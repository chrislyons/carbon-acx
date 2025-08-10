from __future__ import annotations

from pathlib import Path
from datetime import date
from enum import Enum
from typing import List, Optional, Literal

import pandas as pd
from pydantic import BaseModel, ConfigDict, model_validator

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# load canonical units registry
UNIT_REGISTRY = set(pd.read_csv(DATA_DIR / "units.csv", dtype=str)["unit"].dropna().astype(str))


def _load_csv(path: Path, model: type[BaseModel]) -> List[BaseModel]:
    df = pd.read_csv(path, dtype=object)
    df = df.where(pd.notnull(df), None)
    return [model(**row) for row in df.to_dict(orient="records")]


class RegionCode(str, Enum):
    CA_AB = "CA-AB"
    CA_BC = "CA-BC"
    CA_MB = "CA-MB"
    CA_NB = "CA-NB"
    CA_NL = "CA-NL"
    CA_NS = "CA-NS"
    CA_NT = "CA-NT"
    CA_NU = "CA-NU"
    CA_ON = "CA-ON"
    CA_PE = "CA-PE"
    CA_QC = "CA-QC"
    CA_SK = "CA-SK"
    CA_YT = "CA-YT"
    CA = "CA"


ScopeBoundary = Literal["WTT+TTW", "cradle-to-grave", "Electricity LCA", "gate-to-gate"]


class Activity(BaseModel):
    activity_id: str
    category: Optional[str] = None
    name: Optional[str] = None
    default_unit: Optional[str] = None
    description: Optional[str] = None
    unit_definition: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def check_unit(self):
        if self.default_unit and self.default_unit not in UNIT_REGISTRY:
            raise ValueError("default_unit not in units registry")
        return self


class EmissionFactor(BaseModel):
    activity_id: str
    unit: Optional[str] = None
    value_g_per_unit: Optional[float] = None
    is_grid_indexed: Optional[bool] = None
    electricity_kwh_per_unit: Optional[float] = None
    region: Optional[RegionCode] = None
    scope_boundary: Optional[ScopeBoundary] = None
    vintage_year: Optional[int] = None
    uncert_low_g_per_unit: Optional[float] = None
    uncert_high_g_per_unit: Optional[float] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def check_bounds(self):  # noqa: C901 - simple validator
        if self.unit and self.unit not in UNIT_REGISTRY:
            raise ValueError("unit not in units registry")
        has_value = self.value_g_per_unit is not None
        has_grid = bool(self.is_grid_indexed) or self.electricity_kwh_per_unit is not None
        if has_value and has_grid:
            raise ValueError("emission factor cannot be both fixed and grid indexed")
        if not has_value and not has_grid:
            raise ValueError("emission factor requires either fixed value or grid index")
        if has_grid:
            if not self.is_grid_indexed:
                raise ValueError("grid indexed factors must set is_grid_indexed=True")
            if self.electricity_kwh_per_unit is None or self.electricity_kwh_per_unit <= 0:
                raise ValueError("grid indexed factors require electricity_kwh_per_unit > 0")
        else:
            if self.is_grid_indexed:
                raise ValueError("is_grid_indexed only allowed with grid indexed factors")
            if self.electricity_kwh_per_unit is not None:
                raise ValueError("electricity_kwh_per_unit only allowed for grid indexed factors")

        if self.uncert_low_g_per_unit is not None or self.uncert_high_g_per_unit is not None:
            if (
                self.value_g_per_unit is None
                or self.uncert_low_g_per_unit is None
                or self.uncert_high_g_per_unit is None
            ):
                raise ValueError("uncertainty bounds require value, low and high")
            if not (
                self.uncert_low_g_per_unit <= self.value_g_per_unit <= self.uncert_high_g_per_unit
            ):
                raise ValueError("value must be within uncertainty bounds")

        if self.vintage_year is not None and self.vintage_year > date.today().year:
            raise ValueError("vintage_year cannot be in the future")

        return self


class Profile(BaseModel):
    profile_id: str
    office_days_per_week: Optional[float] = None
    default_grid_region: Optional[RegionCode] = None


class ActivitySchedule(BaseModel):
    profile_id: str
    activity_id: str
    quantity_per_week: Optional[float] = None
    office_only: Optional[bool] = None
    freq_per_day: Optional[float] = None
    freq_per_week: Optional[float] = None
    office_days_only: Optional[bool] = None
    region_override: Optional[RegionCode] = None
    mix_region: Optional[RegionCode] = None
    use_canada_average: Optional[bool] = None

    @model_validator(mode="after")
    def check_freq(self):
        if self.freq_per_day is not None and self.freq_per_week is not None:
            raise ValueError("cannot specify both freq_per_day and freq_per_week on same row")
        return self


class GridIntensity(BaseModel):
    region: RegionCode
    intensity_g_per_kwh: Optional[float] = None


# Loader helpers


def load_emission_factors() -> List[EmissionFactor]:
    return _load_csv(DATA_DIR / "emission_factors.csv", EmissionFactor)


def load_profiles() -> List[Profile]:
    return _load_csv(DATA_DIR / "profiles.csv", Profile)


def load_activities() -> List[Activity]:
    return _load_csv(DATA_DIR / "activities.csv", Activity)


def load_activity_schedule() -> List[ActivitySchedule]:
    return _load_csv(DATA_DIR / "activity_schedule.csv", ActivitySchedule)


def load_grid_intensity() -> List[GridIntensity]:
    return _load_csv(DATA_DIR / "grid_intensity.csv", GridIntensity)
