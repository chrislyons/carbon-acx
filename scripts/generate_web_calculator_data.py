from __future__ import annotations

import argparse
import csv
import json
import math
import re
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "acx.web-calculator/1-3-0"
DEFAULT_OUTPUT = Path("apps/carbon-acx-web/src/generated/calculator-data.json")
DEFAULT_CATALOG_OUTPUT = Path("apps/carbon-acx-web/src/generated/catalog-data.json")
SOURCES_OUTPUT = Path("apps/carbon-acx-web/src/generated/sources.json")

CATEGORY_INFO = {
    "transport": {"name": "Transport", "color": "#1f6f68"},
    "food": {"name": "Food & drink", "color": "#9b5b21"},
    "digital": {"name": "Digital", "color": "#435c9c"},
    "home": {"name": "Home & utilities", "color": "#775c1d"},
    "shopping": {"name": "Goods", "color": "#7b486f"},
}

UNIT_LABELS = {
    "1k_tokens": "thousand tokens",
    "garment": "garments",
    "hour": "hours",
    "km": "kilometres",
    "m3": "cubic metres",
    "pkm": "passenger-kilometres",
    "serving": "servings",
    "unit": "units",
    "year": "years",
}

SELECTED_ACTIVITIES = [
    ("transport", "TRAN.SCHOOLRUN.CAR.KM"),
    ("transport", "TRAN.SCHOOLRUN.BIKE.KM"),
    ("transport", "TRAN.TTC.SUBWAY.KM"),
    ("transport", "TRAN.TTC.BUS.KM"),
    ("transport", "TRAN.FLIGHT.SHORTHAUL.PKM"),
    ("transport", "TRAN.FLIGHT.LONGHAUL.PKM"),
    ("food", "FOOD.MEAL.BEEF.SERVING"),
    ("food", "FOOD.MEAL.CHICKEN.SERVING"),
    ("food", "FOOD.MEAL.VEG.SERVING"),
    ("digital", "MEDIA.STREAM.HD.HOUR"),
    ("digital", "MEDIA.STREAM.UHD.HOUR"),
    ("digital", "SOCIAL.INSTAGRAM.HOUR"),
    ("digital", "MUSIC.STREAM.STANDARD.HOUR"),
    ("digital", "AI.USAGE.GPT.QUERY"),
    ("home", "ENERGY.NATGAS.M3"),
    ("home", "MUNI.WATER.POTABLE.M3"),
    ("home", "REFR.APPL.FRIDGE.OP.YEAR"),
    ("home", "REFR.HVAC.AC.OP.YEAR"),
    ("shopping", "CLOTHING.TSHIRT.COTTON"),
    ("shopping", "CLOTHING.JEANS.DENIM"),
    ("shopping", "DEVICE.SMARTPHONE.UNIT"),
    ("shopping", "DEVICE.LAPTOP.UNIT"),
]

REGION_PREFERENCE = {"CA-ON": 0, "CA": 1, "GLOBAL": 2, "": 3}
GRAMS_PER_TONNE = 1_000_000
BENCHMARK_DERIVATION_TOLERANCE_T = 0.15


@dataclass(frozen=True)
class GridIntensityRow:
    region: str
    vintage_year: int | None
    g_per_kwh: float
    source_id: str | None


def _load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        for key in list(row.keys()):
            if key.strip() != key:
                row[key.strip()] = row.pop(key)
    return rows


def _load_commented_csv(path: Path) -> list[dict[str, str]]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    return [dict(row) for row in csv.DictReader(lines)]


