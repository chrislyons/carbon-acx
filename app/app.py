from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict

from dash import Dash, html

from calc import citations

from .components import bubble, references, sankey, stacked
from .components._helpers import extend_unique

ARTIFACT_ENV = "ACX_ARTIFACT_DIR"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "calc" / "outputs"
FIGURE_NAMES = ("stacked", "bubble", "sankey")


def _artifact_dir() -> Path:
    env_value = os.environ.get(ARTIFACT_ENV)
    if env_value:
        return Path(env_value).expanduser()
    return DEFAULT_ARTIFACT_DIR


def _load_figure_payload(base_dir: Path, name: str) -> dict | None:
    path = base_dir / "figures" / f"{name}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _reference_keys(figures: Dict[str, dict | None]) -> list[str]:
    keys: list[str] = []
    for payload in figures.values():
        if not payload:
            continue
        extend_unique(payload.get("citation_keys", []), keys)
    return keys


def _reference_lookup(keys: list[str]) -> dict[str, int]:
    return {
        ref.key: idx
        for idx, ref in enumerate(citations.references_for(keys), start=1)
    }


def create_app() -> Dash:
    artifact_dir = _artifact_dir()
    figures = {name: _load_figure_payload(artifact_dir, name) for name in FIGURE_NAMES}
    reference_keys = _reference_keys(figures)
    reference_lookup = _reference_lookup(reference_keys)

    app = Dash(__name__)
    app.layout = html.Div(
        className="app-container",
        children=[
            html.Main(
                className="chart-column",
                children=[
                    html.Header(
                        [
                            html.H1("Carbon ACX emissions overview"),
                            html.P(
                                "Figures sourced from precomputed artifacts. "
                                "Hover a chart to see supporting references."
                            ),
                        ]
                    ),
                    stacked.render(figures.get("stacked"), reference_lookup),
                    bubble.render(figures.get("bubble"), reference_lookup),
                    sankey.render(figures.get("sankey"), reference_lookup),
                ],
            ),
            references.render(reference_keys),
        ],
    )
    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
