from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol, Sequence

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
from .csv import CsvStore
from .duckdb import DuckDbStore
from ..dal_sql import SqlStore

__all__ = [
    "Activity",
    "ActivitySchedule",
    "Asset",
    "CsvStore",
    "DataStore",
    "DuckDbStore",
    "EmissionFactor",
    "Entity",
    "GridIntensity",
    "Operation",
    "Profile",
    "Site",
    "SqlStore",
    "choose_backend",
]


class DataStore(Protocol):
    def load_entities(self) -> Sequence[Entity]: ...

    def load_sites(self) -> Sequence[Site]: ...

    def load_assets(self) -> Sequence[Asset]: ...

    def load_operations(self) -> Sequence[Operation]: ...

    def load_activities(self) -> Sequence[Activity]: ...

    def load_emission_factors(self) -> Sequence[EmissionFactor]: ...

    def load_profiles(self) -> Sequence[Profile]: ...

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]: ...

    def load_grid_intensity(self) -> Sequence[GridIntensity]: ...


def _resolve_db_path(candidate: str | os.PathLike[str] | None) -> Path:
    if candidate is not None:
        return Path(candidate)
    env_path = os.getenv("ACX_DB_PATH")
    if env_path:
        return Path(env_path)
    return Path("acx.db")


def choose_backend(
    *,
    backend: str | None = None,
    db_path: str | os.PathLike[str] | None = None,
) -> DataStore:
    name = (backend or os.getenv("ACX_DATA_BACKEND") or "csv").strip().lower()
    if name == "csv":
        return CsvStore()
    if name == "duckdb":
        if db_path is not None:
            path = _resolve_db_path(db_path)
            return SqlStore(path, backend="duckdb")
        return DuckDbStore()
    if name == "sqlite":
        path = _resolve_db_path(db_path)
        return SqlStore(path, backend="sqlite")
    raise ValueError(f"Unsupported ACX_DATA_BACKEND={name}")
