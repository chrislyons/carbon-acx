from __future__ import annotations

from dash import html

import calc.derive as derive_mod
from calc import citations
from calc.schema import ActivitySchedule, EmissionFactor, LayerId, Profile

from app import app as app_module


class LayeredStore:
    def load_emission_factors(self):
        return [
            EmissionFactor(activity_id="coffee", value_g_per_unit=1, source_id="coffee"),
            EmissionFactor(activity_id="stream", value_g_per_unit=2, source_id="streaming"),
        ]

    def load_profiles(self):
        return [
            Profile(profile_id="PRO.TEST", layer_id=LayerId.PROFESSIONAL, office_days_per_week=5),
            Profile(profile_id="ONLINE.TEST", layer_id=LayerId.ONLINE, office_days_per_week=0),
        ]

    def load_activity_schedule(self):
        return [
            ActivitySchedule(
                profile_id="PRO.TEST",
                activity_id="coffee",
                layer_id=LayerId.PROFESSIONAL,
                freq_per_week=5,
            ),
            ActivitySchedule(
                profile_id="ONLINE.TEST",
                activity_id="stream",
                layer_id=LayerId.ONLINE,
                freq_per_day=1,
            ),
        ]

    def load_grid_intensity(self):
        return []

    def load_activities(self):
        return []


def _extract_reference_texts(children) -> list[str]:
    ordered_list = next(child for child in children if isinstance(child, html.Ol))
    return [item.children for item in ordered_list.children]


def test_layer_filter_and_reference_union(monkeypatch, derived_output_dir, derived_output_root):
    derive_mod.export_view(LayeredStore(), output_root=derived_output_root)

    artifact_dir = derived_output_dir
    figures_store = {
        name: app_module._load_figure_payload(artifact_dir, name) for name in app_module.FIGURE_NAMES
    }

    professional = app_module._filter_payload(figures_store["stacked"], "professional")
    assert professional["layers"] == ["professional"]
    assert professional["citation_keys"] == ["coffee"]
    assert professional.get("layer_citation_keys") == {"professional": ["coffee"]}
    assert all(row.get("layer_id") == "professional" for row in professional.get("data", []))

    online = app_module._filter_payload(figures_store["stacked"], "online")
    assert online["layers"] == ["online"]
    assert online["citation_keys"] == ["streaming"]
    assert online.get("layer_citation_keys") == {"online": ["streaming"]}
    assert all(row.get("layer_id") == "online" for row in online.get("data", []))

    reference_lookup = app_module._reference_lookup(app_module._reference_keys(figures_store))
    manifest_payload = app_module._load_manifest_payload(artifact_dir)
    layer_map = manifest_payload["layer_citation_keys"]

    union_keys = app_module._order_reference_keys(
        layer_map["professional"] + layer_map["online"], reference_lookup
    )
    expected_union = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(union_keys), start=1)
    ]

    monkeypatch.setenv(app_module.ARTIFACT_ENV, str(artifact_dir))
    dash_app = app_module.create_app()

    references_callback_info = next(
        info for key, info in dash_app.callback_map.items() if key.startswith("references.children")
    )
    references_callback = references_callback_info["callback"].__wrapped__

    professional_children = references_callback(["professional"], layer_map)
    pro_expected = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(layer_map["professional"]), start=1)
    ]
    assert _extract_reference_texts(professional_children) == pro_expected

    combined_children = references_callback(["professional", "online"], layer_map)
    assert _extract_reference_texts(combined_children) == expected_union

    manifest_references = manifest_payload["layer_references"]
    assert manifest_references["professional"] == pro_expected
    assert manifest_references["online"] == [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(layer_map["online"]), start=1)
    ]
