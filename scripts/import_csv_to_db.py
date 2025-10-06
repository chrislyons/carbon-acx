from __future__ import annotations

import argparse
import csv
import sqlite3
from collections import OrderedDict
from pathlib import Path
from typing import Any, Iterable

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

from pydantic import BaseModel

from calc import schema

PLACEHOLDER_NOTE = "__IMPORT_PLACEHOLDER__"

BOOLEAN_COLUMNS: dict[str, tuple[str, ...]] = {
    "emission_factors": ("is_grid_indexed",),
    "activity_schedule": (
        "office_days_only",
        "office_only",
        "use_canada_average",
    ),
}

FLOAT_COLUMNS: dict[str, tuple[str, ...]] = {
    "units": ("si_conversion_factor",),
    "profiles": ("office_days_per_week",),
    "emission_factors": (
        "value_g_per_unit",
        "electricity_kwh_per_unit",
        "electricity_kwh_per_unit_low",
        "electricity_kwh_per_unit_high",
        "uncert_low_g_per_unit",
        "uncert_high_g_per_unit",
    ),
    "activity_schedule": ("freq_per_day", "freq_per_week"),
    "grid_intensity": ("g_per_kwh", "g_per_kwh_low", "g_per_kwh_high"),
}

INTEGER_COLUMNS: dict[str, tuple[str, ...]] = {
    "sources": ("year",),
    "emission_factors": ("vintage_year",),
    "grid_intensity": ("vintage_year",),
}

VALIDATORS: dict[str, type[BaseModel]] = {
    "activities": schema.Activity,
    "emission_factors": schema.EmissionFactor,
    "profiles": schema.Profile,
    "activity_schedule": schema.ActivitySchedule,
    "grid_intensity": schema.GridIntensity,
}

TABLE_ORDER = [
    "sources",
    "units",
    "sectors",
    "activities",
    "profiles",
    "emission_factors",
    "activity_schedule",
    "grid_intensity",
]


def _ensure_activity_placeholders(
    conn: sqlite3.Connection, rows: list[OrderedDict[str, Any]], existing_ids: set[str]
) -> None:
    for row in rows:
        activity_id = row.get("activity_id")
        if activity_id is None or activity_id in existing_ids:
            continue
        layer_id = row.get("layer_id")
        sector_id = row.get("sector_id")
        conn.execute(
            "INSERT INTO activities (activity_id, sector_id, layer_id, notes) VALUES (?, ?, ?, ?)",
            (activity_id, sector_id, layer_id, PLACEHOLDER_NOTE),
        )
        existing_ids.add(activity_id)


def _strip_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _to_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(float(value))


def _to_bool_flag(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if value else 0
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y"}:
        return 1
    if text in {"0", "false", "no", "n"}:
        return 0
    raise ValueError(f"Cannot interpret boolean value: {value!r}")


def _load_csv(path: Path) -> list[OrderedDict[str, Any]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows: list[OrderedDict[str, Any]] = []
        for raw_row in reader:
            cleaned = OrderedDict((key, _strip_or_none(value)) for key, value in raw_row.items())
            rows.append(cleaned)
    return rows


def _apply_conversions(table: str, rows: list[OrderedDict[str, Any]]) -> None:
    float_columns = FLOAT_COLUMNS.get(table, ())
    int_columns = INTEGER_COLUMNS.get(table, ())
    bool_columns = BOOLEAN_COLUMNS.get(table, ())
    for row in rows:
        for column in float_columns:
            if column in row:
                value = row[column]
                row[column] = _to_float(value) if value is not None else None
        for column in int_columns:
            if column in row:
                value = row[column]
                row[column] = _to_int(value) if value is not None else None
        for column in bool_columns:
            if column in row:
                value = row[column]
                row[column] = _to_bool_flag(value)

        if table == "emission_factors" and row.get("region") == "GLOBAL":
            row["region"] = None
        if table == "profiles" and row.get("region_code_default") == "GLOBAL":
            row["region_code_default"] = None


def _validate_rows(table: str, rows: list[OrderedDict[str, Any]]) -> None:
    validator = VALIDATORS.get(table)
    if not validator:
        return
    for row in rows:
        payload = dict(row)
        for column in BOOLEAN_COLUMNS.get(table, ()):  # convert to bool for validation
            value = payload.get(column)
            if value is not None:
                payload[column] = bool(value)
        validator(**payload)


def _open_connection(db_path: Path, backend: str):
    if backend == "sqlite":
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    if backend == "duckdb":  # pragma: no cover - exercised in CI environments
        if duckdb is None:
            raise RuntimeError("DuckDB backend requires the 'duckdb' extra to be installed")
        return duckdb.connect(str(db_path))
    raise ValueError(f"Unsupported backend: {backend}")


def _clear_tables(conn, backend: str) -> None:
    order = [
        "activity_schedule",
        "emission_factors",
        "grid_intensity",
        "profiles",
        "activities",
        "sectors",
        "units",
        "sources",
    ]
    for table in order:
        conn.execute(f"DELETE FROM {table}")


def _insert_rows(conn, table: str, rows: list[OrderedDict[str, Any]]) -> None:
    if not rows:
        return
    columns = list(rows[0].keys())
    placeholders = ", ".join(["?"] * len(columns))
    sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
    values = [[row.get(column) for column in columns] for row in rows]
    conn.executemany(sql, values)


def import_csv_to_db(db_path: Path, data_dir: Path, *, backend: str = "sqlite") -> None:
    backend = backend.lower()
    conn = _open_connection(db_path, backend)
    existing_activity_ids: set[str] = set()
    try:
        conn.execute("BEGIN")
        try:
            _clear_tables(conn, backend)
            for table in TABLE_ORDER:
                csv_path = data_dir / f"{table}.csv"
                rows = _load_csv(csv_path)
                _apply_conversions(table, rows)
                _validate_rows(table, rows)
                if table == "activities":
                    existing_activity_ids = {
                        str(row["activity_id"]) for row in rows if row.get("activity_id")
                    }
                if table == "activity_schedule" and existing_activity_ids:
                    _ensure_activity_placeholders(conn, rows, existing_activity_ids)
                _insert_rows(conn, table, rows)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    finally:
        conn.close()


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import ACX CSV snapshots into an SQL database")
    parser.add_argument(
        "--db", type=Path, required=True, help="Path to the SQLite/DuckDB database file"
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("./data"),
        help="Directory containing source CSV files",
    )
    parser.add_argument(
        "--backend",
        choices=("sqlite", "duckdb"),
        default="sqlite",
        help="Database engine to use when connecting",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)
    import_csv_to_db(args.db, args.data, backend=args.backend)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
