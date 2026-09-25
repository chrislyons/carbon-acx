"""Emission computation and grid-intensity resolution kernels."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from ..schema import ActivitySchedule, EmissionFactor, GridIntensity, Profile, RegionCode

__all__ = [
    "EmissionDetails",
    "compute_emission",
    "compute_emission_details",
    "get_grid_intensity",
    "resolve_grid_row",
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
) -> Optional[float]:
    details = compute_emission_details(sched, profile, ef, grid_lookup)
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


def resolve_grid_row(
    sched: ActivitySchedule,
    profile: Profile | None,
    grid_by_region: Mapping[str | RegionCode, GridIntensity],
) -> Optional[GridIntensity]:
    if sched.region_override is not None:
        region_key = sched.region_override
    elif sched.mix_region is not None:
        region_key = sched.mix_region
    elif sched.use_canada_average:
        region_key = RegionCode.CA
    elif profile and profile.default_grid_region is not None:
        region_key = profile.default_grid_region
    else:
        region_key = None

    if region_key is None:
        return None

    grid = grid_by_region.get(region_key)
    if grid is None and hasattr(region_key, "value"):
        grid = grid_by_region.get(region_key.value)
    if grid is None and isinstance(region_key, RegionCode):
        grid = grid_by_region.get(region_key.value)
    return grid
