"""Runtime compute orchestration used by the live /api/compute endpoint."""

from __future__ import annotations

import hashlib
import math
import os
from collections import defaultdict
from dataclasses import asdict
from typing import Any, Iterable, Mapping

import pandas as pd

from . import citations, figures
from .upstream import dependency_metadata
from .api import collect_activity_source_keys
from .dal import DataStore, SqlStore
from .schema import (
    Activity,
    ActivitySchedule,
    EmissionFactor,
    GridIntensity,
    LayerId,
    Profile,
    RegionCode,
    load_activities as schema_load_activities,
    load_activity_dependencies,
    load_assets as schema_load_assets,
    load_entities as schema_load_entities,
    load_functional_units as schema_load_functional_units,
    load_feedback_loops as schema_load_feedback_loops,
    load_operations as schema_load_operations,
    load_sites as schema_load_sites,
)

# ``calc.derive`` hosts the bulk of the data orchestration logic for the static
# build pipeline.  The live compute path mirrors that behaviour to ensure API
# results stay aligned with the existing artefacts.  Importing the helpers keeps
# the implementation compact without duplicating the transformation logic.
from . import derive

__all__ = ["compute_profile"]


_VERSION_TABLES = (
    "activities",
    "profiles",
    "emission_factors",
    "activity_schedule",
    "grid_intensity",
    "sources",
)


def _normalise_overrides(overrides: Mapping[str, Any] | None) -> dict[str, float]:
    if overrides is None:
        return {}
    if not isinstance(overrides, Mapping):
        raise TypeError("overrides must be a mapping of activity_id to quantity")

    normalised: dict[str, float] = {}
    for raw_key, raw_value in overrides.items():
        if raw_value is None:
            continue
        if not isinstance(raw_key, str) or not raw_key.strip():
            raise ValueError("override keys must be non-empty activity identifiers")
        if isinstance(raw_value, bool):
            # ``bool`` is a subclass of ``int``; explicitly reject it to avoid
            # quietly accepting ``True``/``False`` as 1/0.
            raise TypeError("override values must be numeric quantities, not booleans")
        try:
            value = float(raw_value)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
            raise ValueError(f"invalid override value for {raw_key!r}: {raw_value!r}") from exc
        if not math.isfinite(value):
            raise ValueError(f"override value for {raw_key!r} must be finite")
        normalised[raw_key] = value
    return normalised


def _dataset_version_from_store(store: DataStore) -> str:
    env_value = os.getenv("ACX_DATASET_VERSION")
    if env_value:
        return env_value

    conn = getattr(store, "_conn", None)
    if conn is None:  # pragma: no cover - exercised with CSV/DuckDB backends
        return "unknown"

    parts: list[str] = []
    try:
        cursor = conn.execute("PRAGMA user_version")
    except Exception:  # pragma: no cover - duckdb compat
        cursor = None
    if cursor is not None:
        row = cursor.fetchone()
        if row and row[0]:
            parts.append(f"user_version:{int(row[0])}")

    for table in _VERSION_TABLES:
        try:
            count_row = conn.execute(
                f"SELECT COUNT(*), COALESCE(MAX(rowid), 0) FROM {table}"
            ).fetchone()
        except Exception:  # pragma: no cover - duckdb compat
            continue
        if not count_row:
            continue
        count, max_rowid = count_row
        parts.append(f"{table}:{int(count)}:{int(max_rowid)}")

    if not parts:
        return "unknown"

    digest_source = "|".join(parts).encode("utf-8")
    return hashlib.sha256(digest_source).hexdigest()[:16]


def _apply_override(sched: ActivitySchedule, value: float) -> ActivitySchedule:
    return sched.model_copy(
        update={
            "quantity_per_week": value,
            "freq_per_day": None,
            "freq_per_week": None,
        },
        deep=True,
    )


