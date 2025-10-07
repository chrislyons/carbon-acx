"""Build a lightweight dataset catalog for local chat tooling."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

try:  # pragma: no cover - optional dependency guidance
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled in runtime environments
    duckdb = None  # type: ignore[assignment]

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
DEFAULT_OUTPUT = REPO_ROOT / "artifacts" / "catalog.json"


def _query_dataframe(sql: str, *params: Any) -> pd.DataFrame:
    """Execute ``sql`` using DuckDB and return a pandas DataFrame."""

    if duckdb is None:
        msg = (
            "DuckDB is required for SQL execution but is not installed. "
            "Install the 'db' extra (poetry install --with db) or rely on the"
            " pandas fallback paths."
        )
        raise RuntimeError(msg)
    result = duckdb.sql(sql, params=params)
    frame = result.df()
    return frame


def _read_csv(path: Path) -> pd.DataFrame:
    """Load ``path`` as a DataFrame with all-string columns."""

    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    for column in df.columns:
        df[column] = df[column].map(
            lambda value: value.strip() if isinstance(value, str) else value
        )
    return df


def _nullify(series: pd.Series) -> pd.Series:
    """Convert blank-like values in ``series`` to ``None``."""

    def convert(value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            return value or None
        if pd.isna(value):
            return None
        return value

    return series.apply(convert)


def _to_numeric(series: pd.Series, *, to_int: bool = False) -> pd.Series:
    """Convert ``series`` to numeric values while preserving ``None`` for blanks."""

    converted = pd.to_numeric(series, errors="coerce")
    if to_int:
        converted = converted.round().astype("Int64")
    return converted


def _parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    lowered = value.lower()
    if lowered in {"true", "t", "yes", "y", "1"}:
        return True
    if lowered in {"false", "f", "no", "n", "0"}:
        return False
    return None


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
    if duckdb is not None:
        df = _query_dataframe(sql, str(DATA_DIR / "activities.csv"))
        return _to_records(df)

    df = _read_csv(DATA_DIR / "activities.csv")
    df = df.loc[df["activity_id"].astype(bool)].copy()
    df.rename(columns={"name": "label"}, inplace=True)
    selected = df[["activity_id", "label", "category", "layer_id", "default_unit"]]
    selected = selected.apply(_nullify)
    selected = selected.sort_values(by="activity_id")
    return _to_records(selected)


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
    if duckdb is not None:
        df = _query_dataframe(sql, str(DATA_DIR / "emission_factors.csv"))
        return _to_records(df)

    df = _read_csv(DATA_DIR / "emission_factors.csv")
    df = df.loc[df["activity_id"].astype(bool)].copy()
    df["ef_value_central"] = _to_numeric(df["value_g_per_unit"])
    df["ef_lo"] = _to_numeric(df["uncert_low_g_per_unit"])
    df["ef_hi"] = _to_numeric(df["uncert_high_g_per_unit"])
    df["vintage_year"] = _to_numeric(df["vintage_year"], to_int=True)
    selected = df[
        [
            "activity_id",
            "unit",
            "ef_value_central",
            "ef_lo",
            "ef_hi",
            "scope_boundary",
            "region",
            "vintage_year",
            "source_id",
        ]
    ]
    selected = selected.apply(_nullify)
    numeric_cols = ["ef_value_central", "ef_lo", "ef_hi", "vintage_year"]
    for column in numeric_cols:
        selected[column] = selected[column].where(selected[column].notna(), None)
    selected = selected.sort_values(by=["activity_id", "vintage_year"], na_position="last")
    return _to_records(selected)


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
    if duckdb is not None:
        df = _query_dataframe(sql, str(DATA_DIR / "profiles.csv"))
        return _to_records(df)

    df = _read_csv(DATA_DIR / "profiles.csv")
    df = df.loc[df["profile_id"].astype(bool)].copy()
    df.rename(columns={"name": "label", "region_code_default": "region"}, inplace=True)
    selected = df[["profile_id", "label", "region"]].apply(_nullify)
    selected = selected.sort_values(by="profile_id")
    return _to_records(selected)


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
    if duckdb is not None:
        df = _query_dataframe(sql, str(DATA_DIR / "activity_schedule.csv"))
        return _to_records(df)

    df = _read_csv(DATA_DIR / "activity_schedule.csv")
    df = df.loc[df["profile_id"].astype(bool) & df["activity_id"].astype(bool)].copy()

    daily_mask = df["freq_per_day"].astype(bool)
    weekly_mask = (~daily_mask) & df["freq_per_week"].astype(bool)
    df.loc[daily_mask, "basis"] = "daily"
    df.loc[weekly_mask, "basis"] = "weekly"
    df.loc[~(daily_mask | weekly_mask), "basis"] = "annual"

    df.loc[daily_mask, "value"] = _to_numeric(df.loc[daily_mask, "freq_per_day"])
    df.loc[weekly_mask, "value"] = _to_numeric(df.loc[weekly_mask, "freq_per_week"])
    df.loc[~(daily_mask | weekly_mask), "value"] = None

    df["office_days_only"] = df["office_days_only"].apply(
        lambda raw: _parse_bool(raw) if raw else None
    )

    selected = df[["profile_id", "activity_id", "basis", "value", "office_days_only"]]
    selected = selected.sort_values(by=["profile_id", "activity_id"])
    return _to_records(selected)


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
    if duckdb is not None:
        df = _query_dataframe(sql, str(DATA_DIR / "grid_intensity.csv"))
        return _to_records(df)

    df = _read_csv(DATA_DIR / "grid_intensity.csv")
    df = df.drop(columns=["region"], errors="ignore")
    df = df.loc[df["region_code"].astype(bool)].copy()
    df.rename(columns={"region_code": "region"}, inplace=True)
    df["g_co2e_per_kwh"] = _to_numeric(df["g_per_kwh"])
    df["year"] = _to_numeric(df["vintage_year"], to_int=True)
    selected = df[["region", "g_co2e_per_kwh", "year"]]
    selected = selected.sort_values(by=["region", "year"], na_position="last")
    return _to_records(selected)


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
    if duckdb is not None:
        df = _query_dataframe(
            manifest_sql,
            str(DATA_DIR / "emission_factors.csv"),
            str(DATA_DIR / "grid_intensity.csv"),
            str(DATA_DIR / "profiles.csv"),
            str(DATA_DIR / "emission_factors.csv"),
            str(DATA_DIR / "grid_intensity.csv"),
        )
        record = _to_records(df)
        return (
            record[0]
            if record
            else {"reference_year": None, "region_policy": None, "gwp_horizon": None}
        )

    ef = _read_csv(DATA_DIR / "emission_factors.csv")
    grid = _read_csv(DATA_DIR / "grid_intensity.csv")
    profiles = _read_csv(DATA_DIR / "profiles.csv")

    ef_years = _to_numeric(ef["vintage_year"], to_int=True).dropna().astype(int)
    grid_years = _to_numeric(grid["vintage_year"], to_int=True).dropna().astype(int)
    combined_years = pd.concat([ef_years, grid_years], ignore_index=True)
    reference_year = int(combined_years.max()) if not combined_years.empty else None

    region_policy = None
    grid_strategies = profiles.get("grid_strategy")
    if grid_strategies is not None:
        for raw in grid_strategies:
            cleaned = raw if raw else None
            if cleaned:
                region_policy = cleaned
                break

    horizon = None
    for series in (ef.get("gwp_horizon"), grid.get("gwp_horizon")):
        if series is None:
            continue
        for raw in series:
            cleaned = raw if raw else None
            if cleaned:
                horizon = cleaned
                break
        if horizon is not None:
            break

    return {
        "reference_year": reference_year,
        "region_policy": region_policy,
        "gwp_horizon": horizon,
    }


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
