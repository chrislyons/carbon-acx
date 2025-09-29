from __future__ import annotations

from dash import html

from calc.copy_blocks import na_sentences


def render() -> html.Div:
    sentences = na_sentences()
    paragraph = " ".join(sentences)
    return html.Div(
        html.P([html.Strong("NA coverage. "), paragraph]),
        className="chart-footnote chart-footnote--na",
    )


__all__ = ["render"]
