"""Plotly theming and shared design tokens."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import plotly.graph_objects as go
import plotly.io as pio

TOKENS: dict[str, Any] = {
    "font": {
        "family": {
            "sans": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            "mono": "'JetBrains Mono', SFMono-Regular, Menlo, monospace",
        },
        "sizes": {
            "xs": 12,
            "sm": 14,
            "md": 16,
            "lg": 18,
            "xl": 22,
        },
        "weights": {
            "regular": 400,
            "medium": 500,
            "semibold": 600,
        },
    },
    "radii": {
        "xs": 2,
        "sm": 4,
        "md": 8,
        "lg": 12,
        "xl": 16,
    },
    "spacing": {
        "3xs": 2,
        "xxs": 4,
        "xs": 6,
        "sm": 8,
        "md": 12,
        "lg": 16,
        "xl": 24,
        "2xl": 32,
        "3xl": 40,
    },
    "shadow": {
        "sm": "0 4px 10px rgba(15, 23, 42, 0.08)",
        "md": "0 12px 40px rgba(15, 23, 42, 0.16)",
    },
    "palette": {
        "background": "#ffffff",
        "surface": "#f8fafc",
        "border": "#e2e8f0",
        "muted_border": "#cbd5f5",
        "text": "#0f172a",
        "text_muted": "#475569",
        "accent": "#2563eb",
        "accent_subtle": "#bfdbfe",
        "accent_strong": "#1d4ed8",
        "positive": "#10b981",
        "warning": "#fbbf24",
        "critical": "#ef4444",
        "gridline": "rgba(148, 163, 184, 0.45)",
        "gridline_light": "rgba(148, 163, 184, 0.2)",
    },
}


@lru_cache(maxsize=1)
def get_plotly_template() -> go.layout.Template:
    """Return the shared Plotly template used by Carbon ACX charts."""

    tokens = TOKENS
    palette = tokens["palette"]
    font_family = tokens["font"]["family"]["sans"]
    font_size = tokens["font"]["sizes"]["md"]
    title_size = tokens["font"]["sizes"]["xl"]
    axis_title_size = tokens["font"]["sizes"]["sm"]

    base_template = pio.templates["plotly_white"]
    template = go.layout.Template(base_template)

    template.layout.font = dict(
        family=font_family,
        size=font_size,
        color=palette["text"],
    )
    template.layout.title = dict(
        font=dict(
            family=font_family,
            size=title_size,
            color=palette["text"],
        ),
        pad=dict(b=16),
    )
    template.layout.paper_bgcolor = palette["background"]
    template.layout.plot_bgcolor = palette["background"]
    template.layout.margin = dict(l=64, r=32, t=56, b=64)
    template.layout.colorway = [
        palette["accent"],
        palette["positive"],
        palette["accent_strong"],
        "#0ea5e9",
        "#7c3aed",
        "#059669",
        "#f97316",
        "#6366f1",
    ]
    template.layout.hoverlabel = dict(
        bgcolor=palette["surface"],
        bordercolor=palette["border"],
        font=dict(family=font_family, size=font_size, color=palette["text"]),
    )
    template.layout.legend = dict(
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1.0,
        bgcolor="rgba(255, 255, 255, 0.8)",
        bordercolor=palette["border"],
        borderwidth=1,
        title=dict(text=""),
    )
    template.layout.separators = ", "

    axis_defaults = dict(
        showgrid=True,
        gridcolor=palette["gridline"],
        gridwidth=1,
        zeroline=False,
        linecolor=palette["gridline_light"],
        ticks="outside",
        tickcolor=palette["gridline"],
        ticklen=4,
        title=dict(
            font=dict(
                family=font_family,
                size=axis_title_size,
                color=palette["text_muted"],
            )
        ),
        tickfont=dict(color=palette["text_muted"], size=font_size),
    )

    template.layout.xaxis = axis_defaults
    template.layout.yaxis = axis_defaults

    template.layout.xaxis2 = axis_defaults
    template.layout.yaxis2 = axis_defaults

    template.layout.coloraxis = dict(colorscale="Blues")

    return template
