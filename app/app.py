from __future__ import annotations

from pathlib import Path

from dash import Dash, html

from calc.api import get_aggregates
from calc.dal import choose_backend

from .components import bubble, references, sankey, stacked

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CFG_PATH = Path(__file__).resolve().parent.parent / "calc" / "config.yaml"
DS = choose_backend()


def create_app() -> Dash:
    aggregates, reference_keys = get_aggregates(DATA_DIR, CFG_PATH)
    app = Dash(__name__)
    app.layout = html.Div(
        [
            stacked.render(aggregates),
            bubble.render(aggregates),
            sankey.render(aggregates),
            references.render(reference_keys),
        ]
    )
    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
