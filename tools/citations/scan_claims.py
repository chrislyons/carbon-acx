#!/usr/bin/env python3
"""Scan data sources for numeric claims and produce a gap report."""

from __future__ import annotations

import csv
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
SITE_ARTIFACTS_DIR = REPO_ROOT / "site" / "public" / "artifacts"
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
OUTPUT_JSON = REPO_ROOT / "tools" / "citations" / "gap_report.json"
OUTPUT_MARKDOWN = REPO_ROOT / "tools" / "citations" / "gap_report.md"

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


@dataclass
class DatasetReport:
    name: str
    path: Path
    findings: List[RowFinding] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "path": str(self.path.relative_to(REPO_ROOT)),
            "findings": [finding.to_dict() for finding in self.findings],
        }

    @property
    def issue_count(self) -> int:
        return sum(len(f.issues) for f in self.findings)

    @property
    def claim_count(self) -> int:
        return sum(len(f.claims) for f in self.findings)


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


def is_missing(value: str | None) -> bool:
    if value is None:
        return True
    stripped = value.strip()
    return stripped == "" or stripped.upper() == "NULL"


def parse_float(value: str) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isfinite(result):
        return result
    return None


def collect_claims(row: Dict[str, str]) -> List[Claim]:
    claims: List[Claim] = []
    for key, value in row.items():
        if is_missing(value):
            continue
        number = parse_float(value)
        if number is None:
            continue
        claims.append(Claim(field=key, value=number))
    return claims


def identifier_for_emission_factor(row: Dict[str, str]) -> Dict[str, str]:
    identifier = {}
    if "ef_id" in row and not is_missing(row["ef_id"]):
        identifier["ef_id"] = row["ef_id"].strip()
    if "activity_id" in row and not is_missing(row["activity_id"]):
        identifier["activity_id"] = row["activity_id"].strip()
    return identifier


def identifier_for_grid_intensity(row: Dict[str, str]) -> Dict[str, str]:
    identifier = {}
    for key in ("region", "region_code", "grid_code"):
        if key in row and not is_missing(row[key]):
            identifier[key] = row[key].strip()
            break
    if "vintage_year" in row and not is_missing(row["vintage_year"]):
        identifier["vintage_year"] = row["vintage_year"].strip()
    return identifier


def analyze_emission_factors(path: Path) -> DatasetReport:
    findings: List[RowFinding] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader, start=2):  # account for header line
            claims = collect_claims(row)
            if not claims:
                continue
            issues: List[str] = []
            for req_field in REQUIRED_FIELDS:
                if req_field not in row or is_missing(row[req_field]):
                    issues.append(f"Missing required field: {req_field}")
            is_grid_indexed = row.get("is_grid_indexed", "").strip().lower() == "true"
            if is_grid_indexed:
                for field in GRID_INDEXED_REQUIREMENTS:
                    if field not in row or is_missing(row[field]):
                        issues.append("Grid-indexed row missing required field: " + field)
            findings.append(
                RowFinding(
                    row_number=index,
                    identifier=identifier_for_emission_factor(row),
                    claims=claims,
                    issues=issues,
                )
            )
    return DatasetReport(name="emission_factors.csv", path=path, findings=findings)


def analyze_grid_intensity(path: Path) -> DatasetReport:
    findings: List[RowFinding] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader, start=2):
            claims = collect_claims(row)
            if not claims:
                continue
            issues: List[str] = []
            for req_field in REQUIRED_FIELDS:
                if req_field not in row or is_missing(row[req_field]):
                    issues.append(f"Missing required field: {req_field}")
            findings.append(
                RowFinding(
                    row_number=index,
                    identifier=identifier_for_grid_intensity(row),
                    claims=claims,
                    issues=issues,
                )
            )
    return DatasetReport(name="grid_intensity.csv", path=path, findings=findings)


def collect_scanned_files() -> Dict[str, List[str]]:
    scanned: Dict[str, List[str]] = {
        "data_csv": [],
        "site_artifacts_json": [],
        "artifacts_json": [],
    }

    for csv_path in sorted(DATA_DIR.glob("*.csv")):
        scanned["data_csv"].append(str(csv_path.relative_to(REPO_ROOT)))

    for json_path in sorted(SITE_ARTIFACTS_DIR.glob("*.json")):
        scanned["site_artifacts_json"].append(str(json_path.relative_to(REPO_ROOT)))

    if ARTIFACTS_DIR.exists():
        for json_path in sorted(ARTIFACTS_DIR.glob("*.json")):
            scanned["artifacts_json"].append(str(json_path.relative_to(REPO_ROOT)))

    return scanned


def render_markdown(report: ScanReport) -> str:
    lines: List[str] = []
    lines.append("# Citation Gap Report")
    lines.append("")
    lines.append(f"- Total claims inventoried: {report.total_claims}")
    lines.append(f"- Total issues detected: {report.total_issues}")
    lines.append("")
    lines.append("## Datasets")
    for dataset in report.datasets:
        lines.append(f"### {dataset.name}")
        lines.append("")
        lines.append(f"- Rows with claims: {len(dataset.findings)}")
        lines.append(f"- Claims inventoried: {dataset.claim_count}")
        lines.append(f"- Issues detected: {dataset.issue_count}")
        if dataset.issue_count:
            lines.append("")
            lines.append("#### Issues")
            for finding in dataset.findings:
                if not finding.issues:
                    continue
                identifier = (
                    ", ".join(f"{key}={value}" for key, value in finding.identifier.items())
                    or f"row {finding.row_number}"
                )
                lines.append(f"- **{identifier}**")
                for issue in finding.issues:
                    lines.append(f"  - {issue}")
        lines.append("")
    lines.append("## Scanned files")
    for category, files in report.scanned_files.items():
        lines.append(f"### {category}")
        if not files:
            lines.append("- _(none)_")
        else:
            for path in files:
                lines.append(f"- {path}")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def main(argv: Sequence[str]) -> int:
    emission_path = DATA_DIR / "emission_factors.csv"
    grid_path = DATA_DIR / "grid_intensity.csv"

    datasets = [
        analyze_emission_factors(emission_path),
        analyze_grid_intensity(grid_path),
    ]

    scanned_files = collect_scanned_files()
    report = ScanReport(datasets=datasets, scanned_files=scanned_files)

    OUTPUT_JSON.write_text(json.dumps(report.to_dict(), indent=2) + "\n", encoding="utf-8")
    OUTPUT_MARKDOWN.write_text(render_markdown(report), encoding="utf-8")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
