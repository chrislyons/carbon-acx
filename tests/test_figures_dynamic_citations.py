from __future__ import annotations

import json

import calc.derive as derive_mod
from calc import citations
from calc.schema import ActivitySchedule, EmissionFactor, GridIntensity, LayerId, Profile


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
        return [
            Profile(
                profile_id="p1",
                layer_id=LayerId.PROFESSIONAL,
                office_days_per_week=5,
                default_grid_region="CA-ON",
            )
        ]

    def load_activity_schedule(self):
        return [
            ActivitySchedule(
                profile_id="p1",
                activity_id="video",
                layer_id=LayerId.PROFESSIONAL,
                freq_per_day=1,
            )
        ]

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


def test_figures_use_dynamic_citations(derived_output_dir, derived_output_root):
    out_dir = derived_output_dir

    derive_mod.export_view(DynamicStore(), output_root=derived_output_root)

    export_payload = json.loads((out_dir / "export_view.json").read_text())
    expected_keys = [
        "SRC.DIMPACT.2021",
        "SRC.IESO.2024",
        "SRC.AB.TAILINGS.2023",
        "SRC.INTL.MINING.2022",
        "SRC.IPCC.AR6.2021",
        "SRC.NOAA.OCEAN.2023",
        "SRC.RIVER.HYPOXIA.2020",
    ]
    assert export_payload["citation_keys"] == expected_keys
    assert export_payload["layers"] == ["professional"]
    assert all(row["layer_id"] == "professional" for row in export_payload["data"])
    expected_layer_keys = ["SRC.DIMPACT.2021", "SRC.IESO.2024"]

    expected_refs = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(expected_keys), start=1)
    ]
    assert (
        out_dir / "references" / "stacked_refs.txt"
    ).read_text().strip().splitlines() == expected_refs

    fig_payload = json.loads((out_dir / "figures" / "stacked.json").read_text())
    assert fig_payload["citation_keys"] == expected_keys
    assert fig_payload.get("layer_citation_keys") == {"professional": expected_layer_keys}
    assert "references" not in fig_payload
    assert "layer_references" not in fig_payload
    assert all(row.get("layer_id") == "professional" for row in fig_payload["data"])
