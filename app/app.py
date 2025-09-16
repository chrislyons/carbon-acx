from dash import Dash, html

from .components import bubble, references, sankey, stacked


def create_app() -> Dash:
    app = Dash(__name__)
    app.layout = html.Div([stacked.render(), bubble.render(), sankey.render(), references.render()])
    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run_server(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
