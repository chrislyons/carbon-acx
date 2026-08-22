"""Layer resolution kernels: enum values, ID hints, and precedence rules."""

from __future__ import annotations

import re
from typing import Optional

from ..schema import Activity, ActivitySchedule, LayerId, Profile

__all__ = [
    "LAYER_NAME_HINTS",
    "LAYER_PREFIXES",
    "layer_value",
    "resolve_layer_hint",
    "resolve_layer_id",
]

LAYER_PREFIXES: list[tuple[str, LayerId]] = [
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

LAYER_NAME_HINTS: dict[str, LayerId] = {
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


def layer_value(value: LayerId | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, LayerId):
        return value.value
    return str(value)


def _normalise_layer_hint(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def resolve_layer_hint(value: object | None) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, LayerId):
        return value.value

    text = str(value).strip()
    if not text:
        return None

    upper = text.upper()
    for prefix, layer in LAYER_PREFIXES:
        if upper.startswith(prefix):
            return layer.value

    normalised = _normalise_layer_hint(text)
    hinted = LAYER_NAME_HINTS.get(normalised)
    if hinted is not None:
        return hinted.value

    return None


def resolve_layer_id(
    sched: ActivitySchedule | None,
    profile: Profile | None,
    activity: Activity | None,
) -> Optional[str]:
    for source in (sched, profile, activity):
        if source is None:
            continue
        layer = getattr(source, "layer_id", None)
        resolved = layer_value(layer)
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
        hinted = resolve_layer_hint(candidate)
        if hinted:
            return hinted

    return LayerId.PROFESSIONAL.value
