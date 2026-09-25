from __future__ import annotations

import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any, Sequence

import pytest

from calc.dal import CsvStore, DatasetLoadError, DatasetSnapshot, SqlStore, load_dataset_snapshot
from scripts.import_csv_to_db import import_csv_to_db

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"

_REQUIRED_LOADERS = (
    "load_layers",
    "load_entities",
    "load_sites",
    "load_assets",
    "load_operations",
    "load_activities",
    "load_emission_factors",
    "load_profiles",
    "load_activity_schedule",
    "load_grid_intensity",
    "load_activity_dependencies",
    "load_functional_units",
    "load_activity_fu_map",
)


class _CountingStore:
    """Wrap a store, tallying how often each ``load_*`` method is invoked."""

    def __init__(self, inner: Any) -> None:
        self._inner = inner
        self.calls: Counter[str] = Counter()

    def __getattr__(self, name: str) -> Any:
        if not name.startswith("load_"):
            raise AttributeError(name)
        loader = getattr(self._inner, name)

        def _wrapped() -> Sequence[Any]:
            self.calls[name] += 1
            return loader()

        return _wrapped


class _MissingFunctionalUnits:
    """Wrap a store but expose no functional-unit loaders."""

    def __init__(self, inner: Any) -> None:
        self._inner = inner

    def __getattr__(self, name: str) -> Any:
        if name in {"load_functional_units", "load_activity_fu_map"}:
            raise AttributeError(name)
        return getattr(self._inner, name)


def test_snapshot_loads_every_collection_exactly_once() -> None:
    counting = _CountingStore(CsvStore())
    snapshot = load_dataset_snapshot(counting)

    assert isinstance(snapshot, DatasetSnapshot)
    for method in _REQUIRED_LOADERS:
        assert counting.calls[method] == 1, method
    assert counting.calls["load_feedback_loops"] == 1

    assert {fu.functional_unit_id for fu in snapshot.functional_units}
    assert {m.activity_id for m in snapshot.activity_fu_map}
    assert snapshot.activities and snapshot.emission_factors
    # Snapshot is an immutable single-load view.
    assert isinstance(snapshot.functional_units, tuple)


def test_snapshot_rejects_store_missing_required_loader() -> None:
    backing = CsvStore()
    assert backing.load_functional_units()  # data exists, yet must not be used
    store = _MissingFunctionalUnits(backing)

    with pytest.raises(DatasetLoadError) as excinfo:
        load_dataset_snapshot(store)

    assert "load_functional_units" in str(excinfo.value)


def test_broken_sql_store_fails_loudly_without_csv_fallback(tmp_path: Path) -> None:
    db_path = tmp_path / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)

    conn = sqlite3.connect(db_path)
    conn.execute("DROP TABLE IF EXISTS functional_units")
    conn.execute("DROP TABLE IF EXISTS activity_fu_map")
    conn.commit()
    conn.close()

    store = SqlStore(db_path)
    try:
        with pytest.raises(DatasetLoadError) as excinfo:
            load_dataset_snapshot(store)
    finally:
        store.close()

    assert "functional_units" in str(excinfo.value)


def test_empty_optional_feedback_loops_is_allowed() -> None:
    class _NoFeedback:
        def __init__(self, inner: Any) -> None:
            self._inner = inner

        def __getattr__(self, name: str) -> Any:
            if name == "load_feedback_loops":
                return lambda: []
            return getattr(self._inner, name)

    snapshot = load_dataset_snapshot(_NoFeedback(CsvStore()))
    assert snapshot.feedback_loops == ()
