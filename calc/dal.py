from __future__ import annotations

import os
from typing import Protocol, Sequence, List
from pathlib import Path

import pandas as pd

from .schema import (
    Activity,
    EmissionFactor,
    Profile,
    ActivitySchedule,
    GridIntensity,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_csv(path: Path) -> List[dict]:
    df = pd.read_csv(path, dtype=object)
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")


class DataStore(Protocol):
    def load_activities(self) -> Sequence[Activity]: ...

    def load_emission_factors(self) -> Sequence[EmissionFactor]: ...

    def load_profiles(self) -> Sequence[Profile]: ...

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]: ...

    def load_grid_intensity(self) -> Sequence[GridIntensity]: ...


class CsvStore:
    """CSV-backed implementation of DataStore (default)."""

    def load_activities(self) -> Sequence[Activity]:
        rows = _load_csv(DATA_DIR / "activities.csv")
        return [Activity(**r) for r in rows]

    def load_emission_factors(self) -> Sequence[EmissionFactor]:
        rows = _load_csv(DATA_DIR / "emission_factors.csv")
        return [EmissionFactor(**r) for r in rows]

    def load_profiles(self) -> Sequence[Profile]:
        rows = _load_csv(DATA_DIR / "profiles.csv")
        return [Profile(**r) for r in rows]

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]:
        rows = _load_csv(DATA_DIR / "activity_schedule.csv")
        return [ActivitySchedule(**r) for r in rows]

    def load_grid_intensity(self) -> Sequence[GridIntensity]:
        rows = _load_csv(DATA_DIR / "grid_intensity.csv")
        return [GridIntensity(**r) for r in rows]


def choose_backend() -> DataStore:
    backend = (os.getenv("ACX_DATA_BACKEND") or "csv").lower()
    if backend == "csv":
        return CsvStore()
    # Future: elif backend == "sqlite": return SqlStore(...)
    # Future: elif backend == "duckdb": return DuckStore(...)
    # Future: elif backend == "postgres": return PgStore(...)
    raise ValueError(f"Unsupported ACX_DATA_BACKEND={backend}")
