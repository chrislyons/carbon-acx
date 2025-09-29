from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from calc import derive
from calc.dal import CsvStore, SqlStore
from scripts.import_csv_to_db import import_csv_to_db

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


@pytest.fixture(scope="module")
def sqlite_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("parity-db") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)
    return db_path


def _collect_json_outputs(root: Path) -> dict[str, dict]:
    output_dir = root / "calc" / "outputs"
    payloads: dict[str, dict] = {}
    for path in sorted(output_dir.glob("*.json")):
        payloads[path.name] = json.loads(path.read_text(encoding="utf-8"))
    return payloads


def test_csv_and_sql_outputs_match(
    sqlite_db: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ACX_ALLOW_OUTPUT_RM", "1")
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")
    csv_root = tmp_path / "csv"
    db_root = tmp_path / "db"

    derive.export_view(CsvStore(), output_root=csv_root)

    sql_store = SqlStore(sqlite_db)
    try:
        derive.export_view(sql_store, output_root=db_root)
    finally:
        sql_store.close()

    csv_payloads = _collect_json_outputs(csv_root)
    db_payloads = _collect_json_outputs(db_root)

    assert set(csv_payloads) == set(db_payloads)
    for name in sorted(csv_payloads):
        assert db_payloads[name] == csv_payloads[name]
