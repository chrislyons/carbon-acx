from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import List, Sequence
import re

REFERENCES_DIR = Path(__file__).parent / "references"

_IEEE_NUMBER_PREFIX = re.compile(r"^\s*\[\d+\]\s*")


@dataclass(frozen=True)
class Reference:
    """Structured reference loaded from the repository."""

    key: str
    citation: str
    index: int | None = None

    def numbered(self, index: int) -> Reference:
        """Return a copy of the reference with an explicit IEEE index."""

        return Reference(key=self.key, citation=self.citation, index=index)


@lru_cache(maxsize=None)
def _load_reference(key: str) -> Reference:
    path = REFERENCES_DIR / f"{key}.txt"
    if not path.exists():
        raise KeyError(f"Unknown reference: {key}")
    text = path.read_text(encoding="utf-8").strip()
    return Reference(key=key, citation=text)


def _flatten(obj: object | None) -> List[str]:
    if obj is None:
        return []
    if isinstance(obj, Reference):
        return [obj.key]
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes, bytearray)):
        keys: List[str] = []
        for item in obj:
            keys.extend(_flatten(item))
        return keys
    for attr in ("source_id", "source_ids", "reference_id", "reference_ids"):
        if hasattr(obj, attr):
            value = getattr(obj, attr)
            if value is not None:
                return _flatten(value)
    return []


def references_for(obj: object | None) -> List[Reference]:
    """Resolve and de-duplicate references associated with an object."""

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
