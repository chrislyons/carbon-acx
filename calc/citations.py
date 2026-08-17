from __future__ import annotations

import csv
import re
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import List, Sequence

SOURCES_PATH = Path(__file__).resolve().parents[1] / "data" / "sources.csv"
_IEEE_NUMBER_PREFIX = re.compile(r"^\s*\[\d+\]\s*")


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
    text = _IEEE_NUMBER_PREFIX.sub("", ref.citation).strip()
    return f"[{ref.index}] {text}"


__all__ = ["Reference", "format_ieee", "references_for"]
