from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import yaml

from . import citations, derive, schema


@dataclass(frozen=True)
class ActivityAggregate:
    activity_id: str
    activity_name: str | None
    annual_emissions_g: float


@dataclass(frozen=True)
class Aggregates:
    profile_id: str
    activities: Tuple[ActivityAggregate, ...]
    total_annual_emissions_g: float

    @property
    def by_activity(self) -> Dict[str, float]:
        return {item.activity_id: item.annual_emissions_g for item in self.activities}


def _load_config(cfg_path: Path) -> dict:
    if not cfg_path.exists():
        return {}
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise TypeError("Configuration must be a mapping")
    return data


def _resolve_profile_id(config: dict, profiles: Dict[str, schema.Profile], schedules: Iterable[schema.ActivitySchedule]) -> str:
    profile_id = config.get("default_profile")
    if profile_id in profiles:
        return profile_id
    for sched in schedules:
        if sched.profile_id in profiles:
            return sched.profile_id
    if profiles:
        return next(iter(profiles))
    raise ValueError("No profiles available to aggregate")


def _collect_activity_sources(
    sched: schema.ActivitySchedule,
    profile: schema.Profile,
    ef: schema.EmissionFactor,
    grid_by_region: Dict[str | schema.RegionCode, schema.GridIntensity],
) -> List[str]:
    sources: List[str] = []
    if ef.source_id:
        sources.append(str(ef.source_id))
    if not ef.is_grid_indexed:
        return sources

    if sched.region_override is not None:
        region = sched.region_override
    elif sched.mix_region is not None:
        region = sched.mix_region
    elif sched.use_canada_average:
        region = schema.RegionCode.CA
    elif profile.default_grid_region is not None:
        region = profile.default_grid_region
    else:
        region = None
    if region is None:
        return sources
    key = region
    grid = grid_by_region.get(key)
    if grid is None and hasattr(region, "value"):
        grid = grid_by_region.get(region.value)
    if grid and grid.source_id:
        sources.append(str(grid.source_id))
    return sources


def get_aggregates(data_dir: Path, cfg_path: Path) -> tuple[Aggregates, list[str]]:
    """Load data, compute emissions and return aggregates plus reference keys."""

    activities = {
        activity.activity_id: activity
        for activity in schema._load_csv(data_dir / "activities.csv", schema.Activity)
    }
    profiles = {
        profile.profile_id: profile
        for profile in schema._load_csv(data_dir / "profiles.csv", schema.Profile)
    }
    schedules = list(schema._load_csv(data_dir / "activity_schedule.csv", schema.ActivitySchedule))
    emission_factors = {
        ef.activity_id: ef
        for ef in schema._load_csv(data_dir / "emission_factors.csv", schema.EmissionFactor)
    }
    grid_intensities = list(
        schema._load_csv(data_dir / "grid_intensity.csv", schema.GridIntensity)
    )
    grid_lookup: Dict[str | schema.RegionCode, float | None] = {}
    grid_by_region: Dict[str | schema.RegionCode, schema.GridIntensity] = {}
    for gi in grid_intensities:
        grid_lookup[gi.region] = gi.intensity_g_per_kwh
        grid_by_region[gi.region] = gi
        if hasattr(gi.region, "value"):
            grid_lookup[gi.region.value] = gi.intensity_g_per_kwh
            grid_by_region[gi.region.value] = gi


    config = _load_config(cfg_path)
    profile_id = _resolve_profile_id(config, profiles, schedules)
    profile = profiles[profile_id]

    by_activity: Dict[str, float] = {}
    source_keys: List[str] = []

    for sched in schedules:
        if sched.profile_id != profile_id:
            continue
        ef = emission_factors.get(sched.activity_id)
        if ef is None:
            continue
        emission = derive.compute_emission(sched, profile, ef, grid_lookup)
        if emission is None:
            continue
        by_activity[sched.activity_id] = by_activity.get(sched.activity_id, 0.0) + emission
        source_keys.extend(_collect_activity_sources(sched, profile, ef, grid_by_region))

    activities_payload: List[ActivityAggregate] = []
    for activity_id, total in sorted(by_activity.items(), key=lambda item: item[1], reverse=True):
        activity = activities.get(activity_id)
        activities_payload.append(
            ActivityAggregate(
                activity_id=activity_id,
                activity_name=activity.name if activity else None,
                annual_emissions_g=total,
            )
        )

    aggregates = Aggregates(
        profile_id=profile_id,
        activities=tuple(activities_payload),
        total_annual_emissions_g=sum(by_activity.values()),
    )

    references = citations.references_for(source_keys)
    reference_keys = [ref.key for ref in references]
    return aggregates, reference_keys


__all__ = ["Aggregates", "ActivityAggregate", "get_aggregates"]
