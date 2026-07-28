from __future__ import annotations

from pathlib import Path

import pytest

from scripts.generate_web_calculator_data import (
    SCHEMA_VERSION,
    _factor_evidence,
    _grid_lookup,
    _load_csv,
    build_benchmarks,
    build_catalog_payload,
    build_payload,
)


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_generated_web_calculator_data_uses_published_evidence() -> None:
    payload = build_payload()

    assert payload["schemaVersion"] == SCHEMA_VERSION
    assert len(payload["activities"]) == 22
    car = payload["activities"][0]
    assert car["id"] == "TRAN.SCHOOLRUN.CAR.KM"
    assert car["evidence"]["publicationStatus"] == "published"
    assert car["evidence"]["emissionFactorId"] == "EF.CAR.KM"
    assert car["evidence"]["region"] == "CA-ON"
    assert car["evidence"]["scopeBoundary"] == "WTT+TTW"
    assert car["evidence"]["gwpHorizon"] == "GWP100 (AR6)"
    assert car["evidence"]["vintageYear"] == 2023
    assert car["evidence"]["sourceCitations"]
    assert all(
        activity["evidence"]["publicationStatus"] == "published"
        and "SRC.DEMO" not in activity["evidence"]["sourceIds"]
        for activity in payload["activities"]
    )


def test_generated_web_calculator_data_propagates_grid_factor_ranges() -> None:
    payload = build_payload()
    lookup = {activity["id"]: activity for activity in payload["activities"]}

    subway = lookup["TRAN.TTC.SUBWAY.KM"]
    assert subway["emissionFactor"] > 0
    assert len(subway["evidence"]["sourceIds"]) == 2
    assert subway["evidence"]["uncertainty"]["lowGPerUnit"] is not None
    assert subway["evidence"]["uncertainty"]["highGPerUnit"] is not None


def test_catalog_marks_incomplete_activity_unavailable_without_zero() -> None:
    payload = build_catalog_payload()
    unavailable = [
        activity
        for activity in payload["activities"]
        if activity["evidence"]["publicationStatus"] == "unavailable"
    ]

    assert unavailable
    assert all(activity["emissionFactor"] is None for activity in unavailable)
    assert all(activity["unavailabilityReason"] for activity in unavailable)
    stream = next(activity for activity in payload["activities"] if activity["id"] == "stream")
    assert stream["emissionFactor"] is None
    assert stream["evidence"]["publicationStatus"] == "unavailable"
    assert stream["unavailabilityReason"]


def test_demo_and_missing_citations_are_rejected() -> None:
    activities = {row["activity_id"]: row for row in _load_csv(REPO_ROOT / "data/activities.csv")}
    factors = _load_csv(REPO_ROOT / "data/emission_factors.csv")
    sources = {row["source_id"]: row for row in _load_csv(REPO_ROOT / "data/sources.csv")}
    grids = _grid_lookup(_load_csv(REPO_ROOT / "data/grid_intensity.csv"))
    activity = activities["TRAN.SCHOOLRUN.CAR.KM"]
    factor = next(row.copy() for row in factors if row["ef_id"] == "EF.CAR.KM")

    factor["source_id"] = "SRC.DEMO"
    with pytest.raises(ValueError, match="SRC.DEMO"):
        _factor_evidence(activity, factor, sources, grids)

    factor["ef_id"] = "EF.DEMO.TEST"
    factor["source_id"] = "SRC.EPA.GHG.2024"
    with pytest.raises(ValueError, match="Demonstration factor is not publishable: EF.DEMO.TEST"):
        _factor_evidence(activity, factor, sources, grids)

    factor["ef_id"] = "EF.CAR.KM"
    factor["method_notes"] = "Demonstration only"
    with pytest.raises(ValueError, match="Demonstration factor is not publishable: EF.CAR.KM"):
        _factor_evidence(activity, factor, sources, grids)

    factor["source_id"] = "SRC.NOT.REGISTERED"
    with pytest.raises(ValueError, match="Missing registered IEEE citation"):
        _factor_evidence(activity, factor, sources, grids)


def test_generated_web_calculator_data_carries_sourced_benchmark() -> None:
    payload = build_payload()
    benchmark = payload["benchmarks"]["canadian_average"]

    assert benchmark["perCapitaTonnes"] > 0
    assert benchmark["annualGrams"] == round(benchmark["perCapitaTonnes"] * 1_000_000)
    assert benchmark["sourceId"]
    assert benchmark["sourceCitation"]
    assert isinstance(benchmark["year"], int)


def test_generated_web_calculator_data_carries_provincial_benchmarks() -> None:
    benchmarks = build_payload()["benchmarks"]
    assert benchmarks["canadian_average"]["scope"] == "national"
    provinces = {key: b for key, b in benchmarks.items() if b.get("scope") == "province"}
    assert len(provinces) >= 5
    for key, benchmark in provinces.items():
        assert benchmark["sourceId"], f"{key} missing emissions source"
        assert benchmark["populationSourceId"], f"{key} missing population source"
        assert benchmark["sourceCitation"] and benchmark["populationCitation"]
        assert (
            abs(
                benchmark["totalMt"] / benchmark["populationMillions"]
                - benchmark["perCapitaTonnes"]
            )
            <= 0.15
        )


def test_benchmark_derivation_is_enforced(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "benchmarks.csv").write_text(
        "key,label,scope,region_code,total_mt,population_millions,"
        "per_capita_tonnes,year,source_id,population_source_id,notes\n"
        "x,X,province,X,100,10,99,2023,SRC.X,SRC.P,\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="disagrees with derived"):
        build_benchmarks(tmp_path, {})
