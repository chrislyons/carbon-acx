from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import pytest

from calc.dal_sql import SqlStore
from calc.service import compute_profile
from scripts import import_csv_to_db


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


@pytest.fixture(scope="module")
def sqlite_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("compute") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db.import_csv_to_db(db_path, DATA_DIR)
    return db_path


def _load_profile(db_path: Path, overrides: dict[str, float] | None = None):
    store = SqlStore(db_path)
    try:
        return compute_profile(
            "PRO.TO.24_39.HYBRID.2025",
            overrides or {},
            datastore=store,
        )
    finally:
        store.close()


def _bubble_value(payload: dict, activity_id: str) -> float:
    entries = payload["figures"]["bubble"]["data"]
    for entry in entries:
        if entry["activity_id"] == activity_id:
            return entry["values"]["mean"]
    raise KeyError(activity_id)


def _assert_reference_contract(response: dict) -> None:
    references = response["references"]
    total = len(references)
    assert total > 0

    for figure in response["figures"].values():
        data = figure.get("data")
        if isinstance(data, list):
            candidates = data
        elif isinstance(data, dict):
            candidates = data.get("links", [])
        else:
            candidates = []
        for entry in candidates:
            indices = entry.get("hover_reference_indices", [])
            for idx in indices:
                assert 1 <= idx <= total


def test_compute_profile_shape_and_latency(sqlite_db: Path) -> None:
    start = time.perf_counter()
    response = _load_profile(sqlite_db)
    duration = time.perf_counter() - start
    assert duration < 0.3, f"compute took {duration * 1000:.2f}ms"

    assert set(response) == {"figures", "references", "manifest"}
    figures = response["figures"]
    assert set(figures) == {"stacked", "bubble", "sankey", "feedback"}
    assert response["manifest"]["profile_id"] == "PRO.TO.24_39.HYBRID.2025"
    assert response["manifest"]["dataset_version"]
    assert figures["stacked"]["method"] == "figures.stacked"
    assert figures["bubble"]["method"] == "figures.bubble"
    assert figures["sankey"]["method"] == "figures.sankey"
    assert figures["feedback"]["method"] == "figures.feedback"
    assert response["references"]
    _assert_reference_contract(response)


def test_overrides_modify_activity(sqlite_db: Path) -> None:
    base = _load_profile(sqlite_db)
    tweaked = _load_profile(sqlite_db, overrides={"FOOD.COFFEE.CUP.HOT": 12.5})

    base_value = _bubble_value(base, "FOOD.COFFEE.CUP.HOT")
    tweaked_value = _bubble_value(tweaked, "FOOD.COFFEE.CUP.HOT")
    assert base_value != pytest.approx(tweaked_value)
    assert tweaked_value > 0
