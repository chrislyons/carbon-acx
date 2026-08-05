from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "acx.web-calculator/1-4-0"
SOURCES_SCHEMA_VERSION = "acx.web-sources/1-0-0"
OWID_CONTEXT_SCHEMA_VERSION = "acx.owid-context/1-0-0"
PUBLIC_RELEASE_SCHEMA_VERSION = "acx.public-release/1-0-0"
DEFAULT_OUTPUT = Path("apps/carbon-acx-web/src/generated/calculator-data.json")
DEFAULT_CATALOG_OUTPUT = Path("apps/carbon-acx-web/src/generated/catalog-data.json")
SOURCES_OUTPUT = Path("apps/carbon-acx-web/src/generated/sources.json")
OWID_CONTEXT_OUTPUT = Path("apps/carbon-acx-web/src/generated/owid-context.json")
RELEASE_OUTPUT = Path("apps/carbon-acx-web/src/generated/release-data.json")
PUBLIC_DATA_ROOT = Path("apps/carbon-acx-web/public/data")
OWID_DATA_RELATIVE = Path("data/owid/annual-co2-emissions-per-country.csv")
OWID_METADATA_RELATIVE = Path("data/owid/annual-co2-emissions-per-country.metadata.json")
OWID_MANIFEST_RELATIVE = Path("data/owid/manifest.json")
OWID_PUBLIC_ROOT = PUBLIC_DATA_ROOT / "owid"
OWID_RAW_FILENAMES = (
    "manifest.json",
    "annual-co2-emissions-per-country.csv",
    "annual-co2-emissions-per-country.metadata.json",
)
OWID_DATA_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv"
OWID_METADATA_URL = (
    "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.metadata.json"
)
OWID_CHART_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country"
OWID_CHART_ID = "annual-co2-emissions-per-country"
OWID_METRIC = "Annual CO₂ emissions"

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

EXPECTED_BENCHMARK_KEYS = {
    "canadian_average",
    "alberta_average",
    "saskatchewan_average",
    "ontario_average",
    "quebec_average",
    "british_columbia_average",
    "manitoba_average",
}
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


def _source_url_for(source_id: str, sources: dict[str, dict[str, str]]) -> str:
    url = (sources.get(source_id, {}).get("url") or "").strip()
    if not url:
        raise ValueError(f"Missing registered source URL for {source_id}")
    return url


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
    source_urls = [_source_url_for(source_id, sources)]
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
        source_urls.append(_source_url_for(grid_row.source_id, sources))
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
            "sourceUrls": source_urls,
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
        "sourceUrls": [],
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

    keys = [(row.get("key") or "").strip() for row in rows]
    if len(rows) != len(EXPECTED_BENCHMARK_KEYS) or set(keys) != EXPECTED_BENCHMARK_KEYS:
        missing = sorted(EXPECTED_BENCHMARK_KEYS - set(keys))
        unexpected = sorted(set(keys) - EXPECTED_BENCHMARK_KEYS)
        raise ValueError(
            f"Benchmark selector keys are not the expected set; missing={missing}, "
            f"unexpected={unexpected}"
        )

    benchmarks: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = (row.get("key") or "").strip()
        per_capita_tonnes = _float_or_none(row.get("per_capita_tonnes"))
        if not key or per_capita_tonnes is None:
            raise ValueError("Benchmark row is missing a key or per_capita_tonnes")
        accounting_basis = (row.get("accounting_basis") or "").strip()
        land_use_change = (row.get("land_use_change") or "").strip()
        if accounting_basis != "territorial" or land_use_change != "excluded":
            raise ValueError(
                f"Benchmark '{key}' has unexpected accounting basis or land-use treatment"
            )
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
        year = _int_or_none(row.get("year"))
        if year != 2023 or source_id != "SRC.ECCC.NIR.2025":
            raise ValueError(
                f"Benchmark '{key}' must use year 2023 and source_id SRC.ECCC.NIR.2025"
            )
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
            "year": year,
            "sourceId": source_id,
            "sourceCitation": source_citation,
            "sourceUrl": _source_url_for(source_id, sources) if source_id else None,
            "populationSourceId": population_source_id,
            "populationCitation": population_citation,
            "populationSourceUrl": (
                _source_url_for(population_source_id, sources) if population_source_id else None
            ),
            "notes": (row.get("notes") or "").strip() or None,
            "accountingBasis": accounting_basis,
            "landUseChange": land_use_change,
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


