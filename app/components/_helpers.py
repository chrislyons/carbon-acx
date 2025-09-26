"""Utility helpers shared across Dash components."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Sequence


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
    "reference_numbers",
]
