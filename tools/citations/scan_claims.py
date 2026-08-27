#!/usr/bin/env python3
"""Audit the repository dataflow manifest without mutating repository files."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Mapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
SITE_ARTIFACTS_DIR = REPO_ROOT / "site" / "public" / "artifacts"
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
MANIFEST_PATH = DATA_DIR / "dataflow_manifest.csv"
SOURCES_PATH = DATA_DIR / "sources.csv"
GOVERNANCE_FILES = {"dataflow_manifest.csv", "source_decisions.csv"}
DECISIONS_PATH = DATA_DIR / "source_decisions.csv"
DECISION_COLUMNS = [
    "dataset_path",
    "record_id",
    "source_id",
    "decision",
    "reason",
    "evidence_sha256",
    "replacement_record_id",
    "replacement_source_id",
    "replacement_value_sha256",
    "reviewed_at",
    "reviewer",
    "affected_outputs",
]
DECISION_VALUES = {"verified", "corrected", "consolidated", "culled"}
OUTPUT_VALUES = {
    "derive",
    "web-calculator",
    "web-catalog",
    "web-sources",
    "owid-context",
    "package",
    "worker",
}
MANIFEST_COLUMNS = [
    "stream_id",
    "dataset_path",
    "schema_version",
    "record_key",
    "transport",
    "cadence",
    "retention",
    "timestamp_policy",
    "null_policy",
    "provenance_columns",
    "source_columns",
    "derived_from",
    "publication_surfaces",
]
ALLOWED_STATUSES = {"external", "derived", "modelled", "structural"}
STREAM_ID_RE = re.compile(r"^acx\.[a-z0-9-]+$")
SCHEMA_VERSION_RE = re.compile(r"^acx\.[a-z0-9-]+/\d+-\d+-\d+$")
TRANSPORT_VALUES = {"repository-csv", "repository-json"}
CADENCE_VALUES = {"release-gated", "manual-snapshot"}
RETENTION_VALUES = {"git-history"}
TIMESTAMP_POLICY_VALUES = {"none", "iso-date", "rfc3339-utc"}
NULL_POLICY_VALUES = {"blank"}
NONCANONICAL_NULLS = {"NULL", "N/A", "NA"}
SOURCE_ID_RE = re.compile(r"\bSRC(?:\.[A-Za-z0-9_-]+)+")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
REQUIRED_FIELDS = ["source_id", "vintage_year", "scope_boundary", "gwp_horizon", "region"]
GRID_INDEXED_REQUIREMENTS = ["electricity_kwh_per_unit", "vintage_year"]


@dataclass
class Claim:
    field: str
    value: float

    def to_dict(self) -> Dict[str, float]:
        return {"field": self.field, "value": self.value}


@dataclass
class RowFinding:
    row_number: int
    identifier: Dict[str, str]
    claims: List[Claim] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "row_number": self.row_number,
            "identifier": self.identifier,
            "claims": [claim.to_dict() for claim in self.claims],
            "issues": self.issues,
        }


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


@dataclass
class DatasetReport:
    name: str
    path: Path
    findings: List[RowFinding] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "path": _display_path(self.path),
            "findings": [finding.to_dict() for finding in self.findings],
        }

    @property
    def issue_count(self) -> int:
        return sum(len(finding.issues) for finding in self.findings)

    @property
    def claim_count(self) -> int:
        return sum(len(finding.claims) for finding in self.findings)


@dataclass
class ScanReport:
    datasets: List[DatasetReport]
    scanned_files: Dict[str, List[str]]

    def to_dict(self) -> Dict[str, object]:
        return {
            "scanned_files": self.scanned_files,
            "datasets": [dataset.to_dict() for dataset in self.datasets],
        }

    @property
    def total_claims(self) -> int:
        return sum(dataset.claim_count for dataset in self.datasets)

    @property
    def total_issues(self) -> int:
        return sum(dataset.issue_count for dataset in self.datasets)


@dataclass(frozen=True)
class ManifestSpec:
    stream_id: str
    dataset_path: str
    schema_version: str
    transport: str
    cadence: str
    retention: str
    timestamp_policy: str
    null_policy: str
    record_fields: tuple[str, ...]
    provenance: Mapping[str, str]
    source_columns: tuple[str, ...]
    derived_from: tuple[str, ...]
    publication_surfaces: tuple[str, ...]


def is_missing(value: str | None) -> bool:
    return value is None or not value.strip()


def parse_float(value: str | None) -> float | None:
    try:
        result = float(value or "")
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def collect_claims(row: Mapping[str, str]) -> List[Claim]:
    claims: List[Claim] = []
    for key, value in row.items():
        number = parse_float(value)
        if number is not None:
            claims.append(Claim(field=key, value=number))
    return claims


def _comment_free_csv(path: Path) -> tuple[list[str], list[dict[str, str]], list[int]]:
    lines: list[str] = []
    source_lines: list[int] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        lines.append(line)
        source_lines.append(line_number)
    if not lines:
        return [], [], []
    reader = csv.DictReader(lines)
    if reader.fieldnames is None:
        return [], [], []
    rows: list[dict[str, str]] = []
    row_numbers: list[int] = []
    for offset, row in enumerate(reader):
        rows.append({key.strip(): (value or "") for key, value in row.items() if key is not None})
        header_offset = 1
        row_numbers.append(source_lines[min(offset + header_offset, len(source_lines) - 1)])
    return [field.strip() for field in reader.fieldnames], rows, row_numbers


def _parse_provenance(value: str, fields: Sequence[str]) -> tuple[dict[str, str], list[str]]:
    provenance: dict[str, str] = {}
    errors: list[str] = []
    if not value.strip():
        return provenance, ["provenance_columns is empty"]
    for token in value.split("|"):
        token = token.strip()
        if not token:
            errors.append("provenance_columns contains an empty token")
            continue
        if "=" not in token:
            errors.append(f"Malformed provenance token: {token}")
            continue
        field_name, status = (part.strip() for part in token.split("=", 1))
        if not field_name or not status:
            errors.append(f"Malformed provenance token: {token}")
            continue
        if fields and field_name not in fields:
            errors.append(f"Provenance field is not present in dataset: {field_name}")
        if status not in ALLOWED_STATUSES:
            errors.append(f"Unknown epistemic status '{status}' for {field_name}")
        if field_name in provenance:
            errors.append(f"Duplicate provenance field: {field_name}")
        provenance[field_name] = status
    return provenance, errors


def load_manifest_specs(manifest_path: Path) -> tuple[list[ManifestSpec], list[str]]:
    """Load and validate the canonical data-stream declarations at ``manifest_path``."""

    errors: list[str] = []
    if not manifest_path.exists():
        return [], [f"Missing manifest: {_display_path(manifest_path)}"]
    with manifest_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != MANIFEST_COLUMNS:
            return [], ["Manifest header must be exactly " + ",".join(MANIFEST_COLUMNS)]
        raw_rows = list(reader)
    specs: list[ManifestSpec] = []
    seen_paths: set[str] = set()
    seen_stream_ids: set[str] = set()
    for row_number, row in enumerate(raw_rows, start=2):
        stream_id = (row.get("stream_id") or "").strip()
        dataset_path = (row.get("dataset_path") or "").strip()
        schema_version = (row.get("schema_version") or "").strip()
        record_key = (row.get("record_key") or "").strip()
        transport = (row.get("transport") or "").strip()
        cadence = (row.get("cadence") or "").strip()
        retention = (row.get("retention") or "").strip()
        timestamp_policy = (row.get("timestamp_policy") or "").strip()
        null_policy = (row.get("null_policy") or "").strip()
        if not stream_id or not dataset_path or not schema_version or not record_key:
            errors.append(f"Manifest row {row_number} has an empty required stream field")
            continue
        if not STREAM_ID_RE.fullmatch(stream_id):
            errors.append(f"Manifest row {row_number} has an invalid stream_id: {stream_id}")
        if stream_id in seen_stream_ids:
            errors.append(f"Duplicate manifest stream_id: {stream_id}")
        seen_stream_ids.add(stream_id)
        if not SCHEMA_VERSION_RE.fullmatch(schema_version):
            errors.append(
                f"Manifest row {row_number} has an invalid schema_version: {schema_version}"
            )
        if transport not in TRANSPORT_VALUES:
            errors.append(f"Manifest row {row_number} has an invalid transport: {transport}")
        if cadence not in CADENCE_VALUES:
            errors.append(f"Manifest row {row_number} has an invalid cadence: {cadence}")
        if retention not in RETENTION_VALUES:
            errors.append(f"Manifest row {row_number} has an invalid retention: {retention}")
        if timestamp_policy not in TIMESTAMP_POLICY_VALUES:
            errors.append(
                f"Manifest row {row_number} has an invalid timestamp_policy: {timestamp_policy}"
            )
        if null_policy not in NULL_POLICY_VALUES:
            errors.append(f"Manifest row {row_number} has an invalid null_policy: {null_policy}")
        if dataset_path in seen_paths:
            errors.append(f"Duplicate manifest dataset_path: {dataset_path}")
        seen_paths.add(dataset_path)
        if dataset_path.startswith("/") or ".." in Path(dataset_path).parts:
            errors.append(f"Manifest row {row_number} has an unsafe dataset_path: {dataset_path}")
        record_fields = tuple(part.strip() for part in record_key.split("|") if part.strip())
        if not record_fields or len(record_fields) != len(record_key.split("|")):
            errors.append(f"Manifest row {row_number} has a malformed record_key: {record_key}")
        provenance, provenance_errors = _parse_provenance(row.get("provenance_columns") or "", ())
        # Provenance fields are checked against the actual dataset after its header is read.
        errors.extend(f"Manifest row {row_number}: {message}" for message in provenance_errors)
        source_columns = tuple(
            part.strip() for part in (row.get("source_columns") or "").split("|") if part.strip()
        )
        derived_from = tuple(
            part.strip() for part in (row.get("derived_from") or "").split("|") if part.strip()
        )
        publication_surfaces = tuple(
            part.strip()
            for part in (row.get("publication_surfaces") or "").split("|")
            if part.strip()
        )
        if not publication_surfaces or any(
            value not in OUTPUT_VALUES for value in publication_surfaces
        ):
            errors.append(f"Manifest row {row_number} has invalid publication_surfaces")
        specs.append(
            ManifestSpec(
                stream_id=stream_id,
                dataset_path=dataset_path,
                schema_version=schema_version,
                transport=transport,
                cadence=cadence,
                retention=retention,
                timestamp_policy=timestamp_policy,
                null_policy=null_policy,
                record_fields=record_fields,
                provenance=provenance,
                source_columns=source_columns,
                derived_from=derived_from,
                publication_surfaces=publication_surfaces,
            )
        )
    return specs, errors


def _load_manifest() -> tuple[list[ManifestSpec], list[str]]:
    return load_manifest_specs(MANIFEST_PATH)


def _registry_source_ids(as_of: date | None = None) -> tuple[set[str], list[str]]:
    errors: list[str] = []
    if not SOURCES_PATH.exists():
        return set(), ["Missing source registry: data/sources.csv"]
    fields, rows, row_numbers = _comment_free_csv(SOURCES_PATH)
    expected_fields = ["source_id", "ieee_citation", "url", "year", "license", "review_due_at"]
    if fields != expected_fields:
        errors.append("data/sources.csv has an unexpected header")
    source_ids: set[str] = set()
    for row, row_number in zip(rows, row_numbers):
        source_id = row.get("source_id", "").strip()
        if not source_id:
            errors.append(f"data/sources.csv row {row_number} has no source_id")
            continue
        if source_id in source_ids:
            errors.append(f"Duplicate source_id in data/sources.csv: {source_id}")
        source_ids.add(source_id)
        for column in ("ieee_citation", "url", "year", "license", "review_due_at"):
            if not (row.get(column) or "").strip():
                errors.append(f"data/sources.csv row {row_number} has no {column}")
        try:
            review_due = date.fromisoformat((row.get("review_due_at") or "").strip())
        except ValueError:
            review_due = None
        if review_due is None:
            errors.append(f"data/sources.csv row {row_number} has malformed review_due_at")
        elif as_of is not None and review_due < as_of:
            errors.append(f"data/sources.csv row {row_number} has overdue review_due_at")
    return source_ids, errors


def _identifier(row: Mapping[str, str], fields: Sequence[str]) -> Dict[str, str]:
    return {field: (row.get(field) or "").strip() for field in fields}


def _source_ids(row: Mapping[str, str], columns: Sequence[str]) -> set[str]:
    values: set[str] = set()
    for column in columns:
        values.update(SOURCE_ID_RE.findall(row.get(column, "") or ""))
    return values


def _method_note(row: Mapping[str, str]) -> str:
    for column in ("method_notes", "method_note", "notes", "assumption_notes", "schedule_notes"):
        value = (row.get(column) or "").strip()
        if value:
            return value
    return ""


def _validate_rows(
    spec: ManifestSpec,
    fields: Sequence[str],
    rows: Sequence[Mapping[str, str]],
    row_numbers: Sequence[int],
    source_ids: set[str],
) -> tuple[DatasetReport, list[str]]:
    errors: list[str] = []
    report = DatasetReport(name=spec.dataset_path, path=DATA_DIR / spec.dataset_path)
    missing_keys = [field for field in spec.record_fields if field not in fields]
    if missing_keys:
        errors.append(
            f"{spec.dataset_path}: record_key fields missing from header: {', '.join(missing_keys)}"
        )
    missing_provenance = [field for field in spec.provenance if field not in fields]
    if missing_provenance:
        errors.append(
            f"{spec.dataset_path}: provenance fields missing from header: {', '.join(missing_provenance)}"
        )
    missing_sources = [field for field in spec.source_columns if field not in fields]
    if missing_sources:
        errors.append(
            f"{spec.dataset_path}: source fields missing from header: {', '.join(missing_sources)}"
        )
    if list(fields) != list(spec.provenance):
        errors.append(
            f"{spec.dataset_path}: header must exactly match provenance_columns field order"
        )

    seen_keys: dict[str, int] = {}
    for row, row_number in zip(rows, row_numbers):
        key_values = [(row.get(field) or "").strip() for field in spec.record_fields]
        key = "|".join(key_values)
        row_issues: list[str] = []
        if any(not value for value in key_values):
            message = f"{spec.dataset_path}:{key}: record key contains an empty value"
            errors.append(message)
            row_issues.append(message)
        if key in seen_keys:
            message = (
                f"{spec.dataset_path}: duplicate record key '{key}' at rows "
                f"{seen_keys[key]} and {row_number}"
            )
            errors.append(message)
            row_issues.append(message)
        else:
            seen_keys[key] = row_number

        for column, value in row.items():
            if value.strip().upper() in NONCANONICAL_NULLS:
                message = (
                    f"{spec.dataset_path}:{key}: noncanonical null literal in {column}; use blank"
                )
                errors.append(message)
                row_issues.append(message)

        for source_id in sorted(_source_ids(row, spec.source_columns)):
            if source_id not in source_ids:
                message = f"{spec.dataset_path}:{key}: unregistered source ID {source_id}"
                errors.append(message)
                row_issues.append(message)

        modelled_fields = [
            field
            for field, status in spec.provenance.items()
            if status == "modelled" and not is_missing(row.get(field))
        ]
        if modelled_fields:
            if not _method_note(row):
                message = (
                    f"{spec.dataset_path}:{key}: modelled fields "
                    f"{', '.join(modelled_fields)} require a nonempty method note"
                )
                errors.append(message)
                row_issues.append(message)
            if not _source_ids(row, spec.source_columns):
                inline_ids = set(SOURCE_ID_RE.findall(_method_note(row)))
                if not inline_ids:
                    message = (
                        f"{spec.dataset_path}:{key}: modelled fields "
                        f"{', '.join(modelled_fields)} require a registered methodology source"
                    )
                    errors.append(message)
                    row_issues.append(message)

        if spec.dataset_path == "emission_factors.csv":
            required = [field for field in REQUIRED_FIELDS if is_missing(row.get(field))]
            for field in required:
                message = f"{spec.dataset_path}:{key}: missing required field: {field}"
                errors.append(message)
                row_issues.append(message)
            if (row.get("is_grid_indexed") or "").strip().lower() == "true":
                for field in GRID_INDEXED_REQUIREMENTS:
                    if is_missing(row.get(field)):
                        message = (
                            f"{spec.dataset_path}:{key}: grid-indexed row missing required field: "
                            f"{field}"
                        )
                        errors.append(message)
                        row_issues.append(message)
                if not is_missing(row.get("value_g_per_unit")):
                    message = (
                        f"{spec.dataset_path}:{key}: grid-indexed row must leave "
                        "value_g_per_unit blank because the published value is derived"
                    )
                    errors.append(message)
                    row_issues.append(message)
        elif spec.dataset_path == "grid_intensity.csv":
            for field in REQUIRED_FIELDS:
                if is_missing(row.get(field)):
                    message = f"{spec.dataset_path}:{key}: missing required field: {field}"
                    errors.append(message)
                    row_issues.append(message)

        report.findings.append(
            RowFinding(
                row_number=row_number,
                identifier=_identifier(row, spec.record_fields),
                claims=collect_claims(row),
                issues=row_issues,
            )
        )
    return report, errors


def _validate_json_spec(
    spec: ManifestSpec, source_ids: set[str]
) -> tuple[DatasetReport, list[str]]:
    path = DATA_DIR / spec.dataset_path
    errors: list[str] = []
    report = DatasetReport(name=spec.dataset_path, path=path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return report, [f"{spec.dataset_path}: invalid JSON: {error}"]
    if not isinstance(payload, dict):

        return report, [f"{spec.dataset_path}: expected a JSON object"]
    key = "|".join(str(payload.get(field, "")).strip() for field in spec.record_fields)
    if any(not str(payload.get(field, "")).strip() for field in spec.record_fields):
        errors.append(f"{spec.dataset_path}: record key contains an empty value")
    for provenance_field, status in spec.provenance.items():
        if provenance_field not in payload:
            errors.append(
                f"{spec.dataset_path}: provenance field missing from JSON: {provenance_field}"
            )
        if status not in ALLOWED_STATUSES:
            errors.append(f"{spec.dataset_path}: invalid status {status}")
    for source_id in sorted(
        _source_ids({key: str(value) for key, value in payload.items()}, spec.source_columns)
    ):
        if source_id not in source_ids:
            errors.append(f"{spec.dataset_path}:{key}: unregistered source ID {source_id}")
    report.findings.append(
        RowFinding(row_number=1, identifier=_identifier(payload, spec.record_fields), claims=[])
    )
    return report, errors


def _decision_targets(
    specs: Sequence[ManifestSpec], registry_ids: set[str]
) -> set[tuple[str, str, str]]:
    targets: set[tuple[str, str, str]] = set()
    for source_id in registry_ids:
        targets.add(("sources.csv", source_id, source_id))
    for spec in specs:
        if not spec.source_columns:
            continue
        path = DATA_DIR / spec.dataset_path
        if spec.dataset_path.endswith(".json"):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            record_id = "|".join(
                str(payload.get(field, "")).strip() for field in spec.record_fields
            )
            source_ids = _source_ids(
                {key: str(value) for key, value in payload.items()}, spec.source_columns
            )
        else:
            try:
                fields, rows, _ = _comment_free_csv(path)
            except OSError:
                continue
            del fields
            for row in rows:
                record_id = "|".join((row.get(field) or "").strip() for field in spec.record_fields)
                for source_id in _source_ids(row, spec.source_columns):
                    targets.add((spec.dataset_path, record_id, source_id))
            continue
        for source_id in source_ids:
            targets.add((spec.dataset_path, record_id, source_id))
    return targets


def _validate_decisions(
    specs: Sequence[ManifestSpec],
    registry_ids: set[str],
) -> list[str]:
    errors: list[str] = []
    if not DECISIONS_PATH.exists():
        return [f"Missing source decisions: {_display_path(DECISIONS_PATH)}"]
    fields, rows, row_numbers = _comment_free_csv(DECISIONS_PATH)
    if fields != DECISION_COLUMNS:
        return ["data/source_decisions.csv has an unexpected header"]
    if not rows:
        return ["data/source_decisions.csv is empty"]

    expected = _decision_targets(specs, registry_ids)
    seen: set[tuple[str, str, str]] = set()
    try:
        from calc.refs_util import load_manifest

        ledger_hashes = {
            row.get("source_id", ""): (row.get("sha256") or "").strip().lower()
            for row in load_manifest()
        }
    except (ImportError, OSError):
        ledger_hashes = {}

    for row, row_number in zip(rows, row_numbers):
        dataset_path = (row.get("dataset_path") or "").strip()
        record_id = (row.get("record_id") or "").strip()
        source_id = (row.get("source_id") or "").strip()
        key = (dataset_path, record_id, source_id)
        if key in seen:
            errors.append(f"Duplicate source decision at row {row_number}: {key}")
        seen.add(key)
        if key not in expected:
            errors.append(
                f"Source decision does not match an active source record at row {row_number}: {key}"
            )
        decision = (row.get("decision") or "").strip()
        if decision not in DECISION_VALUES:
            errors.append(f"Invalid decision at row {row_number}: {decision}")
        if not (row.get("reason") or "").strip():
            errors.append(f"Decision reason missing at row {row_number}")
        evidence_hash = (row.get("evidence_sha256") or "").strip().lower()
        if not SHA256_RE.fullmatch(evidence_hash):
            errors.append(f"Evidence hash missing or malformed at row {row_number}")
        elif ledger_hashes.get(source_id) != evidence_hash:
            errors.append(f"Evidence hash does not match source ledger at row {row_number}")
        reviewed_at = (row.get("reviewed_at") or "").strip()
        try:
            reviewed = datetime.fromisoformat(reviewed_at.replace("Z", "+00:00"))
        except ValueError:
            reviewed = None
        if reviewed is None or reviewed.tzinfo is None:
            errors.append(f"reviewed_at must be timezone-aware at row {row_number}")
        if not (row.get("reviewer") or "").strip():
            errors.append(f"Reviewer missing at row {row_number}")
        outputs = [
            value.strip()
            for value in (row.get("affected_outputs") or "").split("|")
            if value.strip()
        ]
        if not outputs or any(value not in OUTPUT_VALUES for value in outputs):
            errors.append(f"Invalid affected_outputs at row {row_number}")
        replacement_fields = (
            (row.get("replacement_record_id") or "").strip(),
            (row.get("replacement_source_id") or "").strip(),
            (row.get("replacement_value_sha256") or "").strip().lower(),
        )
        if decision in {"corrected", "consolidated"}:
            if not replacement_fields[0] or not replacement_fields[1]:
                errors.append(f"Replacement record/source missing at row {row_number}")
            if not SHA256_RE.fullmatch(replacement_fields[2]):
                errors.append(f"Replacement value hash missing at row {row_number}")
        elif any(replacement_fields):
            errors.append(f"Unexpected replacement fields at row {row_number}")

    missing = sorted(expected - seen)
    if missing:
        errors.append(
            "Missing source decisions for: " + ", ".join("|".join(item) for item in missing)
        )
    return errors


def collect_scanned_files() -> Dict[str, List[str]]:
    scanned: Dict[str, List[str]] = {
        "data_csv": [],
        "site_artifacts_json": [],
        "artifacts_json": [],
    }
    for csv_path in sorted(DATA_DIR.glob("*.csv")):
        scanned["data_csv"].append(_display_path(csv_path))
    for json_path in sorted(SITE_ARTIFACTS_DIR.glob("*.json")):
        scanned["site_artifacts_json"].append(_display_path(json_path))
    if ARTIFACTS_DIR.exists():
        for json_path in sorted(ARTIFACTS_DIR.glob("*.json")):
            scanned["artifacts_json"].append(_display_path(json_path))
    return scanned


def render_markdown(report: ScanReport, errors: Sequence[str] = ()) -> str:
    lines: List[str] = ["# Citation Gap Report", ""]
    lines.append(f"- Total claims inventoried: {report.total_claims}")
    lines.append(f"- Total issues detected: {report.total_issues + len(errors)}")
    if errors:
        lines.extend(["", "## Contract errors", ""])
        lines.extend(f"- {error}" for error in errors)
    lines.extend(["", "## Datasets", ""])
    for dataset in report.datasets:
        lines.extend(
            [
                f"### {dataset.name}",
                "",
                f"- Rows with claims: {len(dataset.findings)}",
                f"- Claims inventoried: {dataset.claim_count}",
                f"- Issues detected: {dataset.issue_count}",
            ]
        )
        if dataset.issue_count:
            lines.extend(["", "#### Issues", ""])
            for finding in dataset.findings:
                if not finding.issues:
                    continue
                identifier = (
                    ", ".join(f"{key}={value}" for key, value in finding.identifier.items())
                    or f"row {finding.row_number}"
                )
                lines.append(f"- **{identifier}**")
                lines.extend(f"  - {issue}" for issue in finding.issues)
        lines.append("")
    lines.extend(["## Scanned files", ""])
    for category, files in report.scanned_files.items():
        lines.extend([f"### {category}"])
        lines.extend(f"- {path}" for path in files) if files else lines.append("- _(none)_")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def run_scan(as_of: str) -> tuple[ScanReport, list[str]]:
    try:
        audit_date = date.fromisoformat(as_of)
    except ValueError as error:
        raise ValueError(f"--as-of must be an ISO date (YYYY-MM-DD): {as_of}") from error

    specs, errors = _load_manifest()
    registry_ids, registry_errors = _registry_source_ids(audit_date)
    errors.extend(registry_errors)
    expected_paths = {
        path.name for path in DATA_DIR.glob("*.csv") if path.name not in GOVERNANCE_FILES
    }
    expected_paths.add("owid/manifest.json")
    declared_paths = {spec.dataset_path for spec in specs}
    for path in sorted(expected_paths - declared_paths):
        errors.append(f"Unknown root data file or missing manifest row: data/{path}")
    for path in sorted(declared_paths - expected_paths):
        errors.append(f"Manifest declares missing or unknown dataset: data/{path}")

    datasets: list[DatasetReport] = []
    for spec in specs:
        path = DATA_DIR / spec.dataset_path
        if not path.exists():
            errors.append(f"Manifest declares missing file: data/{spec.dataset_path}")
            continue
        if spec.dataset_path.endswith(".json"):
            dataset, dataset_errors = _validate_json_spec(spec, registry_ids)
        else:
            fields, rows, row_numbers = _comment_free_csv(path)
            dataset, dataset_errors = _validate_rows(spec, fields, rows, row_numbers, registry_ids)
        datasets.append(dataset)
        errors.extend(dataset_errors)
    errors.extend(_validate_decisions(specs, registry_ids))
    return ScanReport(datasets=datasets, scanned_files=collect_scanned_files()), errors


def _write_report(path: Path, report: ScanReport, errors: Sequence[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = report.to_dict()
    if errors:
        payload["errors"] = list(errors)
    if path.suffix.lower() == ".json":
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    else:
        path.write_text(render_markdown(report, errors), encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit repository dataflow contracts")
    parser.add_argument("--as-of", required=True, help="Audit clock, formatted YYYY-MM-DD")
    parser.add_argument("--report", type=Path, help="Opt-in JSON or Markdown report path")
    args = parser.parse_args(argv)
    try:
        report, errors = run_scan(args.as_of)
    except ValueError as error:
        print(f"::error::{error}", file=sys.stderr)
        return 2
    if args.report:
        _write_report(args.report, report, errors)
    if errors:
        for error in errors:
            print(f"::error::{error}", file=sys.stderr)
        return 1
    print(
        f"Dataflow inventory passed ({len(report.datasets)} datasets, {report.total_claims} claims)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
