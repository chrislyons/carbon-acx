"""Selection-policy regressions: determinism and cross-surface agreement.

These tests pin the shared factor and grid-vintage policy introduced in
``calc.selection``. Web has no profile schedule context, so it uses the
selected factor's region; derive/service use an explicit schedule/profile
region when one exists and otherwise fall back to the factor region.
"""

from __future__ import annotations

import json
import math
import sqlite3
from collections import defaultdict
from pathlib import Path

import pytest

from calc import api
from calc.dal import CsvStore, SqlStore
from calc.dataset import load_dataset_snapshot
from calc.derive import export_view
from calc.derive.emissions import (
    build_grid_intensity_lookup,
    group_factors_by_activity,
    resolve_grid_region,
    resolve_grid_row,
    select_activity_factor,
)
from calc.schema import GridIntensity, RegionCode
from calc.selection import (
    FactorCandidate,
    GridCandidate,
    grid_row_id,
    select_emission_factor,
    select_grid_row,
)
from scripts.generate_web_calculator_data import (
    SCENARIO_BACKED_ACTIVITIES,
    SELECTED_ACTIVITIES,
    build_payload,
)
from scripts.import_csv_to_db import import_csv_to_db

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
SCHEMA_PATH = REPO_ROOT / "db" / "schema.sql"


def test_factor_selection_is_region_aware_and_order_independent() -> None:
    candidates = [
        FactorCandidate(region="CA-QC", vintage_year=2024, ef_id="EF.QC", payload="qc"),
        FactorCandidate(region="CA-ON", vintage_year=2022, ef_id="EF.ON", payload="on"),
        FactorCandidate(region="GLOBAL", vintage_year=2025, ef_id="EF.GLOBAL", payload="global"),
    ]

    # Baseline preference wins over vintage: CA-ON beats a newer GLOBAL row.
    assert select_emission_factor(candidates).payload == "on"
    # A supplied preferred region takes precedence over the baseline.
    assert select_emission_factor(candidates, preferred_region="CA-QC").payload == "qc"
    # Input order never changes the outcome.
    assert select_emission_factor(list(reversed(candidates))).payload == "on"
    assert (
        select_emission_factor(list(reversed(candidates)), preferred_region="CA-QC").payload == "qc"
    )


def test_factor_selection_breaks_ties_on_stable_id() -> None:
    candidates = [
        FactorCandidate(region="CA-ON", vintage_year=2024, ef_id="EF.Z", payload="z"),
        FactorCandidate(region="CA-ON", vintage_year=2024, ef_id="EF.A", payload="a"),
    ]
    assert select_emission_factor(candidates).payload == "a"
    assert select_emission_factor(list(reversed(candidates))).payload == "a"


def test_grid_selection_follows_factor_vintage_and_order() -> None:
    rows = [
        GridCandidate(region="CA-ON", vintage_year=2025, source_id="S2025", payload=2025),
        GridCandidate(region="CA-ON", vintage_year=2022, source_id="S2022", payload=2022),
        GridCandidate(region="CA-ON", vintage_year=2024, source_id="S2024", payload=2024),
    ]

    # Exact match on the requested vintage.
    assert select_grid_row(rows, region="CA-ON", vintage_year=2024).payload == 2024
    # Latest older row when the exact vintage is absent.
    assert select_grid_row(rows, region="CA-ON", vintage_year=2023).payload == 2022
    # Latest available row when no older row exists.
    assert select_grid_row(rows, region="CA-ON", vintage_year=2021).payload == 2025
    # No vintage request selects the latest available.
    assert select_grid_row(rows, region="CA-ON").payload == 2025
    # Region filter is exact and order independent.
    assert select_grid_row(list(reversed(rows)), region="CA-ON", vintage_year=2024).payload == 2024
    assert select_grid_row(rows, region="CA-QC", vintage_year=2024) is None


def test_resolve_grid_region_prefers_schedule_then_profile_then_factor() -> None:
    class _Sched:
        region_override = RegionCode.CA_AB
        mix_region = None
        use_canada_average = None

    class _Profile:
        default_grid_region = RegionCode.CA_QC

    assert resolve_grid_region(_Sched(), _Profile(), RegionCode.CA_ON) == RegionCode.CA_AB

    class _SchedNoOverride(_Sched):
        region_override = None

    assert resolve_grid_region(_SchedNoOverride(), _Profile(), RegionCode.CA_ON) == RegionCode.CA_QC

    class _ProfileNoRegion(_Profile):
        default_grid_region = None

    assert resolve_grid_region(_SchedNoOverride(), _ProfileNoRegion(), "CA-ON") == "CA-ON"


def test_grid_intensity_lookup_exposes_enum_and_string_keys() -> None:
    rows = [
        GridIntensity(region="CA-ON", g_per_kwh=28, vintage_year=2024),
        GridIntensity(region="CA-ON", g_per_kwh=27, vintage_year=2025),
    ]
    lookup = build_grid_intensity_lookup(rows)

    # Latest available wins deterministically regardless of input order.
    assert lookup["CA-ON"] == 27
    assert lookup[RegionCode.CA_ON] == 27
    assert build_grid_intensity_lookup(list(reversed(rows)))["CA-ON"] == 27


