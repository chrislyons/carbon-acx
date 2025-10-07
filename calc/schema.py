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

from functools import lru_cache

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


@lru_cache(maxsize=1)
def _remap_record_func():
    from .dal.aliases import remap_record as _remap_record

    return _remap_record


BASE_MODEL_CONFIG = ConfigDict(populate_by_name=True, extra="ignore")


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
    remap = _remap_record_func()
    records = (remap(row) for row in df.to_dict(orient="records"))
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
    GLOBAL = "GLOBAL"


class LayerId(str, Enum):
    PROFESSIONAL = "professional"
    ONLINE = "online"
    INDUSTRIAL_LIGHT = "industrial_light"
    INDUSTRIAL_HEAVY = "industrial_heavy"
    INDUSTRIAL_HEAVY_MILITARY = "industrial_heavy_military"
    INDUSTRIAL_HEAVY_EMBODIED = "industrial_heavy_embodied"
    BUILDINGS_DEFENSE = "buildings_defense"
    MODELED_EVENTS = "modeled_events"
    MATERIALS_CHEMICALS = "materials_chemicals"
    PERSONAL_SECURITY_LAYER = "personal_security_layer"
    BIOSPHERE_FEEDBACKS = "biosphere_feedbacks"
    INDUSTRIAL_EXTERNALITIES = "industrial_externalities"

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
        if self is LayerId.INDUSTRIAL_HEAVY_MILITARY:
            return "Military operations"
        if self is LayerId.INDUSTRIAL_HEAVY_EMBODIED:
            return "Weapons manufacturing"
        if self is LayerId.BUILDINGS_DEFENSE:
            return "Defence installations"
        if self is LayerId.MODELED_EVENTS:
            return "Conflict simulations"
        if self is LayerId.MATERIALS_CHEMICALS:
            return "Defence supply chain"
        if self is LayerId.PERSONAL_SECURITY_LAYER:
            return "Private security"
        if self is LayerId.BIOSPHERE_FEEDBACKS:
            return "Earth system feedbacks"
        if self is LayerId.INDUSTRIAL_EXTERNALITIES:
            return "Industrial externalities"
        return self.value.title()


LayerType = Literal["industry", "civilian", "crosscut"]


class Layer(BaseModel):
    layer_id: LayerId
    layer_name: str
    layer_type: LayerType
    description: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class EntityType(str, Enum):
    CORPORATE = "corporate"
    MUNICIPAL = "municipal"
    NGO = "ngo"
    SOVEREIGN = "sovereign"
    GOVERNMENT = "government"
    INTERGOVERNMENTAL = "intergovernmental"
    INSTALLATION = "installation"
    PERSONA = "persona"


class UtilizationBasis(str, Enum):
    METERED = "metered"
    MODELED = "modeled"


