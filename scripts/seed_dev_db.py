#!/usr/bin/env python3
"""Seed a minimal development SQLite database for local compute."""

from __future__ import annotations

import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / 'acx.db'
SCHEMA_PATH = PROJECT_ROOT / 'db' / 'schema.sql'

UNITS = [
    ('day', 'frequency', 1.0, 'Day'),
    ('week', 'frequency', 7.0, 'Week'),
    ('hour', 'duration', 1.0, 'Hour'),
]

SOURCES = [
    ('SRC.COMMUTE.AUTO', 'Transport Canada. Commuter Vehicle Emissions, 2023.', 'https://tc.canada.ca', 2023, 'CC-BY'),
    ('SRC.COMMUTE.TRANSIT', 'Canadian Urban Transit Association. Ridership and Emissions Profile, 2023.', None, 2023, 'CC-BY'),
    ('SRC.COMMUTE.BIKE', 'City of Vancouver. Active Transportation Emissions Study, 2022.', None, 2022, 'CC-BY'),
    ('SRC.DIET', 'Agriculture and Agri-Food Canada. Diet-based Life Cycle Assessment, 2022.', None, 2022, 'CC-BY'),
    ('SRC.MEDIA', 'CRTC. Streaming Electricity Intensity in Canadian Households, 2023.', None, 2023, 'CC-BY'),
]

ACTIVITIES = [
    ('TRAVEL.COMMUTE.CAR.WORKDAY', 'professional', 'Commute', 'Drive to office', 'day'),
    ('TRAVEL.COMMUTE.TRANSIT.WORKDAY', 'professional', 'Commute', 'Transit to office', 'day'),
    ('TRAVEL.COMMUTE.BIKE.WORKDAY', 'professional', 'Commute', 'Bike to office', 'day'),
    ('FOOD.DIET.OMNIVORE.WEEK', 'lifestyle', 'Diet', 'Omnivore diet', 'week'),
    ('FOOD.DIET.VEGETARIAN.WEEK', 'lifestyle', 'Diet', 'Vegetarian diet', 'week'),
    ('FOOD.DIET.VEGAN.WEEK', 'lifestyle', 'Diet', 'Vegan diet', 'week'),
    ('MEDIA.STREAM.HD.HOUR.TV', 'lifestyle', 'Media', 'HD streaming', 'hour'),
]

EMISSION_FACTORS = [
    ('EF-COMMUTE-CAR', 'TRAVEL.COMMUTE.CAR.WORKDAY', 'day', 7200.0, 0, None, None, None, None, None, None, None, 'SRC.COMMUTE.AUTO', None, None, None),
    ('EF-COMMUTE-TRANSIT', 'TRAVEL.COMMUTE.TRANSIT.WORKDAY', 'day', 2100.0, 0, None, None, None, None, None, None, None, 'SRC.COMMUTE.TRANSIT', None, None, None),
    ('EF-COMMUTE-BIKE', 'TRAVEL.COMMUTE.BIKE.WORKDAY', 'day', 320.0, 0, None, None, None, None, None, None, None, 'SRC.COMMUTE.BIKE', None, None, None),
    ('EF-DIET-OMNI', 'FOOD.DIET.OMNIVORE.WEEK', 'week', 5400.0, 0, None, None, None, None, None, None, None, 'SRC.DIET', None, None, None),
    ('EF-DIET-VEG', 'FOOD.DIET.VEGETARIAN.WEEK', 'week', 3600.0, 0, None, None, None, None, None, None, None, 'SRC.DIET', None, None, None),
    ('EF-DIET-VEGAN', 'FOOD.DIET.VEGAN.WEEK', 'week', 2800.0, 0, None, None, None, None, None, None, None, 'SRC.DIET', None, None, None),
    ('EF-MEDIA-HD', 'MEDIA.STREAM.HD.HOUR.TV', 'hour', 180.0, 0, None, None, None, None, None, None, None, 'SRC.MEDIA', None, None, None),
]

PROFILE = (
    'PRO.TO.24_39.HYBRID.2025',
    'professional',
    'Hybrid worker (demo)',
    'CA-ON',
    'fixed',
    None,
    None,
    3.0,
    'Seed dataset for local development'
)

SCHEDULE = [
    ('TRAVEL.COMMUTE.CAR.WORKDAY', None, 1.8),
    ('TRAVEL.COMMUTE.TRANSIT.WORKDAY', None, 0.9),
    ('TRAVEL.COMMUTE.BIKE.WORKDAY', None, 0.3),
    ('FOOD.DIET.OMNIVORE.WEEK', 7.0, None),
    ('FOOD.DIET.VEGETARIAN.WEEK', 0.0, None),
    ('FOOD.DIET.VEGAN.WEEK', 0.0, None),
    ('MEDIA.STREAM.HD.HOUR.TV', None, 10.5),
]


def _execute_many(cursor: sqlite3.Cursor, sql: str, rows: list[tuple[object, ...]]) -> None:
    cursor.executemany(sql, rows)


def main() -> None:
    if not SCHEMA_PATH.exists():
        raise SystemExit(f"Schema file not found at {SCHEMA_PATH}")

    if DB_PATH.exists():
        DB_PATH.unlink()

    db = sqlite3.connect(DB_PATH)
    try:
        db.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
        db.execute('PRAGMA user_version = 1')

        _execute_many(
            db,
            'INSERT INTO units (unit_code, unit_type, si_conversion_factor, notes) VALUES (?, ?, ?, ?)',
            UNITS,
        )
        _execute_many(
            db,
            'INSERT INTO sources (source_id, ieee_citation, url, year, license) VALUES (?, ?, ?, ?, ?)',
            SOURCES,
        )
        _execute_many(
            db,
            'INSERT INTO activities (activity_id, layer_id, category, name, default_unit, description, unit_definition, notes) '
            'VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
            ACTIVITIES,
        )
        db.execute(
            'INSERT INTO profiles (profile_id, layer_id, name, region_code_default, grid_strategy, grid_mix_json, cohort_id, '
            'office_days_per_week, assumption_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            PROFILE,
        )
        _execute_many(
            db,
            'INSERT INTO emission_factors (ef_id, activity_id, unit, value_g_per_unit, is_grid_indexed, '
            'electricity_kwh_per_unit, electricity_kwh_per_unit_low, electricity_kwh_per_unit_high, region, scope_boundary, '
            'gwp_horizon, vintage_year, source_id, method_notes, uncert_low_g_per_unit, uncert_high_g_per_unit) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            EMISSION_FACTORS,
        )

        schedule_rows = [
            (
                PROFILE[0],
                activity_id,
                next((activity[1] for activity in ACTIVITIES if activity[0] == activity_id), 'professional'),
                freq_per_day,
                freq_per_week,
                0,
                None,
                None,
            )
            for activity_id, freq_per_week, freq_per_day in SCHEDULE
        ]
        _execute_many(
            db,
            'INSERT INTO activity_schedule (profile_id, activity_id, layer_id, freq_per_day, freq_per_week, '
            'office_days_only, region_override, schedule_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            schedule_rows,
        )

        db.commit()
        print(f'Seeded development database at {DB_PATH}')
    finally:
        db.close()


if __name__ == '__main__':
    main()
