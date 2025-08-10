from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from . import figures
from .schema import (
    ActivitySchedule,
    EmissionFactor,
    Profile,
    RegionCode,
    load_activity_schedule,
    load_emission_factors,
    load_grid_intensity,
    load_profiles,
)


def get_grid_intensity(
    profile: Profile,
    grid_lookup: Dict[str, float],
    region_override: Optional[str] = None,
    mix_region: Optional[str] = None,
    use_canada_average: Optional[bool] = None,
) -> Optional[float]:
    if region_override:
        return grid_lookup.get(region_override)
    if mix_region:
        return grid_lookup.get(mix_region)
    if use_canada_average:
        return grid_lookup.get(RegionCode.CA)
    if profile and profile.default_grid_region:
        return grid_lookup.get(profile.default_grid_region)
    return None


def compute_emission(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Dict[str, float],
) -> Optional[float]:
    if not sched.quantity_per_week:
        return None
    quantity = float(sched.quantity_per_week) * 52
    if sched.office_only:
        if not profile.office_days_per_week:
            return None
        quantity *= float(profile.office_days_per_week) / 5
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


def export_view() -> pd.DataFrame:
    efs = {ef.activity_id: ef for ef in load_emission_factors()}
    profiles = {p.profile_id: p for p in load_profiles()}
    grid_lookup = {
        gi.region: gi.intensity_g_per_kwh
        for gi in load_grid_intensity()
        if gi.intensity_g_per_kwh is not None
    }
    rows: List[dict] = []
    for sched in load_activity_schedule():
        profile = profiles.get(sched.profile_id)
        ef = efs.get(sched.activity_id)
        emission = None
        if profile and ef:
            emission = compute_emission(sched, profile, ef, grid_lookup)
        rows.append(
            {
                "profile_id": sched.profile_id,
                "activity_id": sched.activity_id,
                "annual_emissions_g": emission,
            }
        )
    df = pd.DataFrame(rows)
    out_dir = Path(__file__).parent / "outputs"
    out_dir.mkdir(exist_ok=True)
    df.to_csv(out_dir / "export_view.csv", index=False)
    df.to_json(out_dir / "export_view.json", orient="records")
    # example figure slice
    fig_total = figures.total_by_activity(df)
    fig_total.to_csv(out_dir / "figure_total_by_activity.csv", index=False)
    return df


if __name__ == "__main__":
    export_view()