def _collect_grid_maps(
    entries: Iterable[GridIntensity],
) -> tuple[dict[str | RegionCode, float | None], dict[str | RegionCode, GridIntensity]]:
    lookup: dict[str | RegionCode, float | None] = {}
    by_region: dict[str | RegionCode, GridIntensity] = {}
    for row in entries:
        lookup[row.region] = row.intensity_g_per_kwh
        by_region[row.region] = row
        if hasattr(row.region, "value"):
            lookup[row.region.value] = row.intensity_g_per_kwh
            by_region[row.region.value] = row
    return lookup, by_region


def _resolve_profile(profiles: Mapping[str, Profile], profile_id: str) -> Profile:
    try:
        return profiles[profile_id]
    except KeyError as exc:  # pragma: no cover - validated in tests
        raise ValueError(f"unknown profile_id: {profile_id}") from exc


def _collect_layer_references(
    derived_rows: Iterable[dict[str, Any]],
    citation_keys: list[str],
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    layer_key_sets: dict[str, set[str]] = {}
    for row in derived_rows:
        layer = row.get("layer_id") if isinstance(row, dict) else None
        if not layer:
            continue
        keys = collect_activity_source_keys([row])
        if not keys:
            continue
        layer_key_sets.setdefault(str(layer), set()).update(keys)

    layer_citation_keys: dict[str, list[str]] = {}
    for layer, key_set in layer_key_sets.items():
        ordered = [key for key in citation_keys if key in key_set]
        remaining = sorted(key_set.difference(ordered))
        if ordered or remaining:
            layer_citation_keys[layer] = ordered + remaining

    layer_references: dict[str, list[str]] = {
        layer: [
            citations.format_ieee(ref.numbered(idx))
            for idx, ref in enumerate(citations.references_for(keys), start=1)
        ]
        for layer, keys in layer_citation_keys.items()
    }
    return layer_citation_keys, layer_references


def _reference_maps(
    derived_rows: Iterable[dict[str, Any]],
    citation_keys: list[str],
) -> tuple[
    dict[tuple[str | None, str], tuple[list[str], list[int]]],
    dict[tuple[str | None, str], tuple[list[str], list[int]]],
    dict[tuple[str | None, str, str], tuple[list[str], list[int]]],
]:
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
        activity_value = row.get("activity_id")
        activity_key = str(activity_value) if activity_value is not None else None
        category_raw = row.get("activity_category")
        category_key = derive._normalise_category_label(category_raw)

        if category_key:
            stacked_groups[(layer_key, category_key)].update(keys)
        if activity_key:
            bubble_groups[(layer_key, activity_key)].update(keys)
            if category_key:
                sankey_groups[(layer_key, category_key, activity_key)].update(keys)

    def _ordered(values: set[str]) -> list[str]:
        if not values:
            return []
        ordered_keys = [key for key in citation_keys if key in values]
        remaining = [key for key in sorted(values) if key not in ordered_keys]
        return ordered_keys + remaining

    def _indices(keys: list[str]) -> list[int]:
        return [reference_index_lookup[key] for key in keys if key in reference_index_lookup]

    stacked_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for key, values in stacked_groups.items():
        ordered = _ordered(values)
        if ordered:
            stacked_map[key] = (ordered, _indices(ordered))

    bubble_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for key, values in bubble_groups.items():
        ordered = _ordered(values)
        if ordered:
            bubble_map[key] = (ordered, _indices(ordered))

    sankey_map: dict[tuple[str | None, str, str], tuple[list[str], list[int]]] = {}
    for key, values in sankey_groups.items():
        ordered = _ordered(values)
        if ordered:
            sankey_map[key] = (ordered, _indices(ordered))

    return stacked_map, bubble_map, sankey_map


def _build_manifest_payload(
    *,
    generated_at: str,
    manifest_layers: set[str],
    manifest_regions: set[str],
    manifest_ef_vintages: set[int],
    manifest_grid_vintages: set[int],
    manifest_vintage_matrix: dict[str, int],
    citation_keys: list[str],
    layer_citation_keys: dict[str, list[str]],
    layer_references: dict[str, list[str]],
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "generated_at": generated_at,
        "layers": sorted(manifest_layers),
        "regions": sorted(manifest_regions),
        "sources": citation_keys,
        "vintages": {
            "emission_factors": sorted(manifest_ef_vintages),
            "grid_intensity": sorted(manifest_grid_vintages),
        },
        "vintage_matrix": {
            key: manifest_vintage_matrix[key] for key in sorted(manifest_vintage_matrix)
        },
    }
    if layer_citation_keys:
        payload["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        payload["layer_references"] = layer_references
    return payload


def _figure_payload(
    method: str,
    data: Any,
    *,
    generated_at: str,
    profiles: list[str],
    citation_keys: list[str],
    layers: list[str],
    layer_citation_keys: dict[str, list[str]],
    layer_references: dict[str, list[str]],
    references: list[str],
) -> dict[str, Any]:
    metadata = figures.build_metadata(
        method,
        profile_ids=profiles or None,
        generated_at=generated_at,
    )
    metadata["citation_keys"] = citation_keys
    metadata["layers"] = layers
    if layer_citation_keys:
        metadata["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        metadata["layer_references"] = layer_references
    metadata["references"] = references
    metadata["data"] = data
    return figures.trim_figure_payload(metadata)


def compute_profile(
    profile_id: str,
    overrides: Mapping[str, Any] | None = None,
    *,
    datastore: DataStore | None = None,
) -> dict[str, Any]:
    """Return figure slices for ``profile_id`` applying optional overrides."""

    if not isinstance(profile_id, str) or not profile_id.strip():
        raise ValueError("profile_id must be a non-empty string")

    override_values = _normalise_overrides(overrides)

    store = datastore or SqlStore()
    should_close = datastore is None and hasattr(store, "close")
    try:
        activities = {activity.activity_id: activity for activity in store.load_activities()}
        if not activities:
            try:
                activities = {
                    activity.activity_id: activity for activity in schema_load_activities()
                }
            except Exception:  # pragma: no cover - defensive fallback
                activities = {}
        load_operations_fn = getattr(store, "load_operations", None)
        operations_iter = load_operations_fn() if callable(load_operations_fn) else []
        operations = {op.operation_id: op for op in operations_iter}
        if not operations:
            try:
                operations = {op.operation_id: op for op in schema_load_operations()}
            except Exception:  # pragma: no cover - defensive fallback
                operations = {}

        load_entities_fn = getattr(store, "load_entities", None)
        entity_iter = list(load_entities_fn()) if callable(load_entities_fn) else []
        if not entity_iter:
            try:
                entity_iter = list(schema_load_entities())
            except Exception:  # pragma: no cover - defensive fallback
                entity_iter = []
        entities = {entity.entity_id: entity for entity in entity_iter if entity.entity_id}

        load_sites_fn = getattr(store, "load_sites", None)
        site_iter = list(load_sites_fn()) if callable(load_sites_fn) else []
        if not site_iter:
            try:
                site_iter = list(schema_load_sites(entities=entity_iter or None))
            except Exception:  # pragma: no cover - defensive fallback
                site_iter = []
        sites = {site.site_id: site for site in site_iter if site.site_id}

        load_assets_fn = getattr(store, "load_assets", None)
        asset_iter = list(load_assets_fn()) if callable(load_assets_fn) else []
        if not asset_iter:
            try:
                asset_iter = list(
                    schema_load_assets(sites=site_iter or None, entities=entity_iter or None)
                )
            except Exception:  # pragma: no cover - defensive fallback
                asset_iter = []
        assets = {asset.asset_id: asset for asset in asset_iter if asset.asset_id}

        load_feedback_fn = getattr(store, "load_feedback_loops", None)
        feedback_loops = list(load_feedback_fn()) if callable(load_feedback_fn) else []
        if not feedback_loops:
            try:
                feedback_loops = list(
                    schema_load_feedback_loops(activities=list(activities.values()))
                )
            except Exception:  # pragma: no cover - defensive fallback
                feedback_loops = []

        load_fu_fn = getattr(store, "load_functional_units", None)
        fu_iter = list(load_fu_fn()) if callable(load_fu_fn) else []
        if not fu_iter:
            try:
                fu_iter = list(schema_load_functional_units())
            except Exception:  # pragma: no cover - defensive fallback
                fu_iter = []
        functional_units = {fu.functional_unit_id: fu for fu in fu_iter if fu.functional_unit_id}

        emission_factors = {ef.activity_id: ef for ef in store.load_emission_factors()}
        profiles = {item.profile_id: item for item in store.load_profiles()}
        profile = _resolve_profile(profiles, profile_id)

        grid_lookup, grid_by_region = _collect_grid_maps(store.load_grid_intensity())

        dependency_loader = getattr(store, "load_activity_dependencies", None)
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
                raise ValueError(
                    f"Unknown child_activity_id referenced by dependencies: {child_id}"
                )
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
                functional_units=functional_units,
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

        schedules = [
            sched for sched in store.load_activity_schedule() if sched.profile_id == profile_id
        ]
        if not schedules:
            raise ValueError(f"profile {profile_id!r} has no associated schedule rows")

        rows: list[dict[str, Any]] = []
        derived_rows: list[dict[str, Any]] = []
        resolved_profiles: set[str] = set()
        manifest_layers: set[str] = set()
        manifest_regions: set[str] = set()
        manifest_ef_vintages: set[int] = set()
        manifest_grid_vintages: set[int] = set()
        manifest_vintage_matrix: dict[str, int] = {}

        for sched in schedules:
            override = override_values.get(sched.activity_id)
            if override is not None:
                sched = _apply_override(sched, override)

            ef = emission_factors.get(sched.activity_id)
            activity = activities.get(sched.activity_id)

            layer_id = derive._resolve_layer_id(sched, profile, activity)
            if layer_id:
                manifest_layers.add(layer_id)

            grid_row: GridIntensity | None = None
            details = derive.EmissionDetails(mean=None, low=None, high=None)
            emission = None
            if ef:
                if ef.vintage_year is not None:
                    manifest_ef_vintages.add(int(ef.vintage_year))
                if ef.is_grid_indexed:
                    grid_row = derive._resolve_grid_row(sched, profile, grid_by_region)
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
                                existing = manifest_vintage_matrix.get(region_key)
                                if existing is None or year > existing:
                                    manifest_vintage_matrix[region_key] = year
                        elif grid_row.vintage_year is not None:
                            manifest_grid_vintages.add(int(grid_row.vintage_year))
                details = derive.compute_emission_details(sched, profile, ef, grid_lookup, grid_row)
                emission = details.mean

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
                    "activity_category": (
                        activity.category if isinstance(activity, Activity) else None
                    ),
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

            resolved_profiles.add(sched.profile_id)
            derived_rows.append(
                {
                    "profile": profile,
                    "schedule": sched,
                    "activity_id": sched.activity_id,
                    "activity_category": (
                        activity.category if isinstance(activity, Activity) else None
                    ),
                    "emission_factor": ef,
                    "grid_intensity": grid_row,
                    "annual_emissions_g": emission,
                    "layer_id": layer_id,
                    "upstream_chain": upstream_chain,
                }
            )

        sorted_rows = derive._sort_export_rows(rows)
        normalised_rows = [derive._normalise_mapping(row) for row in sorted_rows]
        df = pd.DataFrame(normalised_rows, columns=derive.EXPORT_COLUMNS)

        citation_keys = sorted(collect_activity_source_keys(derived_rows))
        loop_citation_keys = sorted({loop.source_id for loop in feedback_loops if loop.source_id})
        for key in loop_citation_keys:
            if key and key not in citation_keys:
                citation_keys.append(key)
        generated_at = derive._resolve_generated_at()
        profile_list = sorted(resolved_profiles)
        layers_sorted = sorted(manifest_layers)

        layer_citation_keys, layer_references = _collect_layer_references(
            derived_rows, citation_keys
        )
        loop_layer_keys: dict[str, set[str]] = {}
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
                    loop_layer_keys.setdefault(str(layer_value), set()).add(loop.source_id)
        if loop_layer_keys:
            for layer, keys in loop_layer_keys.items():
                existing = layer_citation_keys.get(layer, [])
                existing_set = set(existing)
                ordered = [key for key in citation_keys if key in keys]
                for key in ordered:
                    if key not in existing_set:
                        existing.append(key)
                        existing_set.add(key)
                remaining = sorted(keys.difference(existing_set))
                for key in remaining:
                    if key not in existing_set:
                        existing.append(key)
                        existing_set.add(key)
                layer_citation_keys[layer] = existing
            layer_references = {
                layer: [
                    citations.format_ieee(ref.numbered(idx))
                    for idx, ref in enumerate(citations.references_for(keys), start=1)
                ]
                for layer, keys in layer_citation_keys.items()
            }

        stacked_map, bubble_map, sankey_map = _reference_maps(derived_rows, citation_keys)

        references = [
            citations.format_ieee(ref.numbered(idx))
            for idx, ref in enumerate(citations.references_for(citation_keys), start=1)
        ]

        manifest_payload = _build_manifest_payload(
            generated_at=generated_at,
            manifest_layers=manifest_layers,
            manifest_regions=manifest_regions,
            manifest_ef_vintages=manifest_ef_vintages,
            manifest_grid_vintages=manifest_grid_vintages,
            manifest_vintage_matrix=manifest_vintage_matrix,
            citation_keys=citation_keys,
            layer_citation_keys=layer_citation_keys,
            layer_references=layer_references,
        )

        dataset_version = _dataset_version_from_store(store)
        manifest = dict(manifest_payload)
        manifest["profile_id"] = profile_id
        manifest["profile_resolution"] = {
            "requested": profile_id,
            "used": profile_list,
        }
        if override_values:
            manifest["overrides"] = override_values
        manifest["dataset_version"] = dataset_version

        stacked_result = figures.slice_stacked(df, reference_map=stacked_map)
        bubble_points = [
            asdict(point) for point in figures.slice_bubble(df, reference_map=bubble_map)
        ]
        for point in bubble_points:
            layer_value = point.get("layer_id")
            activity_value = point.get("activity_id")
            chain = bubble_upstream_lookup.get((layer_value, activity_value))
            if chain is not None and layer_value in civilian_layers:
                point["upstream_chain"] = [dict(entry) for entry in chain]
        sankey_result = figures.slice_sankey(df, reference_map=sankey_map)
        feedback_result = figures.slice_feedback(feedback_loops, activities, df)

        figures_payload = {
            "stacked": _figure_payload(
                "figures.stacked",
                stacked_result,
                generated_at=generated_at,
                profiles=profile_list,
                citation_keys=citation_keys,
                layers=layers_sorted,
                layer_citation_keys=layer_citation_keys,
                layer_references=layer_references,
                references=references,
            ),
            "bubble": _figure_payload(
                "figures.bubble",
                bubble_points,
                generated_at=generated_at,
                profiles=profile_list,
                citation_keys=citation_keys,
                layers=layers_sorted,
                layer_citation_keys=layer_citation_keys,
                layer_references=layer_references,
                references=references,
            ),
            "sankey": _figure_payload(
                "figures.sankey",
                sankey_result,
                generated_at=generated_at,
                profiles=profile_list,
                citation_keys=citation_keys,
                layers=layers_sorted,
                layer_citation_keys=layer_citation_keys,
                layer_references=layer_references,
                references=references,
            ),
            "feedback": _figure_payload(
                "figures.feedback",
                feedback_result,
                generated_at=generated_at,
                profiles=profile_list,
                citation_keys=citation_keys,
                layers=layers_sorted,
                layer_citation_keys=layer_citation_keys,
                layer_references=layer_references,
                references=references,
            ),
        }

        return {
            "figures": figures_payload,
            "references": references,
            "manifest": manifest,
        }
    finally:
        if should_close:  # pragma: no branch - simple guard
            store.close()
