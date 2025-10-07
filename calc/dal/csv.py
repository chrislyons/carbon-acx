from __future__ import annotations

from pathlib import Path
from typing import List, Sequence

import pandas as pd

from ..schema import (
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
from .aliases import remap_record

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_csv(path: Path) -> List[dict]:
    df = pd.read_csv(path, dtype=object)
    df = df.where(pd.notnull(df), None)
    return [remap_record(row) for row in df.to_dict(orient="records")]


class CsvStore:
    """CSV-backed implementation of DataStore."""

    def load_layers(self) -> Sequence[Layer]:
        rows = _load_csv(DATA_DIR / "layers.csv")
        return [Layer(**row) for row in rows]

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
        operations = [Operation(**row) for row in rows]
        if not operations:
            return operations

        valid_layers = {layer.layer_id for layer in self.load_layers()}
        missing = sorted(
            {operation.layer_id for operation in operations if operation.layer_id not in valid_layers}
        )
        if missing:
            missing_labels = ", ".join(layer.value for layer in missing)
            raise ValueError(f"Unknown layer_id referenced by operations: {missing_labels}")
        return operations

    def load_activities(self) -> Sequence[Activity]:
        rows = _load_csv(DATA_DIR / "activities.csv")
        activities = [Activity(**row) for row in rows]
        if not activities:
            return activities

        valid_layers = {layer.layer_id for layer in self.load_layers()}
        missing = sorted(
            {activity.layer_id for activity in activities if activity.layer_id not in valid_layers}
        )
        if missing:
            missing_labels = ", ".join(layer.value for layer in missing)
            raise ValueError(f"Unknown layer_id referenced by activities: {missing_labels}")
        return activities

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

    def load_activity_dependencies(self) -> Sequence[ActivityDependency]:
        rows = _load_csv(DATA_DIR / "dependencies.csv")
        return [ActivityDependency(**row) for row in rows]

    def load_feedback_loops(self) -> Sequence[FeedbackLoop]:
        path = DATA_DIR / "feedback_loops.csv"
        if not path.exists():
            return []
        rows = _load_csv(path)
        return [FeedbackLoop(**row) for row in rows]
