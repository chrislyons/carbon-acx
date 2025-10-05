from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def _load_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_numeric_rows_require_source_id() -> None:
    emission_factors = _load_csv("emission_factors.csv")
    numeric_fields = [
        "value_g_per_unit",
        "uncert_low_g_per_unit",
        "uncert_high_g_per_unit",
        "electricity_kwh_per_unit",
        "electricity_kwh_per_unit_low",
        "electricity_kwh_per_unit_high",
    ]

    offenders: list[str] = []
    for row in emission_factors:
        has_numeric = any(row[field].strip() for field in numeric_fields if field in row)
        if has_numeric and not row.get("source_id", "").strip():
            offenders.append(row.get("ef_id", "<unknown>"))

    assert (
        not offenders
    ), "Numeric emission factor rows must include a source_id. Missing for: " + ", ".join(
        sorted(offenders)
    )


def test_grid_indexed_rows_have_vintage_and_electricity() -> None:
    emission_factors = _load_csv("emission_factors.csv")

    offenders: list[str] = []
    for row in emission_factors:
        if row.get("is_grid_indexed", "").strip().lower() != "true":
            continue
        electricity = row.get("electricity_kwh_per_unit", "").strip()
        vintage = row.get("vintage_year", "").strip()
        if not electricity or not vintage:
            offenders.append(row.get("ef_id", "<unknown>"))

    assert not offenders, (
        "Grid-indexed rows require electricity_kwh_per_unit and vintage_year. Missing for: "
        + ", ".join(sorted(offenders))
    )


def test_category_scope_alignment() -> None:
    activities = {row["activity_id"]: row for row in _load_csv("activities.csv")}
    emission_factors = _load_csv("emission_factors.csv")

    transport_offenders: list[str] = []
    media_offenders: list[str] = []

    for row in emission_factors:
        activity_id = row.get("activity_id", "")
        activity = activities.get(activity_id, {})
        category = activity.get("category", "").strip().lower()
        scope_boundary = row.get("scope_boundary", "")

        if activity_id.startswith("TRAN.") or category in {"transport", "mobility"}:
            if "ttw" not in scope_boundary.lower():
                transport_offenders.append(row.get("ef_id", activity_id))

        if activity_id.startswith("MEDIA.") or category == "media":
            if scope_boundary.strip() != "Electricity LCA":
                media_offenders.append(row.get("ef_id", activity_id))

    assert not transport_offenders, (
        "Transport emission factors must include TTW in the scope boundary. Missing for: "
        + ", ".join(sorted(transport_offenders))
    )
    assert not media_offenders, (
        "Media emission factors must use the 'Electricity LCA' scope boundary. Incorrect for: "
        + ", ".join(sorted(media_offenders))
    )


def test_sources_ieee_citations_include_availability() -> None:
    sources = _load_csv("sources.csv")
    offenders = [
        row["source_id"]
        for row in sources
        if row.get("ieee_citation", "").strip()
        and "Available:" not in row["ieee_citation"]
        and "http" not in row["ieee_citation"]
    ]
    assert (
        not offenders
    ), "sources.csv entries must include an access note or URL. Missing for: " + ", ".join(
        sorted(offenders)
    )


def test_artifact_references_exist() -> None:
    artifacts_dir = ROOT / "site" / "public" / "artifacts"
    missing = []
    for artifact in sorted(artifacts_dir.glob("*.json")):
        references_path = artifact.with_suffix(".References.txt")
        if not references_path.exists():
            missing.append(str(references_path))
    assert not missing, "Expected References.txt for artifacts: " + ", ".join(missing)


def test_harvest_manifest_present() -> None:
    manifest_path = ROOT / "references" / "manifest.csv"
    assert manifest_path.exists(), "Missing references/manifest.csv"
