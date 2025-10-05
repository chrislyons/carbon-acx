from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

from app import app as app_module


def _collect_ids(node: Any) -> set[str]:
    ids: set[str] = set()
    if hasattr(node, "to_plotly_json"):
        return _collect_ids(node.to_plotly_json())
    if isinstance(node, dict):
        props = node.get("props")
        if isinstance(props, dict) and "id" in props:
            value = props["id"]
            if isinstance(value, str):
                ids.add(value)
        for value in node.values():
            ids.update(_collect_ids(value))
    elif isinstance(node, Iterable) and not isinstance(node, (str, bytes)):
        for item in node:
            ids.update(_collect_ids(item))
    return ids


def test_layout_contains_expected_sections(monkeypatch) -> None:
    fixture_dir = Path(__file__).parent / "fixtures" / "artifacts_minimal"
    monkeypatch.setenv(app_module.ARTIFACT_ENV, str(fixture_dir))

    dash_app = app_module.create_app()
    client = dash_app.server.test_client()
    response = client.get("/")
    assert response.status_code == 200

    layout_ids = _collect_ids(dash_app.layout.to_plotly_json())

    figures_store = {
        name: app_module._load_figure_payload(fixture_dir, name) for name in app_module.FIGURE_NAMES
    }
    available_layers = app_module._collect_layers(figures_store)
    selected_layers = (
        available_layers[:1] if available_layers else [app_module.LayerId.PROFESSIONAL.value]
    )

    panel_callback_info = next(
        info for key, info in dash_app.callback_map.items() if "layer-panels.children" in key
    )
    callback = panel_callback_info["callback"].__wrapped__
    panels_children, _ = callback(selected_layers, "single", figures_store)

    panel_ids: set[str] = set()
    for child in panels_children:
        panel_ids.update(_collect_ids(child.to_plotly_json()))

    component_ids = layout_ids | panel_ids

    expected_ids = {"stacked", "bubble", "sankey", "feedback", "references"}
    assert expected_ids.issubset(component_ids)
