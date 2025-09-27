from __future__ import annotations

from typing import Mapping, Optional

import plotly.graph_objects as go
from dash import dcc, html

from ._helpers import clamp_optional, format_reference_hint


def _build_figure(payload: dict, reference_hint: str) -> go.Figure:
    data = payload.get("data", []) if payload else []

    categories: list[str] = []
    activities: list[str] = []
    means: list[float] = []
    errors_high: list[float] = []
    errors_low: list[float] = []

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

    figure = go.Figure()
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
        "<b>%{text}</b><br>Category: %{x}<br>Annual emissions: %{y:,.0f} g CO₂e"
        + ("<br>%{customdata}" if reference_hint != "No references" else "")
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
            color="#10b981",
            opacity=0.8,
            line=dict(color="rgba(15, 23, 42, 0.4)", width=1),
        ),
        customdata=[reference_hint] * len(means),
        hovertemplate=hover_template,
    )
    if error_kwargs:
        trace_kwargs["error_y"] = error_kwargs

    figure.add_trace(go.Scatter(**trace_kwargs))

    figure.update_layout(
        margin=dict(l=60, r=20, t=40, b=60),
        xaxis=dict(title="Activity category", type="category"),
        yaxis=dict(title="Annual emissions (g CO₂e)", rangemode="tozero"),
        plot_bgcolor="#ffffff",
        paper_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
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

    title = "Activity bubble chart"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(figure_payload or {}, reference_hint)

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

    return html.Section(
        [html.H2(title), content],
        className="chart-section chart-section--bubble",
        id="bubble",
    )
