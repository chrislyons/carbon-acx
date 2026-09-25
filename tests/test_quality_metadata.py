"""Focused coverage for first-class factor quality metadata.

Canonical rows must carry explicit conservative values rather than invented
grades, the Pydantic models must expose the optional fields, and the SQL layer
must declare and preserve the same columns.
"""

from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from calc import schema
from scripts.import_csv_to_db import import_csv_to_db

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SCHEMA_PATH = ROOT / "db" / "schema.sql"

QUALITY_FIELDS = (
    "evidence_type",
    "quality_grade",
    "applicability_boundary",
    "uncertainty_status",
    "uncertainty_reason",
    "claim_locator",
)
CONSERVATIVE = (
    "unknown",
    "unknown",
    "unknown",
    "not_reported",
    "not_recorded",
    "not_recorded",
)


def _rows(name: str) -> list[dict[str, str]]:
    with (DATA_DIR / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


@pytest.fixture(scope="module")
def sqlite_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("quality") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)
    return db_path


def test_canonical_factor_rows_have_explicit_quality_metadata() -> None:
    factors = _rows("emission_factors.csv")
    grid = _rows("grid_intensity.csv")

    assert factors and grid
    for row in factors:
        assert tuple(row[field] for field in QUALITY_FIELDS) == CONSERVATIVE
    for row in grid:
        assert tuple(row[field] for field in QUALITY_FIELDS) == CONSERVATIVE


def test_quality_metadata_is_optional_but_preserved_by_models() -> None:
    baseline = schema.EmissionFactor(activity_id="a", value_g_per_unit=1)
    assert all(getattr(baseline, field) is None for field in QUALITY_FIELDS)

    graded = schema.EmissionFactor(
        activity_id="a",
        value_g_per_unit=1,
        evidence_type="measured",
        quality_grade="primary",
        applicability_boundary="direct",
        uncertainty_status="quantified",
        uncertainty_reason="reported quartile range",
        claim_locator="SRC.TEST:table 2",
    )
    assert graded.evidence_type == "measured"
    assert graded.claim_locator == "SRC.TEST:table 2"

    grid = schema.GridIntensity(region_code="CA-ON", g_per_kwh=28, quality_grade="indicative")
    assert grid.quality_grade == "indicative"
    assert grid.evidence_type is None


def test_models_reject_unknown_quality_vocabulary() -> None:
    with pytest.raises(ValidationError):
        schema.EmissionFactor(activity_id="a", value_g_per_unit=1, evidence_type="vibes")


def test_sql_declares_and_preserves_quality_metadata(sqlite_db: Path) -> None:
    conn = sqlite3.connect(sqlite_db)
    try:
        for table in ("emission_factors", "grid_intensity"):
            columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
            assert set(QUALITY_FIELDS) <= columns
            column_list = ", ".join(QUALITY_FIELDS)
            persisted = list(conn.execute(f"SELECT {column_list} FROM {table}"))
            assert persisted
            assert all(row == CONSERVATIVE for row in persisted)
    finally:
        conn.close()


def test_sql_provides_complete_functional_unit_tables(sqlite_db: Path) -> None:
    conn = sqlite3.connect(sqlite_db)
    try:
        for table, csv_name in (
            ("functional_units", "functional_units.csv"),
            ("activity_fu_map", "activity_fu_map.csv"),
        ):
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            assert count == len(_rows(csv_name))
    finally:
        conn.close()
