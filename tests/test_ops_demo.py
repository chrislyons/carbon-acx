from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from calc import schema
from calc.dal import CsvStore
from calc.derive import build_intensity_matrix


def test_demo_operation_integrity():
    schema.invalidate_caches()

    store = CsvStore()

    entities = {entity.entity_id: entity for entity in store.load_entities()}
    assert "ENTITY.COKE.CA" in entities
    entity = entities["ENTITY.COKE.CA"]
    assert entity.name == "Coca-Cola Canada"
    assert entity.type.value == "corporate"
    assert entity.notes == "Demo rows for comparison"

    sites = {site.site_id: site for site in store.load_sites()}
    assert "SITE.COKE.TO.DC01" in sites
    site = sites["SITE.COKE.TO.DC01"]
    assert site.entity_id == entity.entity_id
    assert site.notes == "Urban distribution center"

    assets = {asset.asset_id: asset for asset in store.load_assets()}
    assert "ASSET.COKE.TRUCK.C6.DIESEL.2023" in assets
    asset = assets["ASSET.COKE.TRUCK.C6.DIESEL.2023"]
    assert asset.site_id == site.site_id
    assert asset.name == "Class-6 Beverage Truck"
    assert asset.notes == "Demo spec only"

    operations = {operation.operation_id: operation for operation in store.load_operations()}
    assert "OP.COKE.DELIVERY.URBAN_2025" in operations
    operation = operations["OP.COKE.DELIVERY.URBAN_2025"]
    assert operation.asset_id == asset.asset_id
    assert operation.functional_unit_id == "FU.LITRE_DELIVERED"
    assert "route-km" in operation.notes

    activity_ids = {activity.activity_id for activity in store.load_activities()}
    assert operation.activity_id in activity_ids

    fixture_path = Path("tests/fixtures/ops_demo.json")
    fixture = json.loads(fixture_path.read_text())
    assert fixture["operation_id"] == operation.operation_id
    assert "route_km" in fixture["vars"]
    assert "cases_delivered" in fixture["vars"]

    # ensure schema loaders with validation also succeed for the demo rows
    assert any(e.entity_id == entity.entity_id for e in schema.load_entities())
    assert any(s.site_id == site.site_id for s in schema.load_sites())
    assert any(a.asset_id == asset.asset_id for a in schema.load_assets())
    assert any(o.operation_id == operation.operation_id for o in schema.load_operations())


def test_demo_operation_intensity_row(tmp_path):
    schema.invalidate_caches()

    store = CsvStore()
    operations = list(store.load_operations())
    assert operations

    fixture_path = Path("tests/fixtures/ops_demo.json")
    fixture = json.loads(fixture_path.read_text())
    vars_payload = fixture["vars"]

    df = build_intensity_matrix(
        ds=store,
        operations=operations,
        operation_variables={fixture["operation_id"]: vars_payload},
        output_dir=tmp_path,
    )

    subset = df[df["alt_id"] == fixture["operation_id"]]
    assert not subset.empty
    row = subset.iloc[0]
    assert row["functional_unit_id"] == "FU.LITRE_DELIVERED"
    assert row["record_type"] == "operation"
    assert row["alternative"] == fixture["operation_id"]
    assert isinstance(row["method_notes"], str) and "0.355" in row["method_notes"]

    csv_path = tmp_path / "intensity_matrix.csv"
    assert csv_path.exists()
    csv_df = pd.read_csv(csv_path)
    assert (csv_df["alt_id"] == fixture["operation_id"]).any()
    assert (csv_df["record_type"] == "operation").any()
