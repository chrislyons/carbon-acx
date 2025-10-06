#!/usr/bin/env python3
"""Build top-level artefact manifests for Carbon ACX figures."""

from __future__ import annotations

import csv
import json
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping, Sequence

import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from calc.manifest import DATASET_FILES
from calc.utils.hashio import normalise_newlines, sha256_bytes, sha256_concat, sha256_text

TOLERANCE_PCT = 0.01


def _repo_root() -> Path:
    return REPO_ROOT


def _dist_root() -> Path:
    return _repo_root() / "dist" / "artifacts"


def _read_json(path: Path) -> Mapping[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _compute_schema_hash(dataset_paths: Sequence[Path]) -> str:
    headers: list[str] = []
    for path in dataset_paths:
        if not path.exists():
            continue
        with path.open("rb") as handle:
            first_line = handle.readline()
        headers.append(normalise_newlines(first_line).decode("utf-8").strip())
    return sha256_text("\n".join(headers)) if headers else sha256_text("")


def _dataset_paths() -> list[Path]:
    root = _repo_root()
    return [root / candidate for candidate in DATASET_FILES]


def _code_paths() -> list[Path]:
    root = _repo_root()
    return sorted((root / "calc").rglob("*.py"))


def _load_export_rows(export_view_path: Path) -> list[Mapping[str, object]]:
    payload = _read_json(export_view_path)
    data = payload.get("data", [])
    if isinstance(data, list):
        rows = [row for row in data if isinstance(row, Mapping)]
        return rows
    return []


def _activity_map(rows: Iterable[Mapping[str, object]]) -> dict[str, Mapping[str, object]]:
    activity_index: dict[str, Mapping[str, object]] = {}
    for row in rows:
        activity_id = row.get("activity_id")
        if isinstance(activity_id, str):
            activity_index[activity_id] = row
    return activity_index


def _category_activity_ids(rows: Iterable[Mapping[str, object]]) -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        category = row.get("activity_category")
        activity_id = row.get("activity_id")
        if isinstance(category, str) and isinstance(activity_id, str):
            mapping[category].add(activity_id)
    return mapping


def _load_emission_factor_horizons(path: Path) -> dict[str, set[str]]:
    horizons: dict[str, set[str]] = defaultdict(set)
    if not path.exists():
        return horizons
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            activity_id = row.get("activity_id")
            gwp = row.get("gwp_horizon")
            if activity_id and gwp:
                horizons[activity_id].add(gwp)
    return horizons


def _ensure_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def _copy_tree(src: Path, dest: Path, pattern: str = "*") -> None:
    _ensure_dir(dest)
    for candidate in sorted(src.glob(pattern)):
        if candidate.is_file():
            shutil.copy2(candidate, dest / candidate.name)


def _figure_method(figure_payload: Mapping[str, object]) -> str | None:
    method = figure_payload.get("method")
    return method if isinstance(method, str) else None


def _manifest_layer(manifest_payload: Mapping[str, object]) -> str | None:
    render = manifest_payload.get("render")
    if isinstance(render, Mapping):
        layer = render.get("layer")
        if isinstance(layer, str):
            return layer
    return None


def _iter_entries(payload: Mapping[str, object], figure_id: str) -> Iterable[Mapping[str, object]]:
    if figure_id == "stacked":
        data = payload.get("data")
        if isinstance(data, list):
            for entry in data:
                if isinstance(entry, Mapping):
                    yield entry
        return
    if figure_id == "sankey":
        data = payload.get("data")
        if isinstance(data, Mapping):
            links = data.get("links")
            if isinstance(links, list):
                for entry in links:
                    if isinstance(entry, Mapping):
                        yield entry
        return
    if figure_id == "feedback":
        data = payload.get("data")
        if isinstance(data, Mapping):
            links = data.get("links")
            if isinstance(links, list):
                for entry in links:
                    if isinstance(entry, Mapping):
                        yield entry
        return
    data = payload.get("data")
    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, Mapping):
                yield entry


def _numeric_invariance_from_bytes(
    source_bytes: bytes, copied_bytes: bytes
) -> dict[str, object]:
    if source_bytes == copied_bytes:
        max_delta = 0.0
        passed = True
    else:
        max_delta = 100.0
        passed = False
    return {
        "evaluated": True,
        "tolerance_pct": TOLERANCE_PCT,
        "max_delta_pct": max_delta,
        "passed": passed,
    }


def _gather_reference_years(
    figure_id: str,
    figure_payload: Mapping[str, object],
    export_by_activity: Mapping[str, Mapping[str, object]],
    category_activity_map: Mapping[str, set[str]],
) -> set[int]:
    years: set[int] = set()
    if figure_id == "stacked":
        for entry in _iter_entries(figure_payload, figure_id):
            category = entry.get("category")
            if not isinstance(category, str):
                continue
            for activity_id in category_activity_map.get(category, set()):
                baseline_row = export_by_activity.get(activity_id)
                if not isinstance(baseline_row, Mapping):
                    continue
                for key in ("emission_factor_vintage_year", "grid_vintage_year"):
                    value = baseline_row.get(key)
                    if isinstance(value, (int, float)):
                        years.add(int(value))
        return years

    for entry in _iter_entries(figure_payload, figure_id):
        activity_id = entry.get("activity_id")
        if not isinstance(activity_id, str):
            continue
        baseline_row = export_by_activity.get(activity_id)
        if not isinstance(baseline_row, Mapping):
            continue
        for key in ("emission_factor_vintage_year", "grid_vintage_year"):
            value = baseline_row.get(key)
            if isinstance(value, (int, float)):
                years.add(int(value))
    return years


