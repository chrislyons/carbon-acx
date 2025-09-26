from __future__ import annotations

from typing import Optional

from dash import html

from calc.api import Aggregates


def render(aggregates: Optional[Aggregates] = None) -> html.Div:
    return html.Div("stacked placeholder")
