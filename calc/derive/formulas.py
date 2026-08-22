"""Functional-unit formula evaluation and unit-variable extraction kernels."""

from __future__ import annotations

import ast
import re
from decimal import Decimal
from typing import Any, Mapping, Optional

from ..schema import Activity, ActivitySchedule, EmissionFactor, Operation

__all__ = [
    "activity_unit_value",
    "activity_unit_value_from_mapping",
    "evaluate_functional_unit_formula",
    "operation_variable_map",
    "schedule_variable_map",
]

UNIT_VARIABLE_HINTS: dict[str, tuple[str, ...]] = {
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
    "prompt": ("prompts",),
    "site_day": ("site_days",),
    "mmbtu": ("mmbtu", "energy_mmbtu"),
    "tonne": ("tonnes", "mass_tonnes"),
    "1k_tokens": ("tokens", "token_k"),
    "gb": ("gb_transferred", "data_gb"),
    "gigabyte": ("gb_transferred", "data_gb"),
    "server_hour": ("server_hours", "it_server_hours"),
    "rack_month": ("rack_months", "rack_equivalent_months"),
    "hectare": ("hectares_burned", "area_hectares"),
    "event": ("events",),
}

_CASE_TO_LITRE_MULTIPLIER = 24.0 * 0.355
_CASE_TO_LITRE_NOTE = "Derived litres_delivered from cases_delivered using 24 × 0.355 L per case."

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


def schedule_variable_map(sched: ActivitySchedule) -> dict[str, float]:
    data = sched.model_dump(exclude_none=True)
    variables: dict[str, float] = {}
    for key, value in data.items():
        if isinstance(value, (int, float)):
            variables[key] = float(value)
    return variables


def operation_variable_map(
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


def activity_unit_value_from_mapping(
    variables: Mapping[str, Any],
    activity: Activity | None,
    ef: EmissionFactor | None,
) -> Optional[float]:
    candidates: list[str] = []
    if ef and ef.unit:
        candidates.extend(UNIT_VARIABLE_HINTS.get(str(ef.unit).lower(), ()))
    if activity and activity.default_unit:
        candidates.extend(UNIT_VARIABLE_HINTS.get(activity.default_unit.lower(), ()))

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


def activity_unit_value(
    sched: ActivitySchedule,
    activity: Activity | None,
    ef: EmissionFactor,
) -> Optional[float]:
    variables = schedule_variable_map(sched)
    return activity_unit_value_from_mapping(variables, activity, ef)
