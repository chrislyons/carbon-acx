"""Shared Plotly layout defaults for Carbon ACX visualizations."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Final

import plotly.graph_objects as go

__all__ = [
    "REDUCED_MOTION_ENV",
    "apply_figure_layout_defaults",
]

REDUCED_MOTION_ENV: Final[str] = "ACX_REDUCED_MOTION"
_UIREVISION: Final[str] = "carbon-acx"
_TRANSITION_EASING: Final[str] = "cubic-in-out"
_TRANSITION_DURATION_MS: Final[int] = 250


@lru_cache(maxsize=1)
def _is_reduced_motion_enabled() -> bool:
    """Return ``True`` when motion should be disabled."""

    value = os.environ.get(REDUCED_MOTION_ENV)
    if value is None:
        return False
    text = value.strip().lower()
    if text in {"", "0", "false", "no", "off"}:
        return False
    return True


def _transition_duration() -> int:
    if _is_reduced_motion_enabled():
        return 0
    return _TRANSITION_DURATION_MS


def apply_figure_layout_defaults(figure: go.Figure) -> go.Figure:
    """Apply shared layout defaults for Plotly figures."""

    figure.update_layout(
        transition=dict(duration=_transition_duration(), easing=_TRANSITION_EASING),
        uirevision=_UIREVISION,
    )
    return figure