def _build_payload(root: Path, generated_at: str) -> dict[str, Any]:
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
                "unitDefinition": activity.get("unit_definition") or "",
                "notes": activity.get("notes") or "",
                "evidence": evidence,
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "categories": CATEGORY_INFO,
        "activities": activity_payload,
        "benchmarks": build_benchmarks(root, sources),
    }


def build_payload(
    repo_root: Path | None = None, *, generated_at: str | None = None
) -> dict[str, Any]:
    root = repo_root or Path(__file__).resolve().parent.parent
    return _build_payload(root, generated_at or _generated_at())


def _build_catalog_payload(root: Path, generated_at: str) -> dict[str, Any]:
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
                "unitDefinition": activity.get("unit_definition") or "",
                "notes": activity.get("notes") or "",
                "emissionFactor": value_g_per_unit,
                "evidence": evidence,
                "unavailabilityReason": unavailable_reason,
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "activities": catalog,
    }


def build_catalog_payload(
    repo_root: Path | None = None, *, generated_at: str | None = None
) -> dict[str, Any]:
    root = repo_root or Path(__file__).resolve().parent.parent
    return _build_catalog_payload(root, generated_at or _generated_at())


def _build_sources_payload(root: Path) -> dict[str, Any]:
    return {
        "schemaVersion": SOURCES_SCHEMA_VERSION,
        "sources": _load_csv(root / "data/sources.csv"),
    }


def _json_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, indent=2) + "\n").encode("utf-8")


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _owid_metadata_column(metadata: dict[str, Any]) -> dict[str, Any]:
    chart = metadata.get("chart")
    columns = metadata.get("columns")
    if not isinstance(chart, dict) or chart.get("originalChartUrl") != OWID_CHART_URL:
        raise ValueError("OWID metadata chart URL does not match the configured chart")
    if chart.get("title") != "Annual CO₂ emissions":
        raise ValueError("OWID metadata chart title does not match the configured chart")
    if chart.get("citation") != "Global Carbon Budget (2025)":
        raise ValueError("OWID metadata citation does not match the configured source")
    if not isinstance(columns, dict) or set(columns) != {OWID_METRIC}:
        raise ValueError("OWID metadata does not expose the exact configured metric column")
    column = columns[OWID_METRIC]
    if not isinstance(column, dict) or column.get("unit") != "tonnes":
        raise ValueError("OWID metadata metric unit must be tonnes")
    if not isinstance(column.get("timespan"), str) or not column["timespan"].strip():
        raise ValueError("OWID metadata is missing an upstream timespan")
    if not isinstance(column.get("lastUpdated"), str) or not column["lastUpdated"].strip():
        raise ValueError("OWID metadata is missing an upstream lastUpdated vintage")
    descriptions = " ".join(
        str(column.get(key) or "")
        for key in ("descriptionShort", "descriptionKey", "descriptionProcessing")
    ).lower()
    for phrase in ("territorial", "land-use change", "international aviation", "shipping"):
        if phrase not in descriptions:
            raise ValueError(
                f"OWID metadata is missing the required accounting statement: {phrase}"
            )
    return column


