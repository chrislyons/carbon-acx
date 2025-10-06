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
    has_na_sectors,
    primary_reference_index,
    reference_numbers,
)
from ._plotly_settings import apply_figure_layout_defaults

MODE_LABELS = {
    "civilian": "Civilian activity flow",
    "two_stage": "Industry → civilian flow",
}
DEFAULT_MODE = "civilian"


def _mode_payload(data: object, mode: str) -> tuple[list[dict], list[dict]]:
    if not isinstance(data, Mapping):
        return [], []

    def _coerce_sequence(candidate: object) -> list[dict]:
        if isinstance(candidate, list):
            return [entry for entry in candidate if isinstance(entry, Mapping)]
        return []

    nodes = _coerce_sequence(data.get("nodes"))
    links = _coerce_sequence(data.get("links"))

    modes = data.get("modes")
    if isinstance(modes, Mapping):
        payload = modes.get(mode)
        if not isinstance(payload, Mapping) and mode != DEFAULT_MODE:
            payload = modes.get(DEFAULT_MODE)
        if isinstance(payload, Mapping):
            mode_nodes = _coerce_sequence(payload.get("nodes"))
            mode_links = _coerce_sequence(payload.get("links"))
            if mode_nodes:
                nodes = mode_nodes
            if mode_links:
                links = mode_links
    return nodes, links


def available_modes(figure_payload: Optional[dict]) -> list[str]:
    if not isinstance(figure_payload, Mapping):
        return [DEFAULT_MODE]
    data = figure_payload.get("data")
    modes: list[str] = []
    if isinstance(data, Mapping):
        raw_modes = data.get("modes")
        if isinstance(raw_modes, Mapping):
            for key, value in raw_modes.items():
                if not isinstance(value, Mapping):
                    continue
                text = str(key).strip()
                if text:
                    modes.append(text)
    unique: list[str] = []
    seen: set[str] = set()
    for mode in modes:
        if mode not in seen:
            seen.add(mode)
            unique.append(mode)
    if DEFAULT_MODE not in seen:
        unique.insert(0, DEFAULT_MODE)
    else:
        unique = [DEFAULT_MODE] + [mode for mode in unique if mode != DEFAULT_MODE]
    return unique or [DEFAULT_MODE]


def build_figure(
    payload: dict,
    reference_lookup: Mapping[str, int],
    *,
    dark: bool = False,
    selected_activity: str | None = None,
    mode: str = DEFAULT_MODE,
) -> go.Figure:
    data = payload.get("data", {}) if payload else {}
    nodes_raw, links_raw = _mode_payload(data, mode)
    nodes = [node for node in nodes_raw if isinstance(node, Mapping)]
    links = [link for link in links_raw if isinstance(link, Mapping)]

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
        elif node_type == "operation":
            colors.append(palette["accent_strong"])
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
    share_lines: list[str] = []

    for link in links:
        mean_g = clamp_optional((link.get("values") or {}).get("mean"))
        if mean_g is None or mean_g <= 0:
            continue
        source_id = id_to_index.get(str(link.get("source")))
        target_id = id_to_index.get(str(link.get("target")))
        if source_id is None or target_id is None:
            continue
        mean = mean_g / 1000.0
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
        range_lines.append(format_range(low_kg, high_kg, "kg/yr") or "")
        reference_lines.append(format_reference_line(indices))

        share_line = ""
        share_value = link.get("share")
        try:
            share_float = float(share_value)
        except (TypeError, ValueError):
            share_float = None
        if share_float is not None and share_float > 0:
            share_line = f"<br>Share of activity: {share_float * 100:.1f}%"
        share_lines.append(share_line)

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
            share_line,
            activity_id,
        ]
        for formatted_value, range_line, reference_line, share_line, activity_id in zip(
            formatted_values, range_lines, reference_lines, share_lines, activity_ids
        )
    ]
    custom_idx = ["[" + str(i) + "]" for i in range(5)]
    idx0, idx1, idx2, idx3, _idx4 = custom_idx
    hover_template = (
        "<b>%{source.label} → %{target.label}</b>"
        f"<br>Annual emissions: %{{customdata{idx0}}}"
        f"%{{customdata{idx1}}}"
        f"<br>%{{customdata{idx2}}}"
        f"%{{customdata{idx3}}}"
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
    component_name: str = "sankey",
    title_prefix: str = "Activity flow",
    empty_message: str | None = None,
    mode_labels: Mapping[str, str] | None = None,
) -> html.Section:
    section_id = component_name or "sankey"
    title = title_prefix or "Activity flow"
    if title_suffix:
        title = f"{title} — {title_suffix}"

    modes = available_modes(figure_payload or {})
    initial_mode = next(iter(modes), DEFAULT_MODE)
    figure = build_figure(
        figure_payload or {},
        reference_lookup,
        dark=dark,
        selected_activity=active_activity,
        mode=initial_mode,
    )

    if not figure.data:
        message = empty_message or "No flow data available."
        if title_suffix and empty_message is None:
            message = f"No flow data available for {title_suffix}."
        content = html.P(message)
        controls_section = None
    else:
        graph_component = f"{section_id}-chart"
        graph_id: str | dict = graph_component
        if layer_id:
            graph_id = {"component": graph_component, "layer": layer_id}
        content = dcc.Graph(
            id=graph_id,
            figure=figure,
            config={"displayModeBar": False, "responsive": True},
            responsive=True,
            style={"height": "420px"},
            className="chart-figure",
        )
        controls_section = None
        if len(modes) > 1:
            labels_map: Mapping[str, str] = MODE_LABELS
            if mode_labels:
                labels_map = {**MODE_LABELS, **mode_labels}

            mode_component = f"{section_id}-mode"
            mode_id: str | dict = mode_component
            if layer_id:
                mode_id = {"component": mode_component, "layer": layer_id}
            options = [
                {
                    "label": labels_map.get(mode, mode.replace("_", " ").title()),
                    "value": mode,
                }
                for mode in modes
            ]
            controls_section = html.Div(
                className="chart-controls",
                children=[
                    html.Div(
                        className="chart-controls__group",
                        children=[
                            html.Span("View", className="chart-controls__label"),
                            dcc.RadioItems(
                                id=mode_id,
                                options=options,
                                value=initial_mode,
                                className="chart-controls__radios chart-toggle",
                                inputStyle={"marginRight": "0.5rem"},
                                labelStyle={"display": "inline-flex", "alignItems": "center"},
                                persistence=True,
                                persistence_type="session",
                            ),
                        ],
                    )
                ],
            )

    children: list = [html.H2(title)]
    if controls_section is not None:
        children.append(controls_section)
    children.append(content)

    if has_na_sectors(figure_payload):
        children.append(na_notice.render())

    return html.Section(
        children,
        className="chart-section chart-section--sankey",
        id=section_id,
    )


# Backwards compatibility for modules importing the previous helper name.
_build_figure = build_figure
