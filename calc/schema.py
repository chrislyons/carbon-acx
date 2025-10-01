"""Schema definitions plus cached CSV loading helpers for ACX datasets.

This module exposes the pydantic models that describe the public datasets and
provides helpers for reading the canonical CSV inputs. A simple read-through
cache keeps sanitized ``pandas.DataFrame`` objects keyed by file path and
modification time so repeated reads within a process avoid redundant parsing
while still reacting deterministically to changes on disk.
"""

from __future__ import annotations

from pathlib import Path
from datetime import date
from enum import Enum
from typing import Dict, List, Optional, Literal, Sequence, Set, Tuple

import pandas as pd
from pydantic import BaseModel, ConfigDict, Field, model_validator

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# load canonical units registry
_units_df = pd.read_csv(DATA_DIR / "units.csv", dtype=str)
_units_df.columns = [col.strip() for col in _units_df.columns]
if "unit_code" in _units_df.columns:
    _unit_column = "unit_code"
elif "unit" in _units_df.columns:
    _unit_column = "unit"
else:
    raise KeyError("units.csv must define a 'unit_code' column")
UNIT_REGISTRY = set(_units_df[_unit_column].dropna().astype(str))


# simple read-through cache for CSV payloads; values are sanitized DataFrames
_csv_cache: Dict[Path, Tuple[int, pd.DataFrame]] = {}


def _load_csv(path: Path, model: type[BaseModel]) -> tuple[BaseModel, ...]:
    mtime_ns = path.stat().st_mtime_ns
    cached = _csv_cache.get(path)
    if cached and cached[0] == mtime_ns:
        df = cached[1].copy(deep=True)
    else:
        df = pd.read_csv(path, dtype=object)
        df = df.where(pd.notnull(df), None)
        _csv_cache[path] = (mtime_ns, df)
        df = df.copy(deep=True)
    records = df.to_dict(orient="records")
    return tuple(model(**row) for row in records)


def _load_csv_list(path: Path, model: type[BaseModel]) -> List[BaseModel]:
    return list(_load_csv(path, model))


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


class LayerId(str, Enum):
    PROFESSIONAL = "professional"
    ONLINE = "online"
    INDUSTRIAL_LIGHT = "industrial_light"
    INDUSTRIAL_HEAVY = "industrial_heavy"

    @property
    def label(self) -> str:
        if self is LayerId.PROFESSIONAL:
            return "Professional"
        if self is LayerId.ONLINE:
            return "Online"
        if self is LayerId.INDUSTRIAL_LIGHT:
            return "Industrial (Light)"
        if self is LayerId.INDUSTRIAL_HEAVY:
            return "Industrial (Heavy)"
        return self.value.title()


class EntityType(str, Enum):
    CORPORATE = "corporate"
    MUNICIPAL = "municipal"
    NGO = "ngo"
    SOVEREIGN = "sovereign"


class UtilizationBasis(str, Enum):
    METERED = "metered"
    MODELED = "modeled"


ScopeBoundary = Literal[
    "WTT+TTW",
    "cradle-to-grave",
    "Electricity LCA",
    "gate-to-gate",
    "Operational electricity",
]


class Activity(BaseModel):
    activity_id: str
    layer_id: LayerId
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


class FunctionalUnitDomain(str, Enum):
    MOBILITY = "mobility"
    HYDRATION = "hydration"
    LOGISTICS = "logistics"
    INFORMATION = "information"
    NUTRITION = "nutrition"
    SHELTER = "shelter"
    COMFORT = "comfort"
    CARE = "care"
    ENERGY = "energy"


