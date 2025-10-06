from __future__ import annotations

from typing import Iterable, Mapping

from dash import html

__all__ = ["render"]


def _build_sector_contents(sector: Mapping[str, object]) -> list[html.Span]:
    label = str(sector.get("label", "")).strip() or "Agency"
    percent = str(sector.get("percent", "")).strip() or "0%"
    return [
        html.Span(label, className="agency-strip__sector-label"),
        html.Span(percent, className="agency-strip__sector-value"),
    ]


def _tooltip_text(sector: Mapping[str, object]) -> str | None:
    tooltip_lines = sector.get("tooltip_lines")
    if isinstance(tooltip_lines, Iterable):
        lines = [str(line) for line in tooltip_lines if str(line).strip()]
        if lines:
            return "\n".join(lines)
    return None


def _sector(sector: Mapping[str, object]) -> html.Span:
    tooltip = _tooltip_text(sector)
    attrs: dict[str, object] = {
        "className": "agency-strip__sector",
        "children": _build_sector_contents(sector),
    }
    if tooltip:
        attrs["title"] = tooltip
        safe_tooltip = tooltip.replace("\n", "; ")
        attrs["aria-label"] = (
            f"{sector.get('label', '')}: {sector.get('percent', '')}. {safe_tooltip}"
        )
    else:
        attrs["aria-label"] = f"{sector.get('label', '')}: {sector.get('percent', '')}"
    return html.Span(**attrs)


def _separator() -> html.Span:
    return html.Span("•", className="agency-strip__separator", **{"aria-hidden": "true"})


def render(sectors: Iterable[Mapping[str, object]] | None, *, empty_message: str | None = None):
    valid_sectors = [sector for sector in sectors or []]
    if not valid_sectors:
        message = empty_message or "Select an activity to view agency contributions."
        return html.Div(message, className="agency-strip agency-strip--empty")

    children: list[html.Span] = []
    for idx, sector in enumerate(valid_sectors):
        if idx > 0:
            children.append(_separator())
        children.append(_sector(sector))

    return html.Div(children, className="agency-strip", role="list")