@pytest.fixture(scope="module")
def sqlite_store(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("selection-parity-db") / "acx.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.close()
    import_csv_to_db(db_path, DATA_DIR)
    return db_path


def _selection_signature(snapshot) -> dict[str, dict[str, object]]:
    groups = group_factors_by_activity(snapshot.emission_factors)
    grid_candidates = [
        GridCandidate(
            region=row.region,
            vintage_year=row.vintage_year,
            source_id=row.source_id,
            payload=row,
        )
        for row in snapshot.grid_intensity
    ]
    signature: dict[str, dict[str, object]] = {}
    for activity_id, factors in groups.items():
        factor = select_activity_factor(factors)
        if factor is None:
            continue
        grid_id: str | None = None
        if factor.is_grid_indexed:
            row = select_grid_row(
                grid_candidates, region=factor.region, vintage_year=factor.vintage_year
            )
            if row is not None:
                grid_id = grid_row_id(row.region, row.vintage_year)
        signature[activity_id] = {
            "ef_id": factor.ef_id,
            "grid_row_id": grid_id,
        }
    return signature


def test_csv_and_sql_snapshots_select_identical_rows(sqlite_store: Path) -> None:
    csv_snapshot = load_dataset_snapshot(CsvStore())
    store = SqlStore(sqlite_store)
    try:
        sql_snapshot = load_dataset_snapshot(store)
    finally:
        store.close()

    assert _selection_signature(csv_snapshot) == _selection_signature(sql_snapshot)


def test_web_and_derive_agree_on_curated_activity_selection() -> None:
    payload = build_payload(generated_at="2026-08-25T00:00:00+00:00")
    web = {activity["id"]: activity["evidence"] for activity in payload["activities"]}

    snapshot = load_dataset_snapshot(CsvStore())
    groups = group_factors_by_activity(snapshot.emission_factors)
    profiles = {profile.profile_id: profile for profile in snapshot.profiles}
    schedules_by_activity: dict[str, list] = defaultdict(list)
    for sched in snapshot.activity_schedule:
        schedules_by_activity[sched.activity_id].append(sched)
    grid_rows = list(snapshot.grid_intensity)

    checked = 0
    for _, activity_id in SELECTED_ACTIVITIES:
        if activity_id in SCENARIO_BACKED_ACTIVITIES:
            continue
        evidence = web[activity_id]
        schedules = schedules_by_activity.get(activity_id)
        if not schedules:
            continue
        for sched in schedules:
            profile = profiles.get(sched.profile_id)
            preferred_region = resolve_grid_region(sched, profile)
            factor = select_activity_factor(
                groups.get(activity_id, ()), preferred_region=preferred_region
            )
            assert factor is not None
            assert factor.ef_id == evidence["emissionFactorId"]
            region_value = getattr(preferred_region, "value", preferred_region)
            factor_region = getattr(factor.region, "value", factor.region)
            if factor.is_grid_indexed:
                row = resolve_grid_row(
                    sched,
                    profile,
                    grid_rows,
                    preferred_region=factor.region,
                    vintage_year=factor.vintage_year,
                )
                assert row is not None
                selected_grid_id = grid_row_id(row.region, row.vintage_year)
                if region_value == factor_region:
                    assert selected_grid_id == evidence["gridRowId"]
                else:
                    assert selected_grid_id != evidence["gridRowId"]
                    assert row.vintage_year == factor.vintage_year
                checked += 1
    assert checked, "expected at least one grid-indexed curated activity to verify"


def test_web_evidence_records_grid_and_quality_provenance() -> None:
    payload = build_payload(generated_at="2026-08-25T00:00:00+00:00")
    required = (
        "gridRowId",
        "gridRegion",
        "gridVintageYear",
        "evidenceType",
        "qualityGrade",
        "applicabilityBoundary",
        "uncertaintyStatus",
        "uncertaintyReason",
        "claimLocator",
    )
    for activity in payload["activities"]:
        evidence = activity["evidence"]
        for key in required:
            assert key in evidence, f"{activity['id']} evidence missing {key}"

    subway = next(
        activity for activity in payload["activities"] if activity["id"] == "TRAN.TTC.SUBWAY.KM"
    )
    assert subway["evidence"]["gridRowId"] == "grid-row:CA-ON:2024"
    assert subway["evidence"]["gridVintageYear"] == 2024
    assert subway["evidence"]["gridRegion"] == "CA-ON"


def test_api_aggregates_match_derive_export(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ACX_OUTPUT_ROOT", str(tmp_path))
    monkeypatch.setenv("ACX_ALLOW_OUTPUT_RM", "1")
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")

    aggregates, reference_keys = api.get_aggregates(DATA_DIR, REPO_ROOT / "calc" / "config.yaml")
    assert reference_keys

    export_view(CsvStore(), output_root=tmp_path)
    payload = json.loads((tmp_path / "calc" / "outputs" / "export_view.json").read_text())

    expected: dict[str, float] = {}
    for row in payload["data"]:
        if row["profile_id"] != aggregates.profile_id:
            continue
        value = row["annual_emissions_g"] or 0.0
        expected[row["activity_id"]] = expected.get(row["activity_id"], 0.0) + value

    assert expected, "derive export produced no rows for the aggregate profile"
    for item in aggregates.activities:
        assert item.activity_id in expected
        assert math.isclose(item.annual_emissions_g, expected[item.activity_id], rel_tol=1e-6)
    assert math.isclose(aggregates.total_annual_emissions_g, sum(expected.values()), rel_tol=1e-6)
