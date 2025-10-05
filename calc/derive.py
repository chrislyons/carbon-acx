from __future__ import annotations

import ast
import json
import math
import os
import shutil
import datetime as _datetime_module
import hashlib
import re
from collections import defaultdict
from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import pandas as pd

from . import citations, figures
from .upstream import dependency_metadata
from .api import collect_activity_source_keys
from .dal import DataStore, choose_backend
from .schema import (
    Activity,
    ActivityFunctionalUnitMap,
    ActivitySchedule,
    EmissionFactor,
    FunctionalUnit,
    GridIntensity,
    LayerId,
    Operation,
    Profile,
    RegionCode,
    load_activities as schema_load_activities,
    load_activity_dependencies,
    load_activity_fu_map,
    load_assets as schema_load_assets,
    load_entities as schema_load_entities,
    load_functional_units,
    load_feedback_loops as schema_load_feedback_loops,
    load_operations as schema_load_operations,
    load_sites as schema_load_sites,
)

FLOAT_QUANTISER = Decimal("0.000001")
OUTPUT_ROOT_ENV = "ACX_OUTPUT_ROOT"
GENERATED_AT_ENV = "ACX_GENERATED_AT"
ALLOW_OUTPUT_RM_ENV = "ACX_ALLOW_OUTPUT_RM"
REPO_ROOT = Path(__file__).resolve().parent.parent
ARTIFACT_ROOT = REPO_ROOT / "dist" / "artifacts"
BUILD_HASH_RE = re.compile(r"^[0-9a-f]{12}$")
EXPORT_COLUMNS = [
    "profile_id",
    "activity_id",
    "layer_id",
    "activity_name",
    "activity_category",
    "scope_boundary",
    "emission_factor_vintage_year",
    "grid_region",
    "grid_vintage_year",
    "annual_emissions_g",
    "annual_emissions_g_low",
    "annual_emissions_g_high",
    "upstream_chain",
]

INTENSITY_COLUMNS = [
    "alt_id",
    "alternative",
    "record_type",
    "activity_id",
    "activity_name",
    "functional_unit_id",
    "fu_name",
    "intensity_g_per_fu",
    "intensity_low_g_per_fu",
    "intensity_high_g_per_fu",
    "annual_fu",
    "annual_kg",
    "method_notes",
    "scope_boundary",
    "region",
    "source_ids_csv",
]

_UNIT_VARIABLE_HINTS: dict[str, tuple[str, ...]] = {
    "km": ("distance_km", "route_km"),
    "kilometre": ("distance_km", "route_km"),
    "kilometer": ("distance_km", "route_km"),
    "passenger-km": ("distance_km", "route_km"),
    "passenger_km": ("distance_km", "route_km"),
    "passenger-kilometre": ("distance_km", "route_km"),
    "passenger_kilometre": ("distance_km", "route_km"),
    "hour": ("hours",),
    "participant-hour": ("hours",),
    "participant_hour": ("hours",),
    "serving": ("servings",),
    "servings": ("servings",),
    "garment": ("servings",),
    "wear": ("servings",),
}

_CASE_TO_LITRE_MULTIPLIER = 24.0 * 0.355
_CASE_TO_LITRE_NOTE = "Derived litres_delivered from cases_delivered using 24 × 0.355 L per case."

datetime = _datetime_module.datetime
timezone = _datetime_module.timezone

_FORMULA_PATTERN = re.compile(r"^fu\s*=\s*(.+)$")
_VARIABLE_NAME_PATTERN = re.compile(r"^[a-z_]+$")


class _FormulaValidationError(ValueError):
    """Internal marker for invalid functional unit formulas."""


def _coerce_numeric(value: Any) -> float:
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    raise TypeError(f"Unsupported value type for formula evaluation: {type(value)!r}")


def _evaluate_formula_node(node: ast.AST, variables: Mapping[str, Any]) -> Optional[float]:
    if isinstance(node, ast.Expression):
        return _evaluate_formula_node(node.body, variables)

    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
        left = _evaluate_formula_node(node.left, variables)
        right = _evaluate_formula_node(node.right, variables)
        if left is None or right is None:
            return None
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right

    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        operand = _evaluate_formula_node(node.operand, variables)
        if operand is None:
            return None
        if isinstance(node.op, ast.UAdd):
            return +operand
        if isinstance(node.op, ast.USub):
            return -operand

    if isinstance(node, ast.Name):
        if not _VARIABLE_NAME_PATTERN.fullmatch(node.id):
            raise _FormulaValidationError(f"Invalid variable name: {node.id}")
        if node.id not in variables:
            return None
        value = variables[node.id]
        if value is None:
            return None
        try:
            return _coerce_numeric(value)
        except TypeError as exc:  # pragma: no cover - defensive guard
            raise _FormulaValidationError(str(exc)) from exc

    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)

    raise _FormulaValidationError(
        f"Unsupported expression element: {ast.dump(node, include_attributes=False)}"
    )


def evaluate_functional_unit_formula(
    formula: Optional[str], variables: Mapping[str, Any]
) -> Optional[float]:
    """Evaluate a functional unit conversion formula against provided variables.

    The evaluator only supports a constrained arithmetic grammar with the operators
    ``+``, ``-``, ``*`` and ``/`` alongside numeric literals and snake_case
    variable references. When a variable referenced by the formula is missing or
    resolves to ``None``, ``None`` is returned to indicate that a functional unit
    could not be derived. Any structural issues with the formula will raise a
    :class:`ValueError`.
    """

    if formula is None:
        return None

    formula = formula.strip()
    if not formula:
        return None

    match = _FORMULA_PATTERN.match(formula)
    if not match:
        raise ValueError(f"Unsupported functional unit formula: {formula}")

    rhs = match.group(1).strip()
    if not rhs:
        return None

    try:
        parsed = ast.parse(rhs, mode="eval")
    except SyntaxError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"Invalid functional unit formula: {formula}") from exc

    try:
        result = _evaluate_formula_node(parsed, variables)
    except _FormulaValidationError as exc:
        raise ValueError(str(exc)) from exc

    return result


def _quantize_float(value: float) -> float:
    if math.isnan(value) or math.isinf(value):
        return value
    quantised = Decimal(str(value)).quantize(FLOAT_QUANTISER, rounding=ROUND_HALF_UP)
    return float(quantised)


def _coerce_none(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (list, tuple, dict, set)):
        return value
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    return value


def _normalise_value(value: Any) -> Any:
    coerced = _coerce_none(value)
    if coerced is None:
        return None
    if isinstance(coerced, float):
        return _quantize_float(coerced)
    if isinstance(coerced, Decimal):
        return _quantize_float(float(coerced))
    if isinstance(coerced, dict):
        return {key: _normalise_value(val) for key, val in coerced.items()}
    if isinstance(coerced, list):
        return [_normalise_value(item) for item in coerced]
    if isinstance(coerced, tuple):
        return tuple(_normalise_value(item) for item in coerced)
    return coerced


def _normalise_mapping(record: dict) -> dict:
    return {key: _normalise_value(record.get(key)) for key in EXPORT_COLUMNS if key in record} | {
        key: _normalise_value(value) for key, value in record.items() if key not in EXPORT_COLUMNS
    }


def _normalise_category_label(value: Any) -> str:
    if value is None:
        return "uncategorized"
    try:
        if pd.isna(value):
            return "uncategorized"
    except TypeError:
        pass
    text = str(value)
    return text if text else "uncategorized"


