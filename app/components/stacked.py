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
    means: list[float] = []
    err_plus: list[float] = []
    err_minus: list[float] = []
    formatted_values: list[str] = []
    meta_entries: list[dict[str, object]] = []

    for row in data:
        values = row.get("values", {})
        mean = clamp_optional(values.get("mean"))
        if mean is None:
            continue
        high = clamp_optional(values.get("high"))
        low = clamp_optional(values.get("low"))

        categories.append(str(row.get("category", "uncategorized")))
        means.append(mean)
        err_plus.append(max((high or mean) - mean, 0.0))
        err_minus.append(max(mean - (low or mean), 0.0))
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
        "<b>%{y}</b><br>Annual emissions: %{customdata}<br>[%{meta.source_index}]"
        + "<extra></extra>"
    )

    figure.add_trace(
        go.Bar(
            name="Annual emissions",
            x=means,
            y=categories,
            orientation="h",
            marker=dict(color=palette["accent"]),
            opacity=0.85,
            customdata=formatted_values,
            meta=meta_entries,
            hovertemplate=hover_template,
            error_x=error_kwargs,
        )
    )

    figure.update_layout(
        template=get_plotly_template(),
        margin=dict(l=80, r=20, t=40, b=40),
        xaxis=dict(title="Annual emissions (g CO₂e)", showgrid=True, zeroline=False),
        yaxis=dict(title="Activity category", autorange="reversed"),
        showlegend=False,
    )
    return figure


def render(
    figure_payload: Optional[dict],
    reference_lookup: Mapping[str, int],
    *,
    title_suffix: str | None = None,
) -> html.Section:
    title = "Annual emissions by activity category"
    if title_suffix:
        title = f"{title} — {title_suffix}"
    figure = _build_figure(figure_payload or {}, reference_lookup)

    if not figure.data:
        message = "No category data available."
        if title_suffix:
            message = f"No category data available for {title_suffix}."
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
        className="chart-section chart-section--stacked",
        id="stacked",
    )
