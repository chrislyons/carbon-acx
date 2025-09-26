from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from collections.abc import Iterable
from typing import List

import pandas as pd
import yaml

from . import citations

CONFIG_PATH = Path(__file__).parent / "config.yaml"


@lru_cache(maxsize=1)
def _load_config() -> dict:
    data = yaml.safe_load(CONFIG_PATH.read_text())
    if data is None:
        return {}
    return data


def build_metadata(method: str, profile_ids: Iterable[str] | None = None) -> dict:
    config = _load_config()
    requested_profile = config.get("default_profile")

    used_profiles: list[str] | None = None
    profile_value = requested_profile
    if profile_ids is not None:
        used_profiles = [str(profile_id) for profile_id in profile_ids if profile_id]
        if used_profiles:
            if len(used_profiles) == 1:
                profile_value = used_profiles[0]
            else:
                profile_value = ", ".join(used_profiles)
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


def _write_csv_with_metadata(df: pd.DataFrame, path: Path, metadata: dict) -> None:
    with path.open("w") as fh:
        for key, value in metadata.items():
            fh.write(f"# {key}: {value}\n")
        df.to_csv(fh, index=False)


def total_by_activity(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby("activity_id", as_index=False)["annual_emissions_g"].sum()


def _normalize_citation_keys(
    df: pd.DataFrame, citation_keys: Iterable[str] | None
) -> List[str]:
    key_set: set[str] = set()
    if citation_keys is not None:
        key_set.update(str(key) for key in citation_keys if key)
    else:
        from .api import collect_activity_source_keys

        records = df.to_dict(orient="records")
        key_set.update(collect_activity_source_keys(records))
    return sorted(key_set)


def export_total_by_activity(
    df: pd.DataFrame, out_dir: Path, citation_keys: Iterable[str] | None = None
) -> pd.DataFrame:
    fig = total_by_activity(df)
    profile_ids: list[str] | None = None
    if "profile_id" in df.columns:
        profile_ids = sorted(
            {str(profile_id) for profile_id in df["profile_id"].dropna().unique() if profile_id}
        )
        if not profile_ids:
            profile_ids = None
    metadata = build_metadata(
        "figures.total_by_activity", profile_ids=profile_ids
    )
    keys = _normalize_citation_keys(df, citation_keys)
    metadata["citation_keys"] = keys
    _write_csv_with_metadata(fig, out_dir / "figure_total_by_activity.csv", metadata)
    payload = {
        **metadata,
        "references": [
            citations.format_ieee(ref.numbered(idx))
            for idx, ref in enumerate(citations.references_for(keys), start=1)
        ],
        "data": fig.to_dict(orient="records"),
    }
    (out_dir / "figure_total_by_activity.json").write_text(json.dumps(payload, indent=2))
    return fig


def invalidate_cache() -> None:
    _load_config.cache_clear()


__all__ = [
    "total_by_activity",
    "export_total_by_activity",
    "build_metadata",
    "invalidate_cache",
]
