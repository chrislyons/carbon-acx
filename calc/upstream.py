"""Helper utilities for enriching upstream dependency metadata."""

from __future__ import annotations

from typing import Mapping

from .schema import Activity, Asset, Entity, FunctionalUnit, Operation, Site

__all__ = ["dependency_metadata"]


def _coerce_text(value: object | None) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def _short_activity_label(name: str | None) -> str | None:
    if not name:
        return None
    text = name.strip()
    for separator in ("—", "–", "-", ":"):
        if separator in text:
            text = text.split(separator, 1)[0].strip()
            break
    if "(" in text:
        text = text.split("(", 1)[0].strip()
    return text or name.strip()


def dependency_metadata(
    operation: Operation,
    *,
    activities: Mapping[str, Activity] | None = None,
    assets: Mapping[str, Asset] | None = None,
    sites: Mapping[str, Site] | None = None,
    entities: Mapping[str, Entity] | None = None,
    functional_units: Mapping[str, FunctionalUnit] | None = None,
) -> dict[str, object]:
    """Return optional metadata fields for an upstream dependency entry."""

    metadata: dict[str, object] = {}

    activity = activities.get(operation.activity_id) if activities else None
    if activity is not None:
        activity_name = _coerce_text(activity.name)
        if activity_name:
            metadata["operation_activity_name"] = activity_name
            short_label = _short_activity_label(activity_name)
            if short_label:
                metadata["operation_activity_label"] = short_label
        category = _coerce_text(activity.category)
        if category:
            metadata["operation_activity_category"] = category

    asset = assets.get(operation.asset_id) if assets else None
    site = sites.get(asset.site_id) if asset and sites else None
    entity = entities.get(site.entity_id) if site and entities else None

    asset_name = _coerce_text(getattr(asset, "name", None))
    if asset_name:
        metadata["operation_asset_name"] = asset_name
    site_name = _coerce_text(getattr(site, "name", None))
    if site_name:
        metadata["operation_site_name"] = site_name

    entity_name = _coerce_text(getattr(entity, "name", None))
    if entity_name:
        metadata["operation_entity_name"] = entity_name
    entity_id = _coerce_text(getattr(entity, "entity_id", None))
    if entity_id:
        metadata["operation_entity_id"] = entity_id
    entity_type = getattr(entity, "type", None)
    if entity_type:
        metadata["operation_entity_type"] = (
            entity_type.value if hasattr(entity_type, "value") else str(entity_type)
        )

    if operation.functional_unit_id and functional_units:
        functional_unit = functional_units.get(operation.functional_unit_id)
        if functional_unit is not None:
            fu_name = _coerce_text(functional_unit.name)
            if fu_name:
                metadata["operation_functional_unit_name"] = fu_name

    return metadata
