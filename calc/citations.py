from __future__ import annotations

import csv
import re
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, List, Sequence

SOURCES_PATH = Path(__file__).resolve().parents[1] / "data" / "sources.csv"
# Retained as a defensive normalizer for any surviving legacy data (for example
# third-party fixtures). The canonical registry is prefix-free so that citation
# numbers are always derived from the emitted reference set, never the source row.
_IEEE_NUMBER_PREFIX = re.compile(r"^\s*\[(\d+)\]\s*")


def strip_embedded_number(citation: str) -> str:
    """Return ``citation`` without a legacy embedded IEEE number prefix."""

    return _IEEE_NUMBER_PREFIX.sub("", citation).strip()


def has_embedded_number(citation: str) -> bool:
    """Return whether ``citation`` still carries a legacy embedded number prefix."""

    return _IEEE_NUMBER_PREFIX.match(citation) is not None


def validate_reference_numbering(references: Sequence[str]) -> List[str]:
    """Return errors when emitted references are not numbered ``[1]..[n]`` in order."""

    errors: List[str] = []
    for offset, text in enumerate(references, start=1):
        match = _IEEE_NUMBER_PREFIX.match(text)
        if match is None:
            errors.append(f"reference {offset} is missing a sequential [{offset}] label")
            continue
        if int(match.group(1)) != offset:
            errors.append(
                f"reference {offset} is labelled [{match.group(1)}] instead of [{offset}]"
            )
    return errors


@dataclass(frozen=True)
class Reference:
    """Structured citation resolved from the canonical source registry."""

    key: str
    citation: str
    index: int | None = None

    def numbered(self, index: int) -> Reference:
        """Return a copy of the reference with an explicit IEEE index."""

        return Reference(key=self.key, citation=self.citation, index=index)


@lru_cache(maxsize=None)
def _load_reference(key: str) -> Reference:
    with SOURCES_PATH.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if (row.get("source_id") or "").strip() != key:
                continue
            citation = (row.get("ieee_citation") or "").strip()
            if not citation:
                raise KeyError(f"Source has no citation: {key}")
            return Reference(key=key, citation=citation)
    raise KeyError(f"Unknown source: {key}")


_REFERENCE_FIELDS = (
    "citation_keys",
    "source_id",
    "source_ids",
    "reference_id",
    "reference_ids",
)


def _flatten(obj: object | None) -> List[str]:
    if obj is None:
        return []
    if isinstance(obj, Reference):
        return [obj.key]
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, Mapping):
        keys: List[str] = []
        for field in _REFERENCE_FIELDS:
            if field in obj and obj[field] is not None:
                keys.extend(_flatten(obj[field]))
        return keys
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes, bytearray)):
        keys: List[str] = []
        for item in obj:
            keys.extend(_flatten(item))
        return keys
    keys: List[str] = []
    for attr in _REFERENCE_FIELDS:
        if hasattr(obj, attr):
            value = getattr(obj, attr)
            if value is not None:
                keys.extend(_flatten(value))
    return keys


def references_for(obj: object | None) -> List[Reference]:
    """Resolve and de-duplicate source IDs associated with an object."""

    keys = _flatten(obj)
    seen: set[str] = set()
    references: List[Reference] = []
    for key in keys:
        if not key or key in seen:
            continue
        seen.add(key)
        references.append(_load_reference(key))
    return references


def format_ieee(ref: Reference) -> str:
    """Return the IEEE formatted string for a numbered reference."""

    if ref.index is None:
        raise ValueError("Reference index required for IEEE formatting")
    text = strip_embedded_number(ref.citation)
    return f"[{ref.index}] {text}"


def format_references(citation_keys: Sequence[str]) -> List[str]:
    """Return IEEE-formatted reference strings for ``citation_keys`` in order.

    Numbering is derived per emitted set: the first unique key is ``[1]`` and each
    subsequent key advances by one. Source rows never supply their own number.
    """

    references = references_for(citation_keys)
    return [format_ieee(ref.numbered(idx)) for idx, ref in enumerate(references, start=1)]


def _row_value(row: object, key: str) -> object | None:
    if isinstance(row, Mapping):
        return row.get(key)
    return getattr(row, key, None)


def _collect_row_sources(row: object) -> List[str]:
    emission = _row_value(row, "annual_emissions_g")
    if emission is None:
        return []

    keys: List[str] = []
    candidates = (
        "citation_keys",
        "source_ids",
        "source_id",
        "emission_factor",
        "grid_intensity",
    )
    for field in candidates:
        value = _row_value(row, field)
        if value is None:
            continue
        for ref in references_for(value):
            keys.append(ref.key)
    return keys


def collect_activity_source_keys(rows: Iterable[object]) -> set[str]:
    """Return unique citation keys referenced by derived rows."""

    keys: set[str] = set()
    for row in rows:
        keys.update(_collect_row_sources(row))
    return keys


__all__ = [
    "Reference",
    "collect_activity_source_keys",
    "format_ieee",
    "format_references",
    "has_embedded_number",
    "references_for",
    "strip_embedded_number",
    "validate_reference_numbering",
]
