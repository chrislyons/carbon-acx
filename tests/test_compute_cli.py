from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from calc.dal_sql import SqlStore
from calc.service import compute_profile
from scripts import import_csv_to_db


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


@pytest.fixture()
def sqlite_db(tmp_path: Path) -> Path:
    db_path = tmp_path / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db.import_csv_to_db(db_path, DATA_DIR)
    return db_path


def test_compute_cli_matches_compute_profile(
    sqlite_db: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")

    store = SqlStore(sqlite_db)
    try:
        expected = compute_profile(
            "PRO.TO.24_39.HYBRID.2025",
            overrides={"FOOD.COFFEE.CUP.HOT": 12.5},
            datastore=store,
        )
    finally:
        store.close()

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "calc.compute_cli",
            "--backend",
            "sqlite",
            "--db",
            str(sqlite_db),
            "--profile-id",
            "PRO.TO.24_39.HYBRID.2025",
            "--overrides-json",
            '{"FOOD.COFFEE.CUP.HOT": 12.5}',
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    payload = json.loads(completed.stdout)
    assert payload == expected
