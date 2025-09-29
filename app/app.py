from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Iterable, Mapping

import copy
from dash import Dash, Input, Output, State, dcc, html

from calc import citations
from calc.schema import LayerId

from .components import bubble, disclosure, references, sankey, stacked, vintages
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


def _load_export_payload(base_dir: Path) -> dict | None:
    path = base_dir / "export_view.json"
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


def _normalise_sequence(values: Iterable[object]) -> list[str]:
    items: list[str] = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            items.append(text)
    return items


def _collect_methods(figures: Mapping[str, dict | None]) -> list[str]:
    methods: list[str] = []
    for payload in figures.values():
        if not isinstance(payload, Mapping):
            continue
        method = payload.get("method")
        if method:
            extend_unique([str(method)], methods)
    return methods


def _layer_metadata_from_export(export_payload: Mapping | None) -> dict[str, dict[str, list[str]]]:
    layer_metadata: dict[str, dict[str, list[str]]] = {}
    if not isinstance(export_payload, Mapping):
        return layer_metadata

    data = export_payload.get("data")
    if not isinstance(data, list):
        return layer_metadata

    metadata_accumulator: dict[str, dict[str, set[str]]] = {}
    for row in data:
        if not isinstance(row, Mapping):
            continue
        layer_id = row.get("layer_id")
        if not layer_id:
            continue
        key = str(layer_id)
        layer_entry = metadata_accumulator.setdefault(
            key,
            {"scopes": set(), "years": set(), "grid": set()},
        )

        scope_value = row.get("scope_boundary")
        if scope_value:
            layer_entry["scopes"].add(str(scope_value))

        year_value = row.get("emission_factor_vintage_year")
        if year_value not in (None, ""):
            layer_entry["years"].add(str(year_value))

        grid_region = row.get("grid_region")
        grid_year = row.get("grid_vintage_year")
        if grid_region and grid_year not in (None, ""):
            layer_entry["grid"].add(f"{grid_region} ({grid_year})")
        elif grid_region:
            layer_entry["grid"].add(str(grid_region))
        elif grid_year not in (None, ""):
            layer_entry["grid"].add(str(grid_year))

    for layer_id, values in metadata_accumulator.items():
        layer_metadata[layer_id] = {key: sorted(collection) for key, collection in values.items()}

    return layer_metadata


def _manifest_grid_sources(manifest: Mapping | None) -> list[str]:
    if not isinstance(manifest, Mapping):
        return []

    matrix = manifest.get("vintage_matrix")
    sources: list[str] = []
    if isinstance(matrix, Mapping):
        for region, year in matrix.items():
            if region and year not in (None, ""):
                sources.append(f"{region} ({year})")
            elif region:
                sources.append(str(region))
            elif year not in (None, ""):
                sources.append(str(year))

    if not sources:
        regions = manifest.get("regions")
        sources = _normalise_sequence(regions if isinstance(regions, Iterable) else [])

    return sorted(dict.fromkeys(sources))


def _manifest_emission_years(manifest: Mapping | None) -> list[str]:
    if not isinstance(manifest, Mapping):
        return []

    vintages = manifest.get("vintages")
    if not isinstance(vintages, Mapping):
        return []

    emission_years = vintages.get("emission_factors")
    if not isinstance(emission_years, Iterable):
        return []

    return sorted({str(year) for year in emission_years if year not in (None, "")})


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


