from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict

import copy
from dash import Dash, Input, Output, State, dcc, html

from calc import citations
from calc.schema import LayerId

from .components import bubble, references, sankey, stacked, vintages
from .components._helpers import extend_unique

ARTIFACT_ENV = "ACX_ARTIFACT_DIR"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "calc" / "outputs"
FIGURE_NAMES = ("stacked", "bubble", "sankey")

LAYER_ORDER = [layer.value for layer in LayerId]


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


def _load_manifest_payload(base_dir: Path) -> dict | None:
    path = base_dir / "manifest.json"
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
    return {ref.key: idx for idx, ref in enumerate(citations.references_for(keys), start=1)}


def _layer_order_index(layer_id: str) -> int:
    if layer_id in LAYER_ORDER:
        return LAYER_ORDER.index(layer_id)
    return len(LAYER_ORDER)


def _layer_label(layer_id: str) -> str:
    try:
        return LayerId(layer_id).label
    except ValueError:
        return layer_id.replace("_", " ").title()


def _collect_layers(figures: Dict[str, dict | None]) -> list[str]:
    layers: set[str] = set()
    for payload in figures.values():
        if not payload:
            continue
        data = payload.get("data")
        if isinstance(data, list):
            for row in data:
                if not isinstance(row, dict):
                    continue
                value = row.get("layer_id")
                if value:
                    layers.add(str(value))
        elif isinstance(data, dict):
            for link in data.get("links", []):
                if not isinstance(link, dict):
                    continue
                value = link.get("layer_id")
                if value:
                    layers.add(str(value))
    return sorted(layers, key=_layer_order_index)


def _row_layer(row: object) -> str | None:
    if isinstance(row, dict):
        value = row.get("layer_id")
    else:
        value = getattr(row, "layer_id", None)
    if value is None:
        return None
    return str(value)


def _filter_payload(payload: dict | None, layer_id: str | None) -> dict | None:
    if not payload or not layer_id:
        return payload
    filtered = copy.deepcopy(payload)
    data = filtered.get("data")
    if isinstance(data, list):
        filtered["data"] = [row for row in data if _row_layer(row) == layer_id]
    elif isinstance(data, dict):
        links = [link for link in data.get("links", []) if _row_layer(link) == layer_id]
        node_ids = {link.get("source") for link in links} | {link.get("target") for link in links}
        nodes = [node for node in data.get("nodes", []) if node.get("id") in node_ids]
        filtered["data"] = {"nodes": nodes, "links": links}
    return filtered


def _order_layers(layers: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for layer in layers:
        if layer not in seen:
            seen.add(layer)
            unique.append(layer)
    return sorted(unique, key=_layer_order_index)


def create_app() -> Dash:
    artifact_dir = _artifact_dir()
    figures = {name: _load_figure_payload(artifact_dir, name) for name in FIGURE_NAMES}
    reference_keys = _reference_keys(figures)
    reference_lookup = _reference_lookup(reference_keys)
    manifest_payload = _load_manifest_payload(artifact_dir)

    available_layers = _collect_layers(figures)
    default_layers = [available_layers[0]] if available_layers else [LayerId.PROFESSIONAL.value]
    layer_options: list[dict] = []
    for layer in LayerId:
        option = {"label": layer.label, "value": layer.value}
        if available_layers and layer.value not in available_layers:
            option["disabled"] = True
        layer_options.append(option)

    app = Dash(__name__)
    app.layout = html.Div(
        className="app-container",
        children=[
            dcc.Store(id="figures-store", data=figures),
            dcc.Store(id="available-layers", data=available_layers),
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
                    html.Section(
                        className="chart-controls",
                        children=[
                            html.Div(
                                [
                                    html.Label(
                                        "Select layers",
                                        htmlFor="layer-selector",
                                        className="chart-controls__label",
                                    ),
                                    dcc.Checklist(
                                        id="layer-selector",
                                        options=layer_options,
                                        value=default_layers,
                                        inline=True,
                                        className="chart-controls__checklist",
                                    ),
                                ],
                                className="chart-controls__group",
                            ),
                            html.Div(
                                [
                                    html.Label(
                                        "View mode",
                                        htmlFor="view-mode",
                                        className="chart-controls__label",
                                    ),
                                    dcc.RadioItems(
                                        id="view-mode",
                                        options=[
                                            {"label": "Single layer", "value": "single"},
                                            {"label": "Compare layers", "value": "compare"},
                                        ],
                                        value="single",
                                        inline=True,
                                        className="chart-controls__radios",
                                    ),
                                ],
                                className="chart-controls__group",
                            ),
                        ],
                    ),
                    html.Div(id="layer-panels", className="layer-panels"),
                ],
            ),
            html.Div(
                [
                    vintages.render(manifest_payload),
                    references.render(reference_keys),
                ],
                className="sidebar-panels",
            ),
        ],
    )

    @app.callback(
        Output("layer-panels", "children"),
        Output("layer-panels", "className"),
        Input("layer-selector", "value"),
        Input("view-mode", "value"),
        State("figures-store", "data"),
    )
    def _update_panels(selected_layers, view_mode, figures_store):
        panels_class = "layer-panels"
        if not figures_store:
            empty = html.Div(className="layer-empty", children=html.P("No charts available."))
            return [empty], panels_class

        layers = selected_layers or []
        if isinstance(layers, str):
            layers = [layers]
        layers = [layer for layer in layers if isinstance(layer, str)]

        available = _collect_layers(figures_store)
        if available:
            layers = [layer for layer in layers if layer in available]

        ordered_layers = _order_layers(layers)
        if view_mode != "compare" and ordered_layers:
            ordered_layers = ordered_layers[:1]

        if not ordered_layers:
            empty = html.Div(
                className="layer-empty",
                children=html.P("Select at least one layer to view charts."),
            )
            return [empty], panels_class

        if view_mode == "compare" and len(ordered_layers) > 1:
            panels_class += " layer-panels--grid"

        children: list = []
        for layer_id in ordered_layers:
            label = _layer_label(layer_id)
            filtered = {
                name: _filter_payload(payload, layer_id) for name, payload in figures_store.items()
            }
            children.append(
                html.Div(
                    className="layer-panel",
                    children=[
                        stacked.render(
                            filtered.get("stacked"), reference_lookup, title_suffix=label
                        ),
                        bubble.render(filtered.get("bubble"), reference_lookup, title_suffix=label),
                        sankey.render(filtered.get("sankey"), reference_lookup, title_suffix=label),
                    ],
                )
            )

        return children, panels_class

    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
