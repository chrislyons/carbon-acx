"""Utility helpers shared across Dash components."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Sequence


_NA_LABELS = {
    "na",
    "n/a",
    "not available",
    "not yet available",
    "data not available",
    "not modelled",
    "not modeled",
}


def _is_na_label(value: object) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    return text in _NA_LABELS


def has_na_segments(payload: Mapping | None) -> bool:
    """Return ``True`` when the payload contains NA-labelled segments."""

    if not isinstance(payload, Mapping):
        return False

    data = payload.get("data")

    if isinstance(data, list):
        for row in data:
            if not isinstance(row, Mapping):
                continue
            if _is_na_label(row.get("category")) or _is_na_label(row.get("activity_name")):
                return True
            if _is_na_label(row.get("label")):
                return True
    elif isinstance(data, Mapping):
        nodes = data.get("nodes")
        if isinstance(nodes, list):
            for node in nodes:
                if isinstance(node, Mapping) and _is_na_label(node.get("label")):
                    return True
        links = data.get("links")
        if isinstance(links, list):
            for link in links:
                if not isinstance(link, Mapping):
                    continue
                if _is_na_label(link.get("category")) or _is_na_label(link.get("label")):
                    return True

    return False


def reference_numbers(
    citation_keys: Sequence[str] | None, reference_lookup: Mapping[str, int]
) -> list[int]:
    """Return ordered reference numbers for the given citation keys."""

    if not citation_keys:
        return []

    numbers: list[int] = []
    seen: set[int] = set()
    for key in citation_keys:
        index = reference_lookup.get(key)
        if index is None or index in seen:
            continue
        seen.add(index)
        numbers.append(index)
    return numbers


def primary_reference_index(
    citation_keys: Sequence[str] | None, reference_lookup: Mapping[str, int]
) -> int | None:
    numbers = reference_numbers(citation_keys, reference_lookup)
    if not numbers:
        return None
    return min(numbers)


def format_reference_hint(
    citation_keys: Sequence[str] | None, reference_lookup: Mapping[str, int]
) -> str:
    """Return a space-delimited reference hint such as "[n]"."""

    numbers = reference_numbers(citation_keys, reference_lookup)
    if not numbers:
        return "No references"
    return " ".join(f"[{number}]" for number in numbers)


def format_emissions(value: float) -> str:
    """Format emission values with adaptive units for readability."""

    abs_value = abs(value)
    if abs_value >= 1_000_000:
        return f"{value / 1_000_000:.2f} t CO₂e"
    if abs_value >= 1_000:
        return f"{value / 1_000:.2f} kg CO₂e"
    return f"{value:,.0f} g CO₂e"


def clamp_optional(value: float | int | None) -> float | None:
    """Return a float for numeric inputs, or ``None`` when missing."""

    if value is None:
        return None
    return float(value)


def extend_unique(values: Iterable[str], existing: list[str]) -> list[str]:
    """Extend ``existing`` with new values preserving the original order."""

    seen = set(existing)
    for item in values:
        if item not in seen:
            seen.add(item)
            existing.append(item)
    return existing


__all__ = [
    "clamp_optional",
    "extend_unique",
    "format_emissions",
    "format_reference_hint",
    "has_na_segments",
    "primary_reference_index",
    "reference_numbers",
]