def _env_flag(name: str) -> bool:
    value = os.getenv(name)
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_safe_output_dir(path: Path, repo_root: Path) -> bool:
    if _env_flag(ALLOW_OUTPUT_RM_ENV):
        return True

    repo_artifacts = (repo_root / "dist" / "artifacts").resolve()
    resolved = path.resolve()
    try:
        relative = resolved.relative_to(repo_artifacts)
    except ValueError:
        return False

    if not relative.parts:
        return False

    build_segment = relative.parts[0]
    return bool(BUILD_HASH_RE.fullmatch(build_segment))


def _prepare_output_dir(path: Path) -> None:
    if not is_safe_output_dir(path, REPO_ROOT):
        raise ValueError(
            "Refusing to clear output directory outside dist/artifacts build guardrails: "
            f"{path}. Set ACX_ALLOW_OUTPUT_RM=1 to override."
        )

    if path.exists():
        for child in path.iterdir():
            if child.name == ".gitkeep":
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    path.mkdir(parents=True, exist_ok=True)


def _resolve_output_root(output_root: Path | str | None, repo_root: Path) -> Path:
    if output_root is not None:
        candidate = Path(output_root)
    else:
        env_root = os.getenv(OUTPUT_ROOT_ENV)
        if env_root:
            candidate = Path(env_root)
        else:
            candidate = ARTIFACT_ROOT

    if not candidate.is_absolute():
        candidate = (repo_root / candidate).resolve()
    else:
        candidate = candidate.resolve()

    return candidate


def _apply_build_hash(base_root: Path, repo_root: Path, build_hash: str) -> Path:
    repo_artifacts = (repo_root / "dist" / "artifacts").resolve()
    base_resolved = base_root.resolve()
    try:
        relative = base_resolved.relative_to(repo_artifacts)
    except ValueError:
        return base_resolved

    parts = relative.parts
    if parts and BUILD_HASH_RE.fullmatch(parts[0]):
        return base_resolved

    return repo_artifacts.joinpath(build_hash, *parts)


