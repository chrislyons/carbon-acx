from __future__ import annotations

from scripts.generate_web_calculator_data import SCHEMA_VERSION, build_payload


def test_generated_web_calculator_data_uses_canonical_ids() -> None:
    payload = build_payload()

    assert payload["schemaVersion"] == SCHEMA_VERSION
    assert len(payload["activities"]) == 22
    assert payload["activities"][0]["id"] == "TRAN.SCHOOLRUN.CAR.KM"


def test_generated_web_calculator_data_resolves_grid_indexed_values() -> None:
    payload = build_payload()
    lookup = {activity["id"]: activity for activity in payload["activities"]}

    subway = lookup["TRAN.TTC.SUBWAY.KM"]
    assert subway["emissionFactor"] > 0
    assert subway["provenance"]["gridIntensityRegion"] == "CA-ON"
