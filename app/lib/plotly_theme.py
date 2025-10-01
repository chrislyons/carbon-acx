"""Shared compact Plotly layout tokens."""

from __future__ import annotations

from typing import Dict, MutableMapping, TypedDict

__all__ = ["DENSE_LAYOUT", "apply_dense_layout"]


class LayoutDict(TypedDict, total=False):
    margin: Dict[str, int]
    legend: Dict[str, object]
    font: Dict[str, object]
    hoverlabel: Dict[str, object]
    xaxis: Dict[str, object]
    yaxis: Dict[str, object]
    bargap: float
    legend_tracegroupgap: int


DENSE_LAYOUT: LayoutDict = dict(
    margin=dict(l=8, r=8, t=12, b=10),
    legend=dict(orientation="h", yanchor="top", y=1.02, x=0, font=dict(size=12)),
    font=dict(size=12),
    hoverlabel=dict(font_size=12),
    xaxis=dict(tickfont=dict(size=11), titlefont=dict(size=12), automargin=True),
    yaxis=dict(tickfont=dict(size=11), titlefont=dict(size=12), automargin=True),
    bargap=0.10,
    legend_tracegroupgap=6,
)


def apply_dense_layout(layout: MutableMapping[str, object]) -> MutableMapping[str, object]:
    """Update ``layout`` with the compact defaults and return it."""

    layout.update(DENSE_LAYOUT)  # type: ignore[arg-type]
    return layout
