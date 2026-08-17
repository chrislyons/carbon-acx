from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

import pytest

from scripts.generate_web_calculator_data import (
    DEFAULT_CATALOG_OUTPUT,
    DEFAULT_OUTPUT,
    OWID_CONTEXT_OUTPUT,
    PUBLIC_DATA_ROOT,
    RELEASE_OUTPUT,
    SOURCES_OUTPUT,
    SOURCES_SCHEMA_VERSION,
    SCHEMA_VERSION,
    _all_authority_bytes,
    _authority_bytes,
    _commit_authorities,
    _factor_evidence,
    _grid_lookup,
    _load_csv,
    build_benchmarks,
    build_catalog_payload,
    build_owid_context_payload,
    build_payload,
)


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_generated_web_calculator_data_uses_published_evidence() -> None:
    payload = build_payload()

    assert SCHEMA_VERSION == "acx.web-calculator/1-5-0"
    assert payload["schemaVersion"] == SCHEMA_VERSION
    assert len(payload["activities"]) == 21
    car = payload["activities"][0]
    assert car["id"] == "TRAN.SCHOOLRUN.CAR.KM"
    assert car["evidence"]["publicationStatus"] == "published"
    assert car["evidence"]["emissionFactorId"] == "EF.CAR.KM"
    assert car["evidence"]["region"] == "CA-ON"
    assert car["evidence"]["scopeBoundary"] == "WTT+TTW"
    assert car["evidence"]["gwpHorizon"] == "GWP100 (AR6)"
    assert car["evidence"]["vintageYear"] == 2023
    assert car["evidence"]["sourceCitations"]
    assert car["evidence"]["sourceUrls"]
    assert car["unitDefinition"] == ""
    assert car["notes"] == "Passengers default to one when unspecified."
    assert all(
        activity["evidence"]["publicationStatus"] == "published"
        and "SRC.DEMO" not in activity["evidence"]["sourceIds"]
        for activity in payload["activities"]
    )


def test_calculator_generation_requires_source_ledger(tmp_path: Path) -> None:
    shutil.copytree(REPO_ROOT / "data", tmp_path / "data")

    with pytest.raises(ValueError, match="Source ledger evidence is incomplete"):
        build_payload(tmp_path)


def test_ai_scenarios_are_typed_and_not_calculator_factors() -> None:
    payload = build_catalog_payload()

    scenarios = payload["aiScenarios"]
    assert scenarios["schemaVersion"] == "acx.ai-scenarios/1-0-0"
    assert len(scenarios["records"]) == 28
    assert {record["publicationStatus"] for record in scenarios["records"]} >= {
        "published",
        "estimate",
        "unavailable",
    }
    google = next(
        record
        for record in scenarios["records"]
        if record["scenarioId"] == "SCN.GOOGLE.GEMINI.APPS.PROMPT.2025"
    )
    assert google["functionalUnit"] == "prompt"
    assert google["energyWh"] == 0.24
    assert google["carbonAccounting"]["method"] == "direct-disclosure"
    assert google["sourceRefs"][0]["sourceId"] == "SRC.ELSWORTH.GOOGLE.2025"

    calculator_ids = {activity["id"] for activity in build_payload()["activities"]}
    assert "AI.USAGE.GPT.QUERY" not in calculator_ids
    for activity_id in (
        "AI.LLM.INFER.1K_TOKENS.GENERIC",
        "AI.USAGE.GPT.QUERY",
        "AI.USAGE.ANTHROPIC.QUERY",
        "AI.USAGE.GOOGLE.QUERY",
        "AI.IMAGE.GENERATION.PROMPT",
    ):
        activity = next(item for item in payload["activities"] if item["id"] == activity_id)
        assert activity["emissionFactor"] is None
        assert activity["evidence"]["publicationStatus"] == "unavailable"


def test_sources_use_versioned_envelope_and_grid_metadata_aligns() -> None:
    sources = json.loads(
        (REPO_ROOT / "apps/carbon-acx-web/src/generated/sources.json").read_text(encoding="utf-8")
    )
    assert SOURCES_SCHEMA_VERSION == "acx.web-sources/1-0-0"
    assert sources["schemaVersion"] == SOURCES_SCHEMA_VERSION
    assert isinstance(sources["sources"], list)

    payload = build_payload()
    subway = next(
        activity for activity in payload["activities"] if activity["id"] == "TRAN.TTC.SUBWAY.KM"
    )
    evidence = subway["evidence"]
    assert (
        len(evidence["sourceIds"])
        == len(evidence["sourceCitations"])
        == len(evidence["sourceUrls"])
        == 2
    )
    assert all(evidence["sourceUrls"])


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
    assert stream["evidence"]["sourceUrls"] == []
    assert stream["unavailabilityReason"]


