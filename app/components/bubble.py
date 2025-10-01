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
    activities: list[str] = []
    full_activities: list[str] = []
    means: list[float] = []
    errors_high: list[float] = []
    errors_low: list[float] = []
    formatted_values: list[str] = []
    activity_ids: list[str | None] = []
    meta_entries: list[dict[str, object]] = []
    range_lines: list[str] = []
    reference_lines: list[str] = []

    for row in data:
        values = row.get("values", {})
        mean_g = clamp_optional(values.get("mean"))
        if mean_g is None or mean_g <= 0:
            continue
        high_g = clamp_optional(values.get("high"))
        low_g = clamp_optional(values.get("low"))
        mean = mean_g / 1000.0
        high = (high_g / 1000.0) if high_g is not None else None
        low = (low_g / 1000.0) if low_g is not None else None

        category_label = str(row.get("category", "uncategorized"))
        categories.append(truncate_label(category_label, limit=20))
        full_categories.append(category_label)
        activity_label = str(row.get("activity_name") or row.get("activity_id") or "Activity")
        activities.append(truncate_label(activity_label, limit=22))
        full_activities.append(activity_label)
        means.append(mean)
        upper = high if high is not None else mean
        lower = low if low is not None else mean
        errors_high.append(max(upper - mean, 0.0))
        errors_low.append(max(mean - lower, 0.0))
        formatted_values.append(format_emissions(mean_g))
        raw_activity_id = row.get("activity_id")
        if raw_activity_id in (None, ""):
            activity_ids.append(None)
        else:
            activity_ids.append(str(raw_activity_id))
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
        range_text = format_range(low, high, "kg/yr")
        range_lines.append(range_text or "")
        reference_lines.append(format_reference_line(indices))

    palette = get_palette(dark=dark)

    figure = apply_figure_layout_defaults(go.Figure())
    if not means:
        return figure

    max_mean = max(means)
    desired_max_size = 50
    sizeref = 2.0
    if max_mean > 0:
        sizeref = (2.0 * max_mean) / (desired_max_size**2)

    has_error = any(err > 0 for err in errors_high) or any(err > 0 for err in errors_low)
    error_kwargs = (
        {
            "type": "data",
            "array": errors_high,
            "arrayminus": errors_low,
            "symmetric": False,
        }
        if has_error
        else None
    )

    custom_idx = ["[" + str(i) + "]" for i in range(6)]
    idx0, idx1, idx2, idx3, idx4, _idx5 = custom_idx
    hover_template = (
        f"<b>%{{customdata{idx0}}}</b>"
        f"<br>Category: %{{customdata{idx1}}}"
        f"<br>Annual emissions: %{{customdata{idx2}}}"
        f"%{{customdata{idx3}}}"
        f"<br>%{{customdata{idx4}}}"
        "<extra></extra>"
    )

    selected_indices: list[int] = []
    if selected_activity:
        selected_indices = [
            idx for idx, activity_id in enumerate(activity_ids) if activity_id == selected_activity
        ]

    customdata = [
        [
            full_activity,
            full_category,
            formatted_value,
            f"<br>{range_line}" if range_line else "",
            reference_line,
            activity_id,
        ]
        for full_activity, full_category, formatted_value, range_line, reference_line, activity_id in zip(
            full_activities,
            full_categories,
            formatted_values,
            range_lines,
            reference_lines,
            activity_ids,
        )
    ]

    trace_kwargs = dict(
        x=categories,
        y=means,
        mode="markers",
        text=activities,
        marker=dict(
            size=means,
            sizemode="area",
            sizeref=sizeref,
            color=palette["positive"],
            opacity=0.8,
            line=dict(color=palette["muted_border"], width=1),
        ),
        customdata=customdata,
        meta=meta_entries,
        hovertemplate=hover_template,
    )
    if error_kwargs:
        error_kwargs["color"] = palette["accent_strong"]
        trace_kwargs["error_y"] = error_kwargs
    if selected_indices:
        trace_kwargs["selectedpoints"] = selected_indices
        trace_kwargs["selected"] = dict(marker=dict(opacity=0.9))
        trace_kwargs["unselected"] = dict(marker=dict(opacity=0.25))

    figure.add_trace(go.Scatter(**trace_kwargs))

    figure.update_layout(
        template=get_plotly_template(dark=dark),
        xaxis=dict(title="Activity category", type="category"),
        yaxis=dict(title="Annual emissions (kg/yr)", rangemode="tozero"),
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
    title = "Activity bubble chart"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(
        figure_payload or {},
        reference_lookup,
        dark=dark,
        selected_activity=active_activity,
    )

    if not figure.data:
        message = "No activity data available."
        if title_suffix:
            message = f"No activity data available for {title_suffix}."
        content = html.P(message)
    else:
        graph_id: str | dict = "bubble-chart"
        if layer_id:
            graph_id = {"component": "bubble-chart", "layer": layer_id}
        content = dcc.Graph(
            id=graph_id,
            figure=figure,
            config={"displayModeBar": False, "responsive": True},
            responsive=True,
            style={"height": "360px"},
            className="chart-figure",
        )
    children: list = [html.H2(title), content]

    if has_na_segments(figure_payload):
        children.append(na_notice.render())

    return html.Section(
        children,
        className="chart-section chart-section--bubble",
        id="bubble",
    )
