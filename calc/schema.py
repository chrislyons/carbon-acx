from __future__ import annotations

from pathlib import Path
from typing import Optional, Type

import pandas as pd
from pydantic import BaseModel, Field, model_validator


def _read_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    return df.replace({"": None})


def _load(path: Path, model: Type[BaseModel]) -> pd.DataFrame:
    df = _read_csv(path)
    records = []
    for row in df.to_dict(orient="records"):
        record = model.model_validate(row)
        records.append(record.model_dump())
    return pd.DataFrame(records, dtype=object)


class Activity(BaseModel):
    id: str
    name: str
    unit: str


class EmissionFactor(BaseModel):
    id: str
    activity_id: str
    source_id: Optional[str] = None
    value_g_per_unit: Optional[float] = None
    is_grid_indexed: Optional[bool] = None
    electricity_kwh_per_unit: Optional[float] = None
    min_value_g_per_unit: Optional[float] = None
    max_value_g_per_unit: Optional[float] = None

    @model_validator(mode="after")
    def check_rules(self):
        if self.value_g_per_unit is not None and self.is_grid_indexed:
            raise ValueError("fixed and grid-indexed factors are mutually exclusive")
        if self.is_grid_indexed and self.electricity_kwh_per_unit is None:
            raise ValueError("grid-indexed factors require electricity usage")
        if (self.min_value_g_per_unit is None) ^ (self.max_value_g_per_unit is None):
            raise ValueError("bounds must be both provided or both null")
        return self


class Profile(BaseModel):
    id: str
    name: str
    default_grid_intensity_g_per_kwh: Optional[float] = None
    office_days_per_week: int = Field(default=5)


class ActivitySchedule(BaseModel):
    profile_id: str
    activity_id: str
    is_office_day: bool
    frequency_per_day: float
    units_per_activity: float


class Source(BaseModel):
    id: str
    citation: str


class GridIntensity(BaseModel):
    profile_id: str
    region_override: Optional[float] = None
    mix_weighted: Optional[float] = None
    canada_average: Optional[float] = None


def load_activities(path: Path) -> pd.DataFrame:
    return _load(path, Activity)


def load_emission_factors(path: Path) -> pd.DataFrame:
    return _load(path, EmissionFactor)


def load_profiles(path: Path) -> pd.DataFrame:
    return _load(path, Profile)


def load_activity_schedule(path: Path) -> pd.DataFrame:
    return _load(path, ActivitySchedule)


def load_sources(path: Path) -> pd.DataFrame:
    return _load(path, Source)


def load_grid_intensity(path: Path) -> pd.DataFrame:
    return _load(path, GridIntensity)
