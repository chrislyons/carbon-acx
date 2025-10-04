"""Narrative helpers for chart annotations."""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

__all__ = ["pairwise_blurb"]


@dataclass(frozen=True)
class _IntensityRow:
    functional_unit_id: str
    activity_id: str | None
    activity_name: str | None
    alternative_id: str | None
    intensity: float | None
    low: float | None
    high: float | None


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def _artifact_directories() -> Iterable[Path]:
    root = _repo_root()
    return (
        root / "dist" / "artifacts",
        Path("/carbon-acx/artifacts"),
    )


def _coerce_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result):
        return None
    return result


@lru_cache(maxsize=1)
def _load_intensity_rows() -> tuple[_IntensityRow, ...]:
    for directory in _artifact_directories():
        csv_path = directory / "intensity_matrix.csv"
        if not csv_path.exists():
            continue
        rows: list[_IntensityRow] = []
        with csv_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for raw in reader:
                fu_value = raw.get("functional_unit_id") or raw.get("functional_unit")
                if not fu_value:
                    continue
                activity_id = raw.get("activity_id") or raw.get("activity")
                activity_name = raw.get("activity_name") or raw.get("alternative")
                alt_id = raw.get("alt_id") or raw.get("profile_id")
                intensity = _coerce_float(raw.get("intensity_g_per_fu") or raw.get("intensity"))
                low = _coerce_float(
                    raw.get("intensity_low_g_per_fu")
                    or raw.get("low_g_per_fu")
                    or raw.get("intensity_low")
                    or raw.get("low")
                )
                high = _coerce_float(
                    raw.get("intensity_high_g_per_fu")
                    or raw.get("high_g_per_fu")
                    or raw.get("intensity_high")
                    or raw.get("high")
                )
                rows.append(
                    _IntensityRow(
                        functional_unit_id=str(fu_value),
                        activity_id=str(activity_id) if activity_id else None,
                        activity_name=str(activity_name) if activity_name else None,
                        alternative_id=str(alt_id) if alt_id else None,
                        intensity=intensity,
                        low=low,
                        high=high,
                    )
                )
        if rows:
            return tuple(rows)
    return tuple()


def _normalise_identifiers(values: Sequence[object] | None) -> list[str]:
    identifiers: list[str] = []
    if not values:
        return identifiers
    for item in values:
        if isinstance(item, str) and item:
            identifiers.append(item)
        elif isinstance(item, dict):
            for key in ("id", "activity_id", "activityId", "alt_id", "altId"):
                value = item.get(key)
                if isinstance(value, str) and value:
                    identifiers.append(value)
                    break
        elif item not in (None, ""):
            identifiers.append(str(item))
    return identifiers


def _match_record(records: Iterable[_IntensityRow], identifier: str | None) -> _IntensityRow | None:
    if not identifier:
        return None
    for record in records:
        if record.activity_id == identifier:
            return record
    for record in records:
        if record.alternative_id == identifier:
            return record
    return None


def _format_number(value: float) -> str:
    abs_value = abs(value)
    if abs_value >= 1000:
        formatted = f"{value:,.0f}"
    elif abs_value >= 100:
        formatted = f"{value:,.1f}"
    elif abs_value >= 10:
        formatted = f"{value:,.2f}"
    else:
        formatted = f"{value:,.3f}"
    return formatted.rstrip("0").rstrip(".")


def _format_value(record: _IntensityRow) -> str:
    if record.intensity is None:
        return "Unknown"
    value_text = f"{_format_number(record.intensity)} g/FU"
    if (
        record.low is not None
        and record.high is not None
        and record.low != record.high
        and all(math.isfinite(val) for val in (record.low, record.high))
    ):
        low_text = _format_number(record.low)
        high_text = _format_number(record.high)
        value_text = f"{value_text} ({low_text}–{high_text})"
    return value_text


def _format_delta(primary: float | None, comparator: float | None) -> str:
    if primary is None or comparator in (None, 0):
        return ""
    if not all(math.isfinite(value) for value in (primary, comparator)):
        return ""
    if comparator == 0:
        return ""
    delta = ((primary - comparator) / comparator) * 100
    if abs(delta) < 0.05:
        delta = 0.0
    delta_text = f"{delta:.1f}".rstrip("0").rstrip(".")
    if delta > 0:
        delta_text = f"+{delta_text}"
    elif delta < 0:
        delta_text = f"{delta_text}"
    else:
        delta_text = delta_text or "0"
    return f"(Δ{delta_text}%)"


def _label(record: _IntensityRow) -> str:
    for value in (record.activity_name, record.activity_id, record.alternative_id):
        if value:
            return str(value)
    return "Selected activity"


def pairwise_blurb(
    fu_id: str | None,
    primary_activity_id: str | None,
    alt_ids: Sequence[object] | None = None,
) -> str:
    """Return a neutral comparison string for the selected activity."""

    rows = _load_intensity_rows()
    if not rows or not primary_activity_id:
        return ""

    if fu_id:
        relevant = [row for row in rows if row.functional_unit_id == fu_id]
    else:
        primary_match = next(
            (
                row
                for row in rows
                if row.activity_id == primary_activity_id
                or row.alternative_id == primary_activity_id
            ),
            None,
        )
        if primary_match is None:
            return ""
        fu_id = primary_match.functional_unit_id
        relevant = [row for row in rows if row.functional_unit_id == fu_id]

    if not relevant:
        return ""

    primary_record = _match_record(relevant, primary_activity_id)
    if primary_record is None:
        primary_record = next(
            (row for row in relevant if row.intensity is not None),
            None,
        )
    if primary_record is None or primary_record.intensity is None:
        return ""

    alternative_ids = _normalise_identifiers(alt_ids)
    candidates = [identifier for identifier in alternative_ids if identifier != primary_activity_id]
    alternative_record: _IntensityRow | None = None
    for identifier in candidates:
        match = _match_record(relevant, identifier)
        if match and match is not primary_record and match.intensity is not None:
            alternative_record = match
            break
    if alternative_record is None:
        for row in relevant:
            if row is primary_record or row.intensity is None:
                continue
            alternative_record = row
            break

    if alternative_record is None:
        return ""

    primary_text = _format_value(primary_record)
    alt_text = _format_value(alternative_record)
    delta_text = _format_delta(primary_record.intensity, alternative_record.intensity)

    comparison = (
        f"{_label(primary_record)} = {primary_text} vs {_label(alternative_record)} = {alt_text}"
    )
    if delta_text:
        comparison = f"{comparison} {delta_text}"
    return comparison
