from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any, Iterable, List, Sequence

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

from .schema import (
    Activity,
    ActivityDependency,
    ActivitySchedule,
    Asset,
    FeedbackLoop,
    EmissionFactor,
    Entity,
    GridIntensity,
    Layer,
    Operation,
    Profile,
    Site,
)

_PLACEHOLDER_NOTE = "__IMPORT_PLACEHOLDER__"

__all__ = ["SqlStore"]


def _coerce_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, memoryview):
        return value.tobytes()
    return value


class SqlStore:
    """Database-backed DataStore implementation for SQLite and DuckDB."""

    def __init__(
        self,
        db_path: str | os.PathLike[str] | None = None,
        *,
        backend: str = "sqlite",
    ) -> None:
        path = Path(db_path) if db_path is not None else Path(os.getenv("ACX_DB_PATH", "acx.db"))
        backend_normalised = backend.strip().lower()
        if backend_normalised not in {"sqlite", "duckdb"}:
            raise ValueError(f"Unsupported SQL backend: {backend}")
        self._backend = backend_normalised
        self._path = path
        if self._backend == "sqlite":
            conn = sqlite3.connect(str(path))
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            self._conn = conn
        else:
            if duckdb is None:  # pragma: no cover - exercised in runtime environments
                raise RuntimeError("DuckDB backend requires the 'duckdb' extra to be installed")
            self._conn = duckdb.connect(str(path))

    def close(self) -> None:
        self._conn.close()

    def _fetch_all(self, query: str, params: Iterable[Any] | None = None) -> List[dict[str, Any]]:
        cursor = self._conn.execute(query, tuple(params or ()))
        description = cursor.description
        columns = [col[0] for col in description]
        rows = cursor.fetchall()
        payload: List[dict[str, Any]] = []
        for row in rows:
            if isinstance(row, sqlite3.Row):
                record = {column: _coerce_value(row[column]) for column in columns}
            else:
                record = {column: _coerce_value(value) for column, value in zip(columns, row)}
            payload.append(record)
        return payload

    def load_activities(self) -> Sequence[Activity]:
        rows = self._fetch_all(
            """
            SELECT activity_id, sector_id, layer_id, category, name, default_unit,
                   description, unit_definition, notes
            FROM activities
            WHERE notes IS NULL OR notes != ?
            ORDER BY activity_id
            """,
            [_PLACEHOLDER_NOTE],
        )
        return [Activity(**row) for row in rows]

    def load_emission_factors(self) -> Sequence[EmissionFactor]:
        rows = self._fetch_all(
            """
            SELECT ef_id, sector_id, activity_id, layer_id, unit, value_g_per_unit, is_grid_indexed,
                   electricity_kwh_per_unit, electricity_kwh_per_unit_low,
                   electricity_kwh_per_unit_high, region, scope_boundary,
                   gwp_horizon, vintage_year, source_id, method_notes,
                   uncert_low_g_per_unit, uncert_high_g_per_unit
            FROM emission_factors
            ORDER BY ef_id
            """
        )
        return [EmissionFactor(**row) for row in rows]

    def load_profiles(self) -> Sequence[Profile]:
        rows = self._fetch_all(
            """
            SELECT profile_id, sector_id, layer_id, name, region_code_default, grid_strategy,
                   grid_mix_json, cohort_id, office_days_per_week, assumption_notes
            FROM profiles
            ORDER BY profile_id
            """
        )
        return [Profile(**row) for row in rows]

    def load_activity_schedule(self) -> Sequence[ActivitySchedule]:
        rows = self._fetch_all(
            """
            SELECT profile_id,
                   sector_id,
                   activity_id,
                   layer_id,
                   quantity_per_week,
                   office_only,
                   freq_per_day,
                   freq_per_week,
                   office_days_only,
                   region_override,
                   mix_region,
                   use_canada_average,
                   schedule_notes,
                   distance_km,
                   passengers,
                   hours,
                   viewers,
                   servings
            FROM activity_schedule
            ORDER BY profile_id, activity_id
            """
        )
        return [ActivitySchedule(**row) for row in rows]

    def load_grid_intensity(self) -> Sequence[GridIntensity]:
        rows = self._fetch_all(
            """
            SELECT region_code,
                   region,
                   scope_boundary,
                   gwp_horizon,
                   vintage_year,
                   g_per_kwh,
                   g_per_kwh_low,
                   g_per_kwh_high,
                   source_id
            FROM grid_intensity
            ORDER BY region_code, COALESCE(vintage_year, 0)
            """
        )
        return [GridIntensity(**row) for row in rows]

    def load_layers(self) -> Sequence[Layer]:
        rows = self._fetch_all(
            """
            SELECT layer_id, layer_name, layer_type, description
            FROM layers
            ORDER BY layer_id
            """
        )
        return [Layer(**row) for row in rows]

    def load_entities(self) -> Sequence[Entity]:
        rows = self._fetch_all(
            """
            SELECT entity_id, name, type, parent_entity_id, notes
            FROM entities
            ORDER BY entity_id
            """
        )
        return [Entity(**row) for row in rows]

    def load_sites(self) -> Sequence[Site]:
        rows = self._fetch_all(
            """
            SELECT site_id, entity_id, name, region_code, lat, lon, notes
            FROM sites
            ORDER BY site_id
            """
        )
        return [Site(**row) for row in rows]

    def load_assets(self) -> Sequence[Asset]:
        rows = self._fetch_all(
            """
            SELECT asset_id, site_id, asset_type, name, year, power_rating_kw,
                   fuel_type, notes
            FROM assets
            ORDER BY asset_id
            """
        )
        return [Asset(**row) for row in rows]

    def load_operations(self) -> Sequence[Operation]:
        rows = self._fetch_all(
            """
            SELECT operation_id, asset_id, activity_id, layer_id, functional_unit_id,
                   utilization_basis, period_start, period_end, throughput_value,
                   throughput_unit, notes
            FROM operations
            ORDER BY operation_id
            """
        )
        operations = [Operation(**row) for row in rows]
        if not operations:
            return operations

        valid_layers = {layer.layer_id for layer in self.load_layers()}
        missing = sorted(
            {
                operation.layer_id
                for operation in operations
                if operation.layer_id not in valid_layers
            }
        )
        if missing:
            missing_labels = ", ".join(layer.value for layer in missing)
            raise ValueError(f"Unknown layer_id referenced by operations: {missing_labels}")
        return operations

    def load_activity_dependencies(self) -> Sequence[ActivityDependency]:
        # No ORDER BY: consumers depend on the CSV row order of dependencies.csv,
        # which the import path preserves as table insertion order (mirroring the
        # DuckDB store, which reads the file sequentially).
        rows = self._fetch_all(
            """
            SELECT child_activity_id, parent_operation_id, share, notes
            FROM dependencies
            """
        )
        return [ActivityDependency(**row) for row in rows]

    def _feedback_loops_table_exists(self) -> bool:
        if self._backend == "sqlite":
            rows = self._fetch_all(
                """
                SELECT 1 FROM sqlite_master
                WHERE type = 'table' AND name = 'feedback_loops'
                """
            )
        else:
            rows = self._fetch_all(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'feedback_loops'
                """
            )
        return bool(rows)

    def load_feedback_loops(self) -> Sequence[FeedbackLoop]:
        # feedback_loops is optional data: the CSV and DuckDB stores treat a
        # missing file as empty, so an absent table mirrors that behaviour.
        if not self._feedback_loops_table_exists():
            return []
        rows = self._fetch_all(
            """
            SELECT loop_id, trigger_activity_id, response_activity_id, sign,
                   lag_years, strength, source_id, notes
            FROM feedback_loops
            ORDER BY loop_id
            """
        )
        return [FeedbackLoop(**row) for row in rows]

    def __enter__(self) -> "SqlStore":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()
