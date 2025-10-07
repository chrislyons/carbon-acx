#!/usr/bin/env python3
"""Audit seeded layers and their surface area across data and UI artifacts."""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ARTIFACT_DIR = ROOT / "artifacts"
SITE_PUBLIC_ARTIFACT_DIR = ROOT / "site" / "public" / "artifacts"
DIST_ARTIFACT_DIR = ROOT / "dist" / "artifacts"
LAYER_CONFIG_PATH = SITE_PUBLIC_ARTIFACT_DIR / "layers.json"

CSV_FILENAMES = {
    "layers": "layers.csv",
    "activities": "activities.csv",
    "operations": "operations.csv",
    "emission_factors": "emission_factors.csv",
}

ActivityRecord = Mapping[str, str]


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


def _normalise_layer_id(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _extract_examples(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(";") if part.strip()]


def _load_layer_catalog() -> list[dict[str, object]]:
    catalog_path = DATA_DIR / CSV_FILENAMES["layers"]
    rows = _read_csv(catalog_path)
    catalog: list[dict[str, object]] = []
    for row in rows:
        layer_id = _normalise_layer_id(row.get("layer_id"))
        if not layer_id:
            continue
        catalog.append(
            {
                "id": layer_id,
                "title": (
                    row.get("layer_name") or row.get("title") or layer_id.replace("_", " ")
                ).strip(),
                "summary": (row.get("description") or row.get("summary") or "").strip(),
                "optional": (row.get("ui_optional") or "false").strip().lower()
                in {"true", "1", "yes"},
                "icon": (row.get("icon_slug") or "").strip() or None,
                "examples": _extract_examples(row.get("example_activities")),
                "layer_type": (row.get("layer_type") or "").strip() or None,
            }
        )
    return catalog


def _map_activities_by_layer(activities: Iterable[ActivityRecord]) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    for row in activities:
        layer_id = _normalise_layer_id(row.get("layer_id"))
        if not layer_id:
            continue
        bucket = grouped.setdefault(
            layer_id,
            {"count": 0, "activities": []},
        )
        activity_id = (row.get("activity_id") or "").strip()
        name = (row.get("name") or activity_id or "Activity").strip()
        category = (row.get("category") or "").strip()
        bucket["count"] += 1
        bucket["activities"].append(
            {
                "id": activity_id,
                "name": name,
                "category": category,
            }
        )
    for bucket in grouped.values():
        activities_list = bucket["activities"]
        activities_list.sort(key=lambda item: item["name"].lower())
    return grouped


def _map_operations_by_layer(
    operations: Iterable[Mapping[str, str]],
    activity_lookup: Mapping[str, str],
) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = defaultdict(lambda: {"count": 0, "examples": []})
    unresolved: list[str] = []
    for row in operations:
        activity_id = (row.get("activity_id") or "").strip()
        layer_id = _normalise_layer_id(row.get("layer_id"))
        if not layer_id:
            layer_id = _normalise_layer_id(activity_lookup.get(activity_id))
        if not layer_id:
            unresolved.append(activity_id)
            continue
        bucket = grouped[layer_id]
        bucket["count"] += 1
        if len(bucket["examples"]) < 5:
            bucket["examples"].append(activity_id)
    if unresolved:
        grouped.setdefault("__unmapped__", {"count": 0, "examples": [], "missing_activity_ids": []})
        grouped["__unmapped__"]["missing_activity_ids"] = sorted(
            {activity_id for activity_id in unresolved if activity_id}
        )
    return dict(grouped)


def _map_emission_factor_coverage(
    emission_factors: Iterable[Mapping[str, str]],
    activity_lookup: Mapping[str, str],
    activities_by_layer: Mapping[str, dict[str, object]],
) -> dict[str, dict[str, object]]:
    coverage: dict[str, dict[str, object]] = {}
    factors_by_activity: dict[str, set[str]] = defaultdict(set)

    for row in emission_factors:
        activity_id = (row.get("activity_id") or "").strip()
        layer_id = _normalise_layer_id(activity_lookup.get(activity_id))
        if not layer_id:
            continue
        factors_by_activity[layer_id].add(activity_id)

    for layer_id, bucket in activities_by_layer.items():
        activities = bucket["activities"]
        activity_ids = {activity["id"] for activity in activities if activity["id"]}
        covered = factors_by_activity.get(layer_id, set())
        missing = sorted(activity_ids - covered)
        total = len(activity_ids)
        coverage[layer_id] = {
            "activities": total,
            "with_emission_factors": len(covered),
            "coverage_ratio": round(len(covered) / total, 3) if total else 0.0,
            "missing_activity_ids": missing,
        }
    return coverage


def _load_manifest_layer_references() -> dict[str, list[str]]:
    search_roots = [DIST_ARTIFACT_DIR, SITE_PUBLIC_ARTIFACT_DIR, ARTIFACT_DIR]
    for root in search_roots:
        manifest_path = root / "manifest.json"
        if manifest_path.exists():
            try:
                with manifest_path.open(encoding="utf-8") as handle:
                    payload = json.load(handle)
            except json.JSONDecodeError:
                continue
            raw = payload.get("layer_references") if isinstance(payload, dict) else None
            if isinstance(raw, dict):
                normalised: dict[str, list[str]] = {}
                for layer_id, values in raw.items():
                    if not isinstance(values, list):
                        continue
                    entries = [str(item).strip() for item in values if str(item).strip()]
                    normalised[layer_id] = entries
                return normalised
    return {}


def _load_ui_layers() -> set[str]:
    if not LAYER_CONFIG_PATH.exists():
        return set()
    try:
        with LAYER_CONFIG_PATH.open(encoding="utf-8") as handle:
            entries = json.load(handle)
    except json.JSONDecodeError:
        return set()
    configured: set[str] = set()
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict):
                layer_id = _normalise_layer_id(str(entry.get("id")) if "id" in entry else None)
                if layer_id:
                    configured.add(layer_id)
    return configured


