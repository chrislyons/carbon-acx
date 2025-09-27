from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Mapping, Optional

import json
from datetime import datetime, timezone

import pandas as pd

from . import citations, figures
from .api import collect_activity_source_keys
from .dal import DataStore, choose_backend
from .schema import (
    Activity,
    ActivitySchedule,
    EmissionFactor,
    GridIntensity,
    LayerId,
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


def _layer_value(value: LayerId | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, LayerId):
        return value.value
    return str(value)


def _resolve_layer_id(
    sched: ActivitySchedule | None,
    profile: Profile | None,
    activity: Activity | None,
) -> Optional[str]:
    for source in (sched, profile, activity):
        if source is None:
            continue
        layer = getattr(source, "layer_id", None)
        resolved = _layer_value(layer)
        if resolved:
            return resolved
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
    weekly_quantity = _weekly_quantity(sched, profile)
    if weekly_quantity is None:
        return EmissionDetails(mean=None, low=None, high=None)

    quantity = weekly_quantity * 52

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


def _format_references(citation_keys: List[str]) -> List[str]:
    references = citations.references_for(citation_keys)
    return [citations.format_ieee(ref.numbered(idx)) for idx, ref in enumerate(references, start=1)]


def _write_reference_file(directory: Path, stem: str, references: List[str]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    text = "\n".join(references)
    if references:
        text += "\n"
    (directory / f"{stem}_refs.txt").write_text(text, encoding="utf-8")


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
    activities = {activity.activity_id: activity for activity in datastore.load_activities()}
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
    manifest_regions: set[str] = set()
    manifest_layers: set[str] = set()
    manifest_ef_vintages: set[int] = set()
    manifest_grid_vintages: set[int] = set()

    schedules = datastore.load_activity_schedule()
    for sched in schedules:
        profile = profiles.get(sched.profile_id)
        ef = efs.get(sched.activity_id)
        activity = activities.get(sched.activity_id)

        grid_row: Optional[GridIntensity] = None
        details = EmissionDetails(mean=None, low=None, high=None)
        emission = None
        layer_id = _resolve_layer_id(sched, profile, activity)
        if layer_id:
            manifest_layers.add(layer_id)

        if profile and ef:
            if ef.vintage_year is not None:
                manifest_ef_vintages.add(int(ef.vintage_year))
            if ef.is_grid_indexed:
                grid_row = _resolve_grid_row(sched, profile, grid_by_region)
                if grid_row is not None:
                    region_value = (
                        grid_row.region.value
                        if hasattr(grid_row.region, "value")
                        else grid_row.region
                    )
                    if region_value is not None:
                        manifest_regions.add(str(region_value))
                    if grid_row.vintage_year is not None:
                        manifest_grid_vintages.add(int(grid_row.vintage_year))
            details = compute_emission_details(sched, profile, ef, grid_lookup, grid_row)
            emission = details.mean

        rows.append(
            {
                "profile_id": sched.profile_id,
                "activity_id": sched.activity_id,
                "layer_id": layer_id,
                "activity_name": activity.name if isinstance(activity, Activity) else None,
                "activity_category": activity.category if isinstance(activity, Activity) else None,
                "scope_boundary": ef.scope_boundary if isinstance(ef, EmissionFactor) else None,
                "emission_factor_vintage_year": (
                    int(ef.vintage_year)
                    if isinstance(ef, EmissionFactor) and ef.vintage_year is not None
                    else None
                ),
                "grid_region": (
                    grid_row.region.value
                    if grid_row and hasattr(grid_row.region, "value")
                    else (grid_row.region if grid_row else None)
                ),
                "grid_vintage_year": (
                    int(grid_row.vintage_year)
                    if grid_row and grid_row.vintage_year is not None
                    else None
                ),
                "annual_emissions_g": emission,
                "annual_emissions_g_low": details.low,
                "annual_emissions_g_high": details.high,
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
                "layer_id": layer_id,
            }
        )

    df = pd.DataFrame(rows)
    out_dir = Path(__file__).parent / "outputs"
    out_dir.mkdir(exist_ok=True)
    figure_dir = out_dir / "figures"
    figure_dir.mkdir(exist_ok=True)
    reference_dir = out_dir / "references"
    reference_dir.mkdir(exist_ok=True)

    citation_keys = sorted(collect_activity_source_keys(derived_rows))
    resolved_profiles = sorted(resolved_profile_ids)
    profile_arg = resolved_profiles if resolved_profiles else None
    generated_at = datetime.now(timezone.utc).isoformat()

    metadata = figures.build_metadata("export_view", profile_ids=profile_arg)
    metadata["generated_at"] = generated_at
    metadata["citation_keys"] = citation_keys
    metadata["layers"] = sorted(manifest_layers)
    references = _format_references(citation_keys)
    metadata["references"] = references

    _write_reference_file(reference_dir, "export_view", references)

    csv_metadata = {k: v for k, v in metadata.items() if k != "references" and k != "data"}
    with (out_dir / "export_view.csv").open("w", encoding="utf-8") as fh:
        for key, value in csv_metadata.items():
            fh.write(f"# {key}: {value}\n")
        df.to_csv(fh, index=False)

    serialisable = df.replace({pd.NA: None}).astype(object).where(pd.notnull(df), None)
    records = serialisable.to_dict(orient="records")
    payload = {**metadata, "data": records}
    (out_dir / "export_view.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    stacked = figures.slice_stacked(df)
    bubble_points = [asdict(point) for point in figures.slice_bubble(df)]
    sankey = figures.slice_sankey(df)

    def _write_figure(name: str, method: str, data: object) -> None:
        meta = figures.build_metadata(method, profile_ids=profile_arg)
        meta["generated_at"] = generated_at
        meta["citation_keys"] = citation_keys
        meta["layers"] = sorted(manifest_layers)
        meta["references"] = references
        meta["data"] = data
        (figure_dir / f"{name}.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
        _write_reference_file(reference_dir, name, references)

    _write_figure("stacked", "figures.stacked", stacked)
    _write_figure("bubble", "figures.bubble", bubble_points)
    _write_figure("sankey", "figures.sankey", sankey)

    manifest = {
        "generated_at": generated_at,
        "regions": sorted(manifest_regions),
        "vintages": {
            "emission_factors": sorted(manifest_ef_vintages),
            "grid_intensity": sorted(manifest_grid_vintages),
        },
        "sources": citation_keys,
        "layers": sorted(manifest_layers),
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return df


if __name__ == "__main__":
    datastore = choose_backend()
    export_view(datastore)