def test_missing_source_url_is_hard_failure_for_selected_factor() -> None:
    activities = {row["activity_id"]: row for row in _load_csv(REPO_ROOT / "data/activities.csv")}
    factors = _load_csv(REPO_ROOT / "data/emission_factors.csv")
    sources = {row["source_id"]: row for row in _load_csv(REPO_ROOT / "data/sources.csv")}
    grids = _grid_lookup(_load_csv(REPO_ROOT / "data/grid_intensity.csv"))
    factor = next(row.copy() for row in factors if row["ef_id"] == "EF.CAR.KM")
    sources["SRC.ECCC.NIR.2025"]["url"] = ""

    with pytest.raises(ValueError, match="Missing registered source URL"):
        _factor_evidence(activities["TRAN.SCHOOLRUN.CAR.KM"], factor, sources, grids)


def test_catalog_missing_source_url_is_unavailable_without_zero(tmp_path: Path) -> None:
    shutil.copytree(REPO_ROOT / "data", tmp_path / "data")
    shutil.copytree(REPO_ROOT / "refs", tmp_path / "refs")
    source_path = tmp_path / "data/sources.csv"
    fieldnames = ["source_id", "ieee_citation", "url", "year", "license", "review_due_at"]
    with source_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        if row["source_id"] == "SRC.IEA.NRCAN.BUILDINGS.2024":
            row["url"] = ""
    with source_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    payload = build_catalog_payload(tmp_path)
    office = next(
        activity
        for activity in payload["activities"]
        if activity["id"] == "BUILDING.OFFICE.M2.YEAR"
    )
    assert office["evidence"]["publicationStatus"] == "unavailable"
    assert office["emissionFactor"] is None
    assert office["unavailabilityReason"]


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

    factor["method_notes"] = ""
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
    assert benchmark["sourceUrl"]
    assert benchmark["populationSourceUrl"]
    assert benchmark["accountingBasis"] == "territorial"
    assert benchmark["landUseChange"] == "excluded"
    assert benchmark["year"] == 2023


def test_generated_web_calculator_data_carries_provincial_benchmarks() -> None:
    benchmarks = build_payload()["benchmarks"]
    assert benchmarks["canadian_average"]["scope"] == "national"
    provinces = {key: b for key, b in benchmarks.items() if b.get("scope") == "province"}
    assert len(provinces) >= 5
    for key, benchmark in provinces.items():
        assert benchmark["sourceId"], f"{key} missing emissions source"
        assert benchmark["populationSourceId"], f"{key} missing population source"
        assert benchmark["sourceCitation"] and benchmark["populationCitation"]
        assert benchmark["sourceUrl"] and benchmark["populationSourceUrl"]
        assert benchmark["accountingBasis"] == "territorial"
        assert benchmark["landUseChange"] == "excluded"
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
    shutil.copy(REPO_ROOT / "data/benchmarks.csv", data_dir / "benchmarks.csv")
    benchmark_path = data_dir / "benchmarks.csv"
    benchmark_path.write_text(
        benchmark_path.read_text(encoding="utf-8").replace(",17.3,2023,", ",99,2023,", 1),
        encoding="utf-8",
    )
    sources = {row["source_id"]: row for row in _load_csv(REPO_ROOT / "data/sources.csv")}

    with pytest.raises(ValueError, match="disagrees with derived"):
        build_benchmarks(tmp_path, sources)


def test_owid_context_is_pinned_and_sorted() -> None:
    context = build_owid_context_payload(REPO_ROOT)

    assert context["schemaVersion"] == "acx.owid-context/1-0-0"
    assert context["status"] == "available"
    assert context["selection"] == {"entity": "Canada", "code": "CAN"}
    assert context["basis"] == {
        "accountingBasis": "territorial",
        "gas": "CO₂",
        "landUseChange": "excluded",
        "geography": "country production",
        "unit": "tonnes",
    }
    assert (
        context["source"]["chartUrl"]
        == "https://ourworldindata.org/grapher/annual-co2-emissions-per-country"
    )
    years = [point["year"] for point in context["points"]]
    assert years == sorted(years)
    assert len(years) > 1
    assert context["source"]["dataSha256"]
    assert context["source"]["metadataSha256"]


def test_missing_owid_snapshot_emits_explicit_unavailable_context(tmp_path: Path) -> None:
    context = build_owid_context_payload(tmp_path)

    assert context["status"] == "unavailable"
    assert context["source"] is None
    assert context["basis"] is None
    assert context["points"] == []
    assert context["reason"]


