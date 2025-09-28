#!/usr/bin/env python3
"""Fail if banned placeholder tokens appear in shipping data."""

from __future__ import annotations

import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BANNED_TOKENS: tuple[str, ...] = ("Awaiting", "placeholder", "SRC.OLD", "TBD")
NUMERIC_FIELDS: tuple[str, ...] = (
    "value_g_per_unit",
    "electricity_kwh_per_unit",
    "electricity_kwh_per_unit_low",
    "electricity_kwh_per_unit_high",
    "uncert_low_g_per_unit",
    "uncert_high_g_per_unit",
)


@dataclass(frozen=True)
class PlaceholderHit:
    """Location information for a banned token."""

    line_number: int
    token: str
    line_text: str


def iter_data_csv_files() -> Iterable[Path]:
    """Yield CSV files that ship with the data package."""

    if not DATA_DIR.exists():
        raise SystemExit("data directory not found")

    yield from sorted(DATA_DIR.glob("*.csv"))


def scan_file(path: Path) -> list[PlaceholderHit]:
    """Return occurrences of banned tokens within *path*."""

    hits: list[PlaceholderHit] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        lower_line = raw_line.casefold()
        for token in BANNED_TOKENS:
            if token.casefold() in lower_line:
                hits.append(
                    PlaceholderHit(line_number=line_number, token=token, line_text=raw_line.strip())
                )
    return hits


def scan_data_files() -> dict[Path, list[PlaceholderHit]]:
    """Scan all shipping CSV files and collect placeholder hits."""

    findings: dict[Path, list[PlaceholderHit]] = {}
    for path in iter_data_csv_files():
        hits = scan_file(path)
        if hits:
            findings[path] = hits
    return findings


def format_hits(path: Path, hits: list[PlaceholderHit]) -> str:
    relative = path.relative_to(ROOT)
    lines = []
    for hit in hits:
        lines.append(
            f"{relative}:{hit.line_number}: contains banned token '{hit.token}' -> {hit.line_text}"
        )
    return "\n".join(lines)


def load_source_ids() -> set[str]:
    sources_path = DATA_DIR / "sources.csv"
    if not sources_path.exists():
        raise SystemExit("sources.csv not found")

    with sources_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if "source_id" not in reader.fieldnames:
            raise SystemExit("sources.csv missing source_id column")
        return {row["source_id"].strip() for row in reader if row.get("source_id")}


def validate_emission_factors(source_ids: set[str]) -> list[str]:
    errors: list[str] = []
    ef_path = DATA_DIR / "emission_factors.csv"
    if not ef_path.exists():
        return errors

    with ef_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        missing = [field for field in ("source_id", *NUMERIC_FIELDS) if field not in fieldnames]
        if missing:
            raise SystemExit(
                "emission_factors.csv missing expected columns: " + ", ".join(sorted(missing))
            )

        for row_number, row in enumerate(reader, start=2):
            has_numeric = any((row.get(field) or "").strip() for field in NUMERIC_FIELDS)
            if not has_numeric:
                continue

            source_id = row.get("source_id", "").strip()
            if not source_id:
                errors.append(
                    f"{ef_path.relative_to(ROOT)}:{row_number}: numeric row missing source_id -> ef_id {row.get('ef_id', '').strip()}"
                )
                continue

            if source_id not in source_ids:
                errors.append(
                    f"{ef_path.relative_to(ROOT)}:{row_number}: unknown source_id '{source_id}' -> ef_id {row.get('ef_id', '').strip()}"
                )

    return errors


def main() -> int:
    findings = scan_data_files()
    errors: list[str] = []

    if findings:
        for path, hits in findings.items():
            errors.append(format_hits(path, hits))

    source_ids = load_source_ids()
    ef_errors = validate_emission_factors(source_ids)
    errors.extend(ef_errors)

    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
