from __future__ import annotations

from typing import Mapping, Optional

import plotly.graph_objects as go
from dash import dcc, html

from calc.ui.theme import TOKENS, get_plotly_template

from . import na_notice
from ._helpers import clamp_optional, format_reference_hint, has_na_segments


def _build_figure(payload: dict, reference_hint: str) -> go.Figure:
    data = payload.get("data", {}) if payload else {}
    nodes = data.get("nodes", [])
    links = data.get("links", [])

    palette = TOKENS["palette"]

    id_to_index: dict[str, int] = {}
    labels: list[str] = []
    colors: list[str] = []

    for node in nodes:
        node_id = str(node.get("id"))
        if node_id in id_to_index:
            continue
        idx = len(id_to_index)
        id_to_index[node_id] = idx
        labels.append(str(node.get("label") or node_id))
        node_type = str(node.get("type") or "node")
        if node_type == "category":
            colors.append(palette["accent_subtle"])
        else:
            colors.append(palette["accent"])

    sources: list[int] = []
    targets: list[int] = []
    values: list[float] = []
    hover_labels: list[str] = []

    for link in links:
        mean = clamp_optional(link.get("values", {}).get("mean"))
        if mean is None or mean <= 0:
            continue
        source_id = id_to_index.get(str(link.get("source")))
        target_id = id_to_index.get(str(link.get("target")))
        if source_id is None or target_id is None:
            continue
        sources.append(source_id)
        targets.append(target_id)
        values.append(mean)
        category_label = str(link.get("category", ""))
        activity_label = labels[target_id]
        hover = f"{category_label} → {activity_label}<br>Annual emissions: {mean:,.0f} g CO₂e"
        if reference_hint != "No references":
            hover += f"<br>{reference_hint}"
        hover_labels.append(hover)

    figure = go.Figure()
    if not values:
        return figure

    link_color = "rgba(37, 99, 235, 0.45)"
    figure.add_trace(
        go.Sankey(
            arrangement="snap",
            node=dict(
                label=labels,
                color=colors,
                pad=18,
                thickness=20,
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values,
                color=[link_color] * len(values),
                hovertemplate=[f"{label}<extra></extra>" for label in hover_labels],
            ),
            valueformat=",.0f",
            valuesuffix=" g CO₂e",
        )
    )

    figure.update_layout(
        template=get_plotly_template(),
        margin=dict(l=40, r=40, t=40, b=40),
    )
    return figure


def render(
    figure_payload: Optional[dict],
    reference_lookup: Mapping[str, int],
    *,
    title_suffix: str | None = None,
) -> html.Section:
    reference_hint = format_reference_hint(
        figure_payload.get("citation_keys") if figure_payload else None,
        reference_lookup,
    )

    title = "Activity flow"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(figure_payload or {}, reference_hint)

    if not figure.data:
        message = "No flow data available."
        if title_suffix:
            message = f"No flow data available for {title_suffix}."
        content = html.P(message)
    else:
        content = dcc.Graph(
            figure=figure,
            config={"displayModeBar": False, "responsive": True},
            style={"height": "420px"},
            className="chart-figure",
        )

    children: list = [html.H2(title), content]

    if has_na_segments(figure_payload):
        children.append(na_notice.render())

    return html.Section(
        children,
        className="chart-section chart-section--sankey",
        id="sankey",
    )
