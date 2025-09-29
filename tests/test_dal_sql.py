from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

import pytest

from calc.dal import CsvStore, SqlStore
from scripts.import_csv_to_db import import_csv_to_db

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


@pytest.fixture(scope="module")
def sqlite_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("db") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)
    return db_path


def _normalise(models: list[Any], *keys: str) -> list[dict[str, Any]]:
    def _key_value(model: Any) -> tuple[Any, ...]:
        values: list[Any] = []
        for key in keys:
            try:
                value = getattr(model, key)
            except AttributeError:
                extra = getattr(model, "__pydantic_extra__", None)
                value = extra.get(key) if isinstance(extra, dict) else None
            if hasattr(value, "value"):
                values.append(getattr(value, "value"))
            else:
                values.append(value)
        return tuple(values)

    ordered = sorted(models, key=_key_value)
    return [model.model_dump(mode="json", by_alias=True) for model in ordered]


def test_sql_store_matches_csv(sqlite_db: Path) -> None:
    csv_store = CsvStore()
    sql_store = SqlStore(sqlite_db)
    try:
        assert _normalise(list(csv_store.load_activities()), "activity_id") == _normalise(
            list(sql_store.load_activities()), "activity_id"
        )
        assert _normalise(
            list(csv_store.load_emission_factors()), "activity_id", "region", "unit", "source_id"
        ) == _normalise(
            list(sql_store.load_emission_factors()), "activity_id", "region", "unit", "source_id"
        )
        assert _normalise(list(csv_store.load_profiles()), "profile_id") == _normalise(
            list(sql_store.load_profiles()), "profile_id"
        )
        assert _normalise(
            list(csv_store.load_activity_schedule()), "profile_id", "activity_id"
        ) == _normalise(list(sql_store.load_activity_schedule()), "profile_id", "activity_id")
        assert _normalise(
            list(csv_store.load_grid_intensity()), "region", "vintage_year"
        ) == _normalise(list(sql_store.load_grid_intensity()), "region", "vintage_year")
    finally:
        sql_store.close()
