from __future__ import annotations

from typing import Mapping, Optional

import plotly.graph_objects as go
from dash import dcc, html

from calc.ui.theme import TOKENS, get_plotly_template

from . import na_notice
from ._helpers import (
    clamp_optional,
    format_emissions,
    has_na_segments,
    primary_reference_index,
    reference_numbers,
)
from ._plotly_settings import apply_figure_layout_defaults


def _build_figure(payload: dict, reference_lookup: Mapping[str, int]) -> go.Figure:
    data = payload.get("data", []) if payload else []

    categories: list[str] = []
    activities: list[str] = []
    means: list[float] = []
    errors_high: list[float] = []
    errors_low: list[float] = []
    formatted_values: list[str] = []
    meta_entries: list[dict[str, object]] = []

    for row in data:
        values = row.get("values", {})
        mean = clamp_optional(values.get("mean"))
        if mean is None or mean <= 0:
            continue
        high = clamp_optional(values.get("high"))
        low = clamp_optional(values.get("low"))

        categories.append(str(row.get("category", "uncategorized")))
        activities.append(str(row.get("activity_name") or row.get("activity_id")))
        means.append(mean)
        errors_high.append(max((high or mean) - mean, 0.0))
        errors_low.append(max(mean - (low or mean), 0.0))
        formatted_values.append(format_emissions(mean))
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

    palette = TOKENS["palette"]

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

    hover_template = (
        "<b>%{text}</b><br>Category: %{x}<br>Annual emissions: %{customdata}<br>[%{meta.source_index}]"
        + "<extra></extra>"
    )

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
            line=dict(color="rgba(15, 23, 42, 0.35)", width=1),
        ),
        customdata=formatted_values,
        meta=meta_entries,
        hovertemplate=hover_template,
    )
    if error_kwargs:
        error_kwargs["color"] = palette["accent_strong"]
        trace_kwargs["error_y"] = error_kwargs

    figure.add_trace(go.Scatter(**trace_kwargs))

    figure.update_layout(
        template=get_plotly_template(),
        margin=dict(l=60, r=20, t=40, b=60),
        xaxis=dict(title="Activity category", type="category"),
        yaxis=dict(title="Annual emissions (g CO₂e)", rangemode="tozero"),
        showlegend=False,
    )
    return figure


def render(
    figure_payload: Optional[dict],
    reference_lookup: Mapping[str, int],
    *,
    title_suffix: str | None = None,
) -> html.Section:
    title = "Activity bubble chart"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(figure_payload or {}, reference_lookup)

    if not figure.data:
        message = "No activity data available."
        if title_suffix:
            message = f"No activity data available for {title_suffix}."
        content = html.P(message)
    else:
        content = dcc.Graph(
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
        className="chart-section chart-section--bubble",
        id="bubble",
    )