def _build_activity_lookup(activities: Iterable[Mapping[str, str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for row in activities:
        layer_id = _normalise_layer_id(row.get("layer_id"))
        activity_id = (row.get("activity_id") or "").strip()
        if layer_id and activity_id:
            lookup[activity_id] = layer_id
    return lookup


def main() -> int:
    catalog = _load_layer_catalog()
    activities = _read_csv(DATA_DIR / CSV_FILENAMES["activities"])
    operations = _read_csv(DATA_DIR / CSV_FILENAMES["operations"])
    emission_factors = _read_csv(DATA_DIR / CSV_FILENAMES["emission_factors"])

    activity_lookup = _build_activity_lookup(activities)
    activities_by_layer = _map_activities_by_layer(activities)
    ops_by_layer = _map_operations_by_layer(operations, activity_lookup)
    ef_coverage = _map_emission_factor_coverage(
        emission_factors, activity_lookup, activities_by_layer
    )
    layer_references = _load_manifest_layer_references()
    ui_layers = _load_ui_layers()

    missing_icons: list[dict[str, str]] = []
    layers_present: list[dict[str, object]] = []
    missing_refs: list[str] = []

    for entry in catalog:
        layer_id = entry["id"]
        icon_slug = entry.get("icon")
        icon_path = SITE_PUBLIC_ARTIFACT_DIR.parent / "assets" / "layers" / str(icon_slug)
        if icon_slug and not icon_path.exists():
            missing_icons.append(
                {"layer": layer_id, "expected_path": str(icon_path.relative_to(ROOT))}
            )
        elif not icon_slug:
            missing_icons.append({"layer": layer_id, "expected_path": "(icon slug missing)"})

        references = layer_references.get(layer_id, [])
        if not references:
            missing_refs.append(layer_id)

        layer_summary = {
            "id": layer_id,
            "title": entry.get("title"),
            "summary": entry.get("summary"),
            "optional": entry.get("optional"),
            "icon": icon_slug,
            "layer_type": entry.get("layer_type"),
            "ui_configured": layer_id in ui_layers,
            "activities": activities_by_layer.get(layer_id, {}).get("count", 0),
            "operations": ops_by_layer.get(layer_id, {}).get("count", 0),
            "emission_factor_coverage": ef_coverage.get(layer_id, {}),
            "has_references": bool(references),
        }
        layers_present.append(layer_summary)

    seeded_ids = {entry["id"] for entry in catalog}
    hidden_in_ui = sorted(seeded_ids - ui_layers)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "layers_present": sorted(layers_present, key=lambda item: item["id"]),
        "activities_by_layer": activities_by_layer,
        "ops_by_layer": ops_by_layer,
        "ef_coverage": ef_coverage,
        "missing_icons": missing_icons,
        "missing_refs": sorted(missing_refs),
        "hidden_in_ui": hidden_in_ui,
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    SITE_PUBLIC_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    output_paths = [
        ARTIFACT_DIR / "audit_report.json",
        SITE_PUBLIC_ARTIFACT_DIR / "audit_report.json",
    ]
    for path in output_paths:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, sort_keys=True)
            handle.write("\n")

    print(
        f"Wrote audit report to: {', '.join(str(path.relative_to(ROOT)) for path in output_paths)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
