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


def test_generated_web_calculator_data_carries_sourced_benchmark() -> None:
    payload = build_payload()
    benchmark = payload["benchmarks"]["canadian_average"]

    # The comparison baseline must be verifiable: value, vintage, and citation.
    assert benchmark["perCapitaTonnes"] > 0
    assert benchmark["annualGrams"] == round(benchmark["perCapitaTonnes"] * 1_000_000)
    assert benchmark["sourceId"], "benchmark must name its source"
    assert benchmark["sourceCitation"], "benchmark must carry an IEEE citation"
    assert isinstance(benchmark["year"], int)
