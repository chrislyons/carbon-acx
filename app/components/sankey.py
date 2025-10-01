from __future__ import annotations

from typing import Mapping, Optional

import plotly.graph_objects as go
from dash import dcc, html

from calc.ui.theme import get_palette, get_plotly_template
from app.lib.plotly_theme import DENSE_LAYOUT

from . import na_notice
from ._helpers import (
    clamp_optional,
    format_emissions,
    format_range,
    format_reference_line,
    has_na_segments,
    primary_reference_index,
    reference_numbers,
)
from ._plotly_settings import apply_figure_layout_defaults


def _build_figure(
    payload: dict,
    reference_lookup: Mapping[str, int],
    *,
    dark: bool = False,
    selected_activity: str | None = None,
) -> go.Figure:
    data = payload.get("data", {}) if payload else {}
    nodes = data.get("nodes", [])
    links = data.get("links", [])

    palette = get_palette(dark=dark)

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
    formatted_values: list[str] = []
    activity_ids: list[str | None] = []
    meta_entries: list[dict[str, object]] = []
    range_lines: list[str] = []
    reference_lines: list[str] = []

    for link in links:
        mean_g = clamp_optional(link.get("values", {}).get("mean"))
        if mean_g is None or mean_g <= 0:
            continue
        mean = mean_g / 1000.0
        source_id = id_to_index.get(str(link.get("source")))
        target_id = id_to_index.get(str(link.get("target")))
        if source_id is None or target_id is None:
            continue
        sources.append(source_id)
        targets.append(target_id)
        values.append(mean)
        formatted_values.append(format_emissions(mean_g))
        raw_activity_id = link.get("activity_id")
        if raw_activity_id in (None, ""):
            activity_ids.append(None)
        else:
            activity_ids.append(str(raw_activity_id))
        indices = list(link.get("hover_reference_indices") or [])
        if not indices:
            indices = reference_numbers(link.get("citation_keys"), reference_lookup)
        primary = next(iter(indices), None)
        if primary is None:
            primary = primary_reference_index(link.get("citation_keys"), reference_lookup)
        meta_entries.append(
            {
                "source_index": str(primary) if primary is not None else "–",
                "source_index_value": primary,
                "reference_indices": indices,
            }
        )
        values_map = link.get("values") or {}
        low = clamp_optional(values_map.get("low")) if isinstance(values_map, Mapping) else None
        high = clamp_optional(values_map.get("high")) if isinstance(values_map, Mapping) else None
        low_kg = (low / 1000.0) if low is not None else None
        high_kg = (high / 1000.0) if high is not None else None
        range_text = format_range(low_kg, high_kg, "kg/yr")
        range_lines.append(range_text or "")
        reference_lines.append(format_reference_line(indices))

    figure = apply_figure_layout_defaults(go.Figure())
    if not values:
        return figure

    link_color = "rgba(37, 99, 235, 0.45)"
    dim_color = "rgba(37, 99, 235, 0.15)"
    if dark:
        link_color = "rgba(96, 165, 250, 0.6)"
        dim_color = "rgba(96, 165, 250, 0.18)"

    selected_links: list[bool] = []
    if selected_activity:
        selected_links = [activity_id == selected_activity for activity_id in activity_ids]

    if selected_links and any(selected_links):
        link_colors = [link_color if match else dim_color for match in selected_links]
    else:
        link_colors = [link_color] * len(values)

    customdata = [
        [
            formatted_value,
            f"<br>{range_line}" if range_line else "",
            reference_line,
            activity_id,
        ]
        for formatted_value, range_line, reference_line, activity_id in zip(
            formatted_values, range_lines, reference_lines, activity_ids
        )
    ]
    custom_idx = ["[" + str(i) + "]" for i in range(4)]
    idx0, idx1, idx2, _idx3 = custom_idx
    hover_template = (
        "<b>%{source.label} → %{target.label}</b>"
        f"<br>Annual emissions: %{{customdata{idx0}}}"
        f"%{{customdata{idx1}}}"
        f"<br>%{{customdata{idx2}}}"
        "<extra></extra>"
    )
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
                color=link_colors,
                customdata=customdata,
                hovertemplate=hover_template,
            ),
            meta=meta_entries,
            valueformat=",.1f",
            valuesuffix=" kg/yr",
        )
    )

    figure.update_layout(
        template=get_plotly_template(dark=dark),
    )
    figure.update_layout(**DENSE_LAYOUT)
    return figure


def render(
    figure_payload: Optional[dict],
    reference_lookup: Mapping[str, int],
    *,
    title_suffix: str | None = None,
    dark: bool = False,
    layer_id: str | None = None,
    active_activity: str | None = None,
) -> html.Section:
    title = "Activity flow"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(
        figure_payload or {},
        reference_lookup,
        dark=dark,
        selected_activity=active_activity,
    )

    if not figure.data:
        message = "No flow data available."
        if title_suffix:
            message = f"No flow data available for {title_suffix}."
        content = html.P(message)
    else:
        graph_id: str | dict = "sankey-chart"
        if layer_id:
            graph_id = {"component": "sankey-chart", "layer": layer_id}
        content = dcc.Graph(
            id=graph_id,
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
