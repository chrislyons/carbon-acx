"""Dataset orchestrators: full export view and intensity matrix construction."""

from __future__ import annotations

import hashlib
import math
import os
import sys
from collections import defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import pandas as pd

from .. import citations, figures
from .. import manifest as manifest_module
from ..citations import collect_activity_source_keys
from ..dal import DataStore, choose_backend
from ..figures_manifest import (
    FigureManifestArtifacts,
    build_collection_index,
    build_figure_manifest,
    bundle_manifest_artifacts,
)
from ..schema import (
    Activity,
    ActivityFunctionalUnitMap,
    ActivitySchedule,
    EmissionFactor,
    FunctionalUnit,
    GridIntensity,
    LayerId,
    Operation,
    Profile,
    RegionCode,
    load_activities as schema_load_activities,
    load_activity_dependencies,
    load_activity_fu_map,
    load_assets as schema_load_assets,
    load_entities as schema_load_entities,
    load_feedback_loops as schema_load_feedback_loops,
    load_functional_units,
    load_operations as schema_load_operations,
    load_sites as schema_load_sites,
)
from ..upstream import dependency_metadata
from ..utils.clock import resolve_generated_at
from ..utils.env import env_flag
from ..utils.labels import normalise_category_label
from .emissions import (
    EmissionDetails,
    compute_emission_details,
    get_grid_intensity,
    resolve_grid_row,
    weekly_quantity,
)
from .formulas import (
    activity_unit_value,
    activity_unit_value_from_mapping,
    evaluate_functional_unit_formula,
    operation_variable_map,
    schedule_variable_map,
)
from .io import (
    ARTIFACT_ROOT,
    EXPORT_COLUMNS,
    INTENSITY_COLUMNS,
    REPO_ROOT,
    apply_build_hash,
    compute_build_hash,
    normalise_mapping,
    normalise_value,
    prepare_output_dir,
    resolve_output_root,
    sort_export_rows,
    stable_json_dumps,
    write_json,
    write_reference_file,
)
from .layers import resolve_layer_id

__all__ = ["build_intensity_matrix", "export_view"]


