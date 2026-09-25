"""CSV -> SQL -> CSV round-trip fixture for every canonical table.

The export path is intentionally non-destructive: it can only target ``data/``
through an explicit ``--in-place`` decision, and the default lands in the
derived ``build/db_export`` directory.
"""

from __future__ import annotations

import csv
import math
import shutil
import sqlite3
from pathlib import Path

import pytest

from scripts.export_db_to_csv import (
    CANONICAL_DATA_DIR,
    DEFAULT_EXPORT_DIR,
    TABLE_ORDER,
    export_db_to_csv,
    main,
    resolve_out_dir,
)
from scripts.import_csv_to_db import import_csv_to_db

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SCHEMA_PATH = ROOT / "db" / "schema.sql"

# Columns whose canonical `GLOBAL` sentinel must survive CSV -> SQLite -> CSV
# verbatim. The SQL CHECK constraints admit `GLOBAL` for each of these, so a
# blank export here is data loss, not a documented equivalence.
GLOBAL_COLUMNS: dict[str, tuple[str, ...]] = {
    "emission_factors": ("region",),
    "profiles": ("region_code_default",),
    "sites": ("region_code",),
}


@pytest.fixture(scope="module")
def sqlite_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("roundtrip") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)
    return db_path


def _read(name: str, directory: Path) -> list[list[str]]:
    with (directory / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.reader(handle))


def _values_match(authored: str, exported: str) -> bool:
    left = authored.strip()
    right = exported.strip()
    if left == right:
        return True
    try:
        return math.isclose(float(left), float(right), rel_tol=1e-9, abs_tol=0.0)
    except ValueError:
        pass
    upper_left, upper_right = left.upper(), right.upper()
    if upper_left in {"TRUE", "FALSE"} and upper_right in {"TRUE", "FALSE"}:
        return upper_left == upper_right
    return False


def test_export_order_covers_every_canonical_table() -> None:
    assert {
        "sectors",
        "functional_units",
        "activity_fu_map",
        "activities",
        "emission_factors",
        "grid_intensity",
    } <= set(TABLE_ORDER)
    assert len(TABLE_ORDER) == len(set(TABLE_ORDER))
    for table in TABLE_ORDER:
        assert (DATA_DIR / f"{table}.csv").exists()


def test_csv_sql_csv_round_trips_authored_rows(sqlite_db: Path, tmp_path: Path) -> None:
    out_dir = tmp_path / "export"
    export_db_to_csv(sqlite_db, out_dir)

    for table in TABLE_ORDER:
        authored = _read(f"{table}.csv", DATA_DIR)
        exported = _read(f"{table}.csv", out_dir)
        assert exported[0] == authored[0], f"{table} header drifted"
        assert len(exported) == len(authored), f"{table} row count changed"

        for row_number, (row_authored, row_exported) in enumerate(
            zip(authored[1:], exported[1:]), start=2
        ):
            for column, (left, right) in zip(authored[0], zip(row_authored, row_exported)):
                assert _values_match(left, right), (
                    f"{table}:{row_number} column {column}: "
                    f"authored {left!r} != exported {right!r}"
                )

    # `GLOBAL` is a canonical value, not a NULL alias: every authored sentinel
    # must reappear verbatim after the SQL round trip.
    for table, columns in GLOBAL_COLUMNS.items():
        authored = _read(f"{table}.csv", DATA_DIR)
        exported = _read(f"{table}.csv", out_dir)
        header = authored[0]
        for column in columns:
            index = header.index(column)
            authored_values = [row[index] for row in authored[1:]]
            exported_values = [row[index] for row in exported[1:]]
            assert (
                exported_values == authored_values
            ), f"{table}.{column} lost the canonical GLOBAL sentinel"


def test_round_trip_preserves_optional_metadata(sqlite_db: Path, tmp_path: Path) -> None:
    out_dir = tmp_path / "export"
    export_db_to_csv(sqlite_db, out_dir)

    quality_fields = (
        "evidence_type",
        "quality_grade",
        "applicability_boundary",
        "uncertainty_status",
        "uncertainty_reason",
        "claim_locator",
    )
    factors = list(csv.DictReader((out_dir / "emission_factors.csv").open(encoding="utf-8")))
    assert factors
    assert all(field in factors[0] for field in quality_fields)

    authored = {
        row["ef_id"]: row
        for row in csv.DictReader((DATA_DIR / "emission_factors.csv").open(encoding="utf-8"))
    }
    for row in factors:
        source = authored[row["ef_id"]]
        for column in (
            *quality_fields,
            "uncert_low_g_per_unit",
            "uncert_high_g_per_unit",
            "source_id",
        ):
            assert row[column] == source[column]

    functional_units = list(
        csv.DictReader((out_dir / "functional_units.csv").open(encoding="utf-8"))
    )
    fu_ids = {row["functional_unit_id"] for row in functional_units}
    assert fu_ids
    mappings = list(csv.DictReader((out_dir / "activity_fu_map.csv").open(encoding="utf-8")))
    assert mappings
    assert all(row["functional_unit_id"] in fu_ids for row in mappings)