def _float_or_none(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _int_or_none(value: str | None) -> int | None:
    number = _float_or_none(value)
    return int(number) if number is not None else None


def _generated_at() -> str:
    override = os.getenv("ACX_GENERATED_AT")
    return override or datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _clean_name(name: str) -> str:
    return name.split("—per ", 1)[0].strip() if "—per " in name else name.strip()


def _unit_label(unit: str) -> str:
    return UNIT_LABELS.get(unit, unit.replace("_", " "))


def _pick_factor(activity_id: str, rows: list[dict[str, str]]) -> dict[str, str]:
    candidates = [row for row in rows if row["activity_id"] == activity_id]
    if not candidates:
        raise KeyError(f"Missing emission factor for {activity_id}")

    def sort_key(row: dict[str, str]) -> tuple[int, int]:
        return (
            REGION_PREFERENCE.get(row.get("region", "").strip(), 99),
            -(_int_or_none(row.get("vintage_year")) or 0),
        )

    return sorted(candidates, key=sort_key)[0]


def _grid_lookup(rows: list[dict[str, str]]) -> dict[str, list[GridIntensityRow]]:
    lookup: dict[str, list[GridIntensityRow]] = {}
    for row in rows:
        g_per_kwh = _float_or_none(row.get("g_per_kwh"))
        region = row.get("region_code", "").strip()
        if g_per_kwh is None or not region:
            continue
        lookup.setdefault(region, []).append(
            GridIntensityRow(
                region=region,
                vintage_year=_int_or_none(row.get("vintage_year")),
                g_per_kwh=g_per_kwh,
                source_id=(row.get("source_id") or "").strip() or None,
            )
        )
    for values in lookup.values():
        values.sort(key=lambda item: item.vintage_year or 0)
    return lookup


def _pick_grid_row(
    region_code: str,
    vintage_year: int | None,
    lookup: dict[str, list[GridIntensityRow]],
) -> GridIntensityRow:
    candidates = lookup.get(region_code)
    if not candidates:
        raise KeyError(f"Missing grid intensity for {region_code}")
    if vintage_year is not None:
        exact = next((row for row in candidates if row.vintage_year == vintage_year), None)
        if exact:
            return exact
        older = [row for row in candidates if row.vintage_year and row.vintage_year <= vintage_year]
        if older:
            return older[-1]
    return candidates[-1]


def _citation_for(source_id: str, sources: dict[str, dict[str, str]]) -> str:
    if source_id == "SRC.DEMO":
        raise ValueError("SRC.DEMO is not publishable")
    citation = (sources.get(source_id, {}).get("ieee_citation") or "").strip()
    if not citation:
        raise ValueError(f"Missing registered IEEE citation for {source_id}")
    return citation


def _factor_evidence(
    activity: dict[str, str],
    factor: dict[str, str],
    sources: dict[str, dict[str, str]],
    grid_rows: dict[str, list[GridIntensityRow]],
) -> tuple[float, dict[str, Any]]:
    activity_id = activity["activity_id"]
    factor_id = (factor.get("ef_id") or "").strip()
    source_id = (factor.get("source_id") or "").strip()
    region = (factor.get("region") or "").strip()
    scope_boundary = (factor.get("scope_boundary") or "").strip()
    gwp_horizon = (factor.get("gwp_horizon") or "").strip()
    vintage_year = _int_or_none(factor.get("vintage_year"))
    if not all([factor_id, source_id, region, scope_boundary, gwp_horizon]) or vintage_year is None:
        raise ValueError(f"Incomplete published evidence for {activity_id}")
    if (factor.get("unit") or "").strip() != (activity.get("default_unit") or "").strip():
        raise ValueError(f"Unit mismatch for {activity_id}")

    method_notes = (factor.get("method_notes") or "").strip()
    if factor_id.startswith("EF.DEMO.") or re.search(
        r"\b(?:demo|demonstration)\b", method_notes, flags=re.IGNORECASE
    ):
        raise ValueError(f"Demonstration factor is not publishable: {factor_id}")
    if source_id == "SRC.DEMO":
        raise ValueError(f"SRC.DEMO is not publishable: {factor_id}")
    source_ids = [source_id]
    source_citations = [_citation_for(source_id, sources)]
    value_g_per_unit = _float_or_none(factor.get("value_g_per_unit"))
    uncertainty_low = _float_or_none(factor.get("uncert_low_g_per_unit"))
    uncertainty_high = _float_or_none(factor.get("uncert_high_g_per_unit"))
    is_grid_indexed = (factor.get("is_grid_indexed") or "").strip().lower() in {"true", "1", "yes"}

    if is_grid_indexed:
        electricity_kwh = _float_or_none(factor.get("electricity_kwh_per_unit"))
        if electricity_kwh is None:
            raise ValueError(f"Grid-indexed factor missing electricity_kwh_per_unit: {activity_id}")
        grid_row = _pick_grid_row(region, vintage_year, grid_rows)
        if not grid_row.source_id:
            raise ValueError(f"Grid-indexed factor missing grid source: {activity_id}")
        value_g_per_unit = electricity_kwh * grid_row.g_per_kwh
        source_ids.append(grid_row.source_id)
        source_citations.append(_citation_for(grid_row.source_id, sources))
        electricity_low = _float_or_none(factor.get("electricity_kwh_per_unit_low"))
        electricity_high = _float_or_none(factor.get("electricity_kwh_per_unit_high"))
        uncertainty_low = (
            electricity_low * grid_row.g_per_kwh if electricity_low is not None else None
        )
        uncertainty_high = (
            electricity_high * grid_row.g_per_kwh if electricity_high is not None else None
        )

    if value_g_per_unit is None:
        raise ValueError(f"Unable to resolve emission factor for {activity_id}")

    return (
        round(value_g_per_unit, 4),
        {
            "activityId": activity_id,
            "emissionFactorId": factor_id,
            "sectorId": (factor.get("sector_id") or activity.get("sector_id") or "").strip(),
            "layerId": (factor.get("layer_id") or activity.get("layer_id") or "").strip(),
            "region": region,
            "scopeBoundary": scope_boundary,
            "gwpHorizon": gwp_horizon,
            "vintageYear": vintage_year,
            "sourceIds": source_ids,
            "sourceCitations": source_citations,
            "methodNotes": (factor.get("method_notes") or "").strip() or None,
            "uncertainty": {
                "lowGPerUnit": uncertainty_low,
                "highGPerUnit": uncertainty_high,
            },
            "publicationStatus": "published",
        },
    )


def _unavailable_evidence(
    activity: dict[str, str], factor: dict[str, str] | None
) -> dict[str, Any]:
    return {
        "activityId": activity["activity_id"],
        "emissionFactorId": (factor or {}).get("ef_id", ""),
        "sectorId": ((factor or {}).get("sector_id") or activity.get("sector_id") or "").strip(),
        "layerId": ((factor or {}).get("layer_id") or activity.get("layer_id") or "").strip(),
        "region": ((factor or {}).get("region") or "").strip() or None,
        "scopeBoundary": ((factor or {}).get("scope_boundary") or "").strip(),
        "gwpHorizon": ((factor or {}).get("gwp_horizon") or "").strip(),
        "vintageYear": _int_or_none((factor or {}).get("vintage_year")),
        "sourceIds": [],
        "sourceCitations": [],
        "methodNotes": ((factor or {}).get("method_notes") or "").strip() or None,
        "uncertainty": {"lowGPerUnit": None, "highGPerUnit": None},
        "publicationStatus": "unavailable",
    }


def build_benchmarks(
    repo_root: Path, sources: dict[str, dict[str, str]]
) -> dict[str, dict[str, Any]]:
    rows = _load_commented_csv(repo_root / "data/benchmarks.csv")
    if not rows:
        raise ValueError("data/benchmarks.csv contains no benchmark rows")

    benchmarks: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = (row.get("key") or "").strip()
        per_capita_tonnes = _float_or_none(row.get("per_capita_tonnes"))
        if not key or per_capita_tonnes is None:
            raise ValueError("Benchmark row is missing a key or per_capita_tonnes")
        total_mt = _float_or_none(row.get("total_mt"))
        population_millions = _float_or_none(row.get("population_millions"))
        if total_mt is not None and population_millions:
            derived = total_mt / population_millions
            if abs(derived - per_capita_tonnes) > BENCHMARK_DERIVATION_TOLERANCE_T:
                raise ValueError(
                    f"Benchmark '{key}': stated per_capita_tonnes {per_capita_tonnes} "
                    f"disagrees with derived {derived:.2f} (total_mt / population_millions). "
                    "Recompute per_capita_tonnes in data/benchmarks.csv."
                )
        source_id = (row.get("source_id") or "").strip() or None
        population_source_id = (row.get("population_source_id") or "").strip() or None
        source_citation = _citation_for(source_id, sources) if source_id else None
        population_citation = (
            _citation_for(population_source_id, sources) if population_source_id else None
        )
        benchmarks[key] = {
            "label": row.get("label") or key,
            "scope": (row.get("scope") or "").strip() or None,
            "regionCode": (row.get("region_code") or "").strip() or None,
            "perCapitaTonnes": per_capita_tonnes,
            "annualGrams": round(per_capita_tonnes * GRAMS_PER_TONNE),
            "totalMt": total_mt,
            "populationMillions": population_millions,
            "year": _int_or_none(row.get("year")),
            "sourceId": source_id,
            "sourceCitation": source_citation,
            "populationSourceId": population_source_id,
            "populationCitation": population_citation,
            "notes": (row.get("notes") or "").strip() or None,
        }
    return benchmarks


def _load_inputs(repo_root: Path) -> tuple[
    dict[str, dict[str, str]],
    list[dict[str, str]],
    dict[str, dict[str, str]],
    dict[str, list[GridIntensityRow]],
]:
    return (
        {row["activity_id"]: row for row in _load_csv(repo_root / "data/activities.csv")},
        _load_csv(repo_root / "data/emission_factors.csv"),
        {row["source_id"]: row for row in _load_csv(repo_root / "data/sources.csv")},
        _grid_lookup(_load_csv(repo_root / "data/grid_intensity.csv")),
    )


def build_payload(repo_root: Path | None = None) -> dict[str, Any]:
    root = repo_root or Path(__file__).resolve().parent.parent
    activities, factors, sources, grid_rows = _load_inputs(root)
    activity_payload: list[dict[str, Any]] = []
    for category, activity_id in SELECTED_ACTIVITIES:
        activity = activities.get(activity_id)
        if not activity:
            raise ValueError(f"Curated calculator activity is missing: {activity_id}")
        factor = _pick_factor(activity_id, factors)
        value_g_per_unit, evidence = _factor_evidence(activity, factor, sources, grid_rows)
        activity_payload.append(
            {
                "id": activity_id,
                "name": _clean_name(activity["name"]),
                "category": category,
                "unit": activity["default_unit"],
                "unitLabel": _unit_label(activity["default_unit"]),
                "emissionFactor": value_g_per_unit,
                "description": activity.get("description") or "",
                "evidence": evidence,
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": _generated_at(),
        "categories": CATEGORY_INFO,
        "activities": activity_payload,
        "benchmarks": build_benchmarks(root, sources),
    }


def build_catalog_payload(repo_root: Path | None = None) -> dict[str, Any]:
    root = repo_root or Path(__file__).resolve().parent.parent
    activities, factors, sources, grid_rows = _load_inputs(root)
    catalog: list[dict[str, Any]] = []
    for activity_id, activity in sorted(activities.items()):
        factor = None
        try:
            factor = _pick_factor(activity_id, factors)
            value_g_per_unit, evidence = _factor_evidence(activity, factor, sources, grid_rows)
            unavailable_reason = None
        except (KeyError, ValueError) as error:
            value_g_per_unit = None
            evidence = _unavailable_evidence(activity, factor)
            unavailable_reason = str(error)
        catalog.append(
            {
                "id": activity_id,
                "name": _clean_name(activity["name"]),
                "category": (activity.get("category") or "").strip() or "other",
                "unit": activity.get("default_unit") or "",
                "unitLabel": _unit_label(activity.get("default_unit") or ""),
                "description": activity.get("description") or "",
                "emissionFactor": value_g_per_unit,
                "evidence": evidence,
                "unavailabilityReason": unavailable_reason,
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": _generated_at(),
        "activities": catalog,
    }


def write_payload(output_path: Path, repo_root: Path | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(build_payload(repo_root), indent=2) + "\n", encoding="utf-8")
    return output_path


def write_catalog(output_path: Path, repo_root: Path | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(build_catalog_payload(repo_root), indent=2) + "\n", encoding="utf-8"
    )
    return output_path


def write_sources(output_path: Path, repo_root: Path | None = None) -> Path:
    root = repo_root or Path(__file__).resolve().parent.parent
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(_load_csv(root / "data/sources.csv"), indent=2) + "\n", encoding="utf-8"
    )
    return output_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the published calculator and activity catalogue datasets."
    )
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--catalog-output", default=str(DEFAULT_CATALOG_OUTPUT))
    parser.add_argument("--sources-output", default=str(SOURCES_OUTPUT))
    args = parser.parse_args(argv)
    write_payload(Path(args.output))
    write_catalog(Path(args.catalog_output))
    write_sources(Path(args.sources_output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
