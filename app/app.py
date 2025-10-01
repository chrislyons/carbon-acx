from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, Mapping
from urllib.parse import parse_qs, urlencode, quote

import dash

import copy
from dash import ALL, Dash, Input, Output, State, dcc, html, no_update

from calc import citations
from calc.schema import LayerId

from .components import (
    bubble,
    disclosure,
    intensity,
    references,
    sankey,
    stacked,
    vintages,
)
from .lib import narratives
from .components._helpers import extend_unique

ARTIFACT_ENV = "ACX_ARTIFACT_DIR"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "calc" / "outputs"
FIGURE_NAMES = ("stacked", "bubble", "sankey")

LAYER_ORDER = [layer.value for layer in LayerId]
CIVILIAN_LAYERS = {LayerId.PROFESSIONAL.value, LayerId.ONLINE.value}


def _artifact_dir() -> Path:
    env_value = os.environ.get(ARTIFACT_ENV)
    if env_value:
        return Path(env_value).expanduser()
    return DEFAULT_ARTIFACT_DIR


@lru_cache(maxsize=None)
def _cached_json_payload(path: str) -> dict | None:
    path_obj = Path(path)
    if not path_obj.exists():
        return None
    try:
        return json.loads(path_obj.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _load_figure_payload(base_dir: Path, name: str) -> dict | None:
    path = base_dir / "figures" / f"{name}.json"
    return _cached_json_payload(str(path))


def _load_export_payload(base_dir: Path) -> dict | None:
    path = base_dir / "export_view.json"
    return _cached_json_payload(str(path))


def _load_manifest_payload(base_dir: Path) -> dict | None:
    path = base_dir / "manifest.json"
    return _cached_json_payload(str(path))


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


def _coerce_activity_id(value) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        for item in value:
            candidate = _coerce_activity_id(item)
            if candidate:
                return candidate
        return None
    if isinstance(value, Mapping):
        for key in ("activity_id", "activityId", "id"):
            candidate = _coerce_activity_id(value.get(key))
            if candidate:
                return candidate
        return None
    return str(value)


def _extract_activity_id(click_data) -> str | None:
    if not isinstance(click_data, Mapping):
        return None
    points = click_data.get("points")
    if not isinstance(points, list):
        return None
    for point in points:
        if not isinstance(point, Mapping):
            continue
        candidate = _coerce_activity_id(point.get("customdata"))
        if candidate:
            return candidate
        candidate = _coerce_activity_id(point.get("activity_id"))
        if candidate:
            return candidate
    return None


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

    intensity_records = intensity.load_intensity_records()
    intensity_labels = intensity.load_functional_unit_labels()
    intensity_sections = intensity.load_reference_sections()
    intensity_options = intensity.functional_unit_options(intensity_records, intensity_labels)
    intensity_default_fu = intensity_options[0]["value"] if intensity_options else None
    intensity_initial_figure = intensity.build_figure(
        intensity_records,
        intensity_default_fu,
    )
    intensity_initial_references = intensity.render_references_children(
        intensity_sections,
        intensity_default_fu,
        intensity_labels,
    )
    intensity_initial_status = intensity.status_message(
        intensity_records,
        intensity_default_fu,
        intensity_labels,
    )

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

    def _coerce_layer_values(value) -> list[str]:
        if isinstance(value, str):
            return [value]
        if isinstance(value, Iterable):
            return [str(item) for item in value if isinstance(item, str)]
        return []

    def _active_layers_for(
        value, view_mode: str, available_candidates: Iterable[str] | None
    ) -> list[str]:
        layers = _coerce_layer_values(value)
        candidates = [str(item) for item in available_candidates or []]
        if candidates:
            layers = [layer for layer in layers if layer in candidates]
        ordered = _order_layers(layers)
        if view_mode != "compare" and ordered:
            return ordered[:1]
        return ordered

    def _resolve_upstream_chain(
        activity_id: str | None,
        figures_store_value,
        *,
        layer_hint: str | None = None,
    ) -> tuple[str | None, list[dict[str, object]]]:
        if not activity_id or not isinstance(figures_store_value, Mapping):
            return None, []
        bubble_payload = figures_store_value.get("bubble")
        if not isinstance(bubble_payload, Mapping):
            return None, []
        data = bubble_payload.get("data")
        if not isinstance(data, list):
            return None, []

        best_layer: str | None = None
        best_entries: list[dict[str, object]] = []

        def _share_value(payload: Mapping[str, object]) -> float:
            try:
                return float(payload.get("share") or 0.0)
            except (TypeError, ValueError):
                return 0.0

        for row in data:
            if not isinstance(row, Mapping):
                continue
            raw_activity = row.get("activity_id")
            if not raw_activity:
                continue
            if str(raw_activity) != activity_id:
                continue
            row_layer = _row_layer(row)
            raw_chain = row.get("upstream_chain")
            if isinstance(raw_chain, list):
                entries = [dict(entry) for entry in raw_chain if isinstance(entry, Mapping)]
            else:
                entries = []
            entries.sort(key=_share_value, reverse=True)
            if layer_hint and row_layer != layer_hint:
                if best_layer is None and entries:
                    best_layer = row_layer
                    best_entries = entries
                continue
            if entries:
                return row_layer, entries
            if best_layer is None:
                best_layer = row_layer
                best_entries = entries

        return best_layer, best_entries

    def _summarise_layers(
        layers: list[str], metadata_store_value: Mapping | None
    ) -> dict[str, list[str]]:
        metadata = metadata_store_value if isinstance(metadata_store_value, Mapping) else {}
        layer_meta_map = metadata.get("layers") if isinstance(metadata, Mapping) else {}
        emission_years = metadata.get("emission_years") if isinstance(metadata, Mapping) else []
        methods = metadata.get("methods") if isinstance(metadata, Mapping) else []
        grid_sources = metadata.get("grid_sources") if isinstance(metadata, Mapping) else []

        scopes: list[str] = []
        years: list[str] = []
        grids: list[str] = []
        labels: list[str] = []

        if isinstance(layer_meta_map, Mapping):
            for layer_id in layers:
                entry = layer_meta_map.get(layer_id)
                if isinstance(entry, Mapping):
                    extend_unique(entry.get("scopes", []), scopes)
                    extend_unique(entry.get("years", []), years)
                    extend_unique(entry.get("grid", []), grids)
                labels.append(_layer_label(layer_id))
        else:
            labels = [_layer_label(layer) for layer in layers]

        if not labels:
            labels = [_layer_label(layer) for layer in layers]

        return {
            "scopes": scopes,
            "years": years,
            "grids": grids,
            "layer_labels": labels,
            "methods": methods if isinstance(methods, list) else [],
            "grid_sources": grid_sources if isinstance(grid_sources, list) else [],
            "emission_years": emission_years if isinstance(emission_years, list) else [],
        }

    def _format_values(values: Iterable[str], fallback: str) -> str:
        items = [item for item in values if item]
        if not items:
            return fallback
        if len(items) == 1:
            return items[0]
        return ", ".join(items)

    def _build_share_payload(
        selected_layers, view_mode_value: str, metadata_store_value, available_candidates
    ) -> dict[str, object]:
        ordered_layers = _active_layers_for(selected_layers, view_mode_value, available_candidates)
        summary = _summarise_layers(ordered_layers, metadata_store_value)
        year_candidates = summary["years"] or summary["emission_years"]
        scope_text = _format_values(summary["scopes"], "Not specified")
        year_text = _format_values(year_candidates, "No vintages")
        layer_text = _format_values(summary["layer_labels"] or ["None selected"], "None selected")
        caption = " • ".join(
            [
                f"Scope: {scope_text}",
                f"Year: {year_text}",
                f"Layer: {layer_text}",
            ]
        )
        title = "Annual emissions by activity category"
        if ordered_layers:
            if view_mode_value == "compare" and len(summary["layer_labels"]) > 1:
                suffix = ", ".join(summary["layer_labels"])
            else:
                suffix = summary["layer_labels"][0]
            if suffix:
                title = f"{title} — {suffix}"
        slug = ordered_layers[0] if ordered_layers else "overview"
        return {
            "layers": ordered_layers,
            "viewMode": view_mode_value,
            "scope": scope_text,
            "year": year_text,
            "layer": layer_text,
            "scope_values": summary["scopes"],
            "year_values": year_candidates,
            "layer_labels": summary["layer_labels"],
            "caption": caption,
            "chartTitle": title,
            "fileSlug": slug,
        }

    def _build_permalink_query(share_payload: Mapping[str, object]) -> str:
        params: list[tuple[str, str]] = []
        layers = share_payload.get("layers")
        if isinstance(layers, list) and layers:
            params.append(("layer", ",".join(str(layer) for layer in layers)))
        view_mode_value = share_payload.get("viewMode")
        if view_mode_value == "compare":
            params.append(("view", "compare"))
        scope_values = share_payload.get("scope_values")
        if isinstance(scope_values, list) and scope_values:
            params.append(("scope", ",".join(str(item) for item in scope_values)))
        year_values = share_payload.get("year_values")
        if isinstance(year_values, list) and year_values:
            params.append(("year", ",".join(str(item) for item in year_values)))
        if not params:
            return ""
        return "?" + urlencode(params, quote_via=quote, safe=",")

    initial_share_data = _build_share_payload(
        default_layers, "single", metadata_store, available_layers
    )

    app = Dash(__name__)
    app.layout = html.Div(
        className="app-container",
        children=[
            dcc.Location(id="url"),
            dcc.Store(id="theme-preference", storage_type="local"),
            dcc.Store(id="theme-mode"),
            dcc.Store(id="figures-store", data=figures),
            dcc.Store(id="available-layers", data=available_layers),
            dcc.Store(id="layer-citation-keys", data=layer_citation_keys),
            dcc.Store(id="metadata-store", data=metadata_store),
            dcc.Store(id="default-layers", data=default_layers),
            dcc.Store(id="share-data", data=initial_share_data),
            dcc.Store(id="copy-status"),
            dcc.Store(id="download-status"),
            dcc.Store(id="acx-active-activity"),
            dcc.Store(id="intensity-records", data=intensity_records),
            dcc.Store(id="intensity-functional-unit-labels", data=intensity_labels),
            dcc.Store(id="intensity-reference-sections", data=intensity_sections),
            html.Main(
                className="app-main",
                children=[
                    html.Small(
                        "Units: g/FU = grams CO₂e per functional unit; "
                        "kg/yr = kilograms CO₂e per year; "
                        "pkm = passenger-kilometres; h = hours.",
                        className="unit-legend",
                    ),
                    html.Div(
                        id="overview-view",
                        className="overview-view",
                        children=[
                            html.Div(
                                className="overview-grid",
                                children=[
                                    html.Aside(
                                        className="overview-controls",
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
                                                ]
                                            ),
                                            html.P(
                                                "Figures sourced from precomputed artifacts. "
                                                "Hover a chart to see supporting references.",
                                            ),
                                            dcc.Tabs(
                                                id="app-view-tabs",
                                                value="overview",
                                                className="chart-tabs",
                                                children=[
                                                    dcc.Tab(
                                                        label="Overview",
                                                        value="overview",
                                                        className="chart-tabs__tab",
                                                        selected_className="chart-tabs__tab--selected",
                                                    ),
                                                    dcc.Tab(
                                                        label="Intensity",
                                                        value="intensity",
                                                        className="chart-tabs__tab",
                                                        selected_className="chart-tabs__tab--selected",
                                                    ),
                                                ],
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
                                                className="chart-downloads",
                                                children=[
                                                    html.Button(
                                                        "Copy link",
                                                        id="copy-link-btn",
                                                        className="chart-downloads__button",
                                                        type="button",
                                                    ),
                                                    html.Button(
                                                        "Download PNG",
                                                        id="download-png-btn",
                                                        className="chart-downloads__button",
                                                        type="button",
                                                    ),
                                                    html.Button(
                                                        "Clear selection",
                                                        id="clear-activity-selection",
                                                        className="chart-downloads__button",
                                                        type="button",
                                                        disabled=True,
                                                    ),
                                                    html.Span(
                                                        id="share-status",
                                                        className="chart-downloads__status",
                                                        **{"aria-live": "polite", "role": "status"},
                                                    ),
                                                ],
                                            ),
                                            html.Div(
                                                id="chart-badges",
                                                className="chart-badges",
                                            ),
                                            html.Details(
                                                className="disclosure-panel",
                                                id="overview-disclosure",
                                                open=True,
                                                children=[
                                                    html.Summary("Disclosure"),
                                                    html.Div(
                                                        disclosure.render(manifest_payload),
                                                        className="disclosure-panel__content",
                                                    ),
                                                ],
                                            ),
                                            vintages.render(manifest_payload),
                                        ],
                                    ),
                                    html.Section(
                                        id="overview-visualization",
                                        className="overview-visualization",
                                        children=[
                                            html.Div(id="layer-panels", className="layer-panels"),
                                            html.Div(
                                                id="upstream-chips",
                                                className="upstream-chips",
                                            ),
                                            html.Div(
                                                id="activity-narrative",
                                                className="chart-narrative",
                                                **{"aria-live": "polite", "role": "status"},
                                            ),
                                            html.Details(
                                                className="references-accordion",
                                                id="references-accordion",
                                                **{"data-behavior": "references-accordion"},
                                                children=[
                                                    html.Summary("References"),
                                                    html.Div(
                                                        references.render_children(
                                                            initial_reference_keys,
                                                            include_heading=False,
                                                        ),
                                                        id="references",
                                                        className="references-panel",
                                                    ),
                                                ],
                                            ),
                                        ],
                                    ),
                                ],
                            )
                        ],
                    ),
                ],
            ),
            html.Div(
                intensity.render_layout(
                    intensity_options,
                    intensity_default_fu,
                    intensity_initial_figure,
                    intensity_initial_references,
                    status_text=intensity_initial_status,
                ),
                id="intensity-view",
                className="intensity-container",
                style={"display": "none"},
            ),
        ],
    )

    @app.callback(
        Output("overview-view", "style"),
        Output("intensity-view", "style"),
        Input("app-view-tabs", "value"),
    )
    def _toggle_view(tab_value: str | None):
        if tab_value == "intensity":
            return {"display": "none"}, {"display": "block"}
        default_style: dict[str, str] = {}
        return default_style, {"display": "none"}

    @app.callback(
        Output("layer-selector", "value"),
        Output("view-mode", "value"),
        Input("url", "search"),
        Input("url", "hash"),
        State("available-layers", "data"),
        State("default-layers", "data"),
    )
    def _sync_state_from_url(
        search_value, hash_value, available_layers_state, default_layers_state
    ):
        def _coerce_sequence(value) -> list[str]:
            if isinstance(value, list):
                return [str(item) for item in value if isinstance(item, str)]
            return []

        available = _coerce_sequence(available_layers_state)
        fallback = _coerce_sequence(default_layers_state)
        if available:
            fallback = [layer for layer in fallback if layer in available] or available[:1]
        if not fallback:
            fallback = [LayerId.PROFESSIONAL.value]

        query_string = ""
        if isinstance(search_value, str) and search_value:
            query_string = search_value.lstrip("?")
        elif isinstance(hash_value, str) and hash_value:
            query_string = hash_value.lstrip("#")
            if query_string.startswith("?"):
                query_string = query_string[1:]

        parsed = parse_qs(query_string, keep_blank_values=False) if query_string else {}
        layer_values: list[str] = []
        if parsed:
            layer_param = parsed.get("layer") or parsed.get("layers")
            if layer_param:
                raw_value = layer_param[-1]
                for part in str(raw_value).split(","):
                    candidate = part.strip()
                    if candidate:
                        layer_values.append(candidate)

        view_tokens = parsed.get("view") or parsed.get("mode") if parsed else None
        view_mode = "compare" if view_tokens and view_tokens[-1].lower() == "compare" else "single"

        ordered_layers = _active_layers_for(layer_values, view_mode, available or fallback)
        if not ordered_layers:
            ordered_layers = _active_layers_for(fallback, view_mode, available or fallback)

        return ordered_layers, view_mode

    @app.callback(
        Output("layer-panels", "children"),
        Output("layer-panels", "className"),
        Input("layer-selector", "value"),
        Input("view-mode", "value"),
        Input("theme-mode", "data"),
        Input("acx-active-activity", "data"),
        State("figures-store", "data"),
    )
    def _update_panels(
        selected_layers,
        view_mode,
        theme_mode=None,
        active_activity=None,
        figures_store=None,
    ):
        panels_class = "layer-panels"
        if figures_store is None and not isinstance(theme_mode, (str, type(None))):
            figures_store = theme_mode
            theme_mode = None

        if not figures_store:
            empty = html.Div(className="layer-empty", children=html.P("No charts available."))
            return [empty], panels_class

        available = _collect_layers(figures_store)
        ordered_layers = _active_layers_for(selected_layers, view_mode, available)

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
                            layer_id=layer_id,
                            active_activity=active_activity,
                        ),
                        bubble.render(
                            filtered.get("bubble"),
                            reference_lookup,
                            title_suffix=label,
                            dark=dark_mode,
                            layer_id=layer_id,
                            active_activity=active_activity,
                        ),
                        sankey.render(
                            filtered.get("sankey"),
                            reference_lookup,
                            title_suffix=label,
                            dark=dark_mode,
                            layer_id=layer_id,
                            active_activity=active_activity,
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

    @app.callback(
        Output("acx-active-activity", "data"),
        Input({"component": "stacked-chart", "layer": ALL}, "clickData"),
        Input({"component": "bubble-chart", "layer": ALL}, "clickData"),
        Input({"component": "sankey-chart", "layer": ALL}, "clickData"),
        Input("clear-activity-selection", "n_clicks"),
        State("acx-active-activity", "data"),
        prevent_initial_call=True,
    )
    def _sync_active_activity(
        stacked_clicks, bubble_clicks, sankey_clicks, clear_clicks, current_value
    ):
        if not dash.callback_context.triggered:
            return no_update
        triggered = dash.callback_context.triggered[0]
        prop_id = triggered.get("prop_id")
        if prop_id == "clear-activity-selection.n_clicks":
            return None
        value = triggered.get("value")
        activity_id = _extract_activity_id(value)
        if activity_id:
            return activity_id
        if isinstance(value, Mapping):
            return no_update
        if prop_id and prop_id.endswith("clickData"):
            return no_update if current_value is None else current_value
        return no_update

    @app.callback(
        Output("clear-activity-selection", "disabled"),
        Input("acx-active-activity", "data"),
    )
    def _toggle_clear_button(active_activity):
        return active_activity in (None, "")

    @app.callback(
        Output("activity-narrative", "children"),
        Input("acx-active-activity", "data"),
    )
    def _render_activity_narrative(active_activity):
        if not active_activity:
            return ""
        blurb = narratives.pairwise_blurb(None, active_activity, None)
        if not blurb:
            return ""
        return html.P(blurb)

    @app.callback(
        Output("upstream-chips", "children"),
        Input({"component": "bubble-chart", "layer": ALL}, "hoverData"),
        Input("acx-active-activity", "data"),
        State("figures-store", "data"),
    )
    def _render_upstream_chips(bubble_hovers, active_activity, figures_store_value):
        triggered_id = getattr(dash.callback_context, "triggered_id", None)
        activity_id = None
        layer_hint = None

        if isinstance(triggered_id, dict) and triggered_id.get("component") == "bubble-chart":
            triggered_value = dash.callback_context.triggered[0]["value"]
            activity_id = _extract_activity_id(triggered_value)
            layer_hint = triggered_id.get("layer")

        if not activity_id and isinstance(bubble_hovers, list):
            for hover in bubble_hovers:
                candidate = _extract_activity_id(hover)
                if candidate:
                    activity_id = candidate
                    break

        if not activity_id and isinstance(active_activity, str):
            activity_id = active_activity

        if not activity_id:
            return []

        layer_id, upstream_entries = _resolve_upstream_chain(
            activity_id,
            figures_store_value,
            layer_hint=layer_hint,
        )

        effective_layer = layer_id or layer_hint
        if effective_layer not in CIVILIAN_LAYERS:
            return []
        if not upstream_entries:
            return []

        chips: list[html.Component] = []
        for entry in upstream_entries:
            operation_id = entry.get("operation_id")
            if not operation_id:
                continue
            label = (
                entry.get("operation_activity_label")
                or entry.get("operation_activity_name")
                or entry.get("operation_activity_id")
                or operation_id
            )
            brand = entry.get("operation_entity_name") or entry.get("operation_asset_name")
            children: list[html.Component] = [
                html.Span(str(label), className="upstream-chip__name")
            ]
            if brand:
                children.append(html.Span(str(brand), className="upstream-chip__brand"))

            share = entry.get("share")
            share_text = None
            try:
                if share is not None:
                    share_value = float(share)
                    share_text = f"{share_value * 100:.0f}% share"
            except (TypeError, ValueError):
                share_text = None

            notes = entry.get("notes")
            tooltip_parts = [part for part in (share_text, notes) if part]
            chip_kwargs: dict[str, object] = {}
            if tooltip_parts:
                chip_kwargs["title"] = " — ".join(str(part) for part in tooltip_parts)

            fu_id = entry.get("operation_functional_unit_id")
            chip_id = {
                "component": "upstream-chip",
                "operation": str(operation_id),
                "fu": str(fu_id) if fu_id else "__none__",
            }
            chips.append(
                html.Button(
                    children,
                    id=chip_id,
                    className="upstream-chip",
                    type="button",
                    **chip_kwargs,
                )
            )

        if not chips:
            return []

        return [
            html.Span("Upstream:", className="upstream-chips__label"),
            html.Div(chips, className="upstream-chips__list"),
        ]

    @app.callback(
        Output("chart-badges", "children"),
        Input("layer-selector", "value"),
        Input("view-mode", "value"),
        State("metadata-store", "data"),
        State("available-layers", "data"),
    )
    def _update_badges(selected_layers, view_mode, metadata_store, available_layers):
        ordered_layers = _active_layers_for(
            selected_layers,
            view_mode,
            available_layers if isinstance(available_layers, list) else [],
        )
        summary = _summarise_layers(ordered_layers, metadata_store)
        emission_years = summary["years"] or summary["emission_years"]
        layer_labels = summary["layer_labels"] or [_layer_label(layer) for layer in ordered_layers]
        grid_values = summary["grids"] or summary["grid_sources"]
        methods = summary["methods"]

        badges = [
            _format_badge("Scope", _format_values(summary["scopes"], "Not specified")),
            _format_badge(
                "Year",
                _format_values(emission_years or [], "No vintages"),
            ),
            _format_badge(
                "Layer",
                _format_values(layer_labels or ["None selected"], "None selected"),
            ),
            _format_badge("Method", _format_values(methods, "Unknown")),
            _format_badge(
                "Grid source",
                _format_values(grid_values or [], "Not available"),
            ),
        ]

        return badges

    @app.callback(
        Output("app-view-tabs", "value"),
        Output("intensity-functional-unit", "value"),
        Output("intensity-include-operations", "value"),
        Input({"component": "upstream-chip", "operation": ALL, "fu": ALL}, "n_clicks"),
        State("intensity-functional-unit", "value"),
        State("intensity-include-operations", "value"),
        prevent_initial_call=True,
    )
    def _drill_to_intensity(chip_clicks, current_fu, include_operations_state):
        triggered_id = getattr(dash.callback_context, "triggered_id", None)
        if not isinstance(triggered_id, dict) or triggered_id.get("component") != "upstream-chip":
            raise dash.exceptions.PreventUpdate

        fu_id = triggered_id.get("fu")
        target_fu = current_fu
        if fu_id and fu_id != "__none__":
            target_fu = fu_id

        include_operations: list[str] = []
        if isinstance(include_operations_state, (list, tuple)):
            include_operations = [
                str(item) for item in include_operations_state if isinstance(item, str)
            ]
        if "operations" not in include_operations:
            include_operations = include_operations + ["operations"]

        return "intensity", target_fu, include_operations

    @app.callback(
        Output("url", "search"),
        Output("share-data", "data"),
        Input("layer-selector", "value"),
        Input("view-mode", "value"),
        State("metadata-store", "data"),
        State("available-layers", "data"),
        State("url", "search"),
        prevent_initial_call=True,
    )
    def _update_permalink(
        selected_layers,
        view_mode,
        metadata_store_value,
        available_layers_value,
        current_search,
    ):
        available = (
            [str(item) for item in available_layers_value if isinstance(item, str)]
            if isinstance(available_layers_value, list)
            else []
        )
        share_payload = _build_share_payload(
            selected_layers, view_mode, metadata_store_value, available
        )
        search_value = _build_permalink_query(share_payload)
        if search_value == current_search:
            search_output = no_update
        else:
            search_output = search_value
        return search_output, share_payload

    @app.callback(
        Output("share-status", "children"),
        Output("share-status", "className"),
        Input("copy-status", "data"),
        Input("download-status", "data"),
        prevent_initial_call=True,
    )
    def _share_feedback(copy_status, download_status):
        base_class = "chart-downloads__status"
        triggered = getattr(dash.callback_context, "triggered_id", None)
        if triggered == "copy-status" and isinstance(copy_status, Mapping):
            status = copy_status.get("status")
            if status == "success":
                return "Link copied to clipboard.", base_class
            if status == "error":
                return (
                    "Unable to copy link.",
                    f"{base_class} chart-downloads__status--error",
                )
        elif triggered == "download-status" and isinstance(download_status, Mapping):
            status = download_status.get("status")
            if status == "success":
                return "PNG downloaded.", base_class
            if status == "error":
                return (
                    "Unable to export PNG.",
                    f"{base_class} chart-downloads__status--error",
                )
        return "", base_class

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

    app.clientside_callback(
        """
        async function(nClicks) {
            if (!nClicks) {
                return window.dash_clientside.no_update;
            }

            const url =
                window.location.origin +
                window.location.pathname +
                window.location.search +
                window.location.hash;

            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    await navigator.clipboard.writeText(url);
                } else {
                    const textarea = document.createElement("textarea");
                    textarea.value = url;
                    textarea.setAttribute("readonly", "");
                    textarea.style.position = "absolute";
                    textarea.style.left = "-9999px";
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                }
                return {status: "success", timestamp: Date.now()};
            } catch (error) {
                console.error("Copy failed", error);
                return {status: "error", timestamp: Date.now()};
            }
        }
        """,
        Output("copy-status", "data"),
        Input("copy-link-btn", "n_clicks"),
        prevent_initial_call=True,
    )

    app.clientside_callback(
        """
        async function(nClicks, shareData) {
            if (!nClicks) {
                return window.dash_clientside.no_update;
            }
            if (!window.Plotly || typeof window.Plotly.toImage !== "function") {
                return {status: "error", timestamp: Date.now()};
            }

            const target = document.querySelector(
                ".layer-panel .chart-section--stacked .js-plotly-plot"
            );
            if (!target) {
                return {status: "error", timestamp: Date.now()};
            }

            try {
                const dataUrl = await window.Plotly.toImage(target, {
                    format: "png",
                    scale: 2,
                });

                const img = await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = dataUrl;
                });

                const styles = getComputedStyle(document.documentElement);
                const background = styles.getPropertyValue("--color-background").trim() || "#ffffff";
                const textColor = styles.getPropertyValue("--color-text").trim() || "#0f172a";
                const mutedColor = styles.getPropertyValue("--color-text-muted").trim() || "#475569";
                const accentColor = styles.getPropertyValue("--color-accent").trim() || "#2563eb";

                const padding = 80;
                const minWidth = 1200;
                const canvasWidth = Math.max(img.width + padding * 2, minWidth);
                const textWidth = canvasWidth - padding * 2;
                const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
                const title = shareData && shareData.chartTitle
                    ? shareData.chartTitle
                    : "Carbon ACX emissions overview";
                const caption = shareData && shareData.caption ? shareData.caption : "";

                const wrapText = (ctx, text, maxWidth) => {
                    if (!text) {
                        return [];
                    }
                    const words = text.split(/\\s+/).filter(Boolean);
                    const lines = [];
                    let current = "";
                    for (const word of words) {
                        const testLine = current ? `${current} ${word}` : word;
                        if (ctx.measureText(testLine).width > maxWidth && current) {
                            lines.push(current);
                            current = word;
                        } else {
                            current = testLine;
                        }
                    }
                    if (current) {
                        lines.push(current);
                    }
                    return lines;
                };

                const canvas = document.createElement("canvas");
                const measureCtx = canvas.getContext("2d");
                const titleSize = 40;
                const captionSize = 22;
                const footerSize = 16;
                const titleLineHeight = Math.round(titleSize * 1.2);
                const captionLineHeight = Math.round(captionSize * 1.35);

                measureCtx.font = `600 ${titleSize}px ${fontStack}`;
                const titleLines = wrapText(measureCtx, title, textWidth);
                measureCtx.font = `500 ${captionSize}px ${fontStack}`;
                const captionLines = wrapText(measureCtx, caption, textWidth);

                const titleHeight = (titleLines.length || 1) * titleLineHeight;
                const captionHeight = captionLines.length
                    ? captionLines.length * captionLineHeight + 32
                    : 0;
                const footerHeight = Math.round(footerSize * 1.6) + 8;
                const totalHeight = Math.round(
                    padding + titleHeight + 24 + img.height + captionHeight + footerHeight + padding
                );

                canvas.width = canvasWidth;
                canvas.height = totalHeight;
                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingQuality = "high";
                ctx.fillStyle = background;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = textColor;
                ctx.font = `600 ${titleSize}px ${fontStack}`;
                ctx.textBaseline = "top";
                let cursorY = padding;
                const titleRenderLines = titleLines.length ? titleLines : [title];
                for (const line of titleRenderLines) {
                    ctx.fillText(line, padding, cursorY);
                    cursorY += titleLineHeight;
                }

                cursorY += 24;
                const imageX = Math.max(padding, (canvas.width - img.width) / 2);
                ctx.drawImage(img, imageX, cursorY);
                cursorY += img.height;

                if (captionLines.length) {
                    cursorY += 32;
                    ctx.fillStyle = mutedColor || textColor;
                    ctx.font = `500 ${captionSize}px ${fontStack}`;
                    for (const line of captionLines) {
                        ctx.fillText(line, padding, cursorY);
                        cursorY += captionLineHeight;
                    }
                }

                cursorY += 32;
                ctx.font = `600 ${footerSize}px ${fontStack}`;
                ctx.fillStyle = mutedColor || textColor;
                ctx.fillText("carbonacx.org", padding, cursorY);
                ctx.textAlign = "right";
                ctx.fillStyle = accentColor || textColor;
                ctx.fillText("Carbon ACX", canvas.width - padding, cursorY);
                ctx.textAlign = "left";

                const link = document.createElement("a");
                const slug = shareData && shareData.fileSlug ? shareData.fileSlug : "overview";
                link.download = `carbon-acx-${slug}.png`;
                link.href = canvas.toDataURL("image/png");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                return {status: "success", timestamp: Date.now()};
            } catch (error) {
                console.error("PNG export failed", error);
                return {status: "error", timestamp: Date.now()};
            }
        }
        """,
        Output("download-status", "data"),
        Input("download-png-btn", "n_clicks"),
        State("share-data", "data"),
        prevent_initial_call=True,
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
        return references.render_children(
            reference_keys_for_layers,
            include_heading=False,
        )

    @app.callback(
        Output("intensity-figure", "figure"),
        Output("intensity-status", "children"),
        Output("intensity-references", "children"),
        Input("intensity-functional-unit", "value"),
        Input("intensity-include-operations", "value"),
        Input("theme-mode", "data"),
        State("intensity-records", "data"),
        State("intensity-reference-sections", "data"),
        State("intensity-functional-unit-labels", "data"),
    )
    def _update_intensity_view(
        functional_unit_value,
        include_operations_value,
        theme_mode_value,
        records_state,
        reference_sections_state,
        label_state,
    ):
        records = records_state if isinstance(records_state, list) else []
        labels = label_state if isinstance(label_state, dict) else {}
        references_state = (
            reference_sections_state if isinstance(reference_sections_state, dict) else {}
        )
        dark_mode = isinstance(theme_mode_value, str) and theme_mode_value.lower() == "dark"
        include_operations = False
        if isinstance(include_operations_value, (list, tuple, set)):
            include_operations = "operations" in include_operations_value
        figure = intensity.build_figure(
            records,
            functional_unit_value,
            dark=dark_mode,
            include_operations=include_operations,
        )
        status_text = intensity.status_message(
            records,
            functional_unit_value,
            labels,
            include_operations=include_operations,
        )
        reference_children = intensity.render_references_children(
            references_state,
            functional_unit_value,
            labels,
        )
        return figure, status_text, reference_children

    return app


def main(*, host: str = "0.0.0.0", port: int = 8050, debug: bool = False) -> Dash:
    app = create_app()
    app.run(host=host, port=port, debug=debug)
    return app


if __name__ == "__main__":
    main()