def test_partial_owid_snapshot_fails_generation(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "data/owid"
    snapshot_dir.mkdir(parents=True)
    (snapshot_dir / "manifest.json").write_text("{}", encoding="utf-8")

    with pytest.raises(ValueError, match="partial"):
        build_owid_context_payload(tmp_path)


def test_owid_raw_digest_mismatch_fails_generation(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "data/owid"
    snapshot_dir.mkdir(parents=True)
    for filename in (
        "manifest.json",
        "annual-co2-emissions-per-country.csv",
        "annual-co2-emissions-per-country.metadata.json",
    ):
        shutil.copy(REPO_ROOT / "data/owid" / filename, snapshot_dir / filename)
    data_path = snapshot_dir / "annual-co2-emissions-per-country.csv"
    data_path.write_bytes(data_path.read_bytes() + b"\n")

    with pytest.raises(ValueError, match="raw data digest"):
        build_owid_context_payload(tmp_path)


def test_release_authorities_keep_public_pairs_byte_identical() -> None:
    authorities, remove_paths = _all_authority_bytes(REPO_ROOT, "2026-08-04T22:15:00+00:00")

    assert remove_paths == ()
    assert authorities[DEFAULT_OUTPUT] == authorities[PUBLIC_DATA_ROOT / "calculator-data.json"]
    assert (
        authorities[DEFAULT_CATALOG_OUTPUT] == authorities[PUBLIC_DATA_ROOT / "catalog-data.json"]
    )
    assert authorities[SOURCES_OUTPUT] == authorities[PUBLIC_DATA_ROOT / "sources.json"]
    assert authorities[OWID_CONTEXT_OUTPUT] == authorities[PUBLIC_DATA_ROOT / "owid-context.json"]
    assert authorities[RELEASE_OUTPUT] == authorities[PUBLIC_DATA_ROOT / "release.json"]
    release = json.loads(authorities[RELEASE_OUTPUT])
    assert set(release["owid"]["rawAuthorities"]) == {
        "manifest.json",
        "annual-co2-emissions-per-country.csv",
        "annual-co2-emissions-per-country.metadata.json",
    }


def test_changing_only_owid_snapshot_bytes_preserves_acx_authorities(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    required_paths = [
        "data/activities.csv",
        "data/ai_scenarios.csv",
        "data/benchmarks.csv",
        "data/emission_factors.csv",
        "data/grid_intensity.csv",
        "data/sources.csv",
        "data/source_decisions.csv",
        "data/owid/annual-co2-emissions-per-country.csv",
        "data/owid/annual-co2-emissions-per-country.metadata.json",
        "data/owid/manifest.json",
        "refs/sources_manifest.csv",
        "scripts/generate_web_calculator_data.py",
    ]
    for relative_path in required_paths:
        destination = repo_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(REPO_ROOT / relative_path, destination)

    before, _ = _all_authority_bytes(repo_root, "2026-08-04T22:15:00+00:00")
    manifest_path = repo_root / "data/owid/manifest.json"
    manifest = json.loads(manifest_path.read_bytes())
    manifest["retrievedAt"] = "2026-08-05T00:00:00+00:00"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    after, _ = _all_authority_bytes(repo_root, "2026-08-04T22:15:00+00:00")

    assert before[DEFAULT_OUTPUT] == after[DEFAULT_OUTPUT]
    assert before[DEFAULT_CATALOG_OUTPUT] == after[DEFAULT_CATALOG_OUTPUT]
    assert before[SOURCES_OUTPUT] == after[SOURCES_OUTPUT]
    assert before[OWID_CONTEXT_OUTPUT] != after[OWID_CONTEXT_OUTPUT]
    assert before[RELEASE_OUTPUT] != after[RELEASE_OUTPUT]


def test_unavailable_release_removes_stale_public_owid_files(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    for relative_path in (
        "data/activities.csv",
        "data/ai_scenarios.csv",
        "data/benchmarks.csv",
        "data/emission_factors.csv",
        "data/grid_intensity.csv",
        "data/sources.csv",
        "data/source_decisions.csv",
        "refs/sources_manifest.csv",
        "scripts/generate_web_calculator_data.py",
    ):
        destination = repo_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(REPO_ROOT / relative_path, destination)

    output_root = tmp_path / "output"
    stale_root = output_root / PUBLIC_DATA_ROOT / "owid"
    stale_root.mkdir(parents=True)
    for filename in ("manifest.json", "annual-co2-emissions-per-country.csv"):
        (stale_root / filename).write_text("stale", encoding="utf-8")

    authorities, remove_paths = _all_authority_bytes(repo_root, "2026-08-04T22:15:00+00:00")
    _commit_authorities(output_root, authorities, remove_paths)
    context = json.loads((output_root / OWID_CONTEXT_OUTPUT).read_bytes())
    release = json.loads((output_root / RELEASE_OUTPUT).read_bytes())

    assert context["status"] == "unavailable"
    assert release["owid"]["status"] == "unavailable"
    assert release["owid"]["sourceManifestPath"] is None
    assert not any((output_root / path).exists() for path in remove_paths)


def test_atomic_authority_commit_rolls_back_on_replacement_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    output_root = tmp_path / "output"
    before = {}
    for relative_path in (DEFAULT_OUTPUT, DEFAULT_CATALOG_OUTPUT, SOURCES_OUTPUT):
        destination = output_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        content = f"before:{relative_path}".encode()
        destination.write_bytes(content)
        before[relative_path] = content

    authorities = _authority_bytes(REPO_ROOT, "2026-08-04T22:15:00+00:00")
    from scripts import generate_web_calculator_data as generator

    original_replace = generator._replace_file
    calls = 0

    def fail_on_second_replace(source: Path, destination: Path) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("injected replacement failure")
        original_replace(source, destination)

    monkeypatch.setattr(generator, "_replace_file", fail_on_second_replace)
    with pytest.raises(OSError, match="injected replacement failure"):
        _commit_authorities(output_root, authorities)

    for relative_path, content in before.items():
        assert (output_root / relative_path).read_bytes() == content
