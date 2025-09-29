from __future__ import annotations

from typing import Sequence

from dash import html

from calc import citations


def _reference_texts(reference_keys: Sequence[str] | None) -> list[str]:
    references = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(reference_keys or []), start=1)
    ]
    if not references:
        references = ["No references available."]
    return references


def render_children(reference_keys: Sequence[str] | None) -> list[html.Component]:
    references = _reference_texts(reference_keys)
    return [html.H2("References"), html.Ol([html.Li(text) for text in references])]


def render(reference_keys: Sequence[str] | None) -> html.Aside:
    return html.Aside(
        render_children(reference_keys),
        className="references-panel",
        id="references",
    )


__all__ = ["render", "render_children"]
