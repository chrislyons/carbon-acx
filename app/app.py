from __future__ import annotations

from dash import Dash, html

from .components.stacked import stacked_graph
from .components.bubble import bubble_graph
from .components.sankey import sankey_graph
from .components.references import references_pane


app = Dash(__name__)
app.layout = html.Div(
    [
        stacked_graph(),
        bubble_graph(),
        sankey_graph(),
        references_pane(),
    ]
)


if __name__ == "__main__":
    app.run(debug=True)
