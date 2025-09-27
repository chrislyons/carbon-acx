from __future__ import annotations

import os
from typing import Protocol, Sequence, List
from pathlib import Path

import pandas as pd

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

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


class DuckDbStore:
    """DuckDB-backed implementation of DataStore."""

    def __init__(self) -> None:
        if duckdb is None:  # pragma: no cover - exercised in runtime environments
            raise RuntimeError("DuckDB backend requires the 'duckdb' extra to be installed")
        self._conn = duckdb.connect(database=":memory:")

    def _load(self, filename: str) -> List[dict]:
        path = DATA_DIR / filename
        with path.open("r", encoding="utf-8") as fh:
            header = fh.readline().strip()
        columns = [name.strip() for name in header.split(",")]
        column_spec = ", ".join(f"'{col}': 'VARCHAR'" for col in columns)
        result = self._conn.execute(
            f"""
            SELECT *
            FROM read_csv(
                ?,
                HEADER = TRUE,
                SAMPLE_SIZE = -1,
                AUTO_DETECT = FALSE,
                ALL_VARCHAR = TRUE,
                COLUMNS = {{{column_spec}}},
                NULLSTR = ['', 'NULL'],
                STRICT_MODE = FALSE,
                NULL_PADDING = TRUE
            )
            """,
            [str(path)],
        )
        columns = [col[0] for col in result.description]
        rows = result.fetchall()
        payload: List[dict] = []
        for row in rows:
            record = {
                column: value if value is not None else None for column, value in zip(columns, row)
            }
            payload.append(record)
        return payload

    def load_activities(self) -> Sequence[Activity]:
        rows = self._load("activities.csv")
        return [Activity(**r) for r in rows]

    def load_emission_factors(self) -> Sequence[EmissionFactor]:
        rows = self._load("emission_factors.csv")
        return [EmissionFactor(**r) for r in rows]

    def load_profiles(self) -> Sequence[Profile]:
        rows = self._load("profiles.csv")
        return [Profile(**r) for r in rows]

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]:
        rows = self._load("activity_schedule.csv")
        return [ActivitySchedule(**r) for r in rows]

    def load_grid_intensity(self) -> Sequence[GridIntensity]:
        rows = self._load("grid_intensity.csv")
        return [GridIntensity(**r) for r in rows]


def choose_backend() -> DataStore:
    backend = (os.getenv("ACX_DATA_BACKEND") or "csv").lower()
    if backend == "csv":
        return CsvStore()
    if backend == "duckdb":
        return DuckDbStore()
    # Future: elif backend == "sqlite": return SqlStore(...)
    # Future: elif backend == "postgres": return PgStore(...)
    raise ValueError(f"Unsupported ACX_DATA_BACKEND={backend}")
