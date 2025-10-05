from __future__ import annotations

from typing import Iterable, Mapping

__all__ = ["breakdown_for_activity"]

AGENCY_KEY_ORDER = ["sovereign", "corporate", "institutional", "individual"]

ENTITY_TYPE_TO_AGENCY = {
    "corporate": "corporate",
    "company": "corporate",
    "enterprise": "corporate",
    "municipal": "institutional",
    "ngo": "institutional",
    "nonprofit": "institutional",
    "university": "institutional",
    "college": "institutional",
    "cooperative": "institutional",
    "public": "institutional",
    "crown": "sovereign",
    "federal": "sovereign",
    "national": "sovereign",
    "provincial": "sovereign",
    "state": "sovereign",
    "territorial": "sovereign",
    "sovereign": "sovereign",
}

AGENCY_LABELS = {
    "corporate": "Corporate",
    "institutional": "Institutional",
    "sovereign": "Sovereign",
    "individual": "Individual",
}


def _coerce_share(value: object) -> float:
    try:
        share = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):  # pragma: no cover - defensive
        return 0.0
    if not (share > 0.0):
        return 0.0
    return share


def _normalise_text(value: object | None) -> str:
    if value in (None, ""):
        return ""
    return str(value).strip()


def _operation_label(entry: Mapping[str, object]) -> str:
    for key in (
        "operation_activity_label",
        "operation_activity_name",
        "operation_activity_id",
        "operation_id",
    ):
        label = _normalise_text(entry.get(key))
        if label:
            return label
    return "Operation"


def _entity_label(entry: Mapping[str, object]) -> str:
    for key in ("operation_entity_name", "operation_entity_id"):
        value = _normalise_text(entry.get(key))
        if value:
            return value
    return ""


def _normalise_entity_type(value: object | None) -> str:
    text = _normalise_text(value)
    return text.lower()


def _format_percentage(value: float) -> str:
    percent = value * 100
    if percent >= 99.5:
        return "100%"
    if percent >= 10:
        return f"{percent:.0f}%"
    if percent >= 1:
        text = f"{percent:.1f}"
        if text.endswith(".0"):
            text = text[:-2]
        return f"{text}%"
    if percent > 0:
        return "<1%"
    return "0%"


def _agency_rank(agency: str) -> int:
    try:
        return AGENCY_KEY_ORDER.index(agency)
    except ValueError:
        return len(AGENCY_KEY_ORDER)


def _build_tooltip_lines(entries: Iterable[Mapping[str, object]]) -> list[str]:
    items = []
    for entry in entries:
        share = _coerce_share(entry.get("share"))
        if share <= 0:
            continue
        percent = _format_percentage(share)
        label = _operation_label(entry)
        entity = _entity_label(entry)
        if entity:
            label = f"{label} — {entity}"
        items.append((share, f"{percent} — {label}"))
    items.sort(key=lambda item: item[0], reverse=True)
    return [text for _, text in items]


def breakdown_for_activity(
    activity_id: str | None,
    dependency_map: Mapping[str, Iterable[Mapping[str, object]]] | None,
) -> list[dict[str, object]]:
    if not activity_id or not isinstance(dependency_map, Mapping):
        return []

    entries = dependency_map.get(activity_id)
    if not isinstance(entries, Iterable):  # pragma: no cover - defensive
        return []

    groups: dict[str, dict[str, object]] = {}
    total_share = 0.0

    for entry in entries:
        if not isinstance(entry, Mapping):
            continue
        share = _coerce_share(entry.get("share"))
        if share <= 0:
            continue
        total_share += share
        entity_type = _normalise_entity_type(entry.get("operation_entity_type"))
        agency = ENTITY_TYPE_TO_AGENCY.get(entity_type, "institutional")
        bucket = groups.setdefault(agency, {"share": 0.0, "entries": []})
        bucket["share"] = float(bucket.get("share", 0.0)) + share
        bucket_entries = bucket.setdefault("entries", [])
        if isinstance(bucket_entries, list):
            bucket_entries.append(entry)

    if not groups:
        return []

    total_share = max(0.0, min(total_share, 1.0))
    individual_share = max(0.0, 1.0 - total_share)

    segments: list[dict[str, object]] = []
    for agency, payload in groups.items():
        share = float(payload.get("share", 0.0))
        if share <= 0:
            continue
        entries_for_tooltip = payload.get("entries")
        tooltip_lines: list[str] = []
        if isinstance(entries_for_tooltip, Iterable):
            tooltip_lines = _build_tooltip_lines(entries_for_tooltip)
        segments.append(
            {
                "agency": agency,
                "label": AGENCY_LABELS.get(agency, agency.title()),
                "share": share,
                "percent": _format_percentage(share),
                "tooltip_lines": tooltip_lines,
            }
        )

    if individual_share > 0.0005:
        segments.append(
            {
                "agency": "individual",
                "label": AGENCY_LABELS["individual"],
                "share": individual_share,
                "percent": _format_percentage(individual_share),
                "tooltip_lines": [],
            }
        )

    segments.sort(
        key=lambda item: (-float(item.get("share", 0.0)), _agency_rank(str(item.get("agency"))))
    )
    return segments
