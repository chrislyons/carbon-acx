"""Term alias helpers for datastore hydration and schema normalisation."""

from __future__ import annotations

from typing import Iterable, Mapping

import pandas as pd


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    try:
        return bool(pd.isna(value))
    except Exception:  # pragma: no cover - defensive fallback
        return False

TERM_ALIASES: dict[str, str] = {
    "segment": "sector",
    "segment_id": "sector_id",
    "segment_name": "sector_name",
    "segment_label": "sector_label",
    "Segment": "Sector",
    "Segments": "Sectors",
}

_PREFIX_ALIASES: tuple[tuple[str, str], ...] = (
    ("segment_", "sector_"),
    ("Segment ", "Sector "),
    ("segment", "sector"),
)

_SUFFIX_ALIASES: tuple[tuple[str, str], ...] = (
    ("_segment", "_sector"),
    ("Segment", "Sector"),
)


def canonical_term(key: str) -> str:
    """Return the canonical representation for ``key`` using term aliases."""

    replacement = TERM_ALIASES.get(key)
    if replacement is not None:
        return replacement

    for prefix, canonical in _PREFIX_ALIASES:
        if key.startswith(prefix):
            return canonical + key[len(prefix) :]

    for suffix, canonical in _SUFFIX_ALIASES:
        if key.endswith(suffix):
            return key[: -len(suffix)] + canonical

    return key


def remap_record(record: Mapping[str, object]) -> dict[str, object]:
    """Return a copy of ``record`` with legacy segment keys normalised."""

    remapped: dict[str, object] = {}
    for raw_key, value in record.items():
        if isinstance(raw_key, str):
            key = canonical_term(raw_key)
        else:  # pragma: no cover - defensive branch for non-string keys
            key = raw_key
        existing = remapped.get(key)
        if _is_missing(existing) and not _is_missing(value):
            remapped[key] = value
        elif key not in remapped:
            remapped[key] = value
    return remapped


def remap_columns(columns: Iterable[str]) -> dict[str, str]:
    """Return a rename mapping suitable for :meth:`pandas.DataFrame.rename`."""

    mapping: dict[str, str] = {}
    for column in columns:
        canonical = canonical_term(column)
        if canonical != column:
            mapping[column] = canonical
    return mapping


def coalesce_alias_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Return ``frame`` with alias columns folded into their canonical names."""

    for alias, canonical in list(TERM_ALIASES.items()):
        if alias not in frame.columns:
            continue
        if canonical in frame.columns:
            frame[canonical] = frame[canonical].where(
                ~frame[canonical].map(_is_missing), frame[alias]
            )
        else:
            frame[canonical] = frame[alias]
        frame = frame.drop(columns=[alias])
    return frame


__all__ = [
    "TERM_ALIASES",
    "canonical_term",
    "coalesce_alias_columns",
    "remap_columns",
    "remap_record",
]

