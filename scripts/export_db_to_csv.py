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
    "activity_schedule": ("office_days_only", "office_only", "use_canada_average"),
}


TABLE_ORDER = [
    "sources",
    "units",
    "sectors",
    "layers",
    "entities",
    "sites",
    "assets",
    "activities",
    "functional_units",
    "activity_fu_map",
    "operations",
    "profiles",
    "emission_factors",
    "activity_schedule",
    "dependencies",
    "feedback_loops",
    "grid_intensity",
]

# Tables whose SQLite DDL is a superset of the canonical CSV projection. Export
# must emit the canonical column set so the result still satisfies the dataflow
# manifest's ordered provenance (and `make data-audit`) after a round trip.
CANONICAL_COLUMNS: dict[str, tuple[str, ...]] = {
    "activity_schedule": (
        "profile_id",
        "sector_id",
        "activity_id",
        "layer_id",
        "freq_per_day",
        "freq_per_week",
        "office_days_only",
        "region_override",
        "schedule_notes",
        "distance_km",
        "passengers",
        "hours",
        "viewers",
        "servings",
    ),
}

# These SQL columns are supported compute inputs but are not yet represented in
# the canonical activity_schedule.csv header. Refuse to erase populated values
# during export; a future schema migration must promote them explicitly.
PROJECTED_COLUMNS: dict[str, tuple[str, ...]] = {
    "activity_schedule": (
        "quantity_per_week",
        "office_only",
        "mix_region",
        "use_canada_average",
    ),
}

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXPORT_DIR = REPO_ROOT / "build" / "db_export"
CANONICAL_DATA_DIR = REPO_ROOT / "data"

# Export must round-trip authorities byte-faithfully: ORDER BY rowid follows
# insertion (= authored CSV) order. Plain SELECT may satisfy via PK index scans,
# silently reordering rows away from the authored sequence.
ORDER_CLAUSES: dict[str, str] = {table: "ORDER BY rowid" for table in TABLE_ORDER}


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
    canonical = CANONICAL_COLUMNS.get(table)
    if canonical is not None:
        return list(canonical)
    cursor = conn.execute(f"SELECT * FROM {table} LIMIT 0")
    description = cursor.description or []
    return [col[0] for col in description]


def _reject_populated_projection(conn, table: str) -> None:
    for column in PROJECTED_COLUMNS.get(table, ()):
        count = conn.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} IS NOT NULL").fetchone()[
            0
        ]
        if count:
            raise ValueError(
                f"cannot export {table}.{column}: column contains {count} populated "
                "value(s) but is not in the canonical CSV projection"
            )


def _format_bool(value: Any) -> str:
    if value is None:
        return ""
    return "TRUE" if bool(value) else "FALSE"


def _format_value(table: str, column: str, value: Any) -> str:
    if value is None:
        return ""
    if column in BOOLEAN_COLUMNS.get(table, ()):  # bool columns preserve tri-state
        return _format_bool(value)
    if isinstance(value, float):
        return repr(value)
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
        writer = csv.writer(handle, lineterminator="\n")
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
            _reject_populated_projection(conn, table)
            columns = _fetch_columns(conn, table)
            rows = _fetch_rows(conn, table, columns)
            _write_csv(out_dir / f"{table}.csv", columns, rows, table)
    finally:
        conn.close()


def resolve_out_dir(out: Path | None, *, in_place: bool) -> Path:
    """Resolve the CSV destination without silently clobbering canonical ``data/``.

    Default is the derived ``build/db_export`` directory. ``--in-place`` is the
    only way to target the canonical ``data/`` directory, and an explicit
    ``--out data`` without it is rejected.
    """

    canonical = CANONICAL_DATA_DIR.resolve()
    if in_place:
        if out is not None:
            raise ValueError("--in-place cannot be combined with --out")
        return canonical
    if out is not None:
        resolved = Path(out).resolve()
        if resolved == canonical:
            raise ValueError("refusing to overwrite canonical data/; pass --in-place")
        return resolved
    return DEFAULT_EXPORT_DIR


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export ACX SQL tables to CSV snapshots")
    parser.add_argument(
        "--db", type=Path, required=True, help="Path to the SQLite/DuckDB database file"
    )
    destination = parser.add_mutually_exclusive_group()
    destination.add_argument(
        "--out",
        type=Path,
        help="Destination directory for exported CSV files (default: build/db_export)",
    )
    destination.add_argument(
        "--in-place",
        action="store_true",
        help="Write the canonical data/ directory (explicit; never implicit)",
    )
    parser.add_argument(
        "--backend",
        choices=("sqlite", "duckdb"),
        default="sqlite",
        help="Database engine to use when connecting",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not args.db.is_file():
        parser.error(f"database file not found: {args.db}")
    try:
        out_dir = resolve_out_dir(args.out, in_place=args.in_place)
    except ValueError as error:
        parser.error(str(error))
    out_dir.mkdir(parents=True, exist_ok=True)
    export_db_to_csv(args.db, out_dir, backend=args.backend)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
