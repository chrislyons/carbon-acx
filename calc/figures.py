from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any, MutableMapping, Sequence
from dataclasses import dataclass
import datetime as _datetime_module
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd
import yaml

from .dal.aliases import coalesce_alias_columns, remap_columns
from .schema import Activity, FeedbackLoop, LayerId

CONFIG_PATH = Path(__file__).parent / "config.yaml"

LAYER_ORDER = [layer.value for layer in LayerId]
ANNUAL_EMISSIONS_UNITS = {
    "quantity": "annual_emissions",
    "unit": "g_co2e",
    "label": "Annual emissions (g CO₂e)",
}
DEFAULT_GENERATED_AT = "1970-01-01T00:00:00+00:00"
GENERATED_AT_ENV = "ACX_GENERATED_AT"
datetime = _datetime_module.datetime
timezone = _datetime_module.timezone


@lru_cache(maxsize=1)
def _load_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise TypeError("Configuration must be a mapping")
    return data


def _resolve_generated_at(value: str | None = None) -> str:
    if value:
        return value
    env_value = os.getenv(GENERATED_AT_ENV)
    if env_value:
        return env_value
    return datetime.now(timezone.utc).isoformat()


def build_metadata(
    method: str,
    profile_ids: Iterable[str] | None = None,
    *,
    generated_at: str | None = None,
) -> dict:
    config = _load_config()
    requested_profile = config.get("default_profile")

    used_profiles: list[str] | None = None
    profile_value = requested_profile
    if profile_ids is not None:
        used_profiles = [str(profile_id) for profile_id in profile_ids if profile_id]
        if used_profiles:
            profile_value = ", ".join(used_profiles) if len(used_profiles) > 1 else used_profiles[0]
        else:
            profile_value = None

    metadata = {
        "generated_at": _resolve_generated_at(generated_at),
        "profile": profile_value,
        "method": method,
    }

    if used_profiles is not None:
        metadata["profile_resolution"] = {
            "requested": requested_profile,
            "used": used_profiles,
        }

    return metadata


