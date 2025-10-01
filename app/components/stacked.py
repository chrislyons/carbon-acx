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
    truncate_label,
)
from ._plotly_settings import apply_figure_layout_defaults


def _build_figure(
    payload: dict,
    reference_lookup: Mapping[str, int],
    *,
    dark: bool = False,
    selected_activity: str | None = None,
) -> go.Figure:
    data = payload.get("data", []) if payload else []
    categories: list[str] = []
    full_categories: list[str] = []
    means: list[float] = []
    err_plus: list[float] = []
    err_minus: list[float] = []
    formatted_values: list[str] = []
    activity_ids: list[str | None] = []
    meta_entries: list[dict[str, object]] = []
    range_lines: list[str] = []
    reference_lines: list[str] = []

    for row in data:
        values = row.get("values", {})
        mean = clamp_optional(values.get("mean"))
        if mean is None:
            continue
        high = clamp_optional(values.get("high"))
        low = clamp_optional(values.get("low"))

        full_label = str(row.get("category", "uncategorized"))
        categories.append(truncate_label(full_label, limit=22))
        full_categories.append(full_label)
        means.append(mean)
        err_plus.append(max((high or mean) - mean, 0.0))
        err_minus.append(max(mean - (low or mean), 0.0))
        formatted_values.append(format_emissions(mean))
        activity_id = row.get("activity_id")
        if isinstance(activity_id, str) and activity_id:
            activity_ids.append(activity_id)
        else:
            ids = row.get("activity_ids")
            if isinstance(ids, list) and ids:
                candidate = next((str(item) for item in ids if item), None)
                activity_ids.append(candidate)
            else:
                activity_ids.append(None)
        indices = list(row.get("hover_reference_indices") or [])
        if not indices:
            indices = reference_numbers(row.get("citation_keys"), reference_lookup)
        primary = next(iter(indices), None)
        if primary is None:
            primary = primary_reference_index(row.get("citation_keys"), reference_lookup)
        meta_entries.append(
            {
                "source_index": str(primary) if primary is not None else "–",
                "source_index_value": primary,
                "reference_indices": indices,
            }
        )
        units_raw = row.get("units")
        units = "g CO₂e"
        if isinstance(units_raw, Mapping):
            candidate = units_raw.get("mean") or units_raw.get("intensity") or units_raw.get("value")
            if isinstance(candidate, str) and candidate.strip():
                units = candidate.strip()
        range_text = format_range(low, high, units)
        range_lines.append(range_text or "")
        reference_lines.append(format_reference_line(indices))

    palette = get_palette(dark=dark)

    figure = apply_figure_layout_defaults(go.Figure())
    if not means:
        return figure

    has_error = any(value > 0 for value in err_plus) or any(value > 0 for value in err_minus)
    error_kwargs = (
        {
            "type": "data",
            "array": err_plus,
            "arrayminus": err_minus,
            "symmetric": False,
            "color": palette["accent_strong"],
        }
        if has_error
        else None
    )

    hover_template = (
        "<b>%{customdata[0]}</b>"
        "<br>Annual emissions: %{customdata[1]}"
        "%{customdata[2]}"
        "<br>%{customdata[3]}"
        "<extra></extra>"
    )

    selected_indices: list[int] = []
    if selected_activity:
        selected_indices = [
            idx for idx, activity_id in enumerate(activity_ids) if activity_id == selected_activity
        ]

    customdata = [
        [
            full_label,
            formatted_value,
            f"<br>{range_line}" if range_line else "",
            reference_line,
            activity_id,
        ]
        for full_label, formatted_value, range_line, reference_line, activity_id in zip(
            full_categories, formatted_values, range_lines, reference_lines, activity_ids
        )
    ]

    trace_kwargs = dict(
        name="Annual emissions",
        x=means,
        y=categories,
        orientation="h",
        marker=dict(color=palette["accent"]),
        opacity=0.85,
        customdata=customdata,
        meta=meta_entries,
        hovertemplate=hover_template,
        error_x=error_kwargs,
    )
    if selected_indices:
        trace_kwargs["selectedpoints"] = selected_indices
        trace_kwargs["selected"] = dict(marker=dict(opacity=0.9))
        trace_kwargs["unselected"] = dict(marker=dict(opacity=0.25))
    figure.add_trace(go.Bar(**trace_kwargs))

    figure.update_layout(
        template=get_plotly_template(dark=dark),
        xaxis=dict(title="Annual emissions (g CO₂e)", showgrid=True, zeroline=False),
        yaxis=dict(title="Activity category", autorange="reversed"),
        showlegend=False,
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
    title = "Annual emissions by activity category"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(
        figure_payload or {},
        reference_lookup,
        dark=dark,
        selected_activity=active_activity,
    )

    if not figure.data:
        message = "No category data available."
        if title_suffix:
            message = f"No category data available for {title_suffix}."
        content = html.P(message)
    else:
        graph_id: str | dict = "stacked-chart"
        if layer_id:
            graph_id = {"component": "stacked-chart", "layer": layer_id}
        content = dcc.Graph(
            id=graph_id,
            figure=figure,
            config={"displayModeBar": False, "responsive": True},
            style={"height": "360px"},
            className="chart-figure",
        )
    children: list = [html.H2(title), content]

    if has_na_segments(figure_payload):
        children.append(na_notice.render())

    return html.Section(
        children,
        className="chart-section chart-section--stacked",
        id="stacked",
    )