def _compute_build_hash(manifest_payload: Mapping[str, Any], rows: List[dict]) -> str:
    digest_source = json.dumps(
        {"manifest": manifest_payload, "rows": rows},
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(digest_source).hexdigest()[:12]


def _sort_export_rows(rows: List[dict]) -> List[dict]:
    def sort_key(row: dict) -> tuple:
        grid_year = row.get("grid_vintage_year")
        ef_year = row.get("emission_factor_vintage_year")
        return (
            str(row.get("profile_id") or ""),
            str(row.get("activity_id") or ""),
            str(row.get("layer_id") or ""),
            str(row.get("grid_region") or ""),
            -1 if grid_year in (None, "") else int(grid_year),
            -1 if ef_year in (None, "") else int(ef_year),
        )

    return sorted(rows, key=sort_key)


def _write_json(path: Path, payload: Any) -> None:
    normalised = _normalise_value(payload)
    path.write_text(json.dumps(normalised, indent=2, sort_keys=True), encoding="utf-8")


def _resolve_generated_at() -> str:
    env_value = os.getenv(GENERATED_AT_ENV)
    if env_value:
        return env_value
    return datetime.now(timezone.utc).isoformat()


def get_grid_intensity(
    profile: Profile,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
    region_override: Optional[str | RegionCode] = None,
    mix_region: Optional[str | RegionCode] = None,
    use_canada_average: Optional[bool] = None,
) -> Optional[float]:
    if region_override:
        return grid_lookup.get(region_override)
    if mix_region:
        return grid_lookup.get(mix_region)
    if use_canada_average:
        fallback = grid_lookup.get(RegionCode.CA) or grid_lookup.get("CA")
        if fallback is not None:
            return fallback
        values = [value for value in grid_lookup.values() if value is not None]
        if values:
            return sum(values) / len(values)
        return None
    if profile and profile.default_grid_region:
        return grid_lookup.get(profile.default_grid_region)
    return None


def _layer_value(value: LayerId | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, LayerId):
        return value.value
    return str(value)


def _normalise_layer_hint(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _resolve_layer_hint(value: object | None) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, LayerId):
        return value.value

    text = str(value).strip()
    if not text:
        return None

    upper = text.upper()
    for prefix, layer in _LAYER_PREFIXES:
        if upper.startswith(prefix):
            return layer.value

    normalised = _normalise_layer_hint(text)
    hinted = _LAYER_NAME_HINTS.get(normalised)
    if hinted is not None:
        return hinted.value

    return None


def _resolve_layer_id(
    sched: ActivitySchedule | None,
    profile: Profile | None,
    activity: Activity | None,
) -> Optional[str]:
    for source in (sched, profile, activity):
        if source is None:
            continue
        layer = getattr(source, "layer_id", None)
        resolved = _layer_value(layer)
        if resolved:
            return resolved

    hint_sources = (
        getattr(sched, "profile_id", None),
        getattr(profile, "profile_id", None),
        getattr(sched, "activity_id", None),
        getattr(activity, "activity_id", None),
        getattr(activity, "category", None),
    )
    for candidate in hint_sources:
        hinted = _resolve_layer_hint(candidate)
        if hinted:
            return hinted

    return LayerId.PROFESSIONAL.value


def _office_ratio(profile: Profile) -> Optional[float]:
    if profile.office_days_per_week is None:
        return None
    return float(profile.office_days_per_week) / 5


def _weekly_quantity(sched: ActivitySchedule, profile: Profile) -> Optional[float]:
    if sched.quantity_per_week is not None:
        weekly = float(sched.quantity_per_week)
    elif sched.freq_per_week is not None:
        weekly = float(sched.freq_per_week)
    elif sched.freq_per_day is not None:
        if sched.office_only or sched.office_days_only:
            if profile.office_days_per_week is None:
                return None
            days = float(profile.office_days_per_week)
        else:
            days = 7.0
        weekly = float(sched.freq_per_day) * days
    else:
        weekly = None

    if weekly is None:
        return None

    ratio = _office_ratio(profile)
    if sched.office_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio
    if sched.office_days_only and sched.freq_per_day is None:
        if ratio is None:
            return None
        weekly *= ratio

    return weekly


@dataclass(frozen=True)
class EmissionDetails:
    mean: Optional[float]
    low: Optional[float]
    high: Optional[float]

    def as_dict(self) -> dict:
        payload = {"mean": self.mean}
        if self.low is not None:
            payload["low"] = self.low
        if self.high is not None:
            payload["high"] = self.high
        return payload


def compute_emission(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
) -> Optional[float]:
    details = compute_emission_details(sched, profile, ef, grid_lookup)
    return details.mean


def compute_emission_details(
    sched: ActivitySchedule,
    profile: Profile,
    ef: EmissionFactor,
    grid_lookup: Mapping[str | RegionCode, Optional[float]],
    grid_row: GridIntensity | None = None,
) -> EmissionDetails:
    weekly_quantity = _weekly_quantity(sched, profile)
    if weekly_quantity is None:
        return EmissionDetails(mean=None, low=None, high=None)

    quantity = weekly_quantity * 52

    if ef.value_g_per_unit is not None:
        factor = float(ef.value_g_per_unit)
        mean = quantity * factor
        low = (
            quantity * float(ef.uncert_low_g_per_unit)
            if ef.uncert_low_g_per_unit is not None
            else None
        )
        high = (
            quantity * float(ef.uncert_high_g_per_unit)
            if ef.uncert_high_g_per_unit is not None
            else None
        )
        return EmissionDetails(mean=mean, low=low, high=high)

    if ef.is_grid_indexed:
        intensity = None
        if grid_row and grid_row.intensity_g_per_kwh is not None:
            intensity = float(grid_row.intensity_g_per_kwh)
        if intensity is None:
            intensity = get_grid_intensity(
                profile,
                grid_lookup,
                sched.region_override,
                sched.mix_region,
                sched.use_canada_average,
            )
        if intensity is None or ef.electricity_kwh_per_unit is None:
            return EmissionDetails(mean=None, low=None, high=None)

        kwh = float(ef.electricity_kwh_per_unit)
        mean = quantity * float(intensity) * kwh

        intensity_low = (
            float(grid_row.intensity_low_g_per_kwh)
            if grid_row and grid_row.intensity_low_g_per_kwh is not None
            else None
        )
        intensity_high = (
            float(grid_row.intensity_high_g_per_kwh)
            if grid_row and grid_row.intensity_high_g_per_kwh is not None
            else None
        )
        kwh_low = (
            float(ef.electricity_kwh_per_unit_low)
            if ef.electricity_kwh_per_unit_low is not None
            else None
        )
        kwh_high = (
            float(ef.electricity_kwh_per_unit_high)
            if ef.electricity_kwh_per_unit_high is not None
            else None
        )

        low = None
        high = None
        if intensity_low is not None or kwh_low is not None:
            low = (
                quantity
                * (intensity_low if intensity_low is not None else float(intensity))
                * (kwh_low if kwh_low is not None else kwh)
            )
        if intensity_high is not None or kwh_high is not None:
            high = (
                quantity
                * (intensity_high if intensity_high is not None else float(intensity))
                * (kwh_high if kwh_high is not None else kwh)
            )

        return EmissionDetails(mean=mean, low=low, high=high)

    return EmissionDetails(mean=None, low=None, high=None)


def _format_references(citation_keys: List[str]) -> List[str]:
    references = citations.references_for(citation_keys)
    return [citations.format_ieee(ref.numbered(idx)) for idx, ref in enumerate(references, start=1)]


def _write_reference_file(directory: Path, stem: str, references: List[str]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    text = "\n".join(references)
    if references:
        text += "\n"
    (directory / f"{stem}_refs.txt").write_text(text, encoding="utf-8")


def _schedule_variable_map(sched: ActivitySchedule) -> dict[str, float]:
    data = sched.model_dump(exclude_none=True)
    variables: dict[str, float] = {}
    for key, value in data.items():
        if isinstance(value, (int, float)):
            variables[key] = float(value)
    return variables


def _operation_variable_map(
    operation: Operation,
    provided: Mapping[str, Mapping[str, Any]] | None,
) -> tuple[dict[str, float], list[str]]:
    source: Mapping[str, Any] | None = None
    if provided and operation.operation_id in provided:
        candidate = provided[operation.operation_id]
        if isinstance(candidate, Mapping):
            source = candidate

    variables: dict[str, float] = {}
    if source:
        for key, value in source.items():
            try:
                variables[str(key)] = float(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):  # pragma: no cover - defensive
                continue

    notes: list[str] = []
    if "litres_delivered" not in variables:
        cases_value = variables.get("cases_delivered")
        if cases_value is not None:
            litres = float(cases_value) * _CASE_TO_LITRE_MULTIPLIER
            variables["litres_delivered"] = litres
            notes.append(_CASE_TO_LITRE_NOTE)

    throughput_value = getattr(operation, "throughput_value", None)
    if throughput_value is not None:
        try:
            value = float(throughput_value)
        except (TypeError, ValueError):  # pragma: no cover - defensive
            value = None
        if value is not None:
            variables.setdefault("throughput_value", value)

            unit = (operation.throughput_unit or "").strip().lower()
            if unit in {"kg", "kilogram", "kilograms"}:
                variables.setdefault("waste_mass_kg", value)
                variables.setdefault("mass_kg", value)
            elif unit in {"m3", "m^3", "cubic metre", "cubic meter"}:
                variables.setdefault("volume_m3", value)
                variables.setdefault("volume_cubic_metres", value)
            elif unit in {"l", "litre", "liter", "litres", "liters"}:
                variables.setdefault("volume_l", value)

    return variables, notes


def _activity_unit_value_from_mapping(
    variables: Mapping[str, Any],
    activity: Activity | None,
    ef: EmissionFactor | None,
) -> Optional[float]:
    candidates: list[str] = []
    if ef and ef.unit:
        candidates.extend(_UNIT_VARIABLE_HINTS.get(str(ef.unit).lower(), ()))
    if activity and activity.default_unit:
        candidates.extend(_UNIT_VARIABLE_HINTS.get(activity.default_unit.lower(), ()))

    ordered: list[str] = []
    seen: set[str] = set()
    for name in candidates:
        if name in seen:
            continue
        seen.add(name)
        ordered.append(name)

    for fallback in ("distance_km", "route_km", "hours"):
        if fallback not in seen:
            ordered.append(fallback)
            seen.add(fallback)

    for name in ordered:
        value = variables.get(name)
        if value is None:
            continue
        try:
            return float(value)
        except (TypeError, ValueError):  # pragma: no cover - defensive
            continue
    return None


def _activity_unit_value(
    sched: ActivitySchedule,
    activity: Activity | None,
    ef: EmissionFactor,
) -> Optional[float]:
    variables = _schedule_variable_map(sched)
    return _activity_unit_value_from_mapping(variables, activity, ef)


def _dedupe_preserve_order(values: Iterable[str | None]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not value:
            continue
        text = str(value)
        if text in seen:
            continue
        seen.add(text)
        ordered.append(text)
    return ordered


def build_intensity_matrix(
    profile_id: str | None = None,
    fu_id: str | None = None,
    *,
    ds: DataStore | None = None,
    output_dir: Path | None = None,
    emission_factors: Sequence[EmissionFactor] | None = None,
    activity_fu_map: Sequence[ActivityFunctionalUnitMap] | None = None,
    functional_units: Sequence[FunctionalUnit] | None = None,
    profiles: Sequence[Profile] | None = None,
    activity_schedule: Sequence[ActivitySchedule] | None = None,
    operations: Sequence[Operation] | None = None,
    operation_variables: Mapping[str, Mapping[str, Any]] | None = None,
    activities: Sequence[Activity] | None = None,
    grid_lookup: Mapping[str | RegionCode, float | None] | None = None,
    grid_by_region: Mapping[str | RegionCode, GridIntensity] | None = None,
) -> pd.DataFrame:
    datastore = ds or choose_backend()

    activities_seq = (
        list(activities) if activities is not None else list(datastore.load_activities())
    )
    activities_by_id = {activity.activity_id: activity for activity in activities_seq}

    functional_units_seq = (
        list(functional_units) if functional_units is not None else list(load_functional_units())
    )
    functional_units_by_id = {fu.functional_unit_id: fu for fu in functional_units_seq}

    emission_factors_seq = (
        list(emission_factors)
        if emission_factors is not None
        else list(datastore.load_emission_factors())
    )
    ef_by_activity: dict[str, EmissionFactor] = {}
    for ef in emission_factors_seq:
        if ef.activity_id not in ef_by_activity:
            ef_by_activity[ef.activity_id] = ef

    profiles_seq = list(profiles) if profiles is not None else list(datastore.load_profiles())
    profiles_by_id = {profile.profile_id: profile for profile in profiles_seq}

    schedules_seq = (
        list(activity_schedule)
        if activity_schedule is not None
        else list(datastore.load_activity_schedule())
    )

    if operations is not None:
        operations_seq = list(operations)
    else:
        loader = getattr(datastore, "load_operations", None)
        if callable(loader):
            operations_seq = list(loader())
        else:
            operations_seq = []
    operations_by_activity: dict[str, list[Operation]] = defaultdict(list)
    for op in operations_seq:
        operations_by_activity[op.activity_id].append(op)

    operation_variable_map = operation_variables or {}

    activity_fu_seq = (
        list(activity_fu_map)
        if activity_fu_map is not None
        else list(
            load_activity_fu_map(
                activities=activities_seq,
                functional_units=functional_units_seq,
            )
        )
    )

    if grid_lookup is None or grid_by_region is None:
        lookup: dict[str | RegionCode, float | None] = {}
        by_region: dict[str | RegionCode, GridIntensity] = {}
        for grid in datastore.load_grid_intensity():
            lookup[grid.region] = grid.intensity_g_per_kwh
            by_region[grid.region] = grid
            if hasattr(grid.region, "value"):
                lookup[grid.region.value] = grid.intensity_g_per_kwh
                by_region[grid.region.value] = grid
        grid_lookup = lookup if grid_lookup is None else grid_lookup
        grid_by_region = by_region if grid_by_region is None else grid_by_region

    schedules_by_activity: dict[str, list[ActivitySchedule]] = defaultdict(list)
    for sched in schedules_seq:
        if profile_id and sched.profile_id != profile_id:
            continue
        schedules_by_activity[sched.activity_id].append(sched)

    rows: list[dict[str, Any]] = []
    reference_order: list[str] = []

    for mapping in activity_fu_seq:
        if fu_id and mapping.functional_unit_id != fu_id:
            continue

        schedule_list = schedules_by_activity.get(mapping.activity_id, [])
        operation_list = operations_by_activity.get(mapping.activity_id, [])
        if not schedule_list and not operation_list:
            continue

        ef = ef_by_activity.get(mapping.activity_id)
        activity = activities_by_id.get(mapping.activity_id)
        functional_unit = functional_units_by_id.get(mapping.functional_unit_id)

        if schedule_list and ef is not None:
            for sched in schedule_list:
                profile = profiles_by_id.get(sched.profile_id)
                if profile is None:
                    continue

                variables = _schedule_variable_map(sched)
                fu_value = evaluate_functional_unit_formula(mapping.conversion_formula, variables)
                if fu_value is None or not math.isfinite(fu_value) or fu_value <= 0:
                    continue

                activity_units = _activity_unit_value(sched, activity, ef)
                if (
                    activity_units is None
                    or not math.isfinite(activity_units)
                    or activity_units <= 0
                ):
                    continue

                units_per_fu = activity_units / fu_value
                if not math.isfinite(units_per_fu) or units_per_fu <= 0:
                    continue

                intensity_mean: float | None = None
                intensity_low: float | None = None
                intensity_high: float | None = None
                region_value: str | None = None
                grid_row: GridIntensity | None = None

                if ef.value_g_per_unit is not None:
                    factor = float(ef.value_g_per_unit)
                    intensity_mean = factor * units_per_fu
                    if ef.uncert_low_g_per_unit is not None:
                        intensity_low = float(ef.uncert_low_g_per_unit) * units_per_fu
                    if ef.uncert_high_g_per_unit is not None:
                        intensity_high = float(ef.uncert_high_g_per_unit) * units_per_fu
                    if ef.region is not None:
                        region_value = (
                            ef.region.value if hasattr(ef.region, "value") else str(ef.region)
                        )
                elif ef.is_grid_indexed:
                    if grid_by_region:
                        grid_row = _resolve_grid_row(sched, profile, grid_by_region)
                    grid_intensity = None
                    grid_low = None
                    grid_high = None
                    if grid_row:
                        region_value = (
                            grid_row.region.value
                            if hasattr(grid_row.region, "value")
                            else str(grid_row.region)
                        )
                        if grid_row.intensity_g_per_kwh is not None:
                            grid_intensity = float(grid_row.intensity_g_per_kwh)
                        if grid_row.intensity_low_g_per_kwh is not None:
                            grid_low = float(grid_row.intensity_low_g_per_kwh)
                        if grid_row.intensity_high_g_per_kwh is not None:
                            grid_high = float(grid_row.intensity_high_g_per_kwh)

                    if grid_intensity is None and grid_lookup is not None:
                        grid_intensity = get_grid_intensity(
                            profile,
                            grid_lookup,
                            sched.region_override,
                            sched.mix_region,
                            sched.use_canada_average,
                        )

                    kwh_per_unit = ef.electricity_kwh_per_unit
                    if grid_intensity is None or kwh_per_unit is None:
                        continue

                    kwh_per_fu = float(kwh_per_unit) * units_per_fu
                    intensity_mean = float(grid_intensity) * kwh_per_fu

                    if grid_low is not None or ef.electricity_kwh_per_unit_low is not None:
                        grid_low_val = grid_low if grid_low is not None else float(grid_intensity)
                        kwh_low_val = (
                            float(ef.electricity_kwh_per_unit_low) * units_per_fu
                            if ef.electricity_kwh_per_unit_low is not None
                            else kwh_per_fu
                        )
                        intensity_low = grid_low_val * kwh_low_val

                    if grid_high is not None or ef.electricity_kwh_per_unit_high is not None:
                        grid_high_val = (
                            grid_high if grid_high is not None else float(grid_intensity)
                        )
                        kwh_high_val = (
                            float(ef.electricity_kwh_per_unit_high) * units_per_fu
                            if ef.electricity_kwh_per_unit_high is not None
                            else kwh_per_fu
                        )
                        intensity_high = grid_high_val * kwh_high_val
                else:
                    continue

                if intensity_mean is None or not math.isfinite(intensity_mean):
                    continue

                weekly_frequency = _weekly_quantity(sched, profile) if profile else None
                daily_frequency = (
                    (float(weekly_frequency) / 7.0) if weekly_frequency is not None else None
                )
                annual_fu = (
                    fu_value * daily_frequency * 365 if daily_frequency is not None else None
                )
                annual_kg = (annual_fu * intensity_mean / 1000) if annual_fu is not None else None

                source_candidates = []
                if ef.source_id:
                    source_candidates.append(str(ef.source_id))
                if grid_row and grid_row.source_id:
                    source_candidates.append(str(grid_row.source_id))
                source_ids = _dedupe_preserve_order(source_candidates)

                row_context = {"emission_factor": ef}
                if grid_row:
                    row_context["grid_intensity"] = grid_row
                citation_keys = collect_activity_source_keys([row_context])

                if citation_keys:
                    ordered_keys: list[str] = []
                    for key in source_ids:
                        if key in citation_keys and key not in ordered_keys:
                            ordered_keys.append(key)
                    for key in sorted(citation_keys):
                        if key not in ordered_keys:
                            ordered_keys.append(key)
                else:
                    ordered_keys = list(source_ids)

                for key in ordered_keys:
                    if key not in reference_order:
                        reference_order.append(key)

                rows.append(
                    {
                        "alt_id": sched.profile_id,
                        "alternative": sched.profile_id,
                        "record_type": "alternative",
                        "activity_id": mapping.activity_id,
                        "activity_name": activity.name if activity else None,
                        "functional_unit_id": mapping.functional_unit_id,
                        "fu_name": functional_unit.name if functional_unit else None,
                        "intensity_g_per_fu": intensity_mean,
                        "intensity_low_g_per_fu": intensity_low,
                        "intensity_high_g_per_fu": intensity_high,
                        "annual_fu": annual_fu,
                        "annual_kg": annual_kg,
                        "method_notes": None,
                        "scope_boundary": ef.scope_boundary,
                        "region": region_value,
                        "source_ids_csv": ",".join(source_ids),
                    }
                )

        if not operation_list:
            continue

        for operation in operation_list:
            if (
                operation.functional_unit_id
                and operation.functional_unit_id != mapping.functional_unit_id
            ):
                continue
            if fu_id and operation.functional_unit_id and operation.functional_unit_id != fu_id:
                continue

            variables, assumption_notes = _operation_variable_map(operation, operation_variable_map)
            fu_value = evaluate_functional_unit_formula(mapping.conversion_formula, variables)

            intensity_mean = None
            intensity_low = None
            intensity_high = None
            region_value = None

            activity_units = None
            if variables:
                activity_units = _activity_unit_value_from_mapping(variables, activity, ef)

            if (
                ef is not None
                and fu_value is not None
                and activity_units is not None
                and math.isfinite(fu_value)
                and math.isfinite(activity_units)
                and fu_value > 0
                and activity_units > 0
            ):
                units_per_fu = activity_units / fu_value
                if math.isfinite(units_per_fu) and units_per_fu > 0:
                    if ef.value_g_per_unit is not None:
                        factor = float(ef.value_g_per_unit)
                        intensity_mean = factor * units_per_fu
                        if ef.uncert_low_g_per_unit is not None:
                            intensity_low = float(ef.uncert_low_g_per_unit) * units_per_fu
                        if ef.uncert_high_g_per_unit is not None:
                            intensity_high = float(ef.uncert_high_g_per_unit) * units_per_fu
                        if ef.region is not None:
                            region_value = (
                                ef.region.value if hasattr(ef.region, "value") else str(ef.region)
                            )

            source_candidates = []
            if ef and ef.source_id:
                source_candidates.append(str(ef.source_id))
            source_ids = _dedupe_preserve_order(source_candidates)

            if ef:
                citation_keys = collect_activity_source_keys([{"emission_factor": ef}])
            else:
                citation_keys = []

            if citation_keys:
                ordered_keys = []
                for key in source_ids:
                    if key in citation_keys and key not in ordered_keys:
                        ordered_keys.append(key)
                for key in sorted(citation_keys):
                    if key not in ordered_keys:
                        ordered_keys.append(key)
            else:
                ordered_keys = list(source_ids)

            for key in ordered_keys:
                if key not in reference_order:
                    reference_order.append(key)

            notes_value = " ".join(assumption_notes) if assumption_notes else None

            rows.append(
                {
                    "alt_id": operation.operation_id,
                    "alternative": operation.operation_id,
                    "record_type": "operation",
                    "activity_id": mapping.activity_id,
                    "activity_name": activity.name if activity else None,
                    "functional_unit_id": mapping.functional_unit_id,
                    "fu_name": functional_unit.name if functional_unit else None,
                    "intensity_g_per_fu": intensity_mean,
                    "intensity_low_g_per_fu": intensity_low,
                    "intensity_high_g_per_fu": intensity_high,
                    "annual_fu": None,
                    "annual_kg": None,
                    "method_notes": notes_value,
                    "scope_boundary": ef.scope_boundary if ef else None,
                    "region": region_value,
                    "source_ids_csv": ",".join(source_ids),
                }
            )

    df = pd.DataFrame(rows, columns=INTENSITY_COLUMNS)
    if not df.empty:
        df = df.sort_values(
            ["functional_unit_id", "alt_id", "activity_id"],
            na_position="last",
        ).reset_index(drop=True)

    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        csv_path = output_dir / "intensity_matrix.csv"
        df.to_csv(csv_path, index=False, na_rep="")

        references = _format_references(reference_order)
        reference_dir = output_dir / "references"
        _write_reference_file(reference_dir, "intensity", references)

    return df


def _resolve_grid_row(
    sched: ActivitySchedule,
    profile: Profile | None,
    grid_by_region: Mapping[str | RegionCode, GridIntensity],
) -> Optional[GridIntensity]:
    if sched.region_override is not None:
        region_key = sched.region_override
    elif sched.mix_region is not None:
        region_key = sched.mix_region
    elif sched.use_canada_average:
        region_key = RegionCode.CA
    elif profile and profile.default_grid_region is not None:
        region_key = profile.default_grid_region
    else:
        region_key = None

    if region_key is None:
        return None

    grid = grid_by_region.get(region_key)
    if grid is None and hasattr(region_key, "value"):
        grid = grid_by_region.get(region_key.value)
    if grid is None and isinstance(region_key, RegionCode):
        grid = grid_by_region.get(region_key.value)
    return grid


def export_view(
    ds: Optional[DataStore] = None,
    output_root: Path | str | None = None,
) -> pd.DataFrame:
    datastore = ds or choose_backend()
    activities = {activity.activity_id: activity for activity in datastore.load_activities()}
    if not activities:
        try:
            activities = {activity.activity_id: activity for activity in schema_load_activities()}
        except Exception:  # pragma: no cover - defensive fallback
            activities = {}
    load_operations_fn = getattr(datastore, "load_operations", None)
    operations_iter = load_operations_fn() if callable(load_operations_fn) else []
    operations = {operation.operation_id: operation for operation in operations_iter}
    if not operations:
        try:
            operations = {op.operation_id: op for op in schema_load_operations()}
        except Exception:  # pragma: no cover - defensive fallback
            operations = {}
    load_entities_fn = getattr(datastore, "load_entities", None)
    entity_iter = list(load_entities_fn()) if callable(load_entities_fn) else []
    if not entity_iter:
        try:
            entity_iter = list(schema_load_entities())
        except Exception:  # pragma: no cover - defensive fallback
            entity_iter = []
    entities = {entity.entity_id: entity for entity in entity_iter if entity.entity_id}

    load_sites_fn = getattr(datastore, "load_sites", None)
    site_iter = list(load_sites_fn()) if callable(load_sites_fn) else []
    if not site_iter:
        try:
            site_iter = list(schema_load_sites(entities=entity_iter or None))
        except Exception:  # pragma: no cover - defensive fallback
            site_iter = []
    sites = {site.site_id: site for site in site_iter if site.site_id}

    load_assets_fn = getattr(datastore, "load_assets", None)
    asset_iter = list(load_assets_fn()) if callable(load_assets_fn) else []
    if not asset_iter:
        try:
            asset_iter = list(
                schema_load_assets(sites=site_iter or None, entities=entity_iter or None)
            )
        except Exception:  # pragma: no cover - defensive fallback
            asset_iter = []
    assets = {asset.asset_id: asset for asset in asset_iter if asset.asset_id}
    efs = {ef.activity_id: ef for ef in datastore.load_emission_factors()}
    profiles = {p.profile_id: p for p in datastore.load_profiles()}
    load_feedback_loops_fn = getattr(datastore, "load_feedback_loops", None)
    feedback_loops = (
        list(load_feedback_loops_fn()) if callable(load_feedback_loops_fn) else []
    )
    if not feedback_loops:
        try:
            feedback_loops = list(
                schema_load_feedback_loops(activities=list(activities.values()))
            )
        except Exception:  # pragma: no cover - defensive fallback
            feedback_loops = []
    if activities:
        try:
            functional_units = list(load_functional_units())
            activity_fu_mappings = list(
                load_activity_fu_map(
                    activities=list(activities.values()),
                    functional_units=functional_units,
                )
            )
        except ValueError:
            functional_units = []
            activity_fu_mappings = []
    else:
        functional_units = []
        activity_fu_mappings = []
    functional_units_by_id = {
        fu.functional_unit_id: fu
        for fu in functional_units
        if getattr(fu, "functional_unit_id", None)
    }
    grid_lookup: Dict[str | RegionCode, Optional[float]] = {}
    grid_by_region: Dict[str | RegionCode, GridIntensity] = {}
    for gi in datastore.load_grid_intensity():
        grid_lookup[gi.region] = gi.intensity_g_per_kwh
        grid_by_region[gi.region] = gi
        if hasattr(gi.region, "value"):
            grid_lookup[gi.region.value] = gi.intensity_g_per_kwh
            grid_by_region[gi.region.value] = gi

    dependency_loader = getattr(datastore, "load_activity_dependencies", None)
    dependency_records = list(dependency_loader()) if callable(dependency_loader) else []
    if not dependency_records:
        try:
            dependency_records = load_activity_dependencies(
                activities=list(activities.values()) or None,
                operations=list(operations.values()) or None,
            )
        except Exception:  # pragma: no cover - defensive fallback
            dependency_records = []
    dependency_map: dict[str, list[dict[str, Any]]] = {}
    for dependency in dependency_records:
        child_id = dependency.child_activity_id
        if child_id not in activities:
            raise ValueError(f"Unknown child_activity_id referenced by dependencies: {child_id}")
        parent = operations.get(dependency.parent_operation_id)
        if parent is None:
            raise ValueError(
                "Unknown parent_operation_id referenced by dependencies: "
                f"{dependency.parent_operation_id}"
            )
        entry = {
            "operation_id": parent.operation_id,
            "share": float(dependency.share),
        }
        if dependency.notes:
            entry["notes"] = dependency.notes
        if parent.activity_id:
            entry["operation_activity_id"] = parent.activity_id
        if parent.asset_id:
            entry["operation_asset_id"] = parent.asset_id
        if parent.functional_unit_id:
            entry["operation_functional_unit_id"] = parent.functional_unit_id
        metadata = dependency_metadata(
            parent,
            activities=activities,
            assets=assets,
            sites=sites,
            entities=entities,
            functional_units=functional_units_by_id,
        )
        if metadata:
            entry.update(metadata)
        dependency_map.setdefault(child_id, []).append(entry)

    for child_id, entries in dependency_map.items():
        total_share = sum(entry.get("share", 0.0) for entry in entries)
        if total_share > 1.0000001:
            raise ValueError(
                f"Dependency shares for {child_id} exceed 1.0 (received {total_share:.6f})"
            )

    def _clone_chain(activity_id: str) -> list[dict[str, Any]]:
        chain = dependency_map.get(activity_id)
        if not chain:
            return []
        return [dict(entry) for entry in chain]

    civilian_layers = {LayerId.PROFESSIONAL.value, LayerId.ONLINE.value}
    bubble_upstream_lookup: dict[tuple[str | None, str], list[dict[str, Any]]] = {}

    rows: List[dict] = []
    derived_rows: List[dict] = []
    resolved_profile_ids: set[str] = set()
    manifest_regions: set[str] = set()
    manifest_layers: set[str] = set()
    manifest_ef_vintages: set[int] = set()
    manifest_grid_vintages: set[int] = set()
    manifest_vintage_matrix: dict[str, int] = {}

    schedules = datastore.load_activity_schedule()
    for sched in schedules:
        profile = profiles.get(sched.profile_id)
        ef = efs.get(sched.activity_id)
        activity = activities.get(sched.activity_id)

        grid_row: Optional[GridIntensity] = None
        details = EmissionDetails(mean=None, low=None, high=None)
        emission = None
        layer_id = _resolve_layer_id(sched, profile, activity)
        if layer_id:
            manifest_layers.add(layer_id)

        if profile and ef:
            if ef.vintage_year is not None:
                manifest_ef_vintages.add(int(ef.vintage_year))
            if ef.is_grid_indexed:
                grid_row = _resolve_grid_row(sched, profile, grid_by_region)
                if grid_row is not None:
                    region_value = (
                        grid_row.region.value
                        if hasattr(grid_row.region, "value")
                        else grid_row.region
                    )
                    if region_value is not None:
                        region_key = str(region_value)
                        manifest_regions.add(region_key)
                        if grid_row.vintage_year is not None:
                            year = int(grid_row.vintage_year)
                            manifest_grid_vintages.add(year)
                            existing_year = manifest_vintage_matrix.get(region_key)
                            if existing_year is None or year > existing_year:
                                manifest_vintage_matrix[region_key] = year
                    elif grid_row.vintage_year is not None:
                        manifest_grid_vintages.add(int(grid_row.vintage_year))
            details = compute_emission_details(sched, profile, ef, grid_lookup, grid_row)
            emission = details.mean

        upstream_chain: list[dict[str, Any]] | None = None
        if layer_id and layer_id in civilian_layers:
            upstream_chain = _clone_chain(sched.activity_id)
            bubble_upstream_lookup[(layer_id, sched.activity_id)] = [
                dict(entry) for entry in upstream_chain
            ]

        rows.append(
            {
                "profile_id": sched.profile_id,
                "activity_id": sched.activity_id,
                "layer_id": layer_id,
                "activity_name": activity.name if isinstance(activity, Activity) else None,
                "activity_category": activity.category if isinstance(activity, Activity) else None,
                "scope_boundary": ef.scope_boundary if isinstance(ef, EmissionFactor) else None,
                "emission_factor_vintage_year": (
                    int(ef.vintage_year)
                    if isinstance(ef, EmissionFactor) and ef.vintage_year is not None
                    else None
                ),
                "grid_region": (
                    grid_row.region.value
                    if grid_row and hasattr(grid_row.region, "value")
                    else (grid_row.region if grid_row else None)
                ),
                "grid_vintage_year": (
                    int(grid_row.vintage_year)
                    if grid_row and grid_row.vintage_year is not None
                    else None
                ),
                "annual_emissions_g": emission,
                "annual_emissions_g_low": details.low,
                "annual_emissions_g_high": details.high,
                "upstream_chain": upstream_chain,
            }
        )

        if sched.profile_id:
            resolved_profile_ids.add(sched.profile_id)

        derived_rows.append(
            {
                "profile": profile,
                "schedule": sched,
                "activity_id": sched.activity_id,
                "activity_category": activity.category if isinstance(activity, Activity) else None,
                "emission_factor": ef,
                "grid_intensity": grid_row,
                "annual_emissions_g": emission,
                "layer_id": layer_id,
                "upstream_chain": upstream_chain,
            }
        )

    sorted_rows = _sort_export_rows(rows)
    normalised_rows = [_normalise_mapping(row) for row in sorted_rows]
    df = pd.DataFrame(normalised_rows, columns=EXPORT_COLUMNS)

    citation_keys = sorted(collect_activity_source_keys(derived_rows))
    loop_citation_keys = sorted({loop.source_id for loop in feedback_loops if loop.source_id})
    for key in loop_citation_keys:
        if key and key not in citation_keys:
            citation_keys.append(key)
    resolved_profiles = sorted(resolved_profile_ids)
    profile_arg = resolved_profiles if resolved_profiles else None
    generated_at = _resolve_generated_at()
    sorted_layers = sorted(manifest_layers)

    layer_key_sets: dict[str, set[str]] = {}
    for loop in feedback_loops:
        if not loop.source_id:
            continue
        trigger_activity = activities.get(loop.trigger_activity_id)
        response_activity = activities.get(loop.response_activity_id)
        for activity in (trigger_activity, response_activity):
            layer_value = None
            if activity is not None:
                layer_value = getattr(activity.layer_id, "value", activity.layer_id)
            if layer_value:
                layer_key_sets.setdefault(str(layer_value), set()).add(loop.source_id)
    for row in derived_rows:
        layer = row.get("layer_id") if isinstance(row, dict) else getattr(row, "layer_id", None)
        if not layer:
            continue
        keys = collect_activity_source_keys([row])
        if not keys:
            continue
        layer_key_sets.setdefault(str(layer), set()).update(keys)

    layer_citation_keys: dict[str, List[str]] = {}
    for layer in sorted_layers:
        key_set = layer_key_sets.get(layer, set())
        ordered = [key for key in citation_keys if key in key_set]
        remaining = sorted(key_set.difference(ordered))
        layer_citation_keys[layer] = ordered + remaining

    layer_references: dict[str, List[str]] = {
        layer: _format_references(layer_citation_keys.get(layer, [])) for layer in sorted_layers
    }

    reference_index_lookup = {key: idx for idx, key in enumerate(citation_keys, start=1)}

    stacked_groups: dict[tuple[str | None, str], set[str]] = defaultdict(set)
    bubble_groups: dict[tuple[str | None, str], set[str]] = defaultdict(set)
    sankey_groups: dict[tuple[str | None, str, str], set[str]] = defaultdict(set)

    for row in derived_rows:
        keys = collect_activity_source_keys([row])
        if not keys:
            continue
        layer_value = row.get("layer_id")
        layer_key = str(layer_value) if layer_value is not None else None
        activity_key = row.get("activity_id")
        activity_id = str(activity_key) if activity_key is not None else None
        category_raw = row.get("activity_category")
        category_key = _normalise_category_label(category_raw)

        if category_key:
            stacked_groups[(layer_key, category_key)].update(keys)
        if activity_id:
            bubble_groups[(layer_key, activity_id)].update(keys)
            if category_key:
                sankey_groups[(layer_key, category_key, activity_id)].update(keys)

    def _ordered_keys(values: set[str]) -> list[str]:
        if not values:
            return []
        ordered = [key for key in citation_keys if key in values]
        remaining = [key for key in sorted(values) if key not in ordered]
        return ordered + remaining

    def _ordered_indices(keys: list[str]) -> list[int]:
        indices: list[int] = []
        for key in keys:
            index = reference_index_lookup.get(key)
            if index is not None:
                indices.append(index)
        return indices

    stacked_reference_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for group_key, values in stacked_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            stacked_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    bubble_reference_map: dict[tuple[str | None, str], tuple[list[str], list[int]]] = {}
    for group_key, values in bubble_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            bubble_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    sankey_reference_map: dict[tuple[str | None, str, str], tuple[list[str], list[int]]] = {}
    for group_key, values in sankey_groups.items():
        ordered_keys = _ordered_keys(values)
        if ordered_keys:
            sankey_reference_map[group_key] = (ordered_keys, _ordered_indices(ordered_keys))

    metadata = figures.build_metadata(
        "export_view",
        profile_ids=profile_arg,
        generated_at=generated_at,
    )
    metadata["citation_keys"] = citation_keys
    metadata["layers"] = sorted_layers
    if layer_citation_keys:
        metadata["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        metadata["layer_references"] = layer_references
    references = _format_references(citation_keys)
    metadata["references"] = references

    csv_metadata = {k: v for k, v in metadata.items() if k not in {"references", "data"}}
    csv_order = [
        "generated_at",
        "profile",
        "method",
        "profile_resolution",
        "citation_keys",
        "layers",
    ]
    ordered_keys = [key for key in csv_order if key in csv_metadata]
    remaining_keys = [key for key in csv_metadata if key not in csv_order]

    manifest_payload = {
        "generated_at": generated_at,
        "regions": sorted(manifest_regions),
        "vintages": {
            "emission_factors": sorted(manifest_ef_vintages),
            "grid_intensity": sorted(manifest_grid_vintages),
        },
        "vintage_matrix": {
            key: manifest_vintage_matrix[key] for key in sorted(manifest_vintage_matrix)
        },
        "sources": citation_keys,
        "layers": sorted_layers,
    }
    if layer_citation_keys:
        manifest_payload["layer_citation_keys"] = layer_citation_keys
    if layer_references:
        manifest_payload["layer_references"] = layer_references

    build_hash = _compute_build_hash(manifest_payload, normalised_rows)
    base_output_root = _resolve_output_root(output_root, REPO_ROOT)
    output_root_path = _apply_build_hash(base_output_root, REPO_ROOT, build_hash)

    out_dir = Path(output_root_path) / "calc" / "outputs"
    _prepare_output_dir(out_dir)
    figure_dir = out_dir / "figures"
    reference_dir = out_dir / "references"
    _prepare_output_dir(figure_dir)
    _prepare_output_dir(reference_dir)

    _write_reference_file(reference_dir, "export_view", references)

    build_intensity_matrix(
        ds=datastore,
        output_dir=out_dir,
        emission_factors=list(efs.values()),
        activity_fu_map=activity_fu_mappings,
        functional_units=functional_units,
        profiles=list(profiles.values()),
        activity_schedule=schedules,
        activities=list(activities.values()),
        grid_lookup=grid_lookup,
        grid_by_region=grid_by_region,
    )

    export_csv_path = out_dir / "export_view.csv"
    with export_csv_path.open("w", encoding="utf-8") as fh:
        for key in ordered_keys + sorted(remaining_keys):
            value_payload = _normalise_value(csv_metadata[key])
            if isinstance(value_payload, (dict, list)):
                value_str = repr(value_payload)
            else:
                value_str = "" if value_payload is None else str(value_payload)
            fh.write(f"# {key}: {value_str}\n")
        df.to_csv(fh, index=False)

    records = [{column: row.get(column) for column in EXPORT_COLUMNS} for row in normalised_rows]
    payload = dict(metadata)
    payload["data"] = records
    _write_json(out_dir / "export_view.json", payload)

    dependency_payload = {
        activity_id: [dict(entry) for entry in entries]
        for activity_id, entries in sorted(dependency_map.items())
    }
    if dependency_payload:
        _write_json(out_dir / "dependency_map.json", dependency_payload)

    def _with_layer_id(payload: Mapping[str, Any]) -> dict[str, Any]:
        """Return ``payload`` with a normalised ``layer_id`` field."""

        value = payload.get("layer_id") if isinstance(payload, Mapping) else None
        if isinstance(value, LayerId):
            layer_value: str | None = value.value
        elif isinstance(value, str):
            layer_value = value
        else:
            layer_value = None
        if payload.get("layer_id") == layer_value:
            return dict(payload)
        normalised = dict(payload)
        normalised["layer_id"] = layer_value
        return normalised

    stacked = [
        _with_layer_id(entry)
        for entry in figures.slice_stacked(df, reference_map=stacked_reference_map)
    ]
    bubble_points = [
        _with_layer_id(asdict(point))
        for point in figures.slice_bubble(df, reference_map=bubble_reference_map)
    ]
    for point in bubble_points:
        layer_value = point.get("layer_id")
        activity_value = point.get("activity_id")
        key = (layer_value, activity_value)
        chain = bubble_upstream_lookup.get(key)
        if chain is not None and layer_value in civilian_layers:
            point["upstream_chain"] = [dict(entry) for entry in chain]
    sankey = figures.slice_sankey(df, reference_map=sankey_reference_map)
    if isinstance(sankey, Mapping):
        links = sankey.get("links")
        if isinstance(links, list):
            sankey = dict(sankey)
            sankey["links"] = [_with_layer_id(link) for link in links if isinstance(link, Mapping)]
    feedback_graph = figures.slice_feedback(feedback_loops, activities, df)
    if isinstance(feedback_graph, Mapping):
        feedback_graph = dict(feedback_graph)
        feedback_nodes = feedback_graph.get("nodes")
        if isinstance(feedback_nodes, list):
            feedback_graph["nodes"] = [
                _with_layer_id(node) for node in feedback_nodes if isinstance(node, Mapping)
            ]
        feedback_links = feedback_graph.get("links")
        if isinstance(feedback_links, list):
            feedback_graph["links"] = [
                _with_layer_id(link) for link in feedback_links if isinstance(link, Mapping)
            ]

    def _write_figure(name: str, method: str, data: object) -> None:
        meta = figures.build_metadata(
            method,
            profile_ids=profile_arg,
            generated_at=generated_at,
        )
        meta["citation_keys"] = citation_keys
        meta["layers"] = sorted_layers
        if layer_citation_keys:
            meta["layer_citation_keys"] = layer_citation_keys
        if layer_references:
            meta["layer_references"] = layer_references
        meta["references"] = references
        meta["data"] = data
        trimmed_meta = figures.trim_figure_payload(meta)
        _write_json(figure_dir / f"{name}.json", trimmed_meta)
        _write_reference_file(reference_dir, name, references)

    _write_figure("stacked", "figures.stacked", stacked)
    _write_figure("bubble", "figures.bubble", bubble_points)
    _write_figure("sankey", "figures.sankey", sankey)
    _write_figure("feedback", "figures.feedback", feedback_graph)

    manifest = dict(manifest_payload)
    manifest["build_hash"] = build_hash
    _write_json(out_dir / "manifest.json", manifest)

    try:
        output_root_path.resolve().relative_to(ARTIFACT_ROOT.resolve())
    except ValueError:
        pass
    else:
        ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
        pointer_payload = {
            "build_hash": build_hash,
            "artifact_dir": str(output_root_path),
        }
        _write_json(ARTIFACT_ROOT / "latest-build.json", pointer_payload)

    return df


def _parse_export_args(argv: Sequence[str]) -> Any:
    import argparse

    parser = argparse.ArgumentParser(description="Generate ACX derived outputs")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help="Base directory for generated calc/outputs (defaults to the package directory)",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to the SQL database when using sqlite or duckdb backends",
    )
    parser.add_argument(
        "--backend",
        choices=("csv", "sqlite", "duckdb"),
        default=None,
        help="Override ACX_DATA_BACKEND for this invocation",
    )
    return parser.parse_args(argv)


def _parse_intensity_args(argv: Sequence[str]) -> Any:
    import argparse

    parser = argparse.ArgumentParser(description="Generate intensity matrix outputs")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ARTIFACT_ROOT,
        help="Directory to store intensity artifacts (defaults to dist/artifacts)",
    )
    parser.add_argument(
        "--fu",
        dest="functional_unit",
        default=None,
        help="Functional unit identifier to filter on; use 'all' for every unit",
    )
    parser.add_argument(
        "--profile",
        dest="profile_id",
        default=None,
        help="Profile identifier to filter on",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to the SQL database when using sqlite or duckdb backends",
    )
    parser.add_argument(
        "--backend",
        choices=("csv", "sqlite", "duckdb"),
        default=None,
        help="Override ACX_DATA_BACKEND for this invocation",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    argv = list(argv or [])
    command = "export"
    if argv and argv[0] in {"export", "intensity"}:
        command = str(argv.pop(0))

    if command == "export":
        args = _parse_export_args(argv)
        datastore = choose_backend(backend=args.backend, db_path=args.db)
        export_view(datastore, output_root=args.output_root)
        return

    if command == "intensity":
        args = _parse_intensity_args(argv)
        datastore = choose_backend(backend=args.backend, db_path=args.db)
        fu_option = args.functional_unit
        fu_id = None if fu_option is None or str(fu_option).lower() == "all" else fu_option
        build_intensity_matrix(
            profile_id=args.profile_id,
            fu_id=fu_id,
            ds=datastore,
            output_dir=args.output_dir,
        )
        return

    raise ValueError(f"Unsupported command: {command}")


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
_LAYER_PREFIXES: list[tuple[str, LayerId]] = [
    ("PRO.", LayerId.PROFESSIONAL),
    ("ONLINE.", LayerId.ONLINE),
    ("IND.TO.LIGHT.", LayerId.INDUSTRIAL_LIGHT),
    ("IND.TO.HEAVY.", LayerId.INDUSTRIAL_HEAVY),
    ("IND.MIL.", LayerId.INDUSTRIAL_HEAVY_MILITARY),
    ("IND.EMB.", LayerId.INDUSTRIAL_HEAVY_EMBODIED),
    ("DEF.BASE.", LayerId.BUILDINGS_DEFENSE),
    ("MODEL.CONFLICT.", LayerId.MODELED_EVENTS),
    ("CHEM.DEF.", LayerId.MATERIALS_CHEMICALS),
    ("SEC.PRIV.", LayerId.PERSONAL_SECURITY_LAYER),
]

_LAYER_NAME_HINTS: dict[str, LayerId] = {
    "professional": LayerId.PROFESSIONAL,
    "online": LayerId.ONLINE,
    "industrial_light": LayerId.INDUSTRIAL_LIGHT,
    "light_industrial": LayerId.INDUSTRIAL_LIGHT,
    "industrial_heavy": LayerId.INDUSTRIAL_HEAVY,
    "heavy_industrial": LayerId.INDUSTRIAL_HEAVY,
    "military_ops": LayerId.INDUSTRIAL_HEAVY_MILITARY,
    "military_operations": LayerId.INDUSTRIAL_HEAVY_MILITARY,
    "weapons_production": LayerId.INDUSTRIAL_HEAVY_EMBODIED,
    "bases_infrastructure": LayerId.BUILDINGS_DEFENSE,
    "conflict_scenarios": LayerId.MODELED_EVENTS,
    "modeled_events": LayerId.MODELED_EVENTS,
    "defense_supply_chain": LayerId.MATERIALS_CHEMICALS,
    "materials_chemicals": LayerId.MATERIALS_CHEMICALS,
    "private_security": LayerId.PERSONAL_SECURITY_LAYER,
    "personal_security_layer": LayerId.PERSONAL_SECURITY_LAYER,
}
