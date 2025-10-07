"""Build a lightweight dataset catalog for local chat tooling."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

try:  # pragma: no cover - optional dependency guidance
    import duckdb  # type: ignore
except ImportError as exc:  # pragma: no cover - handled in runtime environments
    raise SystemExit(
        "DuckDB is required for calc.make_catalog; install the 'db' extra"
        " (poetry install --with db)."
    ) from exc

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
DEFAULT_OUTPUT = REPO_ROOT / "artifacts" / "catalog.json"


def _query_dataframe(sql: str, *params: Any) -> pd.DataFrame:
    """Execute ``sql`` using DuckDB and return a pandas DataFrame."""

    result = duckdb.sql(sql, params=params)
    frame = result.df()
    return frame


def _to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert ``df`` to JSON-ready records with ``None`` for nulls."""

    if df.empty:
        return []
    sanitized = df.copy(deep=True).astype(object)
    sanitized = sanitized.where(pd.notnull(sanitized), None)
    records = sanitized.to_dict(orient="records")
    normalised: list[dict[str, Any]] = []
    for record in records:
        cleaned: dict[str, Any] = {}
        for key, value in record.items():
            if isinstance(value, float) and pd.isna(value):
                cleaned[key] = None
            else:
                cleaned[key] = value
        normalised.append(cleaned)
    return normalised


def _load_activities() -> list[dict[str, Any]]:
    sql = """
        SELECT
            NULLIF(activity_id, '') AS activity_id,
            NULLIF(name, '') AS label,
            NULLIF(category, '') AS category,
            NULLIF(layer_id, '') AS layer_id,
            NULLIF(default_unit, '') AS default_unit
        FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        WHERE activity_id IS NOT NULL AND activity_id <> ''
        ORDER BY activity_id
    """
    df = _query_dataframe(sql, str(DATA_DIR / "activities.csv"))
    return _to_records(df)


def _load_emission_factors() -> list[dict[str, Any]]:
    sql = """
        WITH source AS (
            SELECT *
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        )
        SELECT
            NULLIF(activity_id, '') AS activity_id,
            NULLIF(unit, '') AS unit,
            TRY_CAST(NULLIF(value_g_per_unit, '') AS DOUBLE) AS ef_value_central,
            TRY_CAST(NULLIF(uncert_low_g_per_unit, '') AS DOUBLE) AS ef_lo,
            TRY_CAST(NULLIF(uncert_high_g_per_unit, '') AS DOUBLE) AS ef_hi,
            NULLIF(scope_boundary, '') AS scope_boundary,
            NULLIF(region, '') AS region,
            TRY_CAST(NULLIF(vintage_year, '') AS INTEGER) AS vintage_year,
            NULLIF(source_id, '') AS source_id
        FROM source
        WHERE activity_id IS NOT NULL AND activity_id <> ''
        ORDER BY activity_id, vintage_year
    """
    df = _query_dataframe(sql, str(DATA_DIR / "emission_factors.csv"))
    return _to_records(df)


def _load_profiles() -> list[dict[str, Any]]:
    sql = """
        SELECT
            NULLIF(profile_id, '') AS profile_id,
            NULLIF(name, '') AS label,
            NULLIF(region_code_default, '') AS region
        FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        WHERE profile_id IS NOT NULL AND profile_id <> ''
        ORDER BY profile_id
    """
    df = _query_dataframe(sql, str(DATA_DIR / "profiles.csv"))
    return _to_records(df)


