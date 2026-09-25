from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from collections.abc import Iterable
from typing import Dict, List, Tuple

import yaml

from . import citations, schema
from .citations import collect_activity_source_keys
from .derive.emissions import (
    build_grid_intensity_lookup,
    compute_emission,
    group_factors_by_activity,
    resolve_grid_region,
    resolve_grid_row,
    select_activity_factor,
)


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


def _resolve_profile_id(
    config: dict, profiles: Dict[str, schema.Profile], schedules: Iterable[schema.ActivitySchedule]
) -> str:
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
    ef: schema.EmissionFactor,
    grid_row: schema.GridIntensity | None,
) -> List[str]:
    sources: List[str] = []
    if ef.source_id:
        sources.append(str(ef.source_id))
    if not ef.is_grid_indexed:
        return sources
    if grid_row is not None and grid_row.source_id:
        sources.append(str(grid_row.source_id))
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
    emission_factor_rows = list(
        schema._load_csv(data_dir / "emission_factors.csv", schema.EmissionFactor)
    )
    factor_groups = group_factors_by_activity(emission_factor_rows)
    grid_rows = list(schema._load_csv(data_dir / "grid_intensity.csv", schema.GridIntensity))
    grid_lookup = build_grid_intensity_lookup(grid_rows)

    config = _load_config(cfg_path)
    profile_id = _resolve_profile_id(config, profiles, schedules)
    profile = profiles[profile_id]

    by_activity: Dict[str, float] = {}
    source_keys: List[str] = []

    # ``collect_activity_source_keys`` lives in :mod:`calc.citations` (a leaf
    # module) so both this API and the derive pipeline import it without an
    # api<->derive cycle; it is re-exported above for backwards compatibility.
    for sched in schedules:
        if sched.profile_id != profile_id:
            continue
        preferred_region = resolve_grid_region(sched, profile)
        ef = select_activity_factor(
            factor_groups.get(sched.activity_id, ()), preferred_region=preferred_region
        )
        if ef is None:
            continue
        grid_row: schema.GridIntensity | None = None
        if ef.is_grid_indexed:
            grid_row = resolve_grid_row(
                sched,
                profile,
                grid_rows,
                preferred_region=ef.region,
                vintage_year=ef.vintage_year,
            )
        emission = compute_emission(sched, profile, ef, grid_lookup, grid_row)
        if emission is None:
            continue
        by_activity[sched.activity_id] = by_activity.get(sched.activity_id, 0.0) + emission
        source_keys.extend(_collect_activity_sources(ef, grid_row))

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


__all__ = [
    "Aggregates",
    "ActivityAggregate",
    "collect_activity_source_keys",
    "get_aggregates",
]