def _order_reference_keys(keys: Iterable[str], reference_lookup: Mapping[str, int]) -> list[str]:
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
    export_payload = _load_export_payload(artifact_dir)
    reference_keys = _reference_keys(figures)
    reference_lookup = _reference_lookup(reference_keys)
    manifest_payload = _load_manifest_payload(artifact_dir)

    layer_metadata = _layer_metadata_from_export(export_payload)
    method_values = _collect_methods(figures)
    if isinstance(export_payload, Mapping):
        export_method = export_payload.get("method")
        if export_method:
            extend_unique([str(export_method)], method_values)

    metadata_store = {
        "layers": layer_metadata,
        "methods": method_values,
        "grid_sources": _manifest_grid_sources(manifest_payload),
        "emission_years": _manifest_emission_years(manifest_payload),
    }

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
            dcc.Store(id="theme-preference", storage_type="local"),
            dcc.Store(id="theme-mode"),
            dcc.Store(id="figures-store", data=figures),
            dcc.Store(id="available-layers", data=available_layers),
            dcc.Store(id="layer-citation-keys", data=layer_citation_keys),
            dcc.Store(id="metadata-store", data=metadata_store),
            html.Main(
                className="chart-column",
                children=[
                    html.Header(
                        [
                            html.Div(
                                [
                                    html.H1("Carbon ACX emissions overview"),
                                    html.Button(
                                        [
                                            html.Span(
                                                className="theme-toggle__icon",
                                                **{"aria-hidden": "true"},
                                            ),
                                            html.Span(
                                                "Theme: System (Light)",
                                                id="theme-toggle-label",
                                                className="theme-toggle__label",
                                            ),
                                        ],
                                        id="theme-toggle",
                                        className="theme-toggle",
                                        title="Cycle theme (system preference: Light)",
                                        **{"aria-label": "Cycle theme (system preference: Light)"},
                                        **{"data-mode": "system"},
                                    ),
                                ],
                                className="page-header__top",
                            ),
                            html.P(
                                "Figures sourced from precomputed artifacts. "
                                "Hover a chart to see supporting references."
                            ),
                            html.Div(
                                className="chart-toolbar",
                                children=[
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
                                                            {
                                                                "label": "Single layer",
                                                                "value": "single",
                                                            },
                                                            {
                                                                "label": "Compare layers",
                                                                "value": "compare",
                                                            },
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
                                    html.Div(
                                        id="chart-badges",
                                        className="chart-badges",
                                    ),
                                ],
                            ),
                            html.Details(
                                className="disclosure-panel",
                                open=True,
                                children=[
                                    html.Summary("Disclosure"),
                                    html.Div(
                                        disclosure.render(manifest_payload),
                                        className="disclosure-panel__content",
                                    ),
                                ],
                            ),
                        ]
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
        Input("theme-mode", "data"),
        State("figures-store", "data"),
    )
    def _update_panels(selected_layers, view_mode, theme_mode=None, figures_store=None):
        panels_class = "layer-panels"
        if figures_store is None and not isinstance(theme_mode, (str, type(None))):
            figures_store = theme_mode
            theme_mode = None

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
        dark_mode = isinstance(theme_mode, str) and theme_mode.lower() == "dark"
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
                            filtered.get("stacked"),
                            reference_lookup,
                            title_suffix=label,
                            dark=dark_mode,
                        ),
                        bubble.render(
                            filtered.get("bubble"),
                            reference_lookup,
                            title_suffix=label,
                            dark=dark_mode,
                        ),
                        sankey.render(
                            filtered.get("sankey"),
                            reference_lookup,
                            title_suffix=label,
                            dark=dark_mode,
                        ),
                    ],
                )
            )

        return children, panels_class

    def _format_badge(label: str, value: str) -> html.Div:
        return html.Div(
            className="chart-badge",
            children=[
                html.Span(label, className="chart-badge__label"),
                html.Span(value, className="chart-badge__value"),
            ],
        )

    def _format_values(values: Iterable[str], fallback: str) -> str:
        items = [item for item in values if item]
        if not items:
            return fallback
        if len(items) == 1:
            return items[0]
        return ", ".join(items)

    @app.callback(
        Output("chart-badges", "children"),
        Input("layer-selector", "value"),
        Input("view-mode", "value"),
        State("metadata-store", "data"),
        State("available-layers", "data"),
    )
    def _update_badges(selected_layers, view_mode, metadata_store, available_layers):
        layers = selected_layers or []
        if isinstance(layers, str):
            layers = [layers]
        layers = [layer for layer in layers if isinstance(layer, str)]

        available = available_layers if isinstance(available_layers, list) else []
        if available:
            layers = [layer for layer in layers if layer in available]

        ordered_layers = _order_layers(layers)
        if view_mode != "compare" and ordered_layers:
            ordered_layers = ordered_layers[:1]

        metadata = metadata_store if isinstance(metadata_store, Mapping) else {}
        layer_meta_map = metadata.get("layers") if isinstance(metadata, Mapping) else {}
        emission_years = metadata.get("emission_years") if isinstance(metadata, Mapping) else []
        methods = metadata.get("methods") if isinstance(metadata, Mapping) else []
        grid_sources = metadata.get("grid_sources") if isinstance(metadata, Mapping) else []

        scopes: list[str] = []
        years: list[str] = []
        grids: list[str] = []
        layer_labels: list[str] = []

        if isinstance(layer_meta_map, Mapping):
            for layer_id in ordered_layers:
                entry = layer_meta_map.get(layer_id)
                if isinstance(entry, Mapping):
                    extend_unique(entry.get("scopes", []), scopes)
                    extend_unique(entry.get("years", []), years)
                    extend_unique(entry.get("grid", []), grids)
                layer_labels.append(_layer_label(layer_id))

        if not layer_labels:
            layer_labels = [_layer_label(layer) for layer in ordered_layers]

        badges = [
            _format_badge("Scope", _format_values(scopes, "Not specified")),
            _format_badge(
                "Year",
                _format_values(years or emission_years or [], "No vintages"),
            ),
            _format_badge(
                "Layer",
                _format_values(layer_labels or ["None selected"], "None selected"),
            ),
            _format_badge("Method", _format_values(methods, "Unknown")),
            _format_badge(
                "Grid source",
                _format_values(grids or grid_sources or [], "Not available"),
            ),
        ]

        return badges

    app.clientside_callback(
        """
        function(nClicks, storedPreference) {
            const ctx = window.dash_clientside.callback_context;
            const trigger = ctx.triggered.length ? ctx.triggered[0] : {prop_id: ""};

            let state = "system";
            if (typeof storedPreference === "string") {
                const normalized = storedPreference.toLowerCase();
                if (normalized === "light" || normalized === "dark") {
                    state = normalized;
                }
            }

            const value = trigger.value;
            if (
                trigger.prop_id === "theme-toggle.n_clicks" &&
                value !== undefined &&
                value !== null
            ) {
                if (state === "system") {
                    state = "dark";
                } else if (state === "dark") {
                    state = "light";
                } else {
                    state = "system";
                }
            }

            const media = window.matchMedia("(prefers-color-scheme: dark)");
            const effective = state === "system" ? (media.matches ? "dark" : "light") : state;
            document.documentElement.setAttribute("data-theme", effective);
            window.__acxThemePreferenceState = state;

            if (!window.__acxThemeMediaListenerAttached) {
                media.addEventListener("change", (event) => {
                    if (window.__acxThemePreferenceState === "system") {
                        document.documentElement.setAttribute(
                            "data-theme",
                            event.matches ? "dark" : "light"
                        );
                    }
                });
                window.__acxThemeMediaListenerAttached = true;
            }

            const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
            const effectiveLabel = capitalize(effective);
            const labelText =
                state === "system"
                    ? `Theme: System (${effectiveLabel})`
                    : `Theme: ${effectiveLabel}`;
            const actionLabel =
                state === "system"
                    ? `Cycle theme (system preference: ${effectiveLabel})`
                    : `Cycle theme (current: ${effectiveLabel})`;

            return [
                state === "system" ? null : state,
                effective,
                state,
                labelText,
                actionLabel,
                actionLabel,
            ];
        }
        """,
        Output("theme-preference", "data"),
        Output("theme-mode", "data"),
        Output("theme-toggle", "data-mode"),
        Output("theme-toggle-label", "children"),
        Output("theme-toggle", "aria-label"),
        Output("theme-toggle", "title"),
        Input("theme-toggle", "n_clicks"),
        State("theme-preference", "data"),
    )

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
