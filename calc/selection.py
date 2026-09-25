"""Deterministic, shared selection policy for emission factors and grid rows.

The publication pipeline (``calc.derive.pipeline``), the canonical compute
service (``calc.service``), and the offline web-calculator generator
(``scripts.generate_web_calculator_data``) share the same factor policy. Grid
selection shares the same vintage policy, while the requested region follows
the consumer's explicit schedule/profile context and falls back to the factor
region when no such context exists.

The single policy implemented here:

* **Factor selection** — a candidate's preferred region wins when a preferred
  region is supplied; otherwise the baseline preference ``CA-ON`` > ``CA`` >
  ``GLOBAL`` applies. Remaining ties resolve by newest vintage year, then by the
  stable ``ef_id``. The result never depends on input row order.
* **Grid selection** — rows are filtered to the requested region, then a row
  whose vintage matches the requested vintage (usually the selected factor's
  vintage) wins; otherwise the latest older row; otherwise the latest available
  row. Ties resolve by stable grid-row id and source id.

Callers adapt their own objects into :class:`FactorCandidate` /
:class:`GridCandidate` records and read the winner from ``.payload``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Optional

__all__ = [
    "BASELINE_REGION_PREFERENCE",
    "FactorCandidate",
    "GridCandidate",
    "factor_sort_key",
    "grid_row_id",
    "grid_sort_key",
    "normalise_region",
    "region_rank",
    "select_emission_factor",
    "select_grid_row",
]

#: Baseline region preference applied when no preferred region is supplied.
BASELINE_REGION_PREFERENCE: tuple[str, ...] = ("CA-ON", "CA", "GLOBAL")

_UNKNOWN_REGION_RANK = len(BASELINE_REGION_PREFERENCE) + 1
_MISSING_REGION_RANK = _UNKNOWN_REGION_RANK + 1


def normalise_region(value: Any) -> Optional[str]:
    """Return a trimmed region code string for enums, strings, or ``None``."""

    if value is None:
        return None
    text = getattr(value, "value", value)
    if not isinstance(text, str):
        text = str(text)
    text = text.strip()
    return text or None


def _stable_id(value: Any) -> str:
    if value is None:
        return ""
    text = getattr(value, "value", value)
    if not isinstance(text, str):
        text = str(text)
    return text.strip()


def region_rank(region: Any, preferred_region: Any = None) -> int:
    """Rank a region for factor selection; lower is preferred."""

    normalised = normalise_region(region)
    if normalised is None:
        return _MISSING_REGION_RANK
    preferred = normalise_region(preferred_region)
    if preferred is not None and normalised == preferred:
        return 0
    try:
        return BASELINE_REGION_PREFERENCE.index(normalised) + 1
    except ValueError:
        return _UNKNOWN_REGION_RANK


def _vintage_descending(vintage_year: Optional[int]) -> int:
    """Sort key placing newest vintages first and missing vintages last."""

    return -(vintage_year if vintage_year is not None else -1)


@dataclass(frozen=True)
class FactorCandidate:
    """One emission-factor row considered by :func:`select_emission_factor`."""

    region: Any
    vintage_year: Optional[int]
    ef_id: Optional[str]
    payload: Any = None


@dataclass(frozen=True)
class GridCandidate:
    """One grid-intensity row considered by :func:`select_grid_row`."""

    region: Any
    vintage_year: Optional[int]
    source_id: Optional[str] = None
    grid_id: Optional[str] = None
    payload: Any = None


def factor_sort_key(
    region: Any,
    vintage_year: Optional[int],
    ef_id: Optional[str],
    preferred_region: Any = None,
) -> tuple[int, int, str]:
    """Return the deterministic sort key for an emission-factor candidate."""

    return (
        region_rank(region, preferred_region),
        _vintage_descending(vintage_year),
        _stable_id(ef_id),
    )


def select_emission_factor(
    candidates: Iterable[FactorCandidate],
    *,
    preferred_region: Any = None,
) -> Optional[FactorCandidate]:
    """Return the deterministic winning factor, or ``None`` when empty."""

    best: Optional[FactorCandidate] = None
    best_key: Optional[tuple[int, int, str]] = None
    for candidate in candidates:
        key = factor_sort_key(
            candidate.region,
            candidate.vintage_year,
            candidate.ef_id,
            preferred_region,
        )
        if best_key is None or key < best_key:
            best_key = key
            best = candidate
    return best


def grid_row_id(region: Any, vintage_year: Optional[int]) -> str:
    """Return the stable identifier for a region/vintage grid row.

    Namespaced distinctly from emission-factor ids (``EF.*``) so the two id
    families never collide in recorded provenance.
    """

    region_text = normalise_region(region) or "UNKNOWN"
    vintage_text = str(vintage_year) if vintage_year is not None else "unknown"
    return f"grid-row:{region_text}:{vintage_text}"


def grid_sort_key(candidate: GridCandidate) -> tuple[str, str, str]:
    return (
        grid_row_id(candidate.region, candidate.vintage_year),
        _stable_id(candidate.source_id),
        _stable_id(candidate.grid_id),
    )


def _latest(candidates: list[GridCandidate]) -> GridCandidate:
    newest_vintage = max(
        (candidate.vintage_year for candidate in candidates if candidate.vintage_year is not None),
        default=None,
    )
    pool = [
        candidate for candidate in candidates if candidate.vintage_year == newest_vintage
    ] or list(candidates)
    return min(pool, key=grid_sort_key)


def select_grid_row(
    candidates: Iterable[GridCandidate],
    *,
    region: Any,
    vintage_year: Optional[int] = None,
) -> Optional[GridCandidate]:
    """Return the deterministic grid row for ``region``/``vintage_year``."""

    target_region = normalise_region(region)
    if target_region is None:
        return None

    regional = [
        candidate for candidate in candidates if normalise_region(candidate.region) == target_region
    ]
    if not regional:
        return None

    if vintage_year is not None:
        exact = [candidate for candidate in regional if candidate.vintage_year == vintage_year]
        if exact:
            return min(exact, key=grid_sort_key)
        older = [
            candidate
            for candidate in regional
            if candidate.vintage_year is not None and candidate.vintage_year <= vintage_year
        ]
        if older:
            newest_older = max(candidate.vintage_year for candidate in older)
            pool = [candidate for candidate in older if candidate.vintage_year == newest_older]
            return min(pool, key=grid_sort_key)

    return _latest(regional)
