from __future__ import annotations

import datetime as dt
import sqlite3
from pathlib import Path

import pytest

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


@pytest.fixture(scope="module")
def schema_sql() -> str:
    return SCHEMA_PATH.read_text(encoding="utf-8")


@pytest.fixture
def connection(schema_sql: str) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(schema_sql)
    yield conn
    conn.close()


def test_schema_constraints(connection: sqlite3.Connection) -> None:
    current_year = dt.date.today().year
    sector_id = "SECTOR.TEST"
    # Seed lookup tables
    connection.execute(
        "INSERT INTO sources (source_id, year) VALUES (?, ?)",
        ("SRC.TEST", current_year),
    )
    connection.execute(
        "INSERT INTO units (unit_code, unit_type, si_conversion_factor) VALUES (?, ?, ?)",
        ("unit", "generic", 1.0),
    )
    connection.execute(
        "INSERT INTO sectors (sector_id, name, description) VALUES (?, ?, ?)",
        (sector_id, "Test Sector", "Fixture sector"),
    )
    connection.execute(
        "INSERT INTO activities (activity_id, sector_id, layer_id, default_unit, name) VALUES (?, ?, ?, ?, ?)",
        ("ACT.TEST", sector_id, "professional", "unit", "Test Activity"),
    )
    connection.execute(
        "INSERT INTO profiles (profile_id, sector_id, layer_id, name) VALUES (?, ?, ?, ?)",
        ("PRO.TEST", sector_id, "professional", "Profile"),
    )

    # Valid fixed emission factor
    connection.execute(
        """
        INSERT INTO emission_factors (
            ef_id, sector_id, activity_id, unit, value_g_per_unit, is_grid_indexed, vintage_year, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("EF.FIXED", sector_id, "ACT.TEST", "unit", 1.5, 0, current_year, "SRC.TEST"),
    )

    # Invalid: grid fields cannot mix with fixed value
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO emission_factors (
                ef_id, sector_id, activity_id, unit, value_g_per_unit, is_grid_indexed, electricity_kwh_per_unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("EF.INVALID.MIX", sector_id, "ACT.TEST", "unit", 1.0, 1, 0.5),
        )

    # Invalid: future vintage year
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO emission_factors (
                ef_id, sector_id, activity_id, unit, value_g_per_unit, is_grid_indexed, vintage_year
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("EF.INVALID.YEAR", sector_id, "ACT.TEST", "unit", 1.0, 0, current_year + 1),
        )

    # Invalid: region must match Canadian codes
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO emission_factors (
                ef_id, sector_id, activity_id, unit, is_grid_indexed, electricity_kwh_per_unit, region
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("EF.INVALID.REGION", sector_id, "ACT.TEST", "unit", 1, 1.0, "US-CA"),
        )

    # Valid grid-indexed factor
    connection.execute(
        """
        INSERT INTO emission_factors (
            ef_id, sector_id, activity_id, unit, is_grid_indexed, electricity_kwh_per_unit, region, vintage_year, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("EF.GRID", sector_id, "ACT.TEST", "unit", 1, 1.0, "CA-ON", current_year, "SRC.TEST"),
    )

    # Invalid profile region code
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            "INSERT INTO profiles (profile_id, sector_id, layer_id, region_code_default) VALUES (?, ?, ?, ?)",
            ("PRO.BAD", sector_id, "professional", "USA"),
        )

    # Valid activity schedule row
    connection.execute(
        """
        INSERT INTO activity_schedule (
            profile_id, sector_id, activity_id, layer_id, freq_per_day, office_days_only, region_override
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ("PRO.TEST", sector_id, "ACT.TEST", "professional", 1.0, 1, "CA-ON"),
    )

    # Invalid schedule: both frequencies provided
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO activity_schedule (
                profile_id, sector_id, activity_id, layer_id, freq_per_day, freq_per_week
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("PRO.TEST", sector_id, "ACT.TEST", "professional", 1.0, 3.0),
        )

    # Invalid schedule region override
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO activity_schedule (
                profile_id, sector_id, activity_id, layer_id, region_override
            ) VALUES (?, ?, ?, ?, ?)
            """,
            ("PRO.TEST", sector_id, "ACT.TEST", "professional", "USA"),
        )

    # Valid grid intensity row
    connection.execute(
        """
        INSERT INTO grid_intensity (
            region_code,
            region,
            scope_boundary,
            gwp_horizon,
            vintage_year,
            g_per_kwh,
            source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "CA-ON",
            "CA-ON",
            "Operational electricity",
            "GWP100 (AR6)",
            current_year,
            10.0,
            "SRC.TEST",
        ),
    )

    # Invalid grid intensity region code
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO grid_intensity (
                region_code,
                region,
                scope_boundary,
                gwp_horizon,
                vintage_year
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                "US-CA",
                "US-CA",
                "Operational electricity",
                "GWP100 (AR6)",
                current_year,
            ),
        )

    # Invalid grid intensity vintage year
    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """
            INSERT INTO grid_intensity (
                region_code,
                region,
                scope_boundary,
                gwp_horizon,
                vintage_year
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                "CA-ON",
                "CA-ON",
                "Operational electricity",
                "GWP100 (AR6)",
                current_year + 1,
            ),
        )
