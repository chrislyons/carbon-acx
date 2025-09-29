from __future__ import annotations

import plotly.graph_objects as go

from calc.ui.theme import TOKENS, get_plotly_template


def test_tokens_cover_core_sections() -> None:
    for section in ["font", "radii", "spacing", "shadow", "palette"]:
        assert section in TOKENS
    assert "sans" in TOKENS["font"]["family"]
    assert "accent" in TOKENS["palette"]


def test_plotly_template_smoke() -> None:
    template = get_plotly_template()
    assert template.layout.font.family
    assert template.layout.margin.l >= 0

    figure = go.Figure(data=[go.Bar(y=[1, 3, 2])])
    figure.update_layout(template=template, title="Test Chart")

    payload = figure.to_plotly_json()
    layout = payload["layout"]
    assert layout["template"]["layout"]["font"]["family"]
    assert layout["title"]["text"] == "Test Chart"
    assert payload["data"][0]["type"] == "bar"
