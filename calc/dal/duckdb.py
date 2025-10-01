from __future__ import annotations

from pathlib import Path
from typing import List, Sequence

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

from ..schema import (
    Activity,
    ActivityDependency,
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


class DuckDbStore:
    """DuckDB-backed implementation of DataStore using CSV sources."""

    def __init__(self) -> None:
        if duckdb is None:  # pragma: no cover - exercised in runtime environments
            raise RuntimeError("DuckDB backend requires the 'duckdb' extra to be installed")
        self._conn = duckdb.connect(database=":memory:")

    def _load(self, filename: str) -> List[dict]:
        path = DATA_DIR / filename
        with path.open("r", encoding="utf-8") as handle:
            header = handle.readline().strip()
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

    def load_entities(self) -> Sequence[Entity]:
        rows = self._load("entities.csv")
        return [Entity(**row) for row in rows]

    def load_sites(self) -> Sequence[Site]:
        rows = self._load("sites.csv")
        return [Site(**row) for row in rows]

    def load_assets(self) -> Sequence[Asset]:
        rows = self._load("assets.csv")
        return [Asset(**row) for row in rows]

    def load_operations(self) -> Sequence[Operation]:
        rows = self._load("operations.csv")
        return [Operation(**row) for row in rows]

    def load_activities(self) -> Sequence[Activity]:
        rows = self._load("activities.csv")
        return [Activity(**row) for row in rows]

    def load_emission_factors(self) -> Sequence[EmissionFactor]:
        rows = self._load("emission_factors.csv")
        return [EmissionFactor(**row) for row in rows]

    def load_profiles(self) -> Sequence[Profile]:
        rows = self._load("profiles.csv")
        return [Profile(**row) for row in rows]

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]:
        rows = self._load("activity_schedule.csv")
        return [ActivitySchedule(**row) for row in rows]

    def load_grid_intensity(self) -> Sequence[GridIntensity]:
        rows = self._load("grid_intensity.csv")
        return [GridIntensity(**row) for row in rows]

    def load_activity_dependencies(self) -> Sequence[ActivityDependency]:
        rows = self._load("dependencies.csv")
        return [ActivityDependency(**row) for row in rows]
