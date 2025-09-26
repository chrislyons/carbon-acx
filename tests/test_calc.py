from calc import citations
from calc.derive import compute_emission, get_grid_intensity
from calc.schema import ActivitySchedule, EmissionFactor, Profile


def test_export_metadata_and_references(tmp_path):
    from pathlib import Path
    import json
    import shutil

    import calc.derive as derive_mod
    from calc.schema import GridIntensity

    class FakeStore:
        def load_emission_factors(self):
            return [
                EmissionFactor(activity_id="coffee", value_g_per_unit=1, source_id="coffee"),
                EmissionFactor(
                    activity_id="stream",
                    is_grid_indexed=True,
                    electricity_kwh_per_unit=1,
                    source_id="streaming",
                ),
            ]

        def load_profiles(self):
            return [Profile(profile_id="p1", office_days_per_week=3, default_grid_region="CA-ON")]

        def load_activity_schedule(self):
            return [
                ActivitySchedule(
                    profile_id="p1", activity_id="coffee", freq_per_week=5, office_days_only=True
                ),
                ActivitySchedule(
                    profile_id="p1", activity_id="stream", freq_per_day=2
                ),
            ]

        def load_grid_intensity(self):
            return [GridIntensity(region="CA-ON", intensity_g_per_kwh=100)]

        def load_activities(self):
            return []

    out_dir = Path("calc/outputs")
    if out_dir.exists():
        shutil.rmtree(out_dir)
    derive_mod.export_view(FakeStore())
    csv_lines = (out_dir / "export_view.csv").read_text().splitlines()
    assert csv_lines[0].startswith("# generated_at: ")
    assert csv_lines[1] == "# profile: PRO.TO.24_39.HYBRID.2025"
    assert csv_lines[2] == "# method: export_view"

    data = json.loads((out_dir / "export_view.json").read_text())
    assert data["profile"] == "PRO.TO.24_39.HYBRID.2025"
    assert data["method"] == "export_view"
    assert "generated_at" in data
    assert isinstance(data["data"], list)
    assert data["citation_keys"] == ["coffee", "streaming"]

    fig_payload = json.loads((out_dir / "figure_total_by_activity.json").read_text())
    expected_refs = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(
            citations.references_for(["coffee", "streaming"]), start=1
        )
    ]
    assert fig_payload["references"] == expected_refs
    assert fig_payload["citation_keys"] == ["coffee", "streaming"]
    assert fig_payload["method"] == "figures.total_by_activity"


def test_emission_calculation_and_nulls():
    profile = Profile(profile_id="p1", office_days_per_week=3, default_grid_region="CA-ON")
    grid = {"CA-ON": 100, "CA": None, "CA-QC": 40}
    assert get_grid_intensity(profile, grid) == 100
    assert get_grid_intensity(profile, grid, use_canada_average=True) == (100 + 40) / 2

    ef_coffee = EmissionFactor(activity_id="coffee", value_g_per_unit=1)
    sched_coffee = ActivitySchedule(
        profile_id="p1", activity_id="coffee", freq_per_week=5, office_days_only=True
    )
    emission = compute_emission(sched_coffee, profile, ef_coffee, grid)
    assert emission == 5 * 52 * (3 / 5) * 1

    ef_stream = EmissionFactor(
        activity_id="stream", is_grid_indexed=True, electricity_kwh_per_unit=1
    )
    sched_stream = ActivitySchedule(profile_id="p1", activity_id="stream", freq_per_day=2)
    emission_stream = compute_emission(sched_stream, profile, ef_stream, grid)
    assert emission_stream == 14 * 52 * 100

    sched_null = ActivitySchedule(profile_id="p1", activity_id="stream")
    assert compute_emission(sched_null, profile, ef_stream, grid) is None
