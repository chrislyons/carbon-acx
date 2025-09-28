from __future__ import annotations

from typing import Mapping

from dash import html

from calc.schema import RegionCode


def _region_label(code: str) -> str:
    try:
        region = RegionCode(code)
    except ValueError:
        return code
    return region.value


def _coerce_matrix(manifest: Mapping | None) -> list[tuple[str, int]]:
    if not manifest:
        return []

    matrix = manifest.get("vintage_matrix") if isinstance(manifest, Mapping) else None
    if not isinstance(matrix, Mapping):
        return []

    entries: list[tuple[str, int]] = []
    for raw_region, raw_year in matrix.items():
        if raw_region is None or raw_year is None:
            continue
        region = str(raw_region)
        try:
            year = int(raw_year)
        except (TypeError, ValueError):
            continue
        entries.append((region, year))

    entries.sort(key=lambda item: item[0])
    return entries


def render(manifest: Mapping | None) -> html.Section:
    entries = _coerce_matrix(manifest)

    if entries:
        content = html.Ul(
            [
                html.Li(
                    [
                        html.Span(_region_label(region), className="vintages-panel__region"),
                        html.Span(str(year), className="vintages-panel__year"),
                    ]
                )
                for region, year in entries
            ],
            className="vintages-list",
        )
        description = html.P("Latest grid intensity vintage year per region.")
    else:
        content = html.P("No grid vintages available.")
        description = None

    children = [html.H2("Vintages")]
    if description is not None:
        children.append(description)
    children.append(content)

    return html.Section(children, className="info-panel vintages-panel", id="vintages")
