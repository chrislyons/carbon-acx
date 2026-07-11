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


def test_generated_web_calculator_data_carries_provincial_benchmarks() -> None:
    payload = build_payload()
    benchmarks = payload["benchmarks"]

    # National + provincial baselines are present.
    assert benchmarks["canadian_average"]["scope"] == "national"
    provinces = {key: b for key, b in benchmarks.items() if b.get("scope") == "province"}
    assert len(provinces) >= 5, "expected multiple provincial baselines"

    for key, b in provinces.items():
        # Every provincial figure carries emissions + population provenance and a
        # derivation that ties out (per-capita == total / population).
        assert b["sourceId"], f"{key} missing emissions source"
        assert b["populationSourceId"], f"{key} missing population source"
        assert b["sourceCitation"] and b["populationCitation"]
        derived = b["totalMt"] / b["populationMillions"]
        assert (
            abs(derived - b["perCapitaTonnes"]) <= 0.15
        ), f"{key}: per-capita {b['perCapitaTonnes']} != derived {derived:.2f}"


def test_benchmark_derivation_is_enforced(tmp_path) -> None:
    """A per-capita that disagrees with total/population must fail the build."""
    import pytest

    from scripts.generate_web_calculator_data import build_benchmarks

    header = (
        "key,label,scope,region_code,total_mt,population_millions,"
        "per_capita_tonnes,year,source_id,population_source_id,notes\n"
    )
    # 100 Mt / 10 M = 10 t, but per_capita claims 99 → build must reject it.
    bad_row = "x,X,province,X,100,10,99,2023,SRC.X,SRC.P,\n"

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "benchmarks.csv").write_text(header + bad_row, encoding="utf-8")

    with pytest.raises(ValueError, match="disagrees with derived"):
        build_benchmarks(tmp_path, {})