def _load_activity_schedule() -> list[dict[str, Any]]:
    sql = """
        WITH source AS (
            SELECT
                NULLIF(profile_id, '') AS profile_id,
                NULLIF(activity_id, '') AS activity_id,
                NULLIF(freq_per_day, '') AS freq_per_day,
                NULLIF(freq_per_week, '') AS freq_per_week,
                NULLIF(office_days_only, '') AS office_days_only
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        )
        SELECT
            profile_id,
            activity_id,
            CASE
                WHEN freq_per_day IS NOT NULL THEN 'daily'
                WHEN freq_per_week IS NOT NULL THEN 'weekly'
                ELSE 'annual'
            END AS basis,
            CASE
                WHEN freq_per_day IS NOT NULL THEN TRY_CAST(freq_per_day AS DOUBLE)
                WHEN freq_per_week IS NOT NULL THEN TRY_CAST(freq_per_week AS DOUBLE)
                ELSE NULL
            END AS value,
            CASE
                WHEN office_days_only IS NULL THEN NULL
                WHEN LOWER(office_days_only) IN ('true', 't', 'yes', 'y', '1') THEN TRUE
                WHEN LOWER(office_days_only) IN ('false', 'f', 'no', 'n', '0') THEN FALSE
                ELSE NULL
            END AS office_days_only
        FROM source
        WHERE profile_id IS NOT NULL AND profile_id <> ''
          AND activity_id IS NOT NULL AND activity_id <> ''
        ORDER BY profile_id, activity_id
    """
    df = _query_dataframe(sql, str(DATA_DIR / "activity_schedule.csv"))
    return _to_records(df)


def _load_grid_intensity() -> list[dict[str, Any]]:
    sql = """
        WITH source AS (
            SELECT
                NULLIF(region_code, '') AS region_code,
                NULLIF(g_per_kwh, '') AS g_per_kwh,
                NULLIF(vintage_year, '') AS vintage_year
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        )
        SELECT
            region_code AS region,
            TRY_CAST(g_per_kwh AS DOUBLE) AS g_co2e_per_kwh,
            TRY_CAST(vintage_year AS INTEGER) AS year
        FROM source
        WHERE region_code IS NOT NULL AND region_code <> ''
        ORDER BY region, year
    """
    df = _query_dataframe(sql, str(DATA_DIR / "grid_intensity.csv"))
    return _to_records(df)


def _manifest_payload() -> dict[str, Any]:
    manifest_sql = """
        WITH ef AS (
            SELECT TRY_CAST(NULLIF(vintage_year, '') AS INTEGER) AS year
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        ),
        grid AS (
            SELECT TRY_CAST(NULLIF(vintage_year, '') AS INTEGER) AS year
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
        ),
        combined_years AS (
            SELECT year FROM ef WHERE year IS NOT NULL
            UNION ALL
            SELECT year FROM grid WHERE year IS NOT NULL
        ),
        policy AS (
            SELECT NULLIF(grid_strategy, '') AS region_policy
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
            WHERE grid_strategy IS NOT NULL AND grid_strategy <> ''
            LIMIT 1
        ),
        horizons AS (
            SELECT NULLIF(gwp_horizon, '') AS gwp_horizon
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
            WHERE gwp_horizon IS NOT NULL AND gwp_horizon <> ''
            UNION ALL
            SELECT NULLIF(gwp_horizon, '') AS gwp_horizon
            FROM read_csv_auto(?, header=TRUE, all_varchar=TRUE)
            WHERE gwp_horizon IS NOT NULL AND gwp_horizon <> ''
            LIMIT 1
        )
        SELECT
            (SELECT MAX(year) FROM combined_years) AS reference_year,
            (SELECT region_policy FROM policy) AS region_policy,
            (SELECT gwp_horizon FROM horizons) AS gwp_horizon
    """
    df = _query_dataframe(
        manifest_sql,
        str(DATA_DIR / "emission_factors.csv"),
        str(DATA_DIR / "grid_intensity.csv"),
        str(DATA_DIR / "profiles.csv"),
        str(DATA_DIR / "emission_factors.csv"),
        str(DATA_DIR / "grid_intensity.csv"),
    )
    record = _to_records(df)
    return record[0] if record else {"reference_year": None, "region_policy": None, "gwp_horizon": None}


def build_catalog() -> dict[str, Any]:
    activities = _load_activities()
    emission_factors = _load_emission_factors()
    profiles = _load_profiles()
    schedule = _load_activity_schedule()
    grid_intensity = _load_grid_intensity()

    datasets = {
        "activities": activities,
        "emission_factors": emission_factors,
        "profiles": profiles,
        "activity_schedule": schedule,
        "grid_intensity": grid_intensity,
    }
    for name, rows in datasets.items():
        if not rows:
            raise SystemExit(f"Catalog dataset '{name}' is empty")

    payload = dict(datasets)
    payload["manifest"] = _manifest_payload()
    return payload


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build artifacts/catalog.json for local chat")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output path for catalog JSON (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)
    payload = build_catalog()
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
