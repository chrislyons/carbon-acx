from __future__ import annotations

from typing import Mapping

from dash import html

from calc.copy_blocks import disclosure_content


def render(manifest: Mapping | None) -> html.Div:
    content = disclosure_content(manifest)

    paragraph_children: list = [html.Strong(f"{content.title}. ")]
    for idx, sentence in enumerate(content.sentences):
        suffix = " " if idx < len(content.sentences) - 1 else ""
        paragraph_children.append(html.Span(sentence + suffix))

    metadata_items = [
        html.Li([html.Strong(f"{label}:"), f" {value}"]) for label, value in content.metadata
    ]

    return html.Div(
        [
            html.P(paragraph_children),
            html.Ul(metadata_items, className="disclosure-block__meta"),
        ],
        className="disclosure-block",
        id="disclosure",
    )


__all__ = ["render"]
