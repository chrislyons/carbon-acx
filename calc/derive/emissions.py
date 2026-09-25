"""Emission computation and grid-intensity resolution kernels."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional, Sequence

from ..schema import ActivitySchedule, EmissionFactor, GridIntensity, Profile, RegionCode
from ..selection import FactorCandidate, GridCandidate, select_emission_factor, select_grid_row

__all__ = [
    "EmissionDetails",
    "build_grid_intensity_lookup",
    "compute_emission",
    "compute_emission_details",
    "get_grid_intensity",
    "resolve_grid_region",
    "resolve_grid_row",
    "select_factors_by_activity",
    "weekly_quantity",
]


def office_ratio(profile: Profile) -> Optional[float]:
    if profile.office_days_per_week is None:
        return None
    return float(profile.office_days_per_week) / 5


def weekly_quantity(sched: ActivitySchedule, profile: Profile) -> Optional[float]:
    if sched.quantity_per_week is not None:
        weekly = float(sched.quantity_per_week)
    elif sched.freq_per_week is not None:
        weekly = float(sched.freq_per_week)
    elif sched.freq_per_day is not None:
        if sched.office_only or sched.office_days_only:
            if profile.office_days_per_week is None:
                return None
            days = float(profile.office_days_per_week)
        else:
            days = 7.0
        weekly = float(sched.freq_per_day) * days
    else:
        weekly = None

    if weekly is None:
        return None

    ratio = office_ratio(profile)
    if sched.office_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio
    if sched.office_days_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio

    return weekly


@dataclass(frozen=True)
class EmissionDetails:
    mean: Optional[float]
    low: Optional[float]
    high: Optional[float]

    def as_dict(self) -> dict:
        payload = {"mean": self.mean}
        if self.low is not None:
            payload["low"] = self.low
        if self.high is not None:
            payload["high"] = self.high
        return payload


def compute_emission(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
    grid_row: GridIntensity | None = None,
) -> Optional[float]:
    details = compute_emission_details(sched, profile, ef, grid_lookup, grid_row)
    return details.mean


def compute_emission_details(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
    grid_row: GridIntensity | None = None,
) -> EmissionDetails:
    weekly_quantity_value = weekly_quantity(sched, profile)
    if weekly_quantity_value is None:
        return EmissionDetails(mean=None, low=None, high=None)

    quantity = weekly_quantity_value * 52

    if ef.value_g_per_unit is not None:
        factor = float(ef.value_g_per_unit)
        mean = quantity * factor
        low = (
            quantity * float(ef.uncert_low_g_per_unit)
            if ef.uncert_low_g_per_unit is not None
            else None
        )
        high = (
            quantity * float(ef.uncert_high_g_per_unit)
            if ef.uncert_high_g_per_unit is not None
            else None
        )
        return EmissionDetails(mean=mean, low=low, high=high)

    if ef.is_grid_indexed:
        intensity = None
        if grid_row and grid_row.intensity_g_per_kwh is not None:
            intensity = float(grid_row.intensity_g_per_kwh)
        if intensity is None:
            intensity = get_grid_intensity(
                profile,
                grid_lookup,
                sched.region_override,
                sched.mix_region,
                sched.use_canada_average,
            )
        if intensity is None or ef.electricity_kwh_per_unit is None:
            return EmissionDetails(mean=None, low=None, high=None)

        kwh = float(ef.electricity_kwh_per_unit)
        mean = quantity * float(intensity) * kwh

        intensity_low = (
            float(grid_row.intensity_low_g_per_kwh)
            if grid_row and grid_row.intensity_low_g_per_kwh is not None
            else None
        )
        intensity_high = (
            float(grid_row.intensity_high_g_per_kwh)
            if grid_row and grid_row.intensity_high_g_per_kwh is not None
            else None
        )
        kwh_low = (
            float(ef.electricity_kwh_per_unit_low)
            if ef.electricity_kwh_per_unit_low is not None
            else None
        )
        kwh_high = (
            float(ef.electricity_kwh_per_unit_high)
            if ef.electricity_kwh_per_unit_high is not None
            else None
        )

        low = None
        high = None
        if intensity_low is not None or kwh_low is not None:
            low = (
                quantity
                * (intensity_low if intensity_low is not None else float(intensity))
                * (kwh_low if kwh_low is not None else kwh)
            )
        if intensity_high is not None or kwh_high is not None:
            high = (
                quantity
                * (intensity_high if intensity_high is not None else float(intensity))
                * (kwh_high if kwh_high is not None else kwh)
            )

        return EmissionDetails(mean=mean, low=low, high=high)

    return EmissionDetails(mean=None, low=None, high=None)


def get_grid_intensity(
    profile: Profile,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
    region_override: Optional[str | RegionCode] = None,
    mix_region: Optional[str | RegionCode] = None,
    use_canada_average: Optional[bool] = None,
) -> Optional[float]:
    if region_override:
        return grid_lookup.get(region_override)
    if mix_region:
        return grid_lookup.get(mix_region)
    if use_canada_average:
        fallback = grid_lookup.get(RegionCode.CA) or grid_lookup.get("CA")
        if fallback is not None:
            return fallback
        values = [value for value in grid_lookup.values() if value is not None]
        if values:
            return sum(values) / len(values)
        return None
    if profile and profile.default_grid_region:
        return grid_lookup.get(profile.default_grid_region)
    return None


def resolve_grid_region(
    sched: ActivitySchedule,
    profile: Profile | None = None,
    preferred_region: str | RegionCode | None = None,
) -> str | RegionCode | None:
    """Return the region whose grid row should be used for ``sched``.

    Schedule overrides win, then the profile default, then the supplied
    ``preferred_region`` (typically the selected emission factor's region).
    """

    if sched.region_override is not None:
        return sched.region_override
    if sched.mix_region is not None:
        return sched.mix_region
    if sched.use_canada_average:
        return RegionCode.CA
    if profile and profile.default_grid_region is not None:
        return profile.default_grid_region
    return preferred_region


def resolve_grid_row(
    sched: ActivitySchedule,
    profile: Profile | None,
    grid_rows: Sequence[GridIntensity],
    *,
    preferred_region: str | RegionCode | None = None,
    vintage_year: int | None = None,
) -> Optional[GridIntensity]:
    """Resolve the deterministic grid row for a schedule and factor vintage."""

    region_key = resolve_grid_region(sched, profile, preferred_region)
    if region_key is None:
        return None

    candidates = [
        GridCandidate(
            region=row.region,
            vintage_year=row.vintage_year,
            source_id=row.source_id,
            payload=row,
        )
        for row in grid_rows
    ]
    choice = select_grid_row(candidates, region=region_key, vintage_year=vintage_year)
    if choice is None:
        return None
    return choice.payload


def build_grid_intensity_lookup(
    grid_rows: Sequence[GridIntensity],
) -> dict[str | RegionCode, float | None]:
    """Build a deterministic ``region -> intensity`` map for fallback lookups.

    Each region resolves to its latest available vintage using the shared
    selection policy rather than the last row encountered in the input. Both the
    original region key (enum or string) and its ``value`` are recorded so that
    callers may look up by either form.
    """

    regions: dict[str, list[GridCandidate]] = {}
    raw_keys: dict[str, list[str | RegionCode]] = {}
    for row in grid_rows:
        region = getattr(row.region, "value", row.region)
        if region is None:
            continue
        key = str(region)
        regions.setdefault(key, []).append(
            GridCandidate(
                region=row.region,
                vintage_year=row.vintage_year,
                source_id=row.source_id,
                payload=row,
            )
        )
        keys = raw_keys.setdefault(key, [])
        if row.region not in keys:
            keys.append(row.region)
        value = getattr(row.region, "value", None)
        if value is not None and value not in keys:
            keys.append(value)

    lookup: dict[str | RegionCode, float | None] = {}
    for region, candidates in regions.items():
        choice = select_grid_row(candidates, region=region, vintage_year=None)
        row = choice.payload if choice is not None else None
        intensity = row.intensity_g_per_kwh if row is not None else None
        for key in raw_keys.get(region, [region]):
            lookup[key] = intensity
    return lookup


def select_activity_factor(
    emission_factors: Iterable[EmissionFactor],
    *,
    preferred_region: str | RegionCode | None = None,
) -> Optional[EmissionFactor]:
    """Select one deterministic factor from candidates for a single activity."""

    choice = select_emission_factor(
        [
            FactorCandidate(
                region=factor.region,
                vintage_year=factor.vintage_year,
                ef_id=factor.ef_id,
                payload=factor,
            )
            for factor in emission_factors
        ],
        preferred_region=preferred_region,
    )
    return choice.payload if choice is not None else None


def group_factors_by_activity(
    emission_factors: Iterable[EmissionFactor],
) -> dict[str, list[EmissionFactor]]:
    """Group emission factors by ``activity_id`` while preserving all candidates."""

    grouped: dict[str, list[EmissionFactor]] = {}
    for factor in emission_factors:
        grouped.setdefault(factor.activity_id, []).append(factor)
    return grouped


def select_factors_by_activity(
    emission_factors: Iterable[EmissionFactor],
) -> dict[str, EmissionFactor]:
    """Resolve one deterministic emission factor per ``activity_id``."""

    selected: dict[str, EmissionFactor] = {}
    for activity_id, factors in group_factors_by_activity(emission_factors).items():
        choice = select_activity_factor(factors)
        if choice is not None:
            selected[activity_id] = choice
    return selected