def _owid_points(csv_bytes: bytes) -> list[dict[str, Any]]:
    try:
        text = csv_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("OWID CSV is not valid UTF-8") from error
    reader = csv.DictReader(text.splitlines())
    fieldnames = reader.fieldnames or []
    if not {"Entity", "Code", "Year", OWID_METRIC}.issubset(fieldnames):
        raise ValueError("OWID CSV is missing a required field")
    if fieldnames.count(OWID_METRIC) != 1:
        raise ValueError("OWID CSV does not contain exactly one configured metric column")
    points: list[dict[str, Any]] = []
    years: set[int] = set()
    for row in reader:
        entity = row.get("Entity")
        code = row.get("Code")
        if entity == "Canada" and code != "CAN":
            raise ValueError("OWID CSV pairs Canada with a code other than CAN")
        if code == "CAN" and entity != "Canada":
            raise ValueError("OWID CSV pairs CAN with an entity other than Canada")
        if entity != "Canada" or code != "CAN":
            continue
        raw_year = (row.get("Year") or "").strip()
        if not raw_year.isdecimal():
            raise ValueError("OWID Canada row has a non-integer year")
        year = int(raw_year)
        try:
            value = float((row.get(OWID_METRIC) or "").strip())
        except ValueError as error:
            raise ValueError("OWID Canada row has a non-numeric value") from error
        if not math.isfinite(value):
            raise ValueError("OWID Canada row has a non-finite value")
        if year in years:
            raise ValueError("OWID Canada series contains duplicate years")
        years.add(year)
        points.append({"year": year, "value": value})
    if not points:
        raise ValueError("OWID CSV contains no Canada/CAN rows")
    return sorted(points, key=lambda point: point["year"])


def _validate_owid_manifest(
    manifest: dict[str, Any], data_bytes: bytes, metadata_bytes: bytes
) -> None:
    expected = {
        "schemaVersion": "acx.owid-source/1-0-0",
        "provider": "Our World in Data",
        "chartId": OWID_CHART_ID,
        "metric": OWID_METRIC,
        "dataUrl": OWID_DATA_URL,
        "metadataUrl": OWID_METADATA_URL,
        "license": "CC BY 4.0",
        "accountingBasis": "territorial",
        "landUseChange": "excluded",
        "unit": "tonnes",
        "entity": "Canada",
        "entityCode": "CAN",
        "citation": "Global Carbon Budget (2025)",
    }
    required = set(expected) | {
        "resolvedDataUrl",
        "resolvedMetadataUrl",
        "retrievedAt",
        "upstreamTimespan",
        "upstreamLastUpdated",
        "dataSha256",
        "metadataSha256",
    }
    if not required.issubset(manifest):
        raise ValueError("OWID manifest is missing a required selection field")
    for key, value in expected.items():
        if manifest.get(key) != value:
            raise ValueError(f"OWID manifest field {key} does not match the configured contract")
    if manifest["dataSha256"] != _sha256_bytes(data_bytes):
        raise ValueError("OWID raw data digest does not match its manifest")
    if manifest["metadataSha256"] != _sha256_bytes(metadata_bytes):
        raise ValueError("OWID metadata digest does not match its manifest")
    for key in (
        "resolvedDataUrl",
        "resolvedMetadataUrl",
        "retrievedAt",
        "upstreamTimespan",
        "upstreamLastUpdated",
    ):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            raise ValueError(f"OWID manifest field {key} must be non-empty")
    for key in ("dataSha256", "metadataSha256"):
        digest = manifest[key]
        if (
            not isinstance(digest, str)
            or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
        ):
            raise ValueError(f"OWID manifest field {key} must be a SHA-256 digest")


