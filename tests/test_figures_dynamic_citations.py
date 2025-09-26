from __future__ import annotations

import json
import shutil
from pathlib import Path

import calc.derive as derive_mod
from calc import citations
from calc.schema import ActivitySchedule, EmissionFactor, GridIntensity, Profile


class DynamicStore:
    def load_emission_factors(self):
        return [
            EmissionFactor(
                activity_id="video",
                is_grid_indexed=True,
                electricity_kwh_per_unit=2,
                source_id="SRC.DIMPACT.2021",
            )
        ]

    def load_profiles(self):
        return [Profile(profile_id="p1", office_days_per_week=5, default_grid_region="CA-ON")]

    def load_activity_schedule(self):
        return [ActivitySchedule(profile_id="p1", activity_id="video", freq_per_day=1)]

    def load_grid_intensity(self):
        return [
            GridIntensity(
                region="CA-ON",
                intensity_g_per_kwh=12,
                source_id="SRC.IESO.2024",
            )
        ]

    def load_activities(self):
        return []


def test_figures_use_dynamic_citations(tmp_path):
    out_dir = Path("calc/outputs")
    if out_dir.exists():
        shutil.rmtree(out_dir)

    derive_mod.export_view(DynamicStore())

    export_payload = json.loads((out_dir / "export_view.json").read_text())
    expected_keys = ["SRC.DIMPACT.2021", "SRC.IESO.2024"]
    assert export_payload["citation_keys"] == expected_keys

    expected_refs = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(expected_keys), start=1)
    ]
    assert (
        out_dir / "references" / "stacked_refs.txt"
    ).read_text().strip().splitlines() == expected_refs

    fig_payload = json.loads((out_dir / "figures" / "stacked.json").read_text())
    assert fig_payload["references"] == expected_refs
    assert fig_payload["citation_keys"] == expected_keys
    assert all("coffee" not in ref and "stream" not in ref for ref in fig_payload["references"])