ScopeBoundary = Literal[
    "WTT+TTW",
    "cradle-to-grave",
    "cradle-to-gate",
    "cradle-to-farmgate",
    "Electricity LCA",
    "gate-to-gate",
    "Operational electricity",
    "Operational energy",
    "Modeled operations",
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
    sector: Optional[str] = Field(default=None, alias="segment")
    sector_name: Optional[str] = Field(default=None, alias="segment_name")
    sector_id: Optional[str] = Field(default=None, alias="segment_id")

    model_config = BASE_MODEL_CONFIG

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
    AGRICULTURE = "agriculture"
    MATERIALS = "materials"
    SHELTER = "shelter"
    COMFORT = "comfort"
    CARE = "care"
    ENERGY = "energy"
    CONSUMPTION = "consumption"
    MODELED = "modeled"
    SERVICES = "services"
    CLIMATE = "climate"
    DATA_CENTRES = "data_centres"
    NATURAL_HAZARDS = "natural_hazards"


class FunctionalUnit(BaseModel):
    functional_unit_id: str
    name: str
    domain: FunctionalUnitDomain
    si_equiv: Optional[str] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class ActivityFunctionalUnitMap(BaseModel):
    activity_id: str
    functional_unit_id: str
    conversion_formula: Optional[str] = None
    assumption_notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class EmissionFactor(BaseModel):
    ef_id: Optional[str] = None
    activity_id: str
    layer_id: Optional[LayerId] = None
    unit: Optional[str] = None
    value_g_per_unit: Optional[float] = None
    is_grid_indexed: Optional[bool] = None
    electricity_kwh_per_unit: Optional[float] = None
    electricity_kwh_per_unit_low: Optional[float] = None
    electricity_kwh_per_unit_high: Optional[float] = None
    region: Optional[RegionCode] = None
    scope_boundary: Optional[ScopeBoundary] = None
    gwp_horizon: Optional[str] = None
    vintage_year: Optional[int] = None
    source_id: Optional[str] = None
    method_notes: Optional[str] = None
    uncert_low_g_per_unit: Optional[float] = None
    uncert_high_g_per_unit: Optional[float] = None

    model_config = BASE_MODEL_CONFIG

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
    name: Optional[str] = None
    grid_strategy: Optional[str] = None
    grid_mix_json: Optional[str] = None
    cohort_id: Optional[str] = None
    office_days_per_week: Optional[float] = None
    assumption_notes: Optional[str] = None
    default_grid_region: Optional[RegionCode] = Field(default=None, alias="region_code_default")

    model_config = BASE_MODEL_CONFIG


class Entity(BaseModel):
    entity_id: str
    name: Optional[str] = None
    type: EntityType
    parent_entity_id: Optional[str] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class Site(BaseModel):
    site_id: str
    entity_id: str
    name: Optional[str] = None
    region_code: Optional[RegionCode] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class Asset(BaseModel):
    asset_id: str
    site_id: str
    asset_type: Optional[str] = None
    name: Optional[str] = None
    year: Optional[int] = None
    power_rating_kw: Optional[float] = None
    fuel_type: Optional[str] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class Operation(BaseModel):
    operation_id: str
    asset_id: str
    activity_id: str
    layer_id: LayerId
    functional_unit_id: Optional[str] = None
    utilization_basis: Optional[UtilizationBasis] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    throughput_value: Optional[float] = None
    throughput_unit: Optional[str] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG


class ActivityDependency(BaseModel):
    child_activity_id: str
    parent_operation_id: str
    share: float
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG

    @model_validator(mode="after")
    def validate_share(self):
        if self.share is None:
            raise ValueError("dependency share is required")
        if not 0 < self.share <= 1:
            raise ValueError("dependency share must be between 0 and 1")
        return self


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
    schedule_notes: Optional[str] = None
    distance_km: Optional[float] = None
    passengers: Optional[float] = None
    hours: Optional[float] = None
    viewers: Optional[float] = None
    servings: Optional[float] = None

    model_config = BASE_MODEL_CONFIG

    @model_validator(mode="after")
    def check_freq(self):
        if self.freq_per_day is not None and self.freq_per_week is not None:
            raise ValueError("cannot specify both freq_per_day and freq_per_week on same row")
        return self


class GridIntensity(BaseModel):
    region: RegionCode = Field(alias="region_code")
    region_label: Optional[str] = Field(default=None, alias="region")
    scope_boundary: Optional[ScopeBoundary] = None
    gwp_horizon: Optional[str] = None
    intensity_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh")
    intensity_low_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh_low")
    intensity_high_g_per_kwh: Optional[float] = Field(default=None, alias="g_per_kwh_high")
    source_id: Optional[str] = None
    vintage_year: Optional[int] = None

    model_config = BASE_MODEL_CONFIG


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

    layer_records = load_layers()
    layer_ids = {layer.layer_id for layer in layer_records}
    missing_layers = sorted(
        {operation.layer_id for operation in operations if operation.layer_id not in layer_ids}
    )
    if missing_layers:
        raise ValueError(
            "Unknown layer_id referenced by operations: "
            + ", ".join(layer.value for layer in missing_layers)
        )

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


def load_activity_dependencies(
    *,
    activities: Sequence[Activity] | None = None,
    operations: Sequence[Operation] | None = None,
) -> List[ActivityDependency]:
    dependencies = _load_csv_list(DATA_DIR / "dependencies.csv", ActivityDependency)
    if not dependencies:
        return dependencies

    activity_records = activities if activities is not None else load_activities()
    operation_records = operations if operations is not None else load_operations()

    activity_ids = {activity.activity_id for activity in activity_records}
    missing_children = sorted(
        {
            dependency.child_activity_id
            for dependency in dependencies
            if dependency.child_activity_id not in activity_ids
        }
    )
    if missing_children:
        raise ValueError(
            "Unknown child_activity_id referenced by dependencies: " + ", ".join(missing_children)
        )

    operation_ids = {operation.operation_id for operation in operation_records}
    missing_parents = sorted(
        {
            dependency.parent_operation_id
            for dependency in dependencies
            if dependency.parent_operation_id not in operation_ids
        }
    )
    if missing_parents:
        raise ValueError(
            "Unknown parent_operation_id referenced by dependencies: " + ", ".join(missing_parents)
        )

    grouped: dict[str, float] = {}
    for dependency in dependencies:
        key = dependency.child_activity_id
        grouped[key] = grouped.get(key, 0.0) + float(dependency.share)
    for activity_id, total in grouped.items():
        if total > 1.0000001:
            raise ValueError(
                f"Dependency shares for {activity_id} exceed 1.0 (received {total:.6f})"
            )

    return dependencies


def load_feedback_loops(
    *,
    activities: Sequence[Activity] | None = None,
) -> List[FeedbackLoop]:
    path = DATA_DIR / "feedback_loops.csv"
    if not path.exists():
        return []
    loops = _load_csv_list(path, FeedbackLoop)
    if not loops:
        return loops

    activity_records = activities if activities is not None else load_activities()
    activity_ids = {activity.activity_id for activity in activity_records}
    missing = sorted(
        {loop.trigger_activity_id for loop in loops if loop.trigger_activity_id not in activity_ids}
        | {
            loop.response_activity_id
            for loop in loops
            if loop.response_activity_id not in activity_ids
        }
    )
    if missing:
        raise ValueError("Unknown activity referenced by feedback_loops: " + ", ".join(missing))
    return loops


def load_emission_factors() -> List[EmissionFactor]:
    return _load_csv_list(DATA_DIR / "emission_factors.csv", EmissionFactor)


def load_profiles() -> List[Profile]:
    return _load_csv_list(DATA_DIR / "profiles.csv", Profile)


def load_layers() -> List[Layer]:
    layers = _load_csv_list(DATA_DIR / "layers.csv", Layer)
    if not layers:
        return layers

    seen: set[LayerId] = set()
    duplicates: set[str] = set()
    for layer in layers:
        if layer.layer_id in seen:
            duplicates.add(layer.layer_id.value)
        else:
            seen.add(layer.layer_id)
    if duplicates:
        raise ValueError(
            "Duplicate layer_id entries in layers.csv: " + ", ".join(sorted(duplicates))
        )
    return layers


def load_activities() -> List[Activity]:
    activities = _load_csv_list(DATA_DIR / "activities.csv", Activity)
    if not activities:
        return activities

    layer_records = load_layers()
    layer_ids = {layer.layer_id for layer in layer_records}
    missing_layers = sorted(
        {activity.layer_id for activity in activities if activity.layer_id not in layer_ids}
    )
    if missing_layers:
        raise ValueError(
            "Unknown layer_id referenced by activities: "
            + ", ".join(layer.value for layer in missing_layers)
        )

    return activities


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


class FeedbackLoop(BaseModel):
    loop_id: str
    trigger_activity_id: str
    response_activity_id: str
    sign: Literal["+", "-"]
    lag_years: Optional[str] = None
    strength: Optional[float] = None
    source_id: Optional[str] = None
    notes: Optional[str] = None

    model_config = BASE_MODEL_CONFIG
