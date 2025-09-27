from calc import citations
from calc.derive import compute_emission, get_grid_intensity
from calc.schema import ActivitySchedule, EmissionFactor, LayerId, Profile


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
            return [
                Profile(
                    profile_id="p1",
                    layer_id=LayerId.PROFESSIONAL,
                    office_days_per_week=3,
                    default_grid_region="CA-ON",
                )
            ]

        def load_activity_schedule(self):
            return [
                ActivitySchedule(
                    profile_id="p1",
                    activity_id="coffee",
                    layer_id=LayerId.PROFESSIONAL,
                    freq_per_week=5,
                    office_days_only=True,
                ),
                ActivitySchedule(
                    profile_id="p1",
                    activity_id="stream",
                    layer_id=LayerId.PROFESSIONAL,
                    freq_per_day=2,
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
    assert csv_lines[1] == "# profile: p1"
    assert csv_lines[2] == "# method: export_view"
    assert (
        csv_lines[3]
        == "# profile_resolution: {'requested': 'PRO.TO.24_39.HYBRID.2025', 'used': ['p1']}"
    )
    assert any(line.startswith("# layers: ") for line in csv_lines)

    data = json.loads((out_dir / "export_view.json").read_text())
    assert data["profile"] == "p1"
    assert data["method"] == "export_view"
    assert data["profile_resolution"] == {
        "requested": "PRO.TO.24_39.HYBRID.2025",
        "used": ["p1"],
    }
    assert "generated_at" in data
    assert isinstance(data["data"], list)
    assert data["citation_keys"] == ["coffee", "streaming"]
    assert data["layers"] == ["professional"]
    assert all(row["layer_id"] == "professional" for row in data["data"])

    expected_refs = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(["coffee", "streaming"]), start=1)
    ]

    export_refs = (out_dir / "references" / "export_view_refs.txt").read_text().strip().splitlines()
    assert export_refs == expected_refs

    stacked_payload = json.loads((out_dir / "figures" / "stacked.json").read_text())
    assert stacked_payload["references"] == expected_refs
    assert stacked_payload["citation_keys"] == ["coffee", "streaming"]
    assert stacked_payload["profile"] == "p1"
    assert stacked_payload["profile_resolution"] == {
        "requested": "PRO.TO.24_39.HYBRID.2025",
        "used": ["p1"],
    }
    assert stacked_payload["method"] == "figures.stacked"
    assert stacked_payload["data"]
    assert all("layer_id" in row for row in stacked_payload["data"])

    bubble_payload = json.loads((out_dir / "figures" / "bubble.json").read_text())
    assert bubble_payload["references"] == expected_refs
    assert all("mean" in point["values"] for point in bubble_payload["data"])
    assert all(point.get("layer_id") for point in bubble_payload["data"])

    sankey_payload = json.loads((out_dir / "figures" / "sankey.json").read_text())
    assert sankey_payload["references"] == expected_refs
    assert isinstance(sankey_payload["data"], dict)
    assert "nodes" in sankey_payload["data"]
    assert "links" in sankey_payload["data"]
    assert all("layer_id" in link for link in sankey_payload["data"]["links"])

    for name in ("stacked", "bubble", "sankey"):
        txt = (out_dir / "references" / f"{name}_refs.txt").read_text().strip().splitlines()
        assert txt == expected_refs

    manifest = json.loads((out_dir / "manifest.json").read_text())
    assert manifest["sources"] == ["coffee", "streaming"]
    assert manifest["layers"] == ["professional"]


def test_emission_calculation_and_nulls():
    profile = Profile(
        profile_id="p1",
        layer_id=LayerId.PROFESSIONAL,
        office_days_per_week=3,
        default_grid_region="CA-ON",
    )
    grid = {"CA-ON": 100, "CA": None, "CA-QC": 40}
    assert get_grid_intensity(profile, grid) == 100
    assert get_grid_intensity(profile, grid, use_canada_average=True) == (100 + 40) / 2

    ef_coffee = EmissionFactor(activity_id="coffee", value_g_per_unit=1)
    sched_coffee = ActivitySchedule(
        profile_id="p1",
        activity_id="coffee",
        layer_id=LayerId.PROFESSIONAL,
        freq_per_week=5,
        office_days_only=True,
    )
    emission = compute_emission(sched_coffee, profile, ef_coffee, grid)
    assert emission == 5 * 52 * (3 / 5) * 1

    ef_stream = EmissionFactor(
        activity_id="stream", is_grid_indexed=True, electricity_kwh_per_unit=1
    )
    sched_stream = ActivitySchedule(
        profile_id="p1",
        activity_id="stream",
        layer_id=LayerId.PROFESSIONAL,
        freq_per_day=2,
    )
    emission_stream = compute_emission(sched_stream, profile, ef_stream, grid)
    assert emission_stream == 14 * 52 * 100

    sched_null = ActivitySchedule(
        profile_id="p1",
        activity_id="stream",
        layer_id=LayerId.PROFESSIONAL,
    )
    assert compute_emission(sched_null, profile, ef_stream, grid) is None