def _coerce_optional(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return None
        return float(value)
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if pd.isna(num):
        return None
    return num


def _bounds(mean: float | None, low: float | None, high: float | None) -> dict:
    if mean is None:
        raise ValueError("Mean value is required for figure slices")
    payload = {"mean": mean}
    if low is not None:
        payload["low"] = low
    if high is not None:
        payload["high"] = high
    return payload


def _value_columns(frame: pd.DataFrame) -> list[str]:
    columns = ["annual_emissions_g"]
    for optional in ["annual_emissions_g_low", "annual_emissions_g_high"]:
        if optional in frame.columns:
            columns.append(optional)
    if "annual_emissions_g" not in frame.columns:
        raise KeyError("DataFrame missing required column: ['annual_emissions_g']")
    return columns


def _extract_values(row: pd.Series) -> dict | None:
    mean = _coerce_optional(row.get("annual_emissions_g"))
    if mean is None:
        return None
    low = None
    if "annual_emissions_g_low" in row.index:
        low = _coerce_optional(row.get("annual_emissions_g_low"))
    high = None
    if "annual_emissions_g_high" in row.index:
        high = _coerce_optional(row.get("annual_emissions_g_high"))
    return _bounds(mean, low, high)


def _normalise_category(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "uncategorized"
    return str(value)


def _normalise_layer(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    return str(value)


def _normalise_sector(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text or None


def _layer_rank(value: str | None) -> int:
    if value in LAYER_ORDER:
        return LAYER_ORDER.index(value)
    return len(LAYER_ORDER)


def _activity_label(activity: Activity | None, fallback_id: str) -> str:
    if activity is None:
        return fallback_id
    if activity.name:
        return activity.name
    return fallback_id


def _ensure_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise KeyError(f"DataFrame missing required columns: {missing}")
    return df


def slice_stacked(
    df: pd.DataFrame,
    reference_map: Mapping[tuple[str | None, str], tuple[list[str], list[int]]] | None = None,
) -> list[dict]:
    if df.empty:
        return []
    frame = _ensure_columns(
        df,
        [
            "annual_emissions_g",
            "activity_category",
            "layer_id",
        ],
    ).copy()
    frame = coalesce_alias_columns(frame)
    frame = frame.rename(columns=remap_columns(frame.columns))
    has_sector = "sector" in frame.columns
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)
    if has_sector:
        frame["sector"] = frame["sector"].map(_normalise_sector)
    value_columns = _value_columns(frame)
    group_keys = ["layer_id", "activity_category"]
    if has_sector:
        group_keys.insert(1, "sector")
    aggregated = (
        frame.groupby(group_keys, dropna=False)[value_columns].sum(min_count=1).reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    sort_keys = ["_layer_rank", "layer_id"]
    if has_sector:
        sort_keys.append("sector")
    sort_keys.extend(["activity_category", "annual_emissions_g"])
    ascending = [True] * len(sort_keys)
    if ascending:
        ascending[-1] = False
    aggregated = aggregated.sort_values(sort_keys, ascending=ascending)

    results: list[dict] = []
    for _, row in aggregated.iterrows():
        values = _extract_values(row)
        if values is None:
            continue
        layer = _normalise_layer(row.get("layer_id"))
        category = row["activity_category"]
        sector = row.get("sector") if has_sector else None
        category_key = sector if sector is not None else category
        entry = {
            "layer_id": layer,
            "category": category,
            "sector": sector,
            "values": values,
            "units": dict(ANNUAL_EMISSIONS_UNITS),
        }
        if reference_map is not None:
            payload = reference_map.get((layer, category_key))
            if payload:
                keys, indices = payload
                if keys:
                    entry["citation_keys"] = keys
                if indices:
                    entry["hover_reference_indices"] = indices
        results.append(entry)
    return results


@dataclass(frozen=True)
class BubblePoint:
    activity_id: str
    activity_name: str
    category: str | None
    sector: str | None
    layer_id: str | None
    values: dict
    units: dict[str, str]
    citation_keys: list[str] | None = None
    hover_reference_indices: list[int] | None = None


def slice_bubble(
    df: pd.DataFrame,
    reference_map: Mapping[tuple[str | None, str], tuple[list[str], list[int]]] | None = None,
) -> list[BubblePoint]:
    if df.empty:
        return []
    frame = _ensure_columns(
        df,
        [
            "activity_id",
            "activity_name",
            "activity_category",
            "annual_emissions_g",
            "layer_id",
        ],
    ).copy()
    frame = coalesce_alias_columns(frame)
    frame = frame.rename(columns=remap_columns(frame.columns))
    has_sector = "sector" in frame.columns
    frame["activity_name"] = frame.apply(
        lambda row: row["activity_name"] if row["activity_name"] else row["activity_id"],
        axis=1,
    )
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)
    if has_sector:
        frame["sector"] = frame["sector"].map(_normalise_sector)

    value_columns = _value_columns(frame)
    group_keys = ["layer_id", "activity_id", "activity_name", "activity_category"]
    if has_sector:
        group_keys.insert(3, "sector")
    aggregated = (
        frame.groupby(group_keys, dropna=False)[value_columns].sum(min_count=1).reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    sort_keys = ["_layer_rank", "layer_id", "activity_id", "activity_name"]
    if has_sector:
        sort_keys.append("sector")
    sort_keys.append("annual_emissions_g")
    ascending = [True] * len(sort_keys)
    if ascending:
        ascending[-1] = False
    aggregated = aggregated.sort_values(sort_keys, ascending=ascending)

    results: list[BubblePoint] = []
    for _, row in aggregated.iterrows():
        values = _extract_values(row)
        if values is None:
            continue
        layer = _normalise_layer(row.get("layer_id"))
        sector = row.get("sector") if has_sector else None
        ref_keys: list[str] | None = None
        ref_indices: list[int] | None = None
        if reference_map is not None:
            activity_id = str(row["activity_id"])
            payload = reference_map.get((layer, activity_id))
            if payload:
                ref_keys, ref_indices = payload
        results.append(
            BubblePoint(
                activity_id=str(row["activity_id"]),
                activity_name=str(row["activity_name"]),
                category=row["activity_category"],
                sector=sector,
                layer_id=layer,
                values=values,
                units=dict(ANNUAL_EMISSIONS_UNITS),
                citation_keys=ref_keys,
                hover_reference_indices=ref_indices,
            )
        )
    return results


def _operation_label(entry: Mapping[str, object], fallback: str) -> str:
    if not isinstance(entry, Mapping):
        return fallback

    def _first_text(keys: tuple[str, ...]) -> str:
        for key in keys:
            value = entry.get(key)
            if value in (None, ""):
                continue
            text = str(value).strip()
            if text:
                return text
        return ""

    activity_label = _first_text(
        (
            "operation_activity_label",
            "operation_activity_name",
            "operation_activity_id",
        )
    )
    entity_label = _first_text(("operation_entity_name", "operation_asset_name"))
    if activity_label and entity_label:
        return f"{activity_label} ({entity_label})"
    return activity_label or entity_label or fallback


def _scale_values(values: Mapping[str, float], share: float) -> dict[str, float]:
    return {key: value * share for key, value in values.items()}


def slice_sankey(
    df: pd.DataFrame,
    reference_map: Mapping[tuple[str | None, str, str], tuple[list[str], list[int]]] | None = None,
) -> dict:
    if df.empty:
        return {"nodes": [], "links": []}
    frame = _ensure_columns(
        df,
        [
            "activity_id",
            "activity_name",
            "activity_category",
            "annual_emissions_g",
            "layer_id",
        ],
    ).copy()
    frame = coalesce_alias_columns(frame)
    frame = frame.rename(columns=remap_columns(frame.columns))
    has_sector = "sector" in frame.columns
    frame["activity_name"] = frame.apply(
        lambda row: row["activity_name"] if row["activity_name"] else row["activity_id"],
        axis=1,
    )
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)
    if has_sector:
        frame["sector"] = frame["sector"].map(_normalise_sector)

    value_columns = _value_columns(frame)
    aggregated = (
        frame.groupby(
            (
                ["layer_id", "activity_category", "activity_id", "activity_name"]
                if not has_sector
                else ["layer_id", "sector", "activity_category", "activity_id", "activity_name"]
            ),
            dropna=False,
        )[value_columns]
        .sum(min_count=1)
        .reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    sort_keys = ["_layer_rank", "layer_id"]
    if has_sector:
        sort_keys.append("sector")
    sort_keys.extend(["activity_category", "activity_id", "activity_name", "annual_emissions_g"])
    ascending = [True] * len(sort_keys)
    if ascending:
        ascending[-1] = False
    aggregated = aggregated.sort_values(sort_keys, ascending=ascending)

    nodes: dict[tuple[str, str], dict] = {}
    two_stage_nodes: dict[str, dict] = {}
    two_stage_links: list[dict] = []

    def _ensure_node(kind: str, label: str) -> dict:
        key = (kind, label)
        if key not in nodes:
            nodes[key] = {"id": f"{kind}:{label}", "type": kind, "label": label}
        return nodes[key]

    def _ensure_two_stage_node(node_id: str, kind: str, label: str) -> dict:
        if node_id not in two_stage_nodes:
            two_stage_nodes[node_id] = {"id": node_id, "type": kind, "label": label}
        return two_stage_nodes[node_id]

    upstream_map: dict[tuple[str | None, str], list[Mapping[str, object]]] = {}
    if "upstream_chain" in df.columns:
        for _, raw_row in df.iterrows():
            layer = _normalise_layer(raw_row.get("layer_id"))
            activity_key = raw_row.get("activity_id")
            if activity_key in (None, ""):
                continue
            activity_id = str(activity_key)
            chain = raw_row.get("upstream_chain")
            if not isinstance(chain, list):
                continue
            entries: list[Mapping[str, object]] = []
            for entry in chain:
                if not isinstance(entry, Mapping):
                    continue
                share_value = entry.get("share")
                try:
                    share = float(share_value)
                except (TypeError, ValueError):
                    continue
                if share <= 0:
                    continue
                entry_copy = dict(entry)
                entry_copy["share"] = share
                entries.append(entry_copy)
            if entries:
                upstream_map[(layer, activity_id)] = entries
                if layer is not None:
                    upstream_map.setdefault((None, activity_id), entries)

    links: list[dict] = []
    for _, row in aggregated.iterrows():
        values = _extract_values(row)
        if values is None:
            continue
        layer = _normalise_layer(row.get("layer_id"))
        raw_category = row["activity_category"]
        sector = row.get("sector") if has_sector else None
        category_label = str(sector) if sector is not None else str(raw_category)
        activity_label = str(row["activity_name"])
        activity_id = str(row["activity_id"])
        source = _ensure_node("category", category_label)
        target = _ensure_node("activity", activity_label)
        entry = {
            "source": source["id"],
            "target": target["id"],
            "activity_id": activity_id,
            "category": raw_category,
            "sector": sector,
            "layer_id": layer,
            "values": values,
            "units": dict(ANNUAL_EMISSIONS_UNITS),
        }
        if reference_map is not None:
            payload = reference_map.get((layer, category_label, activity_id))
            if payload:
                keys, indices = payload
                if keys:
                    entry["citation_keys"] = keys
                if indices:
                    entry["hover_reference_indices"] = indices
        links.append(entry)

        activity_node_id = target["id"]
        _ensure_two_stage_node(activity_node_id, "activity", activity_label)

        share_entries = upstream_map.get((layer, activity_id)) or upstream_map.get(
            (None, activity_id)
        )
        entries_list = [dict(item) for item in share_entries] if share_entries else []
        total_share = sum(float(item.get("share", 0.0)) for item in entries_list)
        residual = max(0.0, 1.0 - total_share)
        if residual > 1e-6:
            entries_list.append(
                {
                    "operation_id": f"direct:{activity_id}",
                    "operation_activity_label": "Direct emissions",
                    "share": residual,
                }
            )

        for operation_entry in entries_list:
            share_value = float(operation_entry.get("share", 0.0))
            if share_value <= 0:
                continue
            operation_key = str(operation_entry.get("operation_id") or f"direct:{activity_id}")
            operation_label = _operation_label(operation_entry, operation_key)
            operation_node_id = f"operation:{operation_key}"
            _ensure_two_stage_node(operation_node_id, "operation", operation_label)
            link_values = _scale_values(values, share_value)
            two_stage_entry = {
                "source": operation_node_id,
                "target": activity_node_id,
                "activity_id": activity_id,
                "category": raw_category,
                "sector": sector,
                "layer_id": layer,
                "values": link_values,
                "units": dict(ANNUAL_EMISSIONS_UNITS),
                "operation_id": operation_key,
                "share": share_value,
            }
            if reference_map is not None:
                payload = reference_map.get((layer, category_label, activity_id))
                if payload:
                    keys, indices = payload
                    if keys:
                        two_stage_entry["citation_keys"] = keys
                    if indices:
                        two_stage_entry["hover_reference_indices"] = indices
            two_stage_links.append(two_stage_entry)

    ordered_nodes = [node for _, node in sorted(nodes.items(), key=lambda item: item[1]["id"])]
    links.sort(
        key=lambda item: (
            item.get("layer_id") or "",
            item.get("category") or "",
            item.get("activity_id") or "",
        )
    )

    two_stage_nodes_sorted = sorted(
        two_stage_nodes.values(),
        key=lambda item: (0 if item.get("type") == "operation" else 1, item.get("label", "")),
    )
    two_stage_links.sort(
        key=lambda item: (
            item.get("layer_id") or "",
            item.get("category") or "",
            item.get("activity_id") or "",
            item.get("operation_id") or "",
        )
    )

    payload = {"nodes": ordered_nodes, "links": links}
    if two_stage_links:
        payload["modes"] = {
            "civilian": {"nodes": ordered_nodes, "links": links},
            "two_stage": {"nodes": two_stage_nodes_sorted, "links": two_stage_links},
        }
    return payload


def slice_feedback(
    loops: Sequence[FeedbackLoop],
    activities: Mapping[str, Activity],
    df: pd.DataFrame | None = None,
) -> dict:
    if not loops:
        return {"nodes": [], "links": []}

    activity_totals: dict[str, float] = {}
    activity_layers: dict[str, str | None] = {}
    if df is not None and not df.empty:
        if {"activity_id", "annual_emissions_g"}.issubset(df.columns):
            grouped = (
                df.groupby("activity_id")[["annual_emissions_g"]].sum(min_count=1).reset_index()
            )
            for _, row in grouped.iterrows():
                activity_id = str(row.get("activity_id"))
                if not activity_id or activity_id == "nan":
                    continue
                value = row.get("annual_emissions_g")
                if value is None or (isinstance(value, float) and pd.isna(value)):
                    continue
                activity_totals[activity_id] = float(value)
        if {"activity_id", "layer_id"}.issubset(df.columns):
            for _, row in df.iterrows():
                activity_key = row.get("activity_id")
                if activity_key in (None, ""):
                    continue
                activity_layers[str(activity_key)] = _normalise_layer(row.get("layer_id"))

    nodes: dict[tuple[str, str], dict] = {}
    links: list[dict] = []

    def ensure_node(activity_id: str, role: str) -> dict:
        key = (role, activity_id)
        node = nodes.get(key)
        if node is not None:
            return node
        activity = activities.get(activity_id)
        label = _activity_label(activity, activity_id)
        layer = activity_layers.get(activity_id)
        if layer is None and activity is not None:
            layer_value = getattr(activity.layer_id, "value", activity.layer_id)
            layer = str(layer_value) if layer_value is not None else None
        node_type = "category" if role == "source" else "activity"
        node = {
            "id": f"{role}:{activity_id}",
            "label": label,
            "type": node_type,
            "layer_id": layer,
            "activity_id": activity_id,
        }
        nodes[key] = node
        return node

    for loop in loops:
        trigger_id = loop.trigger_activity_id
        response_id = loop.response_activity_id
        if not trigger_id or not response_id:
            continue
        strength = float(loop.strength) if loop.strength is not None else 0.0
        magnitude = abs(strength)
        trigger_total = activity_totals.get(trigger_id)
        if trigger_total is not None and trigger_total != 0:
            magnitude = abs(trigger_total) * abs(strength)
        if magnitude <= 0:
            continue

        trigger_node = ensure_node(trigger_id, "source")
        response_node = ensure_node(response_id, "target")

        link: dict[str, object] = {
            "source": trigger_node["id"],
            "target": response_node["id"],
            "values": {"mean": magnitude},
            "citation_keys": [loop.source_id] if loop.source_id else None,
            "metadata": {
                "loop_id": loop.loop_id,
                "sign": loop.sign,
                "lag_years": loop.lag_years,
                "strength": strength,
                "notes": loop.notes,
            },
        }
        links.append(link)

    return {"nodes": list(nodes.values()), "links": links}


def invalidate_cache() -> None:
    _load_config.cache_clear()


__all__ = [
    "BubblePoint",
    "build_metadata",
    "DEFAULT_GENERATED_AT",
    "trim_figure_payload",
    "invalidate_cache",
    "slice_bubble",
    "slice_feedback",
    "slice_sankey",
    "slice_stacked",
]


def trim_figure_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Return a copy of ``payload`` without defaulted or derived metadata.

    Figure metadata is embedded in static JSON artefacts, so trimming redundant
    values can significantly reduce their size.  The resulting payload keeps the
    fields required by the Dash client while removing:

    * ``references`` and ``layer_references`` — the formatted reference text is
      available on demand via :mod:`calc.citations` and duplicated in the
      downloadable ``*_refs.txt`` artefacts.
    * ``generated_at`` when it matches the compile-time default timestamp.
    * ``profile`` when it resolves to the configured default profile.
    * ``profile_resolution`` when it collapses to the default profile.
    """

    trimmed: MutableMapping[str, Any] = dict(payload)

    trimmed.pop("references", None)
    trimmed.pop("layer_references", None)

    generated_at = trimmed.get("generated_at")
    if generated_at == DEFAULT_GENERATED_AT:
        trimmed.pop("generated_at", None)

    default_profile = _load_config().get("default_profile")
    profile_value = trimmed.get("profile")
    if not profile_value or profile_value == default_profile:
        trimmed.pop("profile", None)

    profile_resolution = trimmed.get("profile_resolution")
    if isinstance(profile_resolution, Mapping):
        used = profile_resolution.get("used")
        requested = profile_resolution.get("requested")

        is_iterable = isinstance(used, Iterable) and not isinstance(used, (str, bytes))
        used_values = [str(value) for value in used] if is_iterable else []
        if not used_values:
            trimmed.pop("profile_resolution", None)
        else:
            requested_value = str(requested) if requested else None
            if requested_value == default_profile and used_values == [default_profile]:
                trimmed.pop("profile_resolution", None)
            elif not requested_value:
                trimmed["profile_resolution"] = {"used": used_values}
            else:
                trimmed["profile_resolution"] = {
                    "requested": requested_value,
                    "used": used_values,
                }
    elif "profile_resolution" in trimmed:
        trimmed.pop("profile_resolution", None)

    return dict(trimmed)
