from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
import yaml

from .schema import LayerId

CONFIG_PATH = Path(__file__).parent / "config.yaml"

LAYER_ORDER = [layer.value for layer in LayerId]


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


def build_metadata(method: str, profile_ids: Iterable[str] | None = None) -> dict:
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
        "generated_at": datetime.now(timezone.utc).isoformat(),
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


def _normalise_category(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "uncategorized"
    return str(value)


def _normalise_layer(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    return str(value)


def _layer_rank(value: str | None) -> int:
    if value in LAYER_ORDER:
        return LAYER_ORDER.index(value)
    return len(LAYER_ORDER)


def _ensure_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise KeyError(f"DataFrame missing required columns: {missing}")
    return df


def slice_stacked(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []
    frame = _ensure_columns(
        df,
        [
            "annual_emissions_g",
            "annual_emissions_g_low",
            "annual_emissions_g_high",
            "activity_category",
            "layer_id",
        ],
    ).copy()
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)
    aggregated = (
        frame.groupby(["layer_id", "activity_category"], dropna=False)[
            ["annual_emissions_g", "annual_emissions_g_low", "annual_emissions_g_high"]
        ]
        .sum(min_count=1)
        .reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    aggregated = aggregated.sort_values(
        ["_layer_rank", "annual_emissions_g"], ascending=[True, False]
    )

    results: list[dict] = []
    for _, row in aggregated.iterrows():
        mean = _coerce_optional(row["annual_emissions_g"])
        if mean is None:
            continue
        low = _coerce_optional(row.get("annual_emissions_g_low"))
        high = _coerce_optional(row.get("annual_emissions_g_high"))
        results.append(
            {
                "layer_id": _normalise_layer(row.get("layer_id")),
                "category": row["activity_category"],
                "values": _bounds(mean, low, high),
            }
        )
    return results


@dataclass(frozen=True)
class BubblePoint:
    activity_id: str
    activity_name: str
    category: str | None
    layer_id: str | None
    values: dict


def slice_bubble(df: pd.DataFrame) -> list[BubblePoint]:
    if df.empty:
        return []
    frame = _ensure_columns(
        df,
        [
            "activity_id",
            "activity_name",
            "activity_category",
            "annual_emissions_g",
            "annual_emissions_g_low",
            "annual_emissions_g_high",
            "layer_id",
        ],
    ).copy()
    frame["activity_name"] = frame.apply(
        lambda row: row["activity_name"] if row["activity_name"] else row["activity_id"],
        axis=1,
    )
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)

    aggregated = (
        frame.groupby(
            ["layer_id", "activity_id", "activity_name", "activity_category"],
            dropna=False,
        )[["annual_emissions_g", "annual_emissions_g_low", "annual_emissions_g_high"]]
        .sum(min_count=1)
        .reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    aggregated = aggregated.sort_values(
        ["_layer_rank", "annual_emissions_g"], ascending=[True, False]
    )

    results: list[BubblePoint] = []
    for _, row in aggregated.iterrows():
        mean = _coerce_optional(row["annual_emissions_g"])
        if mean is None:
            continue
        low = _coerce_optional(row.get("annual_emissions_g_low"))
        high = _coerce_optional(row.get("annual_emissions_g_high"))
        layer = _normalise_layer(row.get("layer_id"))
        results.append(
            BubblePoint(
                activity_id=str(row["activity_id"]),
                activity_name=str(row["activity_name"]),
                category=row["activity_category"],
                layer_id=layer,
                values=_bounds(mean, low, high),
            )
        )
    return results


def slice_sankey(df: pd.DataFrame) -> dict:
    if df.empty:
        return {"nodes": [], "links": []}
    frame = _ensure_columns(
        df,
        [
            "activity_id",
            "activity_name",
            "activity_category",
            "annual_emissions_g",
            "annual_emissions_g_low",
            "annual_emissions_g_high",
            "layer_id",
        ],
    ).copy()
    frame["activity_name"] = frame.apply(
        lambda row: row["activity_name"] if row["activity_name"] else row["activity_id"],
        axis=1,
    )
    frame["activity_category"] = frame["activity_category"].map(_normalise_category)
    frame["layer_id"] = frame["layer_id"].map(_normalise_layer)

    aggregated = (
        frame.groupby(
            ["layer_id", "activity_category", "activity_id", "activity_name"], dropna=False
        )[["annual_emissions_g", "annual_emissions_g_low", "annual_emissions_g_high"]]
        .sum(min_count=1)
        .reset_index()
    )
    aggregated["_layer_rank"] = aggregated["layer_id"].map(_layer_rank)
    aggregated = aggregated.sort_values(
        ["_layer_rank", "annual_emissions_g"], ascending=[True, False]
    )

    nodes: dict[tuple[str, str], dict] = {}

    def _ensure_node(kind: str, label: str) -> dict:
        key = (kind, label)
        if key not in nodes:
            nodes[key] = {"id": f"{kind}:{label}", "type": kind, "label": label}
        return nodes[key]

    links: list[dict] = []
    for _, row in aggregated.iterrows():
        mean = _coerce_optional(row["annual_emissions_g"])
        if mean is None:
            continue
        low = _coerce_optional(row.get("annual_emissions_g_low"))
        high = _coerce_optional(row.get("annual_emissions_g_high"))
        layer = _normalise_layer(row.get("layer_id"))
        category_label = str(row["activity_category"])
        activity_label = str(row["activity_name"])
        source = _ensure_node("category", category_label)
        target = _ensure_node("activity", activity_label)
        links.append(
            {
                "source": source["id"],
                "target": target["id"],
                "activity_id": str(row["activity_id"]),
                "category": category_label,
                "layer_id": layer,
                "values": _bounds(mean, low, high),
            }
        )

    ordered_nodes = [node for _, node in sorted(nodes.items(), key=lambda item: item[1]["id"])]
    return {"nodes": ordered_nodes, "links": links}


def invalidate_cache() -> None:
    _load_config.cache_clear()


__all__ = [
    "BubblePoint",
    "build_metadata",
    "invalidate_cache",
    "slice_bubble",
    "slice_sankey",
    "slice_stacked",
]