class FunctionalUnit(BaseModel):
    functional_unit_id: str
    name: str
    domain: FunctionalUnitDomain
    si_equiv: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class ActivityFunctionalUnitMap(BaseModel):
    activity_id: str
    functional_unit_id: str
    conversion_formula: Optional[str] = None
    assumption_notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class EmissionFactor(BaseModel):
    activity_id: str
    unit: Optional[str] = None
    value_g_per_unit: Optional[float] = None
    is_grid_indexed: Optional[bool] = None
    electricity_kwh_per_unit: Optional[float] = None
    electricity_kwh_per_unit_low: Optional[float] = None
    electricity_kwh_per_unit_high: Optional[float] = None
    region: Optional[RegionCode] = None
    scope_boundary: Optional[ScopeBoundary] = None
    vintage_year: Optional[int] = None
    source_id: Optional[str] = None
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
            if (
                self.electricity_kwh_per_unit_low is not None
                and self.electricity_kwh_per_unit_low <= 0
            ):
                raise ValueError("electricity_kwh_per_unit_low must be > 0 when provided")
            if (
                self.electricity_kwh_per_unit_high is not None
                and self.electricity_kwh_per_unit_high <= 0
            ):
                raise ValueError("electricity_kwh_per_unit_high must be > 0 when provided")
            if (
                self.electricity_kwh_per_unit_low is not None
                and self.electricity_kwh_per_unit_high is not None
                and self.electricity_kwh_per_unit_low > self.electricity_kwh_per_unit_high
            ):
                raise ValueError("electricity_kwh_per_unit_low cannot exceed high bound")
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
    layer_id: LayerId
    office_days_per_week: Optional[float] = None
    default_grid_region: Optional[RegionCode] = Field(default=None, alias="region_code_default")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class Entity(BaseModel):
    entity_id: str
    name: Optional[str] = None
    type: EntityType
    parent_entity_id: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class Site(BaseModel):
    site_id: str
    entity_id: str
    name: Optional[str] = None
    region_code: Optional[RegionCode] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class Asset(BaseModel):
    asset_id: str
    site_id: str
    asset_type: Optional[str] = None
    name: Optional[str] = None
    year: Optional[int] = None
    power_rating_kw: Optional[float] = None
    fuel_type: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class Operation(BaseModel):
    operation_id: str
    asset_id: str
    activity_id: str
    functional_unit_id: Optional[str] = None
    utilization_basis: Optional[UtilizationBasis] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    throughput_value: Optional[float] = None
    throughput_unit: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class ActivitySchedule(BaseModel):
    profile_id: str
    activity_id: str
    layer_id: LayerId
    quantity_per_week: Optional[float] = None
    office_only: Optional[bool] = None
    freq_per_day: Optional[float] = None
    freq_per_week: Optional[float] = None
    office_days_only: Optional[bool] = None
    region_override: Optional[RegionCode] = None
    mix_region: Optional[RegionCode] = None
    use_canada_average: Optional[bool] = None
    distance_km: Optional[float] = None
    passengers: Optional[float] = None
    hours: Optional[float] = None
    viewers: Optional[float] = None
    servings: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @model_validator(mode="after")
    def check_freq(self):
        if self.freq_per_day is not None and self.freq_per_week is not None:
            raise ValueError("cannot specify both freq_per_day and freq_per_week on same row")
        return self


class GridIntensity(BaseModel):
    region: RegionCode = Field(alias="region_code")
    intensity_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh")
    intensity_low_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh_low")
    intensity_high_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh_high")
    source_id: Optional[str] = None
    vintage_year: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


# Loader helpers


def load_entities() -> List[Entity]:
    entities = _load_csv_list(DATA_DIR / "entities.csv", Entity)
    if not entities:
        return entities

    entity_ids = {entity.entity_id for entity in entities}
    missing_parents = sorted(
        {
            entity.parent_entity_id
            for entity in entities
            if entity.parent_entity_id and entity.parent_entity_id not in entity_ids
        }
    )
    if missing_parents:
        raise ValueError(
            "Unknown parent_entity_id referenced by entities: " + ", ".join(missing_parents)
        )
    return entities


def load_sites(*, entities: Sequence[Entity] | None = None) -> List[Site]:
    sites = _load_csv_list(DATA_DIR / "sites.csv", Site)
    if not sites:
        return sites

    entity_records = entities if entities is not None else load_entities()
    entity_ids = {entity.entity_id for entity in entity_records}
    missing_entities = sorted(
        {site.entity_id for site in sites if site.entity_id not in entity_ids}
    )
    if missing_entities:
        raise ValueError("Unknown entity_id referenced by sites: " + ", ".join(missing_entities))
    return sites