def _gather_gwp_horizons(
    figure_id: str,
    figure_payload: Mapping[str, object],
    export_by_activity: Mapping[str, Mapping[str, object]],
    category_activity_map: Mapping[str, set[str]],
    horizons_map: Mapping[str, set[str]],
) -> set[str]:
    horizons: set[str] = set()
    if figure_id == "stacked":
        for entry in _iter_entries(figure_payload, figure_id):
            category = entry.get("category")
            if not isinstance(category, str):
                continue
            for activity_id in category_activity_map.get(category, set()):
                horizons.update(horizons_map.get(activity_id, set()))
        return horizons

    for entry in _iter_entries(figure_payload, figure_id):
        activity_id = entry.get("activity_id")
        if isinstance(activity_id, str):
            horizons.update(horizons_map.get(activity_id, set()))
    return horizons


def main() -> None:
    dist_root = _dist_root()
    latest_path = dist_root / "latest-build.json"
    if not latest_path.exists():
        raise SystemExit("No dist/artifacts/latest-build.json found; run make build first")

    latest_payload = _read_json(latest_path)
    artifact_dir = Path(latest_payload.get("artifact_dir", ""))
    if not artifact_dir:
        raise SystemExit("latest-build.json missing artifact_dir")
    outputs_dir = artifact_dir / "calc" / "outputs"

    figures_src = outputs_dir / "figures"
    manifests_src = outputs_dir / "manifests"
    references_src = outputs_dir / "references"

    if not figures_src.exists():
        raise SystemExit(f"Figure directory not found: {figures_src}")

    dist_figures = dist_root / "figures"
    dist_manifests = dist_root / "manifests"
    dist_references = dist_root / "references"

    _copy_tree(figures_src, dist_figures, "*.json")
    _copy_tree(references_src, dist_references, "*.txt")

    dataset_paths = _dataset_paths()
    schema_hash = _compute_schema_hash(dataset_paths)
    code_hash = sha256_concat(_code_paths())

    export_rows = _load_export_rows(outputs_dir / "export_view.json")
    export_by_activity = _activity_map(export_rows)
    category_activity_map = _category_activity_ids(export_rows)

    horizons_map = _load_emission_factor_horizons(_repo_root() / "data" / "emission_factors.csv")

    build_manifest_path = outputs_dir / "manifest.json"
    build_manifest = _read_json(build_manifest_path) if build_manifest_path.exists() else {}
    build_generated_at = build_manifest.get("generated_at")
    build_id = build_manifest.get("build_hash") or latest_payload.get("build_hash")

    now_iso = datetime.now(timezone.utc).isoformat()

    dataset_index: dict[str, object] = {
        "generated_at": now_iso,
        "build": {
            "generated_at": build_generated_at,
            "build_id": build_id,
        },
        "schema_hash": schema_hash,
        "code_hash": code_hash,
        "figures": [],
    }

    _ensure_dir(dist_manifests)

    for figure_path in sorted(dist_figures.glob("*.json")):
        figure_id = figure_path.stem
        figure_payload = _read_json(figure_path)
        figure_bytes = figure_path.read_bytes()
        source_bytes = (figures_src / figure_path.name).read_bytes()
        figure_sha = sha256_bytes(figure_bytes)

        manifest_src_path = manifests_src / f"{figure_id}.json"
        manifest_payload = (
            _read_json(manifest_src_path) if manifest_src_path.exists() else {"figure_id": figure_id}
        )

        figure_type = _figure_method(figure_payload) or manifest_payload.get("figure_type")
        layer_id = _manifest_layer(manifest_payload)
        numeric_invariance = _numeric_invariance_from_bytes(source_bytes, figure_bytes)
        reference_years = _gather_reference_years(
            figure_id, figure_payload, export_by_activity, category_activity_map
        )
        gwp_horizons = _gather_gwp_horizons(
            figure_id, figure_payload, export_by_activity, category_activity_map, horizons_map
        )

        provenance = dict(manifest_payload.get("provenance", {}))
        provenance.update(
            {
                "build": {
                    "generated_at": build_generated_at,
                    "build_id": build_id,
                },
                "schema_hash": schema_hash,
                "code_hash": code_hash,
                "numeric_invariance": numeric_invariance,
            }
        )
        manifest_payload["provenance"] = provenance

        if figure_type:
            manifest_payload["figure_type"] = figure_type
        if layer_id:
            manifest_payload.setdefault("render", {})
            if isinstance(manifest_payload["render"], Mapping):
                manifest_payload["render"] = dict(manifest_payload["render"])
                manifest_payload["render"]["layer"] = layer_id
            else:
                manifest_payload["render"] = {"layer": layer_id}

        manifest_dest_path = dist_manifests / f"{figure_id}.json"
        manifest_dest_path.write_text(json.dumps(manifest_payload, indent=2) + "\n", encoding="utf-8")

        dataset_entry = {
            "figure_id": figure_id,
            "sha256": figure_sha,
            "figure_type": figure_type,
            "layer_id": layer_id,
            "reference_years": sorted(reference_years),
            "reference_year": max(reference_years) if reference_years else None,
            "gwp_horizons": sorted(gwp_horizons),
            "gwp_horizon": sorted(gwp_horizons)[0] if gwp_horizons else None,
        }
        dataset_index["figures"].append(dataset_entry)

    manifest_output = dist_root / "manifest.json"
    manifest_output.write_text(json.dumps(dataset_index, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
