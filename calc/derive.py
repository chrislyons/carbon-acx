from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Mapping, Optional

import json
import pandas as pd

from . import figures
from .api import collect_activity_source_keys
from .dal import DataStore, choose_backend
from .schema import (
    ActivitySchedule,
    EmissionFactor,
    GridIntensity,
    Profile,
    RegionCode,
)


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


def _office_ratio(profile: Profile) -> Optional[float]:
    if profile.office_days_per_week is None:
        return None
    return float(profile.office_days_per_week) / 5


def _weekly_quantity(sched: ActivitySchedule, profile: Profile) -> Optional[float]:
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

    ratio = _office_ratio(profile)
    if sched.office_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio
    if sched.office_days_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio

    return weekly


def compute_emission(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
) -> Optional[float]:
    weekly_quantity = _weekly_quantity(sched, profile)
    if weekly_quantity is None:
        return None
    quantity = weekly_quantity * 52
    if ef.value_g_per_unit is not None:
        factor = float(ef.value_g_per_unit)
    elif ef.is_grid_indexed:
        intensity = get_grid_intensity(
            profile,
            grid_lookup,
            sched.region_override,
            sched.mix_region,
            sched.use_canada_average,
        )
        if intensity is None or ef.electricity_kwh_per_unit is None:
            return None
        factor = float(intensity) * float(ef.electricity_kwh_per_unit)
    else:
        return None
    return quantity * factor


def _resolve_grid_row(
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


def export_view(ds: Optional[DataStore] = None) -> pd.DataFrame:
    datastore = ds or choose_backend()
    efs = {ef.activity_id: ef for ef in datastore.load_emission_factors()}
    profiles = {p.profile_id: p for p in datastore.load_profiles()}
    grid_lookup: Dict[str | RegionCode, Optional[float]] = {}
    grid_by_region: Dict[str | RegionCode, GridIntensity] = {}
    for gi in datastore.load_grid_intensity():
        grid_lookup[gi.region] = gi.intensity_g_per_kwh
        grid_by_region[gi.region] = gi
        if hasattr(gi.region, "value"):
            grid_lookup[gi.region.value] = gi.intensity_g_per_kwh
            grid_by_region[gi.region.value] = gi
    rows: List[dict] = []
    derived_rows: List[dict] = []
    resolved_profile_ids: set[str] = set()
    for sched in datastore.load_activity_schedule():
        profile = profiles.get(sched.profile_id)
        ef = efs.get(sched.activity_id)
        emission = None
        grid_row: Optional[GridIntensity] = None
        if profile and ef:
            emission = compute_emission(sched, profile, ef, grid_lookup)
            if emission is not None and ef.is_grid_indexed:
                grid_row = _resolve_grid_row(sched, profile, grid_by_region)
        rows.append(
            {
                "profile_id": sched.profile_id,
                "activity_id": sched.activity_id,
                "annual_emissions_g": emission,
            }
        )
        if sched.profile_id:
            resolved_profile_ids.add(sched.profile_id)
        derived_rows.append(
            {
                "profile": profile,
                "schedule": sched,
                "emission_factor": ef,
                "grid_intensity": grid_row,
                "annual_emissions_g": emission,
            }
        )
    df = pd.DataFrame(rows)
    out_dir = Path(__file__).parent / "outputs"
    out_dir.mkdir(exist_ok=True)
    citation_keys = sorted(collect_activity_source_keys(derived_rows))
    resolved_profiles = sorted(resolved_profile_ids)
    metadata = figures.build_metadata(
        "export_view", profile_ids=resolved_profiles if resolved_profiles else None
    )
    metadata["citation_keys"] = citation_keys
    with (out_dir / "export_view.csv").open("w") as fh:
        for key, value in metadata.items():
            fh.write(f"# {key}: {value}\n")
        df.to_csv(fh, index=False)
    payload = {**metadata, "data": df.to_dict(orient="records")}
    (out_dir / "export_view.json").write_text(json.dumps(payload, indent=2))
    # example figure slice
    figures.export_total_by_activity(df, out_dir, citation_keys)
    return df


if __name__ == "__main__":
    datastore = choose_backend()
    export_view(datastore)