def _build_owid_context_payload(
    root: Path, generated_at: str
) -> tuple[dict[str, Any], dict[str, bytes] | None]:
    data_path = root / OWID_DATA_RELATIVE
    metadata_path = root / OWID_METADATA_RELATIVE
    manifest_path = root / OWID_MANIFEST_RELATIVE
    present = [path.exists() for path in (data_path, metadata_path, manifest_path)]
    if not any(present):
        return (
            {
                "schemaVersion": OWID_CONTEXT_SCHEMA_VERSION,
                "status": "unavailable",
                "generatedAt": generated_at,
                "source": None,
                "basis": None,
                "selection": {"entity": "Canada", "code": "CAN"},
                "points": [],
                "reason": "No pinned OWID snapshot is available in this release.",
            },
            None,
        )
    if not all(present):
        raise ValueError(
            "OWID snapshot is partial; data, metadata, and manifest must be present together"
        )

    data_bytes = data_path.read_bytes()
    metadata_bytes = metadata_path.read_bytes()
    try:
        manifest = json.loads(manifest_path.read_bytes())
    except json.JSONDecodeError as error:
        raise ValueError("OWID manifest is not valid JSON") from error
    if not isinstance(manifest, dict):
        raise ValueError("OWID manifest is not a JSON object")
    _validate_owid_manifest(manifest, data_bytes, metadata_bytes)
    try:
        metadata = json.loads(metadata_bytes)
    except json.JSONDecodeError as error:
        raise ValueError("OWID metadata is not valid JSON") from error
    if not isinstance(metadata, dict):
        raise ValueError("OWID metadata is not a JSON object")
    column = _owid_metadata_column(metadata)
    points = _owid_points(data_bytes)
    context = {
        "schemaVersion": OWID_CONTEXT_SCHEMA_VERSION,
        "status": "available",
        "generatedAt": generated_at,
        "source": {
            "provider": manifest["provider"],
            "chartId": manifest["chartId"],
            "chartUrl": OWID_CHART_URL,
            "metric": manifest["metric"],
            "dataUrl": manifest["dataUrl"],
            "metadataUrl": manifest["metadataUrl"],
            "citation": manifest["citation"],
            "license": manifest["license"],
            "retrievedAt": manifest["retrievedAt"],
            "upstreamTimespan": column["timespan"],
            "upstreamLastUpdated": column["lastUpdated"],
            "dataSha256": manifest["dataSha256"],
            "metadataSha256": manifest["metadataSha256"],
        },
        "basis": {
            "accountingBasis": "territorial",
            "gas": "CO₂",
            "landUseChange": "excluded",
            "geography": "country production",
            "unit": "tonnes",
        },
        "selection": {"entity": "Canada", "code": "CAN"},
        "points": points,
    }
    return context, {
        "manifest.json": manifest_path.read_bytes(),
        "annual-co2-emissions-per-country.csv": data_bytes,
        "annual-co2-emissions-per-country.metadata.json": metadata_bytes,
    }


def build_owid_context_payload(repo_root: Path | None = None) -> dict[str, Any]:
    root = repo_root or Path(__file__).resolve().parent.parent
    payload, _ = _build_owid_context_payload(root, _generated_at())
    return payload


def _release_inputs(root: Path, snapshot_files: dict[str, bytes] | None) -> dict[str, str | None]:
    relative_paths = {
        Path("data/activities.csv"),
        Path("data/benchmarks.csv"),
        Path("data/emission_factors.csv"),
        Path("data/grid_intensity.csv"),
        Path("data/sources.csv"),
        Path("scripts/generate_web_calculator_data.py"),
        OWID_DATA_RELATIVE,
        OWID_METADATA_RELATIVE,
        OWID_MANIFEST_RELATIVE,
    }
    inputs: dict[str, str | None] = {}
    for relative_path in sorted(relative_paths, key=lambda path: path.as_posix()):
        if relative_path in {OWID_DATA_RELATIVE, OWID_METADATA_RELATIVE, OWID_MANIFEST_RELATIVE}:
            if snapshot_files is None:
                inputs[relative_path.as_posix()] = None
            else:
                filename = relative_path.name
                inputs[relative_path.as_posix()] = _sha256_bytes(snapshot_files[filename])
        else:
            inputs[relative_path.as_posix()] = _sha256_bytes((root / relative_path).read_bytes())
    return inputs


