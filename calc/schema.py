from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import pandas as pd
from pydantic import BaseModel, ConfigDict, model_validator

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_csv(path: Path, model: type[BaseModel]) -> List[BaseModel]:
    df = pd.read_csv(path, dtype=object)
    df = df.where(pd.notnull(df), None)
    return [model(**row) for row in df.to_dict(orient="records")]


class EmissionFactor(BaseModel):
    activity_id: str
    value_g_per_unit: Optional[float] = None
    is_grid_indexed: Optional[bool] = None
    electricity_kwh_per_unit: Optional[float] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def check_bounds(self):
        has_value = self.value_g_per_unit is not None
        has_grid = bool(self.is_grid_indexed) or self.electricity_kwh_per_unit is not None
        if has_value and has_grid:
            raise ValueError("emission factor cannot be both fixed and grid indexed")
        if not has_value and not has_grid:
            raise ValueError("emission factor requires either fixed value or grid index")
        if self.is_grid_indexed:
            if self.electricity_kwh_per_unit is None:
                raise ValueError("grid indexed factors need electricity_kwh_per_unit")
        else:
            if self.electricity_kwh_per_unit is not None:
                raise ValueError("electricity_kwh_per_unit only allowed for grid indexed factors")
        return self


class Profile(BaseModel):
    profile_id: str
    office_days_per_week: Optional[float] = None
    default_grid_region: Optional[str] = None


class ActivitySchedule(BaseModel):
    profile_id: str
    activity_id: str
    quantity_per_week: Optional[float] = None
    office_only: Optional[bool] = None
    region_override: Optional[str] = None
    mix_region: Optional[str] = None
    use_canada_average: Optional[bool] = None


class GridIntensity(BaseModel):
    region: str
    intensity_g_per_kwh: Optional[float] = None


# Loader helpers


def load_emission_factors() -> List[EmissionFactor]:
    return _load_csv(DATA_DIR / "emission_factors.csv", EmissionFactor)


def load_profiles() -> List[Profile]:
    return _load_csv(DATA_DIR / "profiles.csv", Profile)


def load_activity_schedule() -> List[ActivitySchedule]:
    return _load_csv(DATA_DIR / "activity_schedule.csv", ActivitySchedule)


def load_grid_intensity() -> List[GridIntensity]:
    return _load_csv(DATA_DIR / "grid_intensity.csv", GridIntensity)
