from __future__ import annotations

import argparse
import csv
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "acx.web-calculator/1-0-0"
DEFAULT_OUTPUT = Path("apps/carbon-acx-web/src/generated/calculator-data.json")

CATEGORY_INFO = {
    "transport": {"name": "Transport", "emoji": "🚗", "color": "#3b82f6"},
    "food": {"name": "Food & Drink", "emoji": "🍽️", "color": "#10b981"},
    "digital": {"name": "Digital", "emoji": "📱", "color": "#8b5cf6"},
    "home": {"name": "Home & Utilities", "emoji": "🏠", "color": "#f59e0b"},
    "shopping": {"name": "Shopping", "emoji": "🛍️", "color": "#ef4444"},
}

UNIT_LABELS = {
    "1k_tokens": "thousand tokens",
    "garment": "garments",
    "hour": "hours",
    "km": "kilometers",
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


@dataclass(frozen=True)
class GridIntensityRow:
    region: str
    vintage_year: int | None
    g_per_kwh: float
    source_id: str | None


def _load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _float_or_none(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    return float(text)


def _int_or_none(value: str | None) -> int | None:
    number = _float_or_none(value)
    if number is None:
        return None
    return int(number)


def _generated_at() -> str:
    override = os.getenv("ACX_GENERATED_AT")
    if override:
        return override
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _clean_name(name: str) -> str:
    if "—per " in name:
        return name.split("—per ", 1)[0].strip()
    return name.strip()


def _unit_label(unit: str) -> str:
    return UNIT_LABELS.get(unit, unit.replace("_", " "))


def _pick_factor(activity_id: str, rows: list[dict[str, str]]) -> dict[str, str]:
    candidates = [row for row in rows if row["activity_id"] == activity_id]
    if not candidates:
        raise KeyError(f"Missing emission factor for {activity_id}")

    def sort_key(row: dict[str, str]) -> tuple[int, int]:
        region = row.get("region", "").strip()
        vintage = _int_or_none(row.get("vintage_year")) or 0
        return (REGION_PREFERENCE.get(region, 99), -vintage)

    return sorted(candidates, key=sort_key)[0]


def _grid_lookup(rows: list[dict[str, str]]) -> dict[str, list[GridIntensityRow]]:
    lookup: dict[str, list[GridIntensityRow]] = {}
    for row in rows:
        g_per_kwh = _float_or_none(row.get("g_per_kwh"))
        if g_per_kwh is None:
            continue
        lookup.setdefault(row["region_code"], []).append(
            GridIntensityRow(
                region=row["region_code"],
                vintage_year=_int_or_none(row.get("vintage_year")),
                g_per_kwh=g_per_kwh,
                source_id=row.get("source_id") or None,
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
        for row in candidates:
            if row.vintage_year == vintage_year:
                return row
        older = [row for row in candidates if row.vintage_year and row.vintage_year <= vintage_year]
        if older:
            return older[-1]
    return candidates[-1]


def build_payload() -> dict[str, Any]:
    repo_root = Path(__file__).resolve().parent.parent
    activities = {row["activity_id"]: row for row in _load_csv(repo_root / "data/activities.csv")}
    factors = _load_csv(repo_root / "data/emission_factors.csv")
    sources = {row["source_id"]: row for row in _load_csv(repo_root / "data/sources.csv")}
    grid_rows = _grid_lookup(_load_csv(repo_root / "data/grid_intensity.csv"))

    activity_payload: list[dict[str, Any]] = []
    for category, activity_id in SELECTED_ACTIVITIES:
        activity = activities[activity_id]
        factor = _pick_factor(activity_id, factors)
        is_grid_indexed = bool((factor.get("is_grid_indexed") or "").strip())
        value_g_per_unit = _float_or_none(factor.get("value_g_per_unit"))
        grid_row = None
        source_ids = [factor.get("source_id") or ""]

        if is_grid_indexed:
            electricity_kwh = _float_or_none(factor.get("electricity_kwh_per_unit"))
            if electricity_kwh is None:
                raise ValueError(f"Grid-indexed factor missing electricity_kwh_per_unit: {activity_id}")
            grid_row = _pick_grid_row(
                factor.get("region", "").strip(),
                _int_or_none(factor.get("vintage_year")),
                grid_rows,
            )
            value_g_per_unit = round(electricity_kwh * grid_row.g_per_kwh, 4)
            if grid_row.source_id:
                source_ids.append(grid_row.source_id)

        if value_g_per_unit is None:
            raise ValueError(f"Unable to resolve emission factor for {activity_id}")

        source_ids = [item for item in source_ids if item]
        citations = [sources[source_id]["ieee_citation"] for source_id in source_ids if source_id in sources]

        activity_payload.append(
            {
                "id": activity_id,
                "name": _clean_name(activity["name"]),
                "category": category,
                "unit": activity["default_unit"],
                "unitLabel": _unit_label(activity["default_unit"]),
                "emissionFactor": value_g_per_unit,
                "description": activity.get("description") or "",
                "sourceIds": source_ids,
                "sourceCitations": citations,
                "provenance": {
                    "activityId": activity_id,
                    "emissionFactorId": factor["ef_id"],
                    "emissionFactorRegion": factor.get("region") or None,
                    "emissionFactorVintageYear": _int_or_none(factor.get("vintage_year")),
                    "gridIntensityRegion": grid_row.region if grid_row else None,
                    "gridIntensityVintageYear": grid_row.vintage_year if grid_row else None,
                },
            }
        )

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": _generated_at(),
        "categories": CATEGORY_INFO,
        "activities": activity_payload,
    }


def write_payload(output_path: Path) -> Path:
    payload = build_payload()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return output_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the calculator dataset used by the Carbon ACX Next.js web app."
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Output path for generated JSON (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args(argv)
    write_payload(Path(args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
