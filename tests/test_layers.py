from __future__ import annotations

import csv
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _read_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


def _normalise(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def test_layers_exist_and_are_referenced() -> None:
    layers = _read_csv("layers.csv")
    assert layers, "layers.csv must not be empty"

    layer_ids = {_normalise(row.get("layer_id")) for row in layers if _normalise(row.get("layer_id"))}
    assert layer_ids, "layers.csv must define at least one layer_id"

    datasets = (
        ("activities.csv", "activity_id"),
        ("operations.csv", "operation_id"),
    )
    for filename, key_field in datasets:
        records = _read_csv(filename)
        assert records, f"{filename} must not be empty"
        for index, row in enumerate(records, start=2):
            layer_id = _normalise(row.get("layer_id"))
            identifier = _normalise(row.get(key_field)) or f"row {index}"
            assert layer_id, f"{filename} {identifier} missing layer_id"
            assert (
                layer_id in layer_ids
            ), f"{filename} {identifier} references unknown layer_id {layer_id}"
