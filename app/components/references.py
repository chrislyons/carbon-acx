from __future__ import annotations

from typing import Sequence

from dash import html

from calc import citations


def render(reference_keys: Sequence[str] | None) -> html.Aside:
    references = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(reference_keys or []), start=1)
    ]
    if not references:
        references = ["No references available."]

    return html.Aside(
        [
            html.H2("References"),
            html.Ol([html.Li(text) for text in references]),
        ],
        className="references-panel",
    )