def load_assets(
    *, sites: Sequence[Site] | None = None, entities: Sequence[Entity] | None = None
) -> List[Asset]:
    assets = _load_csv_list(DATA_DIR / "assets.csv", Asset)
    if not assets:
        return assets

    site_records = sites if sites is not None else load_sites(entities=entities)
    site_ids = {site.site_id for site in site_records}
    missing_sites = sorted({asset.site_id for asset in assets if asset.site_id not in site_ids})
    if missing_sites:
        raise ValueError("Unknown site_id referenced by assets: " + ", ".join(missing_sites))
    return assets


def load_operations(
    *,
    assets: Sequence[Asset] | None = None,
    activities: Sequence[Activity] | None = None,
) -> List[Operation]:
    operations = _load_csv_list(DATA_DIR / "operations.csv", Operation)
    if not operations:
        return operations

    asset_records = assets if assets is not None else load_assets()
    asset_ids: Set[str] = {asset.asset_id for asset in asset_records}
    missing_assets = sorted(
        {operation.asset_id for operation in operations if operation.asset_id not in asset_ids}
    )
    if missing_assets:
        raise ValueError("Unknown asset_id referenced by operations: " + ", ".join(missing_assets))

    activity_records = activities if activities is not None else load_activities()
    activity_ids = {activity.activity_id for activity in activity_records}
    missing_activities = sorted(
        {
            operation.activity_id
            for operation in operations
            if operation.activity_id not in activity_ids
        }
    )
    if missing_activities:
        raise ValueError(
            "Unknown activity_id referenced by operations: " + ", ".join(missing_activities)
        )

    return operations


def load_emission_factors() -> List[EmissionFactor]:
    return _load_csv_list(DATA_DIR / "emission_factors.csv", EmissionFactor)


def load_profiles() -> List[Profile]:
    return _load_csv_list(DATA_DIR / "profiles.csv", Profile)


def load_activities() -> List[Activity]:
    return _load_csv_list(DATA_DIR / "activities.csv", Activity)


def load_functional_units() -> List[FunctionalUnit]:
    return _load_csv_list(DATA_DIR / "functional_units.csv", FunctionalUnit)


def load_activity_fu_map(
    *,
    activities: Sequence[Activity] | None = None,
    functional_units: Sequence[FunctionalUnit] | None = None,
) -> List[ActivityFunctionalUnitMap]:
    mappings = _load_csv_list(DATA_DIR / "activity_fu_map.csv", ActivityFunctionalUnitMap)
    if not mappings:
        return mappings

    activity_records = activities if activities is not None else load_activities()
    functional_unit_records = (
        functional_units if functional_units is not None else load_functional_units()
    )

    activity_ids = {activity.activity_id for activity in activity_records}
    functional_unit_ids = {
        functional_unit.functional_unit_id for functional_unit in functional_unit_records
    }

    missing_activities = sorted(
        {mapping.activity_id for mapping in mappings if mapping.activity_id not in activity_ids}
    )
    if missing_activities:
        raise ValueError(
            "Unknown activity_id referenced by activity_fu_map: " + ", ".join(missing_activities)
        )

    missing_functional_units = sorted(
        {
            mapping.functional_unit_id
            for mapping in mappings
            if mapping.functional_unit_id not in functional_unit_ids
        }
    )
    if missing_functional_units:
        raise ValueError(
            "Unknown functional_unit_id referenced by activity_fu_map: "
            + ", ".join(missing_functional_units)
        )

    return mappings


def load_activity_schedule() -> List[ActivitySchedule]:
    return _load_csv_list(DATA_DIR / "activity_schedule.csv", ActivitySchedule)


def load_grid_intensity() -> List[GridIntensity]:
    return _load_csv_list(DATA_DIR / "grid_intensity.csv", GridIntensity)


def invalidate_caches() -> None:
    """Clear cached CSV reads for schema models."""

    _csv_cache.clear()