def _dedupe_preserve_order(values: Iterable[str | None]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not value:
            continue
        text = str(value)
        if text in seen:
            continue
        seen.add(text)
        ordered.append(text)
    return ordered


def build_intensity_matrix(
    profile_id: str | None = None,
    fu_id: str | None = None,
    *,
    ds: DataStore | None = None,
    output_dir: Path | None = None,
    emission_factors: Sequence[EmissionFactor] | None = None,
    activity_fu_map: Sequence[ActivityFunctionalUnitMap] | None = None,
    functional_units: Sequence[FunctionalUnit] | None = None,
    profiles: Sequence[Profile] | None = None,
    activity_schedule: Sequence[ActivitySchedule] | None = None,
    operations: Sequence[Operation] | None = None,
    operation_variables: Mapping[str, Mapping[str, Any]] | None = None,
    activities: Sequence[Activity] | None = None,
    grid_lookup: Mapping[str | RegionCode, float | None] | None = None,
    grid_by_region: Mapping[str | RegionCode, GridIntensity] | None = None,
) -> pd.DataFrame:
    datastore = ds or choose_backend()

    activities_seq = (
        list(activities) if activities is not None else list(datastore.load_activities())
    )
    activities_by_id = {activity.activity_id: activity for activity in activities_seq}

    functional_units_seq = (
        list(functional_units) if functional_units is not None else list(load_functional_units())
    )
    functional_units_by_id = {fu.functional_unit_id: fu for fu in functional_units_seq}

    emission_factors_seq = (
        list(emission_factors)
        if emission_factors is not None
        else list(datastore.load_emission_factors())
    )
    ef_by_activity: dict[str, EmissionFactor] = {}
    for ef in emission_factors_seq:
        if ef.activity_id not in ef_by_activity:
            ef_by_activity[ef.activity_id] = ef

    profiles_seq = list(profiles) if profiles is not None else list(datastore.load_profiles())
    profiles_by_id = {profile.profile_id: profile for profile in profiles_seq}

    schedules_seq = (
        list(activity_schedule)
        if activity_schedule is not None
        else list(datastore.load_activity_schedule())
    )

    if operations is not None:
        operations_seq = list(operations)
    else:
        loader = getattr(datastore, "load_operations", None)
        if callable(loader):
            operations_seq = list(loader())
        else:
            operations_seq = []
    operations_by_activity: dict[str, list[Operation]] = defaultdict(list)
    for op in operations_seq:
        operations_by_activity[op.activity_id].append(op)

    operation_variables_map = operation_variables or {}

    activity_fu_seq = (
        list(activity_fu_map)
        if activity_fu_map is not None
        else list(
            load_activity_fu_map(
                activities=activities_seq,
                functional_units=functional_units_seq,
            )
        )
    )

    if grid_lookup is None or grid_by_region is None:
        lookup: dict[str | RegionCode, float | None] = {}
        by_region: dict[str | RegionCode, GridIntensity] = {}
        for grid in datastore.load_grid_intensity():
            lookup[grid.region] = grid.intensity_g_per_kwh
            by_region[grid.region] = grid
            if hasattr(grid.region, "value"):
                lookup[grid.region.value] = grid.intensity_g_per_kwh
                by_region[grid.region.value] = grid
        grid_lookup = lookup if grid_lookup is None else grid_lookup
        grid_by_region = by_region if grid_by_region is None else grid_by_region

    schedules_by_activity: dict[str, list[ActivitySchedule]] = defaultdict(list)
    for sched in schedules_seq:
        if profile_id and sched.profile_id != profile_id:
            continue
        schedules_by_activity[sched.activity_id].append(sched)

    rows: list[dict[str, Any]] = []
    reference_order: list[str] = []

    for mapping in activity_fu_seq:
        if fu_id and mapping.functional_unit_id != fu_id:
            continue

        schedule_list = schedules_by_activity.get(mapping.activity_id, [])
        operation_list = operations_by_activity.get(mapping.activity_id, [])
        if not schedule_list and not operation_list:
            continue

        ef = ef_by_activity.get(mapping.activity_id)
        activity = activities_by_id.get(mapping.activity_id)
        functional_unit = functional_units_by_id.get(mapping.functional_unit_id)

        if schedule_list and ef is not None:
            for sched in schedule_list:
                profile = profiles_by_id.get(sched.profile_id)
                if profile is None:
                    continue

                variables = schedule_variable_map(sched)
                fu_value = evaluate_functional_unit_formula(mapping.conversion_formula, variables)
                if fu_value is None or not math.isfinite(fu_value) or fu_value <= 0:
                    continue

                activity_units = activity_unit_value(sched, activity, ef)
                if (
                    activity_units is None
                    or not math.isfinite(activity_units)
                    or activity_units <= 0
                ):
                    continue

                units_per_fu = activity_units / fu_value
                if not math.isfinite(units_per_fu) or units_per_fu <= 0:
                    continue

                intensity_mean: float | None = None
                intensity_low: float | None = None
                intensity_high: float | None = None
                region_value: str | None = None
                grid_row: GridIntensity | None = None

                if ef.value_g_per_unit is not None:
                    factor = float(ef.value_g_per_unit)
                    intensity_mean = factor * units_per_fu
                    if ef.uncert_low_g_per_unit is not None:
                        intensity_low = float(ef.uncert_low_g_per_unit) * units_per_fu
                    if ef.uncert_high_g_per_unit is not None:
                        intensity_high = float(ef.uncert_high_g_per_unit) * units_per_fu
                    if ef.region is not None:
                        region_value = (
                            ef.region.value if hasattr(ef.region, "value") else str(ef.region)
                        )
                elif ef.is_grid_indexed:
                    if grid_by_region:
                        grid_row = resolve_grid_row(sched, profile, grid_by_region)
                    grid_intensity = None
                    grid_low = None
                    grid_high = None
                    if grid_row:
                        region_value = (
                            grid_row.region.value
                            if hasattr(grid_row.region, "value")
                            else str(grid_row.region)
                        )
                        if grid_row.intensity_g_per_kwh is not None:
                            grid_intensity = float(grid_row.intensity_g_per_kwh)
                        if grid_row.intensity_low_g_per_kwh is not None:
                            grid_low = float(grid_row.intensity_low_g_per_kwh)
                        if grid_row.intensity_high_g_per_kwh is not None:
                            grid_high = float(grid_row.intensity_high_g_per_kwh)

                    if grid_intensity is None and grid_lookup is not None:
                        grid_intensity = get_grid_intensity(
                            profile,
                            grid_lookup,
                            sched.region_override,
                            sched.mix_region,
                            sched.use_canada_average,
                        )

                    kwh_per_unit = ef.electricity_kwh_per_unit
                    if grid_intensity is None or kwh_per_unit is None:
                        continue

                    kwh_per_fu = float(kwh_per_unit) * units_per_fu
                    intensity_mean = float(grid_intensity) * kwh_per_fu

                    if grid_low is not None or ef.electricity_kwh_per_unit_low is not None:
                        grid_low_val = grid_low if grid_low is not None else float(grid_intensity)
                        kwh_low_val = (
                            float(ef.electricity_kwh_per_unit_low) * units_per_fu
                            if ef.electricity_kwh_per_unit_low is not None
                            else kwh_per_fu
                        )
                        intensity_low = grid_low_val * kwh_low_val

                    if grid_high is not None or ef.electricity_kwh_per_unit_high is not None:
                        grid_high_val = (
                            grid_high if grid_high is not None else float(grid_intensity)
                        )
                        kwh_high_val = (
                            float(ef.electricity_kwh_per_unit_high) * units_per_fu
                            if ef.electricity_kwh_per_unit_high is not None
                            else kwh_per_fu
                        )
                        intensity_high = grid_high_val * kwh_high_val
                else:
                    continue

                if intensity_mean is None or not math.isfinite(intensity_mean):
                    continue

                weekly_frequency = weekly_quantity(sched, profile) if profile else None
                daily_frequency = (
                    (float(weekly_frequency) / 7.0) if weekly_frequency is not None else None
                )
                annual_fu = (
                    fu_value * daily_frequency * 365 if daily_frequency is not None else None
                )
                annual_kg = (annual_fu * intensity_mean / 1000) if annual_fu is not None else None

                source_candidates = []
                if ef.source_id:
                    source_candidates.append(str(ef.source_id))
                if grid_row and grid_row.source_id:
                    source_candidates.append(str(grid_row.source_id))
                source_ids = _dedupe_preserve_order(source_candidates)

                row_context = {"emission_factor": ef}
                if grid_row:
                    row_context["grid_intensity"] = grid_row
                citation_keys = collect_activity_source_keys([row_context])

                if citation_keys:
                    ordered_keys: list[str] = []
                    for key in source_ids:
                        if key in citation_keys and key not in ordered_keys:
                            ordered_keys.append(key)
                    for key in sorted(citation_keys):
                        if key not in ordered_keys:
                            ordered_keys.append(key)
                else:
                    ordered_keys = list(source_ids)

                for key in ordered_keys:
                    if key not in reference_order:
                        reference_order.append(key)

                rows.append(
                    {
                        "alt_id": sched.profile_id,
                        "alternative": sched.profile_id,
                        "record_type": "alternative",
                        "activity_id": mapping.activity_id,
                        "activity_name": activity.name if activity else None,
                        "functional_unit_id": mapping.functional_unit_id,
                        "fu_name": functional_unit.name if functional_unit else None,
                        "intensity_g_per_fu": intensity_mean,
                        "intensity_low_g_per_fu": intensity_low,
                        "intensity_high_g_per_fu": intensity_high,
                        "annual_fu": annual_fu,
                        "annual_kg": annual_kg,
                        "method_notes": None,
                        "scope_boundary": ef.scope_boundary,
                        "region": region_value,
                        "source_ids_csv": ",".join(source_ids),
                    }
                )

        if not operation_list:
            continue

        for operation in operation_list:
            if (
                operation.functional_unit_id
                and operation.functional_unit_id != mapping.functional_unit_id
            ):
                continue
            if fu_id and operation.functional_unit_id and operation.functional_unit_id != fu_id:
                continue

            variables, assumption_notes = operation_variable_map(operation, operation_variables_map)
            fu_value = evaluate_functional_unit_formula(mapping.conversion_formula, variables)

            intensity_mean = None
            intensity_low = None
            intensity_high = None
            region_value = None

            activity_units = None
            if variables:
                activity_units = activity_unit_value_from_mapping(variables, activity, ef)

            if (
                ef is not None
                and fu_value is not None
                and activity_units is not None
                and math.isfinite(fu_value)
                and math.isfinite(activity_units)
                and fu_value > 0
                and activity_units > 0
            ):
                units_per_fu = activity_units / fu_value
                if math.isfinite(units_per_fu) and units_per_fu > 0:
                    if ef.value_g_per_unit is not None:
                        factor = float(ef.value_g_per_unit)
                        intensity_mean = factor * units_per_fu
                        if ef.uncert_low_g_per_unit is not None:
                            intensity_low = float(ef.uncert_low_g_per_unit) * units_per_fu
                        if ef.uncert_high_g_per_unit is not None:
                            intensity_high = float(ef.uncert_high_g_per_unit) * units_per_fu
                        if ef.region is not None:
                            region_value = (
                                ef.region.value if hasattr(ef.region, "value") else str(ef.region)
                            )

            source_candidates = []
            if ef and ef.source_id:
                source_candidates.append(str(ef.source_id))
            source_ids = _dedupe_preserve_order(source_candidates)

            if ef:
                citation_keys = collect_activity_source_keys([{"emission_factor": ef}])
            else:
                citation_keys = []

            if citation_keys:
                ordered_keys = []
                for key in source_ids:
                    if key in citation_keys and key not in ordered_keys:
                        ordered_keys.append(key)
                for key in sorted(citation_keys):
                    if key not in ordered_keys:
                        ordered_keys.append(key)
            else:
                ordered_keys = list(source_ids)

            for key in ordered_keys:
                if key not in reference_order:
                    reference_order.append(key)

            notes_value = " ".join(assumption_notes) if assumption_notes else None

            rows.append(
                {
                    "alt_id": operation.operation_id,
                    "alternative": operation.operation_id,
                    "record_type": "operation",
                    "activity_id": mapping.activity_id,
                    "activity_name": activity.name if activity else None,
                    "functional_unit_id": mapping.functional_unit_id,
                    "fu_name": functional_unit.name if functional_unit else None,
                    "intensity_g_per_fu": intensity_mean,
                    "intensity_low_g_per_fu": intensity_low,
                    "intensity_high_g_per_fu": intensity_high,
                    "annual_fu": None,
                    "annual_kg": None,
                    "method_notes": notes_value,
                    "scope_boundary": ef.scope_boundary if ef else None,
                    "region": region_value,
                    "source_ids_csv": ",".join(source_ids),
                }
            )

    df = pd.DataFrame(rows, columns=INTENSITY_COLUMNS)
    if not df.empty:
        df = df.sort_values(
            ["functional_unit_id", "alt_id", "activity_id"],
            na_position="last",
        ).reset_index(drop=True)

    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        csv_path = output_dir / "intensity_matrix.csv"
        df.to_csv(csv_path, index=False, na_rep="")

        references = citations.format_references(reference_order)
        reference_dir = output_dir / "references"
        write_reference_file(reference_dir, "intensity", references)

    return df


def export_view(
    ds: Optional[DataStore] = None,
    output_root: Path | str | None = None,
) -> pd.DataFrame:
    datastore = ds or choose_backend()
    activities = {activity.activity_id: activity for activity in datastore.load_activities()}
    if not activities:
        try:
            activities = {activity.activity_id: activity for activity in schema_load_activities()}
        except Exception:  # pragma: no cover - defensive fallback
            activities = {}
    load_operations_fn = getattr(datastore, "load_operations", None)
    operations_iter = load_operations_fn() if callable(load_operations_fn) else []
    operations = {operation.operation_id: operation for operation in operations_iter}
    if not operations:
        try:
            operations = {op.operation_id: op for op in schema_load_operations()}
        except Exception:  # pragma: no cover - defensive fallback
            operations = {}
    load_entities_fn = getattr(datastore, "load_entities", None)
    entity_iter = list(load_entities_fn()) if callable(load_entities_fn) else []
    if not entity_iter:
        try:
            entity_iter = list(schema_load_entities())
        except Exception:  # pragma: no cover - defensive fallback
            entity_iter = []
    entities = {entity.entity_id: entity for entity in entity_iter if entity.entity_id}

    load_sites_fn = getattr(datastore, "load_sites", None)
    site_iter = list(load_sites_fn()) if callable(load_sites_fn) else []
    if not site_iter:
        try:
            site_iter = list(schema_load_sites(entities=entity_iter or None))
        except Exception:  # pragma: no cover - defensive fallback
            site_iter = []
    sites = {site.site_id: site for site in site_iter if site.site_id}

    load_assets_fn = getattr(datastore, "load_assets", None)
    asset_iter = list(load_assets_fn()) if callable(load_assets_fn) else []
    if not asset_iter:
        try:
            asset_iter = list(
                schema_load_assets(sites=site_iter or None, entities=entity_iter or None)
            )
        except Exception:  # pragma: no cover - defensive fallback
            asset_iter = []
    assets = {asset.asset_id: asset for asset in asset_iter if asset.asset_id}
    efs = {ef.activity_id: ef for ef in datastore.load_emission_factors()}
    profiles = {p.profile_id: p for p in datastore.load_profiles()}
    load_feedback_loops_fn = getattr(datastore, "load_feedback_loops", None)
    feedback_loops = list(load_feedback_loops_fn()) if callable(load_feedback_loops_fn) else []
    if not feedback_loops:
        try:
            feedback_loops = list(schema_load_feedback_loops(activities=list(activities.values())))
        except Exception:  # pragma: no cover - defensive fallback
            feedback_loops = []
    if activities:
        try:
            functional_units = list(load_functional_units())
            activity_fu_mappings = list(
                load_activity_fu_map(
                    activities=list(activities.values()),
                    functional_units=functional_units,
                )
            )
        except ValueError:
            functional_units = []
            activity_fu_mappings = []
    else:
        functional_units = []
        activity_fu_mappings = []
    functional_units_by_id = {
        fu.functional_unit_id: fu
        for fu in functional_units
        if getattr(fu, "functional_unit_id", None)
    }
    grid_lookup: Dict[str | RegionCode, Optional[float]] = {}
    grid_by_region: Dict[str | RegionCode, GridIntensity] = {}
    for gi in datastore.load_grid_intensity():
        grid_lookup[gi.region] = gi.intensity_g_per_kwh
        grid_by_region[gi.region] = gi
        if hasattr(gi.region, "value"):
            grid_lookup[gi.region.value] = gi.intensity_g_per_kwh
            grid_by_region[gi.region.value] = gi

    dependency_loader = getattr(datastore, "load_activity_dependencies", None)
    dependency_records = list(dependency_loader()) if callable(dependency_loader) else []
    if not dependency_records:
        try:
            dependency_records = load_activity_dependencies(
                activities=list(activities.values()) or None,
                operations=list(operations.values()) or None,
            )
        except Exception:  # pragma: no cover - defensive fallback
            dependency_records = []
    dependency_map: dict[str, list[dict[str, Any]]] = {}
    for dependency in dependency_records:
        child_id = dependency.child_activity_id
        if child_id not in activities:
            raise ValueError(f"Unknown child_activity_id referenced by dependencies: {child_id}")
        parent = operations.get(dependency.parent_operation_id)
        if parent is None:
            raise ValueError(
                "Unknown parent_operation_id referenced by dependencies: "
                f"{dependency.parent_operation_id}"
            )
        entry = {
            "operation_id": parent.operation_id,
            "share": float(dependency.share),
        }
        if dependency.notes:
            entry["notes"] = dependency.notes
        if parent.activity_id:
            entry["operation_activity_id"] = parent.activity_id
        if parent.asset_id:
            entry["operation_asset_id"] = parent.asset_id
        if parent.functional_unit_id:
            entry["operation_functional_unit_id"] = parent.functional_unit_id
        metadata = dependency_metadata(
            parent,
            activities=activities,
            assets=assets,
            sites=sites,
            entities=entities,
            functional_units=functional_units_by_id,
        )
        if metadata:
            entry.update(metadata)
        dependency_map.setdefault(child_id, []).append(entry)

    for child_id, entries in dependency_map.items():
        total_share = sum(entry.get("share", 0.0) for entry in entries)
        if total_share > 1.0000001:
            raise ValueError(
                f"Dependency shares for {child_id} exceed 1.0 (received {total_share:.6f})"
            )

    def _clone_chain(activity_id: str) -> list[dict[str, Any]]:
        chain = dependency_map.get(activity_id)
        if not chain:
            return []
        return [dict(entry) for entry in chain]

    civilian_layers = {LayerId.PROFESSIONAL.value, LayerId.ONLINE.value}
    bubble_upstream_lookup: dict[tuple[str | None, str], list[dict[str, Any]]] = {}

    rows: List[dict] = []
    derived_rows: List[dict] = []
    excluded_missing_profile = 0
    excluded_missing_ef = 0
    resolved_profile_ids: set[str] = set()
    manifest_regions: set[str] = set()
    manifest_layers: set[str] = set()
    manifest_ef_vintages: set[int] = set()
    manifest_grid_vintages: set[int] = set()
    manifest_vintage_matrix: dict[str, int] = {}

    schedules = datastore.load_activity_schedule()
    for sched in schedules:
        profile = profiles.get(sched.profile_id)
        ef = efs.get(sched.activity_id)
        activity = activities.get(sched.activity_id)

        grid_row: Optional[GridIntensity] = None
        details = EmissionDetails(mean=None, low=None, high=None)
        emission = None
        layer_id = resolve_layer_id(sched, profile, activity)

        if profile is None:
            excluded_missing_profile += 1
        if ef is None:
            excluded_missing_ef += 1
        if profile and ef:
            if ef.vintage_year is not None:
                manifest_ef_vintages.add(int(ef.vintage_year))
            if ef.is_grid_indexed:
                grid_row = resolve_grid_row(sched, profile, grid_by_region)
                if grid_row is not None:
                    region_value = (
                        grid_row.region.value
                        if hasattr(grid_row.region, "value")
                        else grid_row.region
                    )
                    if region_value is not None:
                        region_key = str(region_value)
                        manifest_regions.add(region_key)
                        if grid_row.vintage_year is not None:
                            year = int(grid_row.vintage_year)
                            manifest_grid_vintages.add(year)
                            existing_year = manifest_vintage_matrix.get(region_key)
                            if existing_year is None or year > existing_year:
                                manifest_vintage_matrix[region_key] = year
                    elif grid_row.vintage_year is not None:
                        manifest_grid_vintages.add(int(grid_row.vintage_year))
            details = compute_emission_details(sched, profile, ef, grid_lookup, grid_row)
            emission = details.mean
            if emission is not None and layer_id:
                manifest_layers.add(str(layer_id))

        upstream_chain: list[dict[str, Any]] | None = None
        if layer_id and layer_id in civilian_layers:
            upstream_chain = _clone_chain(sched.activity_id)
            bubble_upstream_lookup[(layer_id, sched.activity_id)] = [
                dict(entry) for entry in upstream_chain
            ]

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
                "upstream_chain": upstream_chain,
            }
        )

        if sched.profile_id:
            resolved_profile_ids.add(sched.profile_id)

        derived_rows.append(
            {
                "profile": profile,
                "schedule": sched,
                "activity_id": sched.activity_id,
                "activity_category": activity.category if isinstance(activity, Activity) else None,
                "emission_factor": ef,
                "grid_intensity": grid_row,
                "annual_emissions_g": emission,
                "layer_id": layer_id,
                "upstream_chain": upstream_chain,
            }
        )

    excluded_null_emissions = sum(1 for row in rows if row["annual_emissions_g"] is None)
    if excluded_missing_profile or excluded_missing_ef or excluded_null_emissions:
        print(
            "export_view: excluded or null emissions — "
            f"missing_profile={excluded_missing_profile} "
            f"missing_emission_factor={excluded_missing_ef} "
            f"null_emission_rows={excluded_null_emissions}",
            file=sys.stderr,
        )

    sorted_rows = sort_export_rows(rows)
    normalised_rows = [normalise_mapping(row) for row in sorted_rows]
    df = pd.DataFrame(normalised_rows, columns=EXPORT_COLUMNS)

    citation_keys = sorted(collect_activity_source_keys(derived_rows))
    loop_citation_keys = sorted({loop.source_id for loop in feedback_loops if loop.source_id})
    for key in loop_citation_keys:
        if key and key not in citation_keys:
            citation_keys.append(key)
    resolved_profiles = sorted(resolved_profile_ids)
    profile_arg = resolved_profiles if resolved_profiles else None
    generated_at = resolve_generated_at()
    sorted_layers = sorted(manifest_layers)

    layer_key_sets: dict[str, set[str]] = {}
    for loop in feedback_loops:
        if not loop.source_id:
            continue
        trigger_activity = activities.get(loop.trigger_activity_id)
        response_activity = activities.get(loop.response_activity_id)
        for activity in (trigger_activity, response_activity):
            layer_value = None
            if activity is not None:
                layer_value = getattr(activity.layer_id, "value", activity.layer_id)
            if layer_value:
                layer_key_sets.setdefault(str(layer_value), set()).add(loop.source_id)
    for row in derived_rows:
        layer = row.get("layer_id") if isinstance(row, dict) else getattr(row, "layer_id", None)
        if not layer:
            continue
        keys = collect_activity_source_keys([row])
        if not keys:
            continue
        layer_key_sets.setdefault(str(layer), set()).update(keys)

    layer_citation_keys: dict[str, List[str]] = {}
    for layer in sorted_layers:
        key_set = layer_key_sets.get(layer, set())
        ordered = [key for key in citation_keys if key in key_set]
        remaining = sorted(key_set.difference(ordered))
        layer_citation_keys[layer] = ordered + remaining

    layer_references: dict[str, List[str]] = {
        layer: citations.format_references(layer_citation_keys.get(layer, []))
        for layer in sorted_layers
    }

    reference_index_lookup = {key: idx for idx, key in enumerate(citation_keys, start=1)}

    stacked_groups: dict[tuple[str | None, str], set[str]] = defaultdict(set)
    bubble_groups: dict[tuple[str | None, str], set[str]] = defaultdict(set)
    sankey_groups: dict[tuple[str | None, str, str], set[str]] = defaultdict(set)

    for row in derived_rows:
        keys = collect_activity_source_keys([row])
        if not keys:
            continue
        layer_value = row.get("layer_id")
        layer_key = str(layer_value) if layer_value is not None else None
        activity_key = row.get("activity_id")
        activity_id = str(activity_key) if activity_key is not None else None
        category_raw = row.get("activity_category")
        category_key = normalise_category_label(category_raw)

        if category_key:
            stacked_groups[(layer_key, category_key)].update(keys)
        if activity_id:
            bubble_groups[(layer_key, activity_id)].update(keys)
            if category_key:
                sankey_groups[(layer_key, category_key, activity_id)].update(keys)

    def _ordered_keys(values: set[str]) -> list[str]:
        if not values:
            return []
        ordered = [key for key in citation_keys if key in values]
        remaining = [key for key in sorted(values) if key not in ordered]
        return ordered + remaining

    def _ordered_indices(keys: list[str]) -> list[int]:
        indices: list[int] = []
        for key in keys:
            index = reference_index_lookup.get(key)
            if index is not None:
                indices.append(index)
        return indices

    stacked_reference_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for group_key, values in stacked_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            stacked_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    bubble_reference_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for group_key, values in bubble_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            bubble_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    sankey_reference_map: dict[tuple[str | None, str, str], tuple[list[str], list[int]]] = {}
    for group_key, values in sankey_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            sankey_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    metadata = figures.build_metadata(
        "export_view",
        profile_ids=profile_arg,
        generated_at=generated_at,
    )
    metadata["citation_keys"] = citation_keys
    metadata["layers"] = sorted_layers
    if layer_citation_keys:
        metadata["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        metadata["layer_references"] = layer_references
    references = citations.format_references(citation_keys)
    metadata["references"] = references

    csv_metadata = {k: v for k, v in metadata.items() if k not in {"references", "data"}}
    csv_order = [
        "generated_at",
        "profile",
        "method",
        "profile_resolution",
        "citation_keys",
        "layers",
    ]
    ordered_keys = [key for key in csv_order if key in csv_metadata]
    remaining_keys = [key for key in csv_metadata if key not in csv_order]

    export_manifest_payload = {
        "generated_at": generated_at,
        "regions": sorted(manifest_regions),
        "vintages": {
            "emission_factors": sorted(manifest_ef_vintages),
            "grid_intensity": sorted(manifest_grid_vintages),
        },
        "vintage_matrix": {
            key: manifest_vintage_matrix[key] for key in sorted(manifest_vintage_matrix)
        },
        "sources": citation_keys,
        "layers": sorted_layers,
    }
    if layer_citation_keys:
        export_manifest_payload["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        export_manifest_payload["layer_references"] = layer_references

    build_hash = compute_build_hash(export_manifest_payload, normalised_rows)
    base_output_root = resolve_output_root(output_root, REPO_ROOT)
    output_root_path = apply_build_hash(base_output_root, REPO_ROOT, build_hash)

    out_dir = Path(output_root_path) / "calc" / "outputs"
    prepare_output_dir(out_dir)
    figure_dir = out_dir / "figures"
    reference_dir = out_dir / "references"
    prepare_output_dir(figure_dir)
    prepare_output_dir(reference_dir)

    write_reference_file(reference_dir, "export_view", references)

    artifact_figure_dir = ARTIFACT_ROOT / "figures"
    artifact_reference_dir = ARTIFACT_ROOT / "references"
    artifact_manifest_dir = ARTIFACT_ROOT / "manifests"
    for path in (artifact_figure_dir, artifact_reference_dir, artifact_manifest_dir):
        path.mkdir(parents=True, exist_ok=True)

    figure_manifests: list[FigureManifestArtifacts] = []
    hashed_preferred = env_flag("ACX040_HASHED")

    build_intensity_matrix(
        ds=datastore,
        output_dir=out_dir,
        emission_factors=list(efs.values()),
        activity_fu_map=activity_fu_mappings,
        functional_units=functional_units,
        profiles=list(profiles.values()),
        activity_schedule=schedules,
        activities=list(activities.values()),
        grid_lookup=grid_lookup,
        grid_by_region=grid_by_region,
    )

    export_csv_path = out_dir / "export_view.csv"
    with export_csv_path.open("w", encoding="utf-8") as fh:
        for key in ordered_keys + sorted(remaining_keys):
            value_payload = normalise_value(csv_metadata[key])
            if isinstance(value_payload, (dict, list)):
                value_str = repr(value_payload)
            else:
                value_str = "" if value_payload is None else str(value_payload)
            fh.write(f"# {key}: {value_str}\n")
        df.to_csv(fh, index=False)

    records = [{column: row.get(column) for column in EXPORT_COLUMNS} for row in normalised_rows]
    payload = dict(metadata)
    payload["data"] = records
    write_json(out_dir / "export_view.json", payload)

    dependency_payload = {
        activity_id: [dict(entry) for entry in entries]
        for activity_id, entries in sorted(dependency_map.items())
    }
    if dependency_payload:
        write_json(out_dir / "dependency_map.json", dependency_payload)

    def _with_layer_id(entry_payload: Mapping[str, Any]) -> dict[str, Any]:
        """Return ``entry_payload`` with a normalised ``layer_id`` field."""

        value = entry_payload.get("layer_id") if isinstance(entry_payload, Mapping) else None
        if isinstance(value, LayerId):
            layer_value: str | None = value.value
        elif isinstance(value, str):
            layer_value = value
        else:
            layer_value = None
        if entry_payload.get("layer_id") == layer_value:
            return dict(entry_payload)
        normalised = dict(entry_payload)
        normalised["layer_id"] = layer_value
        return normalised

    stacked = [
        _with_layer_id(entry)
        for entry in figures.slice_stacked(df, reference_map=stacked_reference_map)
    ]
    bubble_points = [
        _with_layer_id(asdict(point))
        for point in figures.slice_bubble(df, reference_map=bubble_reference_map)
    ]
    for point in bubble_points:
        layer_value = point.get("layer_id")
        activity_value = point.get("activity_id")
        key = (layer_value, activity_value)
        chain = bubble_upstream_lookup.get(key)
        if chain is not None and layer_value in civilian_layers:
            point["upstream_chain"] = [dict(entry) for entry in chain]
    sankey = figures.slice_sankey(df, reference_map=sankey_reference_map)
    if isinstance(sankey, Mapping):
        links = sankey.get("links")
        if isinstance(links, list):
            sankey = dict(sankey)
            sankey["links"] = [_with_layer_id(link) for link in links if isinstance(link, Mapping)]
    feedback_graph = figures.slice_feedback(feedback_loops, activities, df)
    if isinstance(feedback_graph, Mapping):
        feedback_graph = dict(feedback_graph)
        feedback_nodes = feedback_graph.get("nodes")
        if isinstance(feedback_nodes, list):
            feedback_graph["nodes"] = [
                _with_layer_id(node) for node in feedback_nodes if isinstance(node, Mapping)
            ]
        feedback_links = feedback_graph.get("links")
        if isinstance(feedback_links, list):
            feedback_graph["links"] = [
                _with_layer_id(link) for link in feedback_links if isinstance(link, Mapping)
            ]

    def _write_figure(name: str, method: str, data: object) -> None:
        meta = figures.build_metadata(
            method,
            profile_ids=profile_arg,
            generated_at=generated_at,
        )
        meta["citation_keys"] = citation_keys
        meta["layers"] = sorted_layers
        if layer_citation_keys:
            meta["layer_citation_keys"] = layer_citation_keys
        if layer_references:
            meta["layer_references"] = layer_references
        meta["references"] = references
        meta["data"] = data
        trimmed_meta = figures.trim_figure_payload(meta)
        legacy_figure_path = figure_dir / f"{name}.json"
        write_json(legacy_figure_path, trimmed_meta)

        stable_payload = stable_json_dumps(trimmed_meta)
        figure_sha256 = hashlib.sha256(stable_payload.encode("utf-8")).hexdigest()
        hash_prefix = figure_sha256[:8]

        artifact_legacy_figure = artifact_figure_dir / f"{name}.json"
        artifact_hashed_figure = artifact_figure_dir / f"{name}.{hash_prefix}.json"
        artifact_legacy_figure.write_text(stable_payload, encoding="utf-8")
        artifact_hashed_figure.write_text(stable_payload, encoding="utf-8")

        reference_text = write_reference_file(reference_dir, name, references)
        references_bytes = reference_text.encode("utf-8")
        references_sha256 = hashlib.sha256(references_bytes).hexdigest()
        artifact_legacy_reference = artifact_reference_dir / f"{name}_refs.txt"
        artifact_hashed_reference = artifact_reference_dir / f"{name}_refs.{hash_prefix}.txt"
        artifact_legacy_reference.write_text(reference_text, encoding="utf-8")
        artifact_hashed_reference.write_text(reference_text, encoding="utf-8")

        manifest_generated_at = meta.get("generated_at")
        if not isinstance(manifest_generated_at, str):
            manifest_generated_at = generated_at

        figure_manifest = build_figure_manifest(
            figure_id=name,
            figure_method=method,
            generated_at=manifest_generated_at,
            hash_prefix=hash_prefix,
            figure_sha256=figure_sha256,
            figure_path=artifact_hashed_figure,
            legacy_figure_path=artifact_legacy_figure,
            citation_keys=[str(key) for key in meta.get("citation_keys", [])],
            references=[str(entry) for entry in references],
            references_sha256=references_sha256,
            references_path=artifact_hashed_reference,
            legacy_references_path=artifact_legacy_reference,
            artifact_root=ARTIFACT_ROOT,
        )
        figure_manifest_payload = figure_manifest.model_dump(mode="json")
        manifest_json = stable_json_dumps(figure_manifest_payload)
        manifest_sha256 = hashlib.sha256(manifest_json.encode("utf-8")).hexdigest()
        legacy_manifest_path = artifact_manifest_dir / f"{name}.manifest.json"
        hashed_manifest_path = artifact_manifest_dir / f"{name}.{hash_prefix}.manifest.json"
        legacy_manifest_path.write_text(manifest_json, encoding="utf-8")
        hashed_manifest_path.write_text(manifest_json, encoding="utf-8")

        figure_manifests.append(
            bundle_manifest_artifacts(
                figure_manifest,
                manifest_path=hashed_manifest_path,
                legacy_manifest_path=legacy_manifest_path,
                manifest_sha256=manifest_sha256,
                references_sha256=references_sha256,
                artifact_root=ARTIFACT_ROOT,
            )
        )

    _write_figure("stacked", "figures.stacked", stacked)
    _write_figure("bubble", "figures.bubble", bubble_points)
    _write_figure("sankey", "figures.sankey", sankey)
    _write_figure("feedback", "figures.feedback", feedback_graph)

    manifest_module.generate_all(out_dir)

    manifest = dict(export_manifest_payload)
    manifest["build_hash"] = build_hash
    write_json(out_dir / "manifest.json", manifest)

    dataset_manifest_path = out_dir / "manifest.json"
    dataset_manifest_sha256 = hashlib.sha256(dataset_manifest_path.read_bytes()).hexdigest()
    dataset_version_value = manifest.get("dataset_version")
    dataset_version = str(dataset_version_value) if isinstance(dataset_version_value, str) else None

    if figure_manifests:
        index_model = build_collection_index(
            figure_manifests,
            generated_at=str(metadata.get("generated_at", generated_at)),
            build_hash=build_hash,
            dataset_version=dataset_version,
            hashed_preferred=hashed_preferred,
            dataset_manifest_path=dataset_manifest_path,
            dataset_manifest_sha256=dataset_manifest_sha256,
            artifact_root=ARTIFACT_ROOT,
        )
        index_json = stable_json_dumps(index_model.model_dump(mode="json"))
        (ARTIFACT_ROOT / "manifest.json").write_text(index_json, encoding="utf-8")

    try:
        output_root_path.resolve().relative_to(ARTIFACT_ROOT.resolve())
    except ValueError:
        pass
    else:
        pointer_payload = {
            "build_hash": build_hash,
            "artifact_dir": os.getenv("ACX_POINTER_ARTIFACT_DIR", str(output_root_path)),
        }
        write_json(ARTIFACT_ROOT / "latest-build.json", pointer_payload)

    return df