def _build_release_payload(
    root: Path,
    generated_at: str,
    context_bytes: bytes,
    authorities: dict[Path, bytes],
    snapshot_files: dict[str, bytes] | None,
) -> dict[str, Any]:
    public_calculator = PUBLIC_DATA_ROOT / "calculator-data.json"
    public_catalog = PUBLIC_DATA_ROOT / "catalog-data.json"
    public_sources = PUBLIC_DATA_ROOT / "sources.json"
    public_context = PUBLIC_DATA_ROOT / "owid-context.json"
    context = json.loads(context_bytes)
    available = context.get("status") == "available"
    return {
        "schemaVersion": PUBLIC_RELEASE_SCHEMA_VERSION,
        "generatedAt": generated_at,
        "inputs": _release_inputs(root, snapshot_files),
        "authorities": {
            "calculator": {
                "schemaVersion": SCHEMA_VERSION,
                "path": "/data/calculator-data.json",
                "sha256": _sha256_bytes(authorities[public_calculator]),
            },
            "catalog": {
                "schemaVersion": SCHEMA_VERSION,
                "path": "/data/catalog-data.json",
                "sha256": _sha256_bytes(authorities[public_catalog]),
            },
            "sources": {
                "schemaVersion": SOURCES_SCHEMA_VERSION,
                "path": "/data/sources.json",
                "sha256": _sha256_bytes(authorities[public_sources]),
            },
            "owidContext": {
                "schemaVersion": OWID_CONTEXT_SCHEMA_VERSION,
                "path": "/data/owid-context.json",
                "sha256": _sha256_bytes(authorities[public_context]),
            },
        },
        "sourceRegistryPath": "/data/sources.json",
        "owid": {
            "status": "available" if available else "unavailable",
            "contextSha256": _sha256_bytes(context_bytes),
            "sourceManifestPath": "/data/owid/manifest.json" if available else None,
            "sourceDataPath": (
                "/data/owid/annual-co2-emissions-per-country.csv" if available else None
            ),
            "sourceMetadataPath": (
                "/data/owid/annual-co2-emissions-per-country.metadata.json" if available else None
            ),
        },
    }


