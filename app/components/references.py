from __future__ import annotations

from typing import Iterable, Sequence

from dash import html

from calc import citations


def _reference_entries(reference_keys: Sequence[str] | None) -> list[tuple[str, int, str]]:
    entries: list[tuple[str, int, str]] = []
    for idx, ref in enumerate(citations.references_for(reference_keys or []), start=1):
        entries.append((ref.key, idx, citations.format_ieee(ref.numbered(idx))))
    return entries


def _combine_keys(
    primary: Sequence[str] | None, secondary: Sequence[str] | None
) -> list[str]:
    keys: list[str] = []
    for value in (primary or []):
        if value not in keys:
            keys.append(value)
    for value in (secondary or []):
        if value not in keys:
            keys.append(value)
    return keys


def _build_items(
    keys: Iterable[str],
    lookup: dict[str, tuple[int, str]],
) -> list[html.Li]:
    items: list[html.Li] = []
    for key in keys:
        payload = lookup.get(key)
        if not payload:
            continue
        index, text = payload
        attrs = {"children": text}
        if index is not None:
            attrs["data-reference-index"] = str(index)
        items.append(html.Li(**attrs))
    return items


def render_children(
    reference_keys: Sequence[str] | None,
    *,
    include_heading: bool = True,
    upstream_keys: Sequence[str] | None = None,
) -> list[html.Component]:
    combined_keys = _combine_keys(reference_keys, upstream_keys)
    entries = _reference_entries(combined_keys)
    if not entries:
        children = [
            html.H2("References") if include_heading else None,
            html.P("No references available."),
        ]
        return [child for child in children if child is not None]

    entry_lookup = {key: (idx, text) for key, idx, text in entries}

    def _section(
        title: str,
        keys: Sequence[str] | None,
        class_name: str,
    ) -> html.Div | None:
        items = _build_items(keys or [], entry_lookup)
        if not items:
            return None
        start_index = None
        for key in keys or []:
            payload = entry_lookup.get(key)
            if payload:
                index_value, _ = payload
                start_index = index_value
                break
        if start_index is None:
            first_key = next(iter(combined_keys), None)
            if first_key is not None:
                index_value, _ = entry_lookup[first_key]
                start_index = index_value
            else:
                start_index = 1
        return html.Div(
            [
                html.H3(title),
                html.Ol(items, className="references-list", start=start_index),
            ],
            className=class_name,
        )

    children: list[html.Component] = []
    if include_heading:
        children.append(html.H2("References"))

    sections: list[html.Component] = []
    direct_section = _section(
        "Direct factors",
        reference_keys,
        "references-panel__section references-panel__section--direct",
    )
    upstream_section = _section(
        "Upstream industrial factors",
        upstream_keys,
        "references-panel__section references-panel__section--upstream",
    )

    if direct_section:
        sections.append(direct_section)
    if upstream_section:
        sections.append(upstream_section)

    if not sections:
        sections.append(
            html.Div(
                [
                    html.Ol(
                        _build_items(combined_keys, entry_lookup),
                        className="references-list",
                    )
                ],
                className="references-panel__section",
            )
        )

    children.extend(sections)
    return children


def render(reference_keys: Sequence[str] | None) -> html.Aside:
    return html.Aside(
        render_children(reference_keys),
        className="references-panel",
        id="references",
    )


__all__ = ["render", "render_children"]
