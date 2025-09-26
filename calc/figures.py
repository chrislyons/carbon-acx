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


def build_metadata(method: str) -> dict:
    profile = _load_config().get("default_profile")
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "method": method,
    }


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
    metadata = build_metadata("figures.total_by_activity")
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
