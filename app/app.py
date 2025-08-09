from dash import Dash, html

from .components import bubble, references, sankey, stacked


def create_app() -> Dash:
    app = Dash(__name__)
    app.layout = html.Div([stacked.render(), bubble.render(), sankey.render(), references.render()])
    return app


def main() -> None:
    create_app()


if __name__ == "__main__":
    main()
