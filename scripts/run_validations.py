"""Repository data validation and determinism checks.

This script bundles the bespoke validation steps requested for the
``carbon-acx`` data workflows. It performs four major tasks:

1. Schema and semantic validation of CSV datasets under ``data/``.
2. Deterministic build verification by running ``make build`` twice and
   comparing JSON artefact hashes.
3. Numerical sanity checks on the generated intensity matrix outputs.
4. Rendering a human-readable validation summary.

The resulting report is written to ``calc/outputs/validation_summary.txt``.
"""

from __future__ import annotations

import csv
import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Mapping, Sequence

import pandas as pd

from calc import manifest, schema
from calc.refs_util import load_source_catalog
from calc.utils.hashio import sha256_concat, sha256_file


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
DIST_ARTIFACTS_DIR = REPO_ROOT / "dist" / "artifacts"
SUMMARY_PATH = REPO_ROOT / "calc" / "outputs" / "validation_summary.txt"


@dataclass
class CheckResult:
    """Represents the outcome of a validation check."""

    name: str
    passed: bool
    details: list[str] = field(default_factory=list)

    def format_block(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        lines = [f"[{status}] {self.name}"]
        if self.details:
            lines.extend(f"  - {line}" for line in self.details)
        return "\n".join(lines)


def _columns_from_model(model: type[schema.BaseModel]) -> tuple[set[str], set[str]]:
    """Return expected and required column names for ``model``."""

    expected: set[str] = set()
    required: set[str] = set()
    for field_name, field in model.model_fields.items():
        column = field.alias or field_name
        expected.add(column)
        if field.is_required():
            required.add(column)
    return expected, required


def _read_columns(path: Path) -> list[str]:
    data = pd.read_csv(path, nrows=0)
    return [column.strip() for column in data.columns]


def check_schema_headers() -> CheckResult:
    """Validate CSV headers against the repository schema models."""

    model_datasets: Mapping[str, type[schema.BaseModel]] = {
        "activities.csv": schema.Activity,
        "activity_fu_map.csv": schema.ActivityFunctionalUnitMap,
        "activity_schedule.csv": schema.ActivitySchedule,
        "assets.csv": schema.Asset,
        "dependencies.csv": schema.ActivityDependency,
        "emission_factors.csv": schema.EmissionFactor,
        "entities.csv": schema.Entity,
        "feedback_loops.csv": schema.FeedbackLoop,
        "functional_units.csv": schema.FunctionalUnit,
        "grid_intensity.csv": schema.GridIntensity,
        "operations.csv": schema.Operation,
        "profiles.csv": schema.Profile,
        "sites.csv": schema.Site,
    }

    manual_datasets: Mapping[str, Sequence[str]] = {
        "layers.csv": (
            "layer_id",
            "title",
            "summary",
            "ui_optional",
            "icon_slug",
            "example_activities",
        ),
        "sources.csv": ("source_id", "ieee_citation", "url", "year", "license"),
        "units.csv": ("unit_code", "unit_type", "si_conversion_factor", "notes"),
    }

    issues: list[str] = []

    for filename, model in model_datasets.items():
        path = DATA_DIR / filename
        if not path.exists():
            continue
        actual_columns = set(_read_columns(path))
        expected_columns, required_columns = _columns_from_model(model)
        extra = sorted(actual_columns - expected_columns)
        if extra:
            issues.append(
                f"{filename}: unexpected columns {', '.join(extra)}"
            )
        missing = sorted(required_columns - actual_columns)
        if missing:
            issues.append(
                f"{filename}: missing required columns {', '.join(missing)}"
            )

    for filename, expected in manual_datasets.items():
        path = DATA_DIR / filename
        if not path.exists():
            continue
        actual_columns = set(_read_columns(path))
        expected_columns = set(expected)
        extra = sorted(actual_columns - expected_columns)
        missing = sorted(expected_columns - actual_columns)
        if extra or missing:
            detail = f"{filename}:"
            if extra:
                detail += f" unexpected columns {', '.join(extra)}"
            if missing:
                if extra:
                    detail += ";"
                detail += f" missing columns {', '.join(missing)}"
            issues.append(detail)

    if issues:
        return CheckResult(
            name="Schema integrity",
            passed=False,
            details=issues,
        )

    return CheckResult(
        name="Schema integrity",
        passed=True,
        details=["All CSV headers align with schema definitions."],
    )


def _is_numeric(value: str | None) -> bool:
    if value is None:
        return False
    candidate = value.strip()
    if not candidate:
        return False
    try:
        float(candidate)
    except ValueError:
        return False
    return True


def check_citation_completeness() -> CheckResult:
    """Ensure emission factors reference catalogued IEEE citations."""

    sources = load_source_catalog()
    known_source_ids = set(sources)
    numeric_columns = {
        "value_g_per_unit",
        "electricity_kwh_per_unit",
        "electricity_kwh_per_unit_low",
        "electricity_kwh_per_unit_high",
        "uncert_low_g_per_unit",
        "uncert_high_g_per_unit",
    }

    path = DATA_DIR / "emission_factors.csv"
    offenders: list[str] = []
    missing_citations: list[str] = []

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            ef_id = (row.get("ef_id") or row.get("activity_id") or "<unknown>").strip()
            has_numeric = any(
                _is_numeric(row.get(column)) for column in numeric_columns
            )
            if not has_numeric:
                continue
            source_id = (row.get("source_id") or "").strip()
            if not source_id:
                offenders.append(f"{ef_id}: missing source_id")
                continue
            if source_id not in known_source_ids:
                offenders.append(
                    f"{ef_id}: unknown source_id '{source_id}'"
                )
                continue
            entry = sources[source_id]
            if not entry.ieee_citation:
                missing_citations.append(
                    f"{ef_id}: source '{source_id}' missing IEEE citation text"
                )

    details: list[str] = []
    if offenders:
        details.extend(offenders)
    if missing_citations:
        details.extend(missing_citations)

    if details:
        return CheckResult(
            name="Citation completeness",
            passed=False,
            details=details,
        )

    return CheckResult(
        name="Citation completeness",
        passed=True,
        details=["All numeric emission factors map to cited sources."],
    )


def check_frequency_exclusivity() -> CheckResult:
    """Verify schedule rows set at most one frequency column."""

    path = DATA_DIR / "activity_schedule.csv"
    df = pd.read_csv(path)
    mask = df["freq_per_day"].notna() & df["freq_per_week"].notna()
    if mask.any():
        offenders = df.loc[mask, ["profile_id", "activity_id"]]
        details = [
            f"{row.profile_id}/{row.activity_id}: both frequencies set"
            for row in offenders.itertuples(index=False)
        ]
        return CheckResult(
            name="Frequency exclusivity",
            passed=False,
            details=details,
        )

    return CheckResult(
        name="Frequency exclusivity",
        passed=True,
        details=["No schedule rows define both freq_per_day and freq_per_week."],
    )


def check_layer_coverage() -> CheckResult:
    """Confirm activities and emission factors specify recognised layers."""

    valid_layers = {layer.value for layer in schema.LayerId}

    def _missing_layers(path: Path, label: str) -> list[str]:
        df = pd.read_csv(path, dtype=str)
        df = df.fillna("")
        mask = ~df["layer_id"].astype(str).str.strip().isin(valid_layers)
        return [
            f"{label} {row.layer_id or '<blank>'} (row {index + 2})"
            for index, row in df.loc[mask].iterrows()
        ]

    activity_issues = _missing_layers(DATA_DIR / "activities.csv", "activity")
    ef_issues = _missing_layers(DATA_DIR / "emission_factors.csv", "emission factor")

    details = activity_issues + ef_issues
    if details:
        return CheckResult(
            name="Layer coverage",
            passed=False,
            details=details,
        )

    return CheckResult(
        name="Layer coverage",
        passed=True,
        details=["All activities and emission factors include valid layer identifiers."],
    )


def _run_make_build() -> None:
    subprocess.run(["make", "build"], check=True, cwd=REPO_ROOT)


def _hash_json_files(directory: Path) -> Mapping[str, str]:
    hashes: dict[str, str] = {}
    for path in sorted(directory.glob("*.json")):
        hashes[path.name] = sha256_file(path)
    return hashes


def verify_determinism() -> tuple[CheckResult, dict[str, str]]:
    """Run ``make build`` twice and compare JSON artefact hashes."""

    _run_make_build()
    first_hashes = _hash_json_files(DIST_ARTIFACTS_DIR)

    _run_make_build()
    second_hashes = _hash_json_files(DIST_ARTIFACTS_DIR)

    differences: list[str] = []
    all_keys = sorted(set(first_hashes) | set(second_hashes))
    for key in all_keys:
        first = first_hashes.get(key)
        second = second_hashes.get(key)
        if first != second:
            differences.append(f"{key}: {first} != {second}")

    if differences:
        result = CheckResult(
            name="Deterministic build",
            passed=False,
            details=differences,
        )
    else:
        result = CheckResult(
            name="Deterministic build",
            passed=True,
            details=["Repeated builds produced identical JSON artefact hashes."],
        )

    return result, second_hashes


def numerical_sanity_checks() -> CheckResult:
    """Validate intensity matrix totals and uncertainty bounds."""

    intensity_path = DIST_ARTIFACTS_DIR / "intensity_matrix.csv"
    if not intensity_path.exists():
        return CheckResult(
            name="Numerical sanity checks",
            passed=False,
            details=["Missing dist/artifacts/intensity_matrix.csv"],
        )

    intensities = pd.read_csv(intensity_path)
    activities = pd.read_csv(DATA_DIR / "activities.csv", usecols=["activity_id", "category"])
    merged = intensities.merge(activities, on="activity_id", how="left")

    annual_fu = merged["annual_fu"].fillna(0)
    negative_rows = merged[
        merged["annual_kg"].notna()
        & (
            (merged["annual_kg"] < 0)
            | ((merged["annual_kg"] == 0) & (annual_fu > 0))
        )
    ]
    if not negative_rows.empty:
        details = [
            f"{row.activity_id} ({row.category or 'uncategorised'}): annual_kg={row.annual_kg}"
            for row in negative_rows.itertuples(index=False)
        ]
        return CheckResult(
            name="Numerical sanity checks",
            passed=False,
            details=details,
        )

    invalid_bounds = merged[
        merged["intensity_low_g_per_fu"].notna()
        & merged["intensity_high_g_per_fu"].notna()
        & (
            (merged["intensity_low_g_per_fu"] > merged["intensity_g_per_fu"])
            | (merged["intensity_g_per_fu"] > merged["intensity_high_g_per_fu"])
        )
    ]
    if not invalid_bounds.empty:
        details = [
            f"{row.activity_id}: bounds {row.intensity_low_g_per_fu} ≤ {row.intensity_g_per_fu} ≤ {row.intensity_high_g_per_fu} violated"
            for row in invalid_bounds.itertuples(index=False)
        ]
        return CheckResult(
            name="Numerical sanity checks",
            passed=False,
            details=details,
        )

    category_totals = (
        merged.dropna(subset=["annual_kg"])
        .groupby("category", dropna=False)["annual_kg"]
        .sum()
        .reset_index()
    )

    details = [
        f"{(row.category or 'uncategorised')}: total annual_kg={row.annual_kg:.6f}"
        for row in category_totals.itertuples(index=False)
    ]

    return CheckResult(
        name="Numerical sanity checks",
        passed=True,
        details=details,
    )


def _read_latest_build() -> Mapping[str, str]:
    latest_path = DIST_ARTIFACTS_DIR / "latest-build.json"
    if latest_path.exists():
        return json.loads(latest_path.read_text(encoding="utf-8"))
    return {}


def _compute_schema_hash() -> str:
    dataset_paths = [REPO_ROOT / path for path in manifest.DATASET_FILES]
    return sha256_concat(dataset_paths)


def write_summary(
    results: Sequence[CheckResult],
    build_metadata: Mapping[str, str],
    schema_hash: str,
    hashes: Mapping[str, str],
) -> None:
    lines: list[str] = ["Validation Summary", "===================", ""]
    for result in results:
        lines.append(result.format_block())
        lines.append("")

    build_id = build_metadata.get("build_hash") or build_metadata.get("build_id", "")
    if build_id:
        lines.append(f"build_id: {build_id}")
    schema_hash_line = f"schema_hash: {schema_hash}"
    lines.append(schema_hash_line)

    if hashes:
        lines.append("JSON artefact hashes:")
        for name, digest in sorted(hashes.items()):
            lines.append(f"  - {name}: {digest}")

    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    schema.invalidate_caches()

    checks = [
        check_schema_headers(),
        check_citation_completeness(),
        check_frequency_exclusivity(),
        check_layer_coverage(),
    ]

    determinism_result, hashes = verify_determinism()
    checks.append(determinism_result)

    numeric_result = numerical_sanity_checks()
    checks.append(numeric_result)

    build_metadata = _read_latest_build()
    schema_hash = _compute_schema_hash()
    write_summary(checks, build_metadata, schema_hash, hashes)

    if not all(result.passed for result in checks):
        raise SystemExit(1)


if __name__ == "__main__":
    main()

