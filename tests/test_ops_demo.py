from __future__ import annotations

import json
from pathlib import Path

from calc import schema
from calc.dal import CsvStore


def test_demo_operation_integrity():
    schema.invalidate_caches()

    store = CsvStore()

    entities = {entity.entity_id: entity for entity in store.load_entities()}
    assert "ENTITY.COKE.CA" in entities
    entity = entities["ENTITY.COKE.CA"]
    assert entity.name == "Coca-Cola Canada"
    assert entity.type.value == "corporate"

    sites = {site.site_id: site for site in store.load_sites()}
    assert "SITE.COKE.TO.DC01" in sites
    site = sites["SITE.COKE.TO.DC01"]
    assert site.entity_id == entity.entity_id

    assets = {asset.asset_id: asset for asset in store.load_assets()}
    assert "ASSET.COKE.TRUCK.C6.DIESEL.2023" in assets
    asset = assets["ASSET.COKE.TRUCK.C6.DIESEL.2023"]
    assert asset.site_id == site.site_id

    operations = {operation.operation_id: operation for operation in store.load_operations()}
    assert "OP.COKE.DELIVERY.URBAN_2025" in operations
    operation = operations["OP.COKE.DELIVERY.URBAN_2025"]
    assert operation.asset_id == asset.asset_id
    assert operation.functional_unit_id == "FU.LITRE_DELIVERED"

    activity_ids = {activity.activity_id for activity in store.load_activities()}
    assert operation.activity_id in activity_ids

    fixture_path = Path("tests/fixtures/ops_demo.json")
    fixture = json.loads(fixture_path.read_text())
    assert fixture["operation_id"] == operation.operation_id
    assert set(fixture["vars"].keys()) == {"route_km", "cases_delivered"}

    # ensure schema loaders with validation also succeed for the demo rows
    assert any(e.entity_id == entity.entity_id for e in schema.load_entities())
    assert any(s.site_id == site.site_id for s in schema.load_sites())
    assert any(a.asset_id == asset.asset_id for a in schema.load_assets())
    assert any(o.operation_id == operation.operation_id for o in schema.load_operations())