def test_export_is_non_destructive_by_default(tmp_path: Path) -> None:
    assert resolve_out_dir(None, in_place=False) == DEFAULT_EXPORT_DIR
    assert resolve_out_dir(None, in_place=True) == CANONICAL_DATA_DIR.resolve()

    with pytest.raises(ValueError):
        resolve_out_dir(CANONICAL_DATA_DIR, in_place=False)
    with pytest.raises(ValueError):
        resolve_out_dir(Path("data"), in_place=True)

    explicit = tmp_path / "explicit"
    assert resolve_out_dir(explicit, in_place=False) == explicit.resolve()


def test_export_cli_rejects_missing_database(tmp_path: Path) -> None:
    with pytest.raises(SystemExit) as excinfo:
        main(["--db", str(tmp_path / "missing.db")])
    assert excinfo.value.code == 2


def test_in_place_export_projection_preserves_global(sqlite_db: Path, tmp_path: Path) -> None:
    """An explicit ``--in-place`` export must be safe: the projection written
    over canonical ``data/`` carries ``GLOBAL`` verbatim and re-imports without
    mutating it."""

    assert resolve_out_dir(None, in_place=True) == CANONICAL_DATA_DIR.resolve()

    projection = tmp_path / "projection"
    export_db_to_csv(sqlite_db, projection)

    # Authored GLOBAL sentinels survive SQL and the projection unchanged. The
    # projection is what ``--in-place`` would overwrite canonical data with, so
    # a blank here is data loss rather than a documented equivalence.
    covered: set[tuple[str, str]] = set()
    for table, columns in GLOBAL_COLUMNS.items():
        authored = _read(f"{table}.csv", DATA_DIR)
        exported = _read(f"{table}.csv", projection)
        header = authored[0]
        for column in columns:
            index = header.index(column)
            authored_values = [row[index] for row in authored[1:]]
            assert (
                exported[1:] and [row[index] for row in exported[1:]] == authored_values
            ), f"{table}.{column}: in-place projection changed authored values"
            if "GLOBAL" in authored_values:
                covered.add((table, column))
    assert ("emission_factors", "region") in covered
    assert ("sites", "region_code") in covered

    # A canonical `GLOBAL` profile default (valid per schema.RegionCode) is
    # SQL-admissible and survives projection; canonical data happens not to use
    # it yet, so inject it into a throwaway copy to lock the constraint.
    global_db = tmp_path / "global.db"
    shutil.copyfile(sqlite_db, global_db)
    conn = sqlite3.connect(global_db)
    try:
        conn.execute(
            "UPDATE profiles SET region_code_default = 'GLOBAL' "
            "WHERE profile_id = (SELECT profile_id FROM profiles ORDER BY profile_id LIMIT 1)"
        )
        conn.execute(
            "UPDATE activity_schedule SET region_override = 'GLOBAL' "
            "WHERE rowid = (SELECT rowid FROM activity_schedule LIMIT 1)"
        )
        conn.commit()
    finally:
        conn.close()

    global_projection = tmp_path / "global_projection"
    export_db_to_csv(global_db, global_projection)
    profiles = list(csv.DictReader((global_projection / "profiles.csv").open(encoding="utf-8")))
    schedules = list(
        csv.DictReader((global_projection / "activity_schedule.csv").open(encoding="utf-8"))
    )
    assert any(row["region_code_default"] == "GLOBAL" for row in profiles)
    assert any(row["region_override"] == "GLOBAL" for row in schedules)

    # The projection is a re-importable fixed point: round-tripping it again
    # keeps the injected GLOBAL values rather than nulling them.
    reapplied = tmp_path / "reapplied.db"
    conn = sqlite3.connect(reapplied)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(reapplied, global_projection)
    stable = tmp_path / "stable"
    export_db_to_csv(reapplied, stable)
    stable_profiles = list(csv.DictReader((stable / "profiles.csv").open(encoding="utf-8")))
    assert [row["region_code_default"] for row in stable_profiles] == [
        row["region_code_default"] for row in profiles
    ]


def test_export_rejects_populated_projected_schedule_columns(
    sqlite_db: Path, tmp_path: Path
) -> None:
    projected_db = tmp_path / "projected.db"
    shutil.copyfile(sqlite_db, projected_db)
    conn = sqlite3.connect(projected_db)
    try:
        conn.execute(
            "UPDATE activity_schedule SET quantity_per_week = 1 "
            "WHERE rowid = (SELECT rowid FROM activity_schedule LIMIT 1)"
        )
        conn.commit()
    finally:
        conn.close()

    with pytest.raises(ValueError, match="activity_schedule.quantity_per_week"):
        export_db_to_csv(projected_db, tmp_path / "projection")
