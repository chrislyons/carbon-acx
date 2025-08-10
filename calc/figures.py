from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import pandas as pd
import yaml

from .citations import load_citations

CONFIG_PATH = Path(__file__).parent / "config.yaml"


def build_metadata(method: str) -> dict:
    profile = yaml.safe_load(CONFIG_PATH.read_text()).get("default_profile")
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


def export_total_by_activity(
    df: pd.DataFrame, out_dir: Path, citation_keys: List[str]
) -> pd.DataFrame:
    fig = total_by_activity(df)
    metadata = build_metadata("figures.total_by_activity")
    _write_csv_with_metadata(fig, out_dir / "figure_total_by_activity.csv", metadata)
    payload = {
        **metadata,
        "references": load_citations(citation_keys),
        "data": fig.to_dict(orient="records"),
    }
    (out_dir / "figure_total_by_activity.json").write_text(json.dumps(payload, indent=2))
    return fig


__all__ = [
    "total_by_activity",
    "export_total_by_activity",
    "build_metadata",
]
