import os
from pathlib import Path

import pandas as pd
from pydantic import BaseModel

from calc import schema


class DummyModel(BaseModel):
    name: str


def test_load_csv_uses_cached_frame(tmp_path, monkeypatch):
    schema._csv_cache.clear()
    csv_path = tmp_path / "dummy.csv"
    csv_path.write_text("name\nfoo\n", encoding="utf-8")

    original_read_csv = pd.read_csv
    read_calls: list[Path] = []

    def traced_read_csv(path, dtype=None):
        read_calls.append(Path(path))
        return original_read_csv(path, dtype=dtype)

    monkeypatch.setattr(schema.pd, "read_csv", traced_read_csv)

    first = schema._load_csv(csv_path, DummyModel)
    assert len(read_calls) == 1
    second = schema._load_csv(csv_path, DummyModel)
    assert len(read_calls) == 1
    assert first == second

    csv_path.write_text("name\nbar\n", encoding="utf-8")
    current_ns = csv_path.stat().st_mtime_ns
    os.utime(csv_path, ns=(current_ns + 1, current_ns + 1))

    updated = schema._load_csv(csv_path, DummyModel)
    assert len(read_calls) == 2
    assert [item.name for item in updated] == ["bar"]