def write_payload(output_path: Path, repo_root: Path | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(_json_bytes(build_payload(repo_root)))
    return output_path


def write_catalog(output_path: Path, repo_root: Path | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(_json_bytes(build_catalog_payload(repo_root)))
    return output_path


def write_sources(output_path: Path, repo_root: Path | None = None) -> Path:
    root = repo_root or Path(__file__).resolve().parent.parent
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(_json_bytes(_build_sources_payload(root)))
    return output_path


def _authority_bytes(repo_root: Path, generated_at: str) -> dict[Path, bytes]:
    return {
        DEFAULT_OUTPUT: _json_bytes(_build_payload(repo_root, generated_at)),
        DEFAULT_CATALOG_OUTPUT: _json_bytes(_build_catalog_payload(repo_root, generated_at)),
        SOURCES_OUTPUT: _json_bytes(_build_sources_payload(repo_root)),
    }


def _all_authority_bytes(
    repo_root: Path, generated_at: str
) -> tuple[dict[Path, bytes], tuple[Path, ...]]:
    authorities = _authority_bytes(repo_root, generated_at)
    context_payload, snapshot_files = _build_owid_context_payload(repo_root, generated_at)
    context_bytes = _json_bytes(context_payload)
    authorities[OWID_CONTEXT_OUTPUT] = context_bytes
    authorities[PUBLIC_DATA_ROOT / "calculator-data.json"] = authorities[DEFAULT_OUTPUT]
    authorities[PUBLIC_DATA_ROOT / "catalog-data.json"] = authorities[DEFAULT_CATALOG_OUTPUT]
    authorities[PUBLIC_DATA_ROOT / "sources.json"] = authorities[SOURCES_OUTPUT]
    authorities[PUBLIC_DATA_ROOT / "owid-context.json"] = context_bytes

    remove_paths: list[Path] = []
    if snapshot_files is not None:
        for filename, content in snapshot_files.items():
            authorities[OWID_PUBLIC_ROOT / filename] = content
    else:
        remove_paths.extend(OWID_PUBLIC_ROOT / filename for filename in OWID_RAW_FILENAMES)

    release_bytes = _json_bytes(
        _build_release_payload(
            repo_root,
            generated_at,
            context_bytes,
            authorities,
            snapshot_files,
        )
    )
    authorities[RELEASE_OUTPUT] = release_bytes
    authorities[PUBLIC_DATA_ROOT / "release.json"] = release_bytes
    return authorities, tuple(remove_paths)


def _validate_authority_bytes(authorities: dict[Path, bytes]) -> None:
    for relative_path, payload_bytes in authorities.items():
        if not payload_bytes:
            raise ValueError(f"Generated authority is empty: {relative_path}")
        if relative_path.name in OWID_RAW_FILENAMES:
            continue
        if not payload_bytes.endswith(b"\n"):
            raise ValueError(f"Generated authority is missing a trailing newline: {relative_path}")
        payload = json.loads(payload_bytes)
        if not isinstance(payload, dict):
            raise ValueError(f"Generated authority is not a JSON object: {relative_path}")
        if relative_path.name == "sources.json":
            if payload.get("schemaVersion") != SOURCES_SCHEMA_VERSION or not isinstance(
                payload.get("sources"), list
            ):
                raise ValueError(f"Invalid generated source authority: {relative_path}")
        elif relative_path.name == "owid-context.json":
            if payload.get("schemaVersion") != OWID_CONTEXT_SCHEMA_VERSION:
                raise ValueError(f"Invalid generated OWID context authority: {relative_path}")
        elif relative_path.name in {"release-data.json", "release.json"}:
            if payload.get("schemaVersion") != PUBLIC_RELEASE_SCHEMA_VERSION:
                raise ValueError(f"Invalid generated release authority: {relative_path}")
        elif payload.get("schemaVersion") != SCHEMA_VERSION:
            raise ValueError(f"Invalid generated calculator authority: {relative_path}")


def _replace_file(source: Path, destination: Path) -> None:
    os.replace(source, destination)


def _commit_authorities(
    output_root: Path,
    authorities: dict[Path, bytes],
    remove_paths: tuple[Path, ...] = (),
) -> None:
    output_root = output_root.resolve()
    output_root.parent.mkdir(parents=True, exist_ok=True)
    staging_root = Path(
        tempfile.mkdtemp(prefix=f".{output_root.name}.staging-", dir=output_root.parent)
    )
    backup_root = Path(
        tempfile.mkdtemp(prefix=f".{output_root.name}.backup-", dir=output_root.parent)
    )
    targets = tuple(dict.fromkeys((*authorities, *remove_paths)))
    replaced: list[tuple[Path, Path, bool]] = []
    try:
        for relative_path, payload_bytes in authorities.items():
            staged_path = staging_root / relative_path
            staged_path.parent.mkdir(parents=True, exist_ok=True)
            staged_path.write_bytes(payload_bytes)
            if staged_path.read_bytes() != payload_bytes:
                raise OSError(f"Staged authority bytes changed: {relative_path}")

        for relative_path in targets:
            destination = output_root / relative_path
            if destination.exists():
                backup_path = backup_root / relative_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                backup_path.write_bytes(destination.read_bytes())

        for relative_path in authorities:
            destination = output_root / relative_path
            staged_path = staging_root / relative_path
            backup_path = backup_root / relative_path
            existed = backup_path.exists()
            destination.parent.mkdir(parents=True, exist_ok=True)
            _replace_file(staged_path, destination)
            replaced.append((destination, backup_path, existed))

        for relative_path in remove_paths:
            destination = output_root / relative_path
            if destination.exists():
                backup_path = backup_root / relative_path
                destination.unlink()
                replaced.append((destination, backup_path, True))
    except Exception:
        for destination, backup_path, existed in reversed(replaced):
            if existed:
                _replace_file(backup_path, destination)
            elif destination.exists():
                destination.unlink()
        raise
    finally:
        shutil.rmtree(staging_root, ignore_errors=True)
        shutil.rmtree(backup_root, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the published calculator and offline context authorities."
    )
    default_repo_root = Path(__file__).resolve().parent.parent
    parser.add_argument("--repo-root", default=str(default_repo_root))
    parser.add_argument("--output-root", default=str(default_repo_root))
    args = parser.parse_args(argv)
    repo_root = Path(args.repo_root).resolve()
    output_root = Path(args.output_root).resolve()
    authorities, remove_paths = _all_authority_bytes(repo_root, _generated_at())
    _validate_authority_bytes(authorities)
    _commit_authorities(output_root, authorities, remove_paths)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
