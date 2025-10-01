from __future__ import annotations

from pathlib import Path
from typing import List, Sequence

import pandas as pd

from ..schema import (
    Activity,
    ActivitySchedule,
    Asset,
    EmissionFactor,
    Entity,
    GridIntensity,
    Operation,
    Profile,
    Site,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_csv(path: Path) -> List[dict]:
    df = pd.read_csv(path, dtype=object)
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")


class CsvStore:
    """CSV-backed implementation of DataStore."""

    def load_entities(self) -> Sequence[Entity]:
        rows = _load_csv(DATA_DIR / "entities.csv")
        return [Entity(**row) for row in rows]

    def load_sites(self) -> Sequence[Site]:
        rows = _load_csv(DATA_DIR / "sites.csv")
        return [Site(**row) for row in rows]

    def load_assets(self) -> Sequence[Asset]:
        rows = _load_csv(DATA_DIR / "assets.csv")
        return [Asset(**row) for row in rows]

    def load_operations(self) -> Sequence[Operation]:
        rows = _load_csv(DATA_DIR / "operations.csv")
        return [Operation(**row) for row in rows]

    def load_activities(self) -> Sequence[Activity]:
        rows = _load_csv(DATA_DIR / "activities.csv")
        return [Activity(**row) for row in rows]

    def load_emission_factors(self) -> Sequence[EmissionFactor]:
        rows = _load_csv(DATA_DIR / "emission_factors.csv")
        for row in rows:
            if row.get("region") == "GLOBAL":
                row["region"] = None
        return [EmissionFactor(**row) for row in rows]

    def load_profiles(self) -> Sequence[Profile]:
        rows = _load_csv(DATA_DIR / "profiles.csv")
        return [Profile(**row) for row in rows]

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]:
        rows = _load_csv(DATA_DIR / "activity_schedule.csv")
        return [ActivitySchedule(**row) for row in rows]

    def load_grid_intensity(self) -> Sequence[GridIntensity]:
        rows = _load_csv(DATA_DIR / "grid_intensity.csv")
        return [GridIntensity(**row) for row in rows]
