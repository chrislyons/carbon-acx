"""Backend-agnostic, single-load dataset snapshots for the ACX data access layer.

The snapshot loader reads every canonical collection from the *selected* backend
exactly once and returns an immutable :class:`DatasetSnapshot`. It is deliberately
fail-closed: a backend that lacks a required loader, an absent table, or an empty
required collection raises :class:`DatasetLoadError` instead of silently falling
back to another backend or to the schema-level CSV loaders.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any, Callable, Sequence, TYPE_CHECKING

from .schema import (
    Activity,
    ActivityDependency,
    ActivityFunctionalUnitMap,
    ActivitySchedule,
    Asset,
    EmissionFactor,
    Entity,
    FeedbackLoop,
    FunctionalUnit,
    GridIntensity,
    Layer,
    Operation,
    Profile,
    Site,
)

if TYPE_CHECKING:  # pragma: no cover - imported for static type checking
    from .dal import DataStore

try:  # pragma: no cover - optional dependency
    import duckdb  # type: ignore
except ImportError:  # pragma: no cover - handled lazily
    duckdb = None

__all__ = ["DatasetLoadError", "DatasetSnapshot", "load_dataset_snapshot"]


class DatasetLoadError(RuntimeError):
    """Raised when a required dataset cannot be loaded from the selected backend.

    This signals a structural or data-integrity failure (missing loader, absent
    table, empty required collection, or an invalid row) rather than a transient
    error; consumers must not attempt a per-table fallback.
    """


@dataclass(frozen=True)
class DatasetSnapshot:
    """Immutable view of every canonical ACX collection from one backend."""

    layers: Sequence[Layer]
    entities: Sequence[Entity]
    sites: Sequence[Site]
    assets: Sequence[Asset]
    operations: Sequence[Operation]
    activities: Sequence[Activity]
    emission_factors: Sequence[EmissionFactor]
    profiles: Sequence[Profile]
    activity_schedule: Sequence[ActivitySchedule]
    grid_intensity: Sequence[GridIntensity]
    activity_dependencies: Sequence[ActivityDependency]
    functional_units: Sequence[FunctionalUnit]
    activity_fu_map: Sequence[ActivityFunctionalUnitMap]
    feedback_loops: Sequence[FeedbackLoop]


# (snapshot attribute, store loader). Required collections must be supplied and be
# non-empty; only ``feedback_loops`` is optional and may legitimately be empty.
_REQUIRED_COLLECTIONS: tuple[tuple[str, str], ...] = (
    ("layers", "load_layers"),
    ("entities", "load_entities"),
    ("sites", "load_sites"),
    ("assets", "load_assets"),
    ("operations", "load_operations"),
    ("activities", "load_activities"),
    ("emission_factors", "load_emission_factors"),
    ("profiles", "load_profiles"),
    ("activity_schedule", "load_activity_schedule"),
    ("grid_intensity", "load_grid_intensity"),
    ("activity_dependencies", "load_activity_dependencies"),
    ("functional_units", "load_functional_units"),
    ("activity_fu_map", "load_activity_fu_map"),
)
_OPTIONAL_COLLECTIONS: tuple[tuple[str, str], ...] = (("feedback_loops", "load_feedback_loops"),)

# Backend/data errors that must surface as :class:`DatasetLoadError`. ``ValueError``
# also covers Pydantic validation failures, which subclass it. Programming errors
# (TypeError, AttributeError, ...) are intentionally *not* caught so they stay loud.
_DATA_ERRORS: tuple[type[BaseException], ...] = (OSError, ValueError, sqlite3.Error)
if duckdb is not None:  # pragma: no cover - depends on optional extra
    _DATA_ERRORS += (duckdb.Error,)


def _require_loader(store: Any, collection: str, method: str) -> Callable[[], Sequence[Any]]:
    loader = getattr(store, method, None)
    if not callable(loader):
        raise DatasetLoadError(
            f"{type(store).__name__} does not implement {method}() required to load the "
            f"{collection!r} collection; the dataset snapshot never falls back to another backend"
        )
    return loader


def _load_collection(
    store: Any, collection: str, method: str, *, required: bool
) -> tuple[Any, ...]:
    loader = _require_loader(store, collection, method)
    try:
        records = loader()
    except _DATA_ERRORS as exc:
        raise DatasetLoadError(
            f"Failed to load {collection!r} via {method}() from {type(store).__name__}: {exc}"
        ) from exc
    if records is None:
        raise DatasetLoadError(
            f"{method}() on {type(store).__name__} returned None for collection {collection!r}"
        )
    payload = tuple(records)
    if required and not payload:
        raise DatasetLoadError(
            f"Required collection {collection!r} is empty; the selected backend must supply it"
        )
    return payload


def load_dataset_snapshot(store: DataStore) -> DatasetSnapshot:
    """Load every canonical collection from ``store`` exactly once.

    Raises :class:`DatasetLoadError` when a required collection is missing,
    unloadable, or empty. Optional collections (``feedback_loops``) may be empty.
    """

    loaded: dict[str, tuple[Any, ...]] = {}
    for collection, method in _REQUIRED_COLLECTIONS:
        loaded[collection] = _load_collection(store, collection, method, required=True)
    for collection, method in _OPTIONAL_COLLECTIONS:
        loaded[collection] = _load_collection(store, collection, method, required=False)
    return DatasetSnapshot(**loaded)
