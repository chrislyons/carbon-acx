from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Iterable, Mapping

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
    filtered["layers"] = [layer_id]

    layer_key_map = filtered.get("layer_citation_keys")
    if isinstance(layer_key_map, dict):
        keys = layer_key_map.get(layer_id, [])
        filtered["layer_citation_keys"] = {layer_id: keys}
        filtered["citation_keys"] = keys
    else:
        keys = None

    layer_ref_map = filtered.get("layer_references")
    if isinstance(layer_ref_map, dict):
        filtered["layer_references"] = {layer_id: layer_ref_map.get(layer_id, [])}
        if keys is not None:
            filtered["references"] = layer_ref_map.get(layer_id, filtered.get("references"))

    return filtered


def _order_layers(layers: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for layer in layers:
        if layer not in seen:
            seen.add(layer)
            unique.append(layer)
    return sorted(unique, key=_layer_order_index)


def _reference_rank(key: str, reference_lookup: Mapping[str, int]) -> tuple[int, str]:
    index = reference_lookup.get(key)
    if index is None:
        return (len(reference_lookup), key)
    return (index, key)


def _order_reference_keys(
    keys: Iterable[str], reference_lookup: Mapping[str, int]
) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for key in keys:
        if key in seen:
            continue
        seen.add(key)
        unique.append(key)
    return sorted(unique, key=lambda item: _reference_rank(item, reference_lookup))


def create_app() -> Dash:
    artifact_dir = _artifact_dir()
    figures = {name: _load_figure_payload(artifact_dir, name) for name in FIGURE_NAMES}
    reference_keys = _reference_keys(figures)
    reference_lookup = _reference_lookup(reference_keys)
    manifest_payload = _load_manifest_payload(artifact_dir)

    layer_citation_keys: dict[str, list[str]] = {}
    if isinstance(manifest_payload, dict):
        manifest_layers = manifest_payload.get("layer_citation_keys")
        if isinstance(manifest_layers, dict):
            layer_citation_keys = {
                str(layer): list(keys)
                for layer, keys in manifest_layers.items()
                if isinstance(keys, list)
            }

    available_layers = _collect_layers(figures)
    default_layers = [available_layers[0]] if available_layers else [LayerId.PROFESSIONAL.value]

    def _resolve_reference_keys(
        layers: Iterable[str], mapping: Mapping[str, list[str]] | None = None
    ) -> list[str]:
        active_map: Mapping[str, list[str]] = mapping or layer_citation_keys
        aggregated: list[str] = []
        has_mapping = bool(active_map)
        for layer in layers:
            extend_unique(active_map.get(layer, []), aggregated)
        if not aggregated and not has_mapping:
            aggregated = list(reference_keys)
        return _order_reference_keys(aggregated, reference_lookup)

    initial_reference_keys = _resolve_reference_keys(default_layers)
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
            dcc.Store(id="layer-citation-keys", data=layer_citation_keys),
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
                    references.render(initial_reference_keys),
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

    @app.callback(
        Output("references", "children"),
        Input("layer-selector", "value"),
        State("layer-citation-keys", "data"),
    )
    def _update_references(selected_layers, layer_map):
        layers = selected_layers or []
        if isinstance(layers, str):
            layers = [layers]
        layers = [layer for layer in layers if isinstance(layer, str)]
        ordered_layers = _order_layers(layers)

        mapping = layer_citation_keys
        if isinstance(layer_map, dict):
            mapping = {
                str(layer): list(keys)
                for layer, keys in layer_map.items()
                if isinstance(keys, list)
            }

        reference_keys_for_layers = _resolve_reference_keys(ordered_layers, mapping)
        return references.render_children(reference_keys_for_layers)

    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
