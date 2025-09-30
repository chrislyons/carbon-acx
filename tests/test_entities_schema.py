from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from calc import schema


CSV_HEADERS = {
    "entities.csv": "entity_id,name,type,parent_entity_id,notes",
    "sites.csv": "site_id,entity_id,name,region_code,lat,lon,notes",
    "assets.csv": "asset_id,site_id,asset_type,name,year,power_rating_kw,fuel_type,notes",
    "operations.csv": (
        "operation_id,asset_id,activity_id,functional_unit_id,utilization_basis,"
        "period_start,period_end,throughput_value,throughput_unit,notes"
    ),
    "activities.csv": "activity_id,layer_id,category,name,default_unit,description,unit_definition,notes",
}


@pytest.fixture()
def empty_registry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path
    for name, header in CSV_HEADERS.items():
        (data_dir / name).write_text(header + "\n", encoding="utf-8")
    monkeypatch.setattr(schema, "DATA_DIR", data_dir)
    schema.invalidate_caches()
    return data_dir


def test_loaders_accept_empty_csvs(empty_registry: Path) -> None:
    assert schema.load_entities() == []
    assert schema.load_sites() == []
    assert schema.load_assets() == []
    assert schema.load_operations() == []


def test_entity_type_enum_enforced(empty_registry: Path) -> None:
    (empty_registry / "entities.csv").write_text(
        "entity_id,name,type,parent_entity_id,notes\ncorp-1,Acme,invalid,,\n",
        encoding="utf-8",
    )
    schema.invalidate_caches()
    with pytest.raises(ValidationError):
        schema.load_entities()
