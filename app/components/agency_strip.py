from __future__ import annotations

from typing import Iterable, Mapping

from dash import html

__all__ = ["render"]


def _build_segment_contents(segment: Mapping[str, object]) -> list[html.Span]:
    label = str(segment.get("label", "")).strip() or "Agency"
    percent = str(segment.get("percent", "")).strip() or "0%"
    return [
        html.Span(label, className="agency-strip__segment-label"),
        html.Span(percent, className="agency-strip__segment-value"),
    ]


def _tooltip_text(segment: Mapping[str, object]) -> str | None:
    tooltip_lines = segment.get("tooltip_lines")
    if isinstance(tooltip_lines, Iterable):
        lines = [str(line) for line in tooltip_lines if str(line).strip()]
        if lines:
            return "\n".join(lines)
    return None


def _segment(segment: Mapping[str, object]) -> html.Span:
    tooltip = _tooltip_text(segment)
    attrs: dict[str, object] = {
        "className": "agency-strip__segment",
        "children": _build_segment_contents(segment),
    }
    if tooltip:
        attrs["title"] = tooltip
        safe_tooltip = tooltip.replace("\n", "; ")
        attrs["aria-label"] = (
            f"{segment.get('label', '')}: {segment.get('percent', '')}. {safe_tooltip}"
        )
    else:
        attrs["aria-label"] = f"{segment.get('label', '')}: {segment.get('percent', '')}"
    return html.Span(**attrs)


def _separator() -> html.Span:
    return html.Span("•", className="agency-strip__separator", **{"aria-hidden": "true"})


def render(segments: Iterable[Mapping[str, object]] | None, *, empty_message: str | None = None):
    valid_segments = [segment for segment in segments or []]
    if not valid_segments:
        message = empty_message or "Select an activity to view agency contributions."
        return html.Div(message, className="agency-strip agency-strip--empty")

    children: list[html.Span] = []
    for idx, segment in enumerate(valid_segments):
        if idx > 0:
            children.append(_separator())
        children.append(_segment(segment))

    return html.Div(children, className="agency-strip", role="list")
