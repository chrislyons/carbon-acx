from __future__ import annotations

from typing import Sequence

from dash import html

from calc import citations


def render(reference_keys: Sequence[str]) -> html.Section:
    refs = citations.references_for(reference_keys)
    items = [
        html.Li(citations.format_ieee(ref.numbered(idx)))
        for idx, ref in enumerate(refs, start=1)
    ]
    if not items:
        items = [html.Li("No references available.")]
    return html.Section([html.H2("References"), html.Ul(items)])
