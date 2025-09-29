from __future__ import annotations

import argparse
import csv
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Sequence

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

PLACEHOLDER_NOTE = "__IMPORT_PLACEHOLDER__"

BOOLEAN_COLUMNS: dict[str, tuple[str, ...]] = {
    "emission_factors": ("is_grid_indexed",),
    "activity_schedule": ("office_days_only",),
}

ORDER_CLAUSES: dict[str, str] = {
    "sources": "ORDER BY source_id",
    "units": "ORDER BY unit_code",
    "activities": "ORDER BY activity_id",
    "profiles": "ORDER BY profile_id",
    "emission_factors": "ORDER BY ef_id",
    "activity_schedule": "ORDER BY profile_id, activity_id",
    "grid_intensity": "ORDER BY region_code, vintage_year",
}

TABLE_ORDER = [
    "sources",
    "units",
    "activities",
    "profiles",
    "emission_factors",
    "activity_schedule",
    "grid_intensity",
]


def _open_connection(db_path: Path, backend: str):
    if backend == "sqlite":
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        return conn
    if backend == "duckdb":  # pragma: no cover - exercised in CI environments
        if duckdb is None:
            raise RuntimeError("DuckDB backend requires the 'duckdb' extra to be installed")
        return duckdb.connect(str(db_path))
    raise ValueError(f"Unsupported backend: {backend}")


def _fetch_columns(conn, table: str) -> list[str]:
    cursor = conn.execute(f"SELECT * FROM {table} LIMIT 0")
    description = cursor.description or []
    return [col[0] for col in description]


def _format_bool(value: Any, *, default_false: bool = False) -> str:
    if value is None:
        return ""
    return "TRUE" if bool(value) else ("FALSE" if default_false else "")


def _format_value(table: str, column: str, value: Any) -> str:
    if value is None:
        return ""
    if column in BOOLEAN_COLUMNS.get(table, ()):  # bool columns
        default_false = table == "activity_schedule"
        return _format_bool(value, default_false=default_false)
    if isinstance(value, float):
        return format(value, ".15g")
    return str(value)


def _fetch_rows(conn, table: str, columns: Sequence[str]) -> list[list[Any]]:
    order_clause = ORDER_CLAUSES.get(table, "")
    column_list = ", ".join(columns)
    where_clause = ""
    if table == "activities":
        where_clause = f"WHERE COALESCE(notes, '') != '{PLACEHOLDER_NOTE}'"
    sql = f"SELECT {column_list} FROM {table} {where_clause} {order_clause}".strip()
    cursor = conn.execute(sql)
    rows = cursor.fetchall()
    payload: list[list[Any]] = []
    for row in rows:
        if isinstance(row, sqlite3.Row):
            payload.append([row[column] for column in columns])
        else:
            payload.append(list(row))
    return payload


def _write_csv(path: Path, columns: Sequence[str], rows: list[list[Any]], table: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(columns)
        for row in rows:
            writer.writerow(
                [_format_value(table, column, value) for column, value in zip(columns, row)]
            )


def export_db_to_csv(db_path: Path, out_dir: Path, *, backend: str = "sqlite") -> None:
    backend = backend.lower()
    conn = _open_connection(db_path, backend)
    try:
        for table in TABLE_ORDER:
            columns = _fetch_columns(conn, table)
            rows = _fetch_rows(conn, table, columns)
            _write_csv(out_dir / f"{table}.csv", columns, rows, table)
    finally:
        conn.close()


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export ACX SQL tables to CSV snapshots")
    parser.add_argument(
        "--db", type=Path, required=True, help="Path to the SQLite/DuckDB database file"
    )
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Destination directory for exported CSV files",
    )
    parser.add_argument(
        "--backend",
        choices=("sqlite", "duckdb"),
        default="sqlite",
        help="Database engine to use when connecting",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)
    args.out.mkdir(parents=True, exist_ok=True)
    export_db_to_csv(args.db, args.out, backend=args.backend)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
