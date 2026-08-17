#!/usr/bin/env python3
"""Verify generated authorities are evidence-bound and byte-consistent."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Mapping

from scripts import generate_web_calculator_data as generator

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
VERIFICATION_URL_RE = re.compile(r"^https://[^\s]+/actions/runs/\d+$")


def _sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def _date(value: object, field: str, errors: list[str]) -> date | None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{field} is missing")
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        errors.append(f"{field} is not an ISO date: {value}")
        return None


def _timestamp(value: object, field: str, errors: list[str]) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{field} is missing")
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field} is not an ISO timestamp: {value}")
        return None
    if parsed.tzinfo is None:
        errors.append(f"{field} must include a timezone")
        return None
    return parsed


def _csv_by_id(path: Path, field: str) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {
            (row.get(field) or "").strip(): dict(row)
            for row in csv.DictReader(handle)
            if (row.get(field) or "").strip()
        }


def _source_maps(
    root: Path,
) -> tuple[
    dict[str, dict[str, str]],
    dict[str, dict[str, str]],
    dict[str, dict[str, str]],
]:
    sources = _csv_by_id(root / "data/sources.csv", "source_id")
    ledger = _csv_by_id(root / "refs/sources_manifest.csv", "source_id")
    decisions: dict[str, dict[str, str]] = {}
    with (root / "data/source_decisions.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if (
                (row.get("dataset_path") or "").strip() == "sources.csv"
                and (row.get("record_id") or "").strip()
                and (row.get("source_id") or "").strip()
            ):
                decisions[(row.get("source_id") or "").strip()] = dict(row)
    return sources, ledger, decisions


def _validate_source_evidence(
    evidence: object,
    source_id: str,
    sources: Mapping[str, Mapping[str, str]],
    ledger: Mapping[str, Mapping[str, str]],
    decisions: Mapping[str, Mapping[str, str]],
    as_of: date,
    errors: list[str],
    location: str,
) -> None:
    if not isinstance(evidence, dict):
        errors.append(f"{location}: sourceEvidence is missing")
        return
    if evidence.get("sourceId") != source_id:
        errors.append(f"{location}: sourceEvidence sourceId does not match {source_id}")
    source = sources.get(source_id)
    ledger_row = ledger.get(source_id)
    decision = decisions.get(source_id)
    if source is None or ledger_row is None or decision is None:
        errors.append(
            f"{location}: source {source_id} lacks canonical registry, ledger, or decision"
        )
        return
    digest = str(evidence.get("evidenceSha256") or "").lower()
    ledger_digest = (ledger_row.get("sha256") or "").strip().lower()
    if not SHA256_RE.fullmatch(digest) or digest != ledger_digest:
        errors.append(f"{location}: evidence hash does not match source ledger")
    if (decision.get("decision") or "").strip() in {"", "culled"}:
        errors.append(f"{location}: source decision is not publishable")
    if (decision.get("evidence_sha256") or "").strip().lower() != ledger_digest:
        errors.append(f"{location}: source decision hash does not match source ledger")
    review_due = _date(evidence.get("reviewDueAt"), f"{location}.reviewDueAt", errors)
    if review_due is not None and review_due < as_of:
        errors.append(f"{location}: source review is overdue")
    _timestamp(evidence.get("retrievedAt"), f"{location}.retrievedAt", errors)
    if evidence.get("retrievedAt") != (ledger_row.get("fetched_at") or "").strip():
        errors.append(f"{location}: retrievedAt disagrees with source ledger")
    if evidence.get("reviewDueAt") != (source.get("review_due_at") or "").strip():
        errors.append(f"{location}: reviewDueAt disagrees with source registry")
    if evidence.get("verificationRunUrl") != (ledger_row.get("verification_run_url") or "").strip():
        errors.append(f"{location}: verification run URL disagrees with ledger")
    if evidence.get("rawArtifactName") != (ledger_row.get("raw_artifact_name") or "").strip():
        errors.append(f"{location}: raw artifact name disagrees with ledger")
    if not VERIFICATION_URL_RE.fullmatch(str(evidence.get("verificationRunUrl") or "")):
        errors.append(f"{location}: verification run URL is not immutable")
    if not str(evidence.get("rawArtifactName") or "").strip():
        errors.append(f"{location}: raw artifact name is missing")


def _validate_source_summary(
    source_id: str,
    citation: object,
    url: object,
    sources: Mapping[str, Mapping[str, str]],
    errors: list[str],
    location: str,
) -> None:
    source = sources.get(source_id)
    if source is None:
        errors.append(f"{location}: source {source_id} is not in the canonical registry")
        return
    if citation != (source.get("ieee_citation") or "").strip():
        errors.append(f"{location}: citation disagrees with source registry")
    if url != (source.get("url") or "").strip():
        errors.append(f"{location}: URL disagrees with source registry")


def _validate_activity(
    activity: Mapping[str, Any],
    sources: Mapping[str, Mapping[str, str]],
    ledger: Mapping[str, Mapping[str, str]],
    decisions: Mapping[str, Mapping[str, str]],
    as_of: date,
    errors: list[str],
    location: str,
) -> None:
    factor = activity.get("emissionFactor")
    evidence = activity.get("evidence")
    if not isinstance(evidence, dict):
        errors.append(f"{location}: evidence object is missing")
        return
    status = evidence.get("publicationStatus")
    source_ids = evidence.get("sourceIds")
    source_citations = evidence.get("sourceCitations")
    source_urls = evidence.get("sourceUrls")
    source_evidence = evidence.get("sourceEvidence")
    if factor is None:
        if activity.get("unavailabilityReason") in (None, ""):
            errors.append(f"{location}: unavailable activity lacks a reason")
        if status != "unavailable":
            errors.append(f"{location}: null factor is not marked unavailable")
        if source_ids or source_citations or source_urls or source_evidence:
            errors.append(f"{location}: unavailable activity exposes source values")
        return
    if status != "published":
        errors.append(f"{location}: numeric factor is not marked published")
    if not isinstance(source_ids, list) or not source_ids:
        errors.append(f"{location}: numeric factor lacks source IDs")
        return
    if not isinstance(source_citations, list) or len(source_citations) != len(source_ids):
        errors.append(f"{location}: source citations do not align with source IDs")
    if not isinstance(source_urls, list) or len(source_urls) != len(source_ids):
        errors.append(f"{location}: source URLs do not align with source IDs")
    if not isinstance(source_evidence, list) or len(source_evidence) != len(source_ids):
        errors.append(f"{location}: source evidence does not align with source IDs")
    for index, source_id in enumerate(source_ids):
        if not isinstance(source_id, str):
            errors.append(f"{location}: source ID is not text")
            continue
        citation = (
            source_citations[index]
            if isinstance(source_citations, list) and index < len(source_citations)
            else None
        )
        url = (
            source_urls[index]
            if isinstance(source_urls, list) and index < len(source_urls)
            else None
        )
        _validate_source_summary(
            source_id,
            citation,
            url,
            sources,
            errors,
            f"{location}.sourceIds[{index}]",
        )
        if isinstance(source_evidence, list) and index < len(source_evidence):
            _validate_source_evidence(
                source_evidence[index],
                source_id,
                sources,
                ledger,
                decisions,
                as_of,
                errors,
                f"{location}.sourceEvidence[{index}]",
            )


def audit_publication(root: Path, as_of: date) -> list[str]:
    errors: list[str] = []
    release_path = root / generator.RELEASE_OUTPUT
    try:
        release = _json(release_path)
        generated_at = release.get("generatedAt")
        if not isinstance(generated_at, str) or not generated_at.strip():
            errors.append("release generatedAt is missing")
            generated_at = ""
        expected, remove_paths = generator._all_authority_bytes(root, generated_at)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        return [f"Unable to rebuild publication authorities: {error}"]

    for relative_path, expected_bytes in expected.items():
        actual_path = root / relative_path
        if not actual_path.is_file():
            errors.append(f"Missing generated authority: {relative_path}")
        elif actual_path.read_bytes() != expected_bytes:
            errors.append(f"Generated authority drift: {relative_path}")
    for relative_path in remove_paths:
        if (root / relative_path).exists():
            errors.append(f"Unavailable OWID authority was not removed: {relative_path}")

    try:
        sources, ledger, decisions = _source_maps(root)
    except (OSError, csv.Error) as error:
        return errors + [f"Unable to load publication provenance: {error}"]

    calculator = _json(root / generator.DEFAULT_OUTPUT)
    catalog = _json(root / generator.DEFAULT_CATALOG_OUTPUT)
    source_authority = _json(root / generator.SOURCES_OUTPUT)
    expected_source_ids = generator._active_source_ids(root)
    actual_source_ids = {
        row.get("source_id")
        for row in source_authority.get("sources", [])
        if isinstance(row, dict) and isinstance(row.get("source_id"), str)
    }
    if actual_source_ids != expected_source_ids:
        errors.append("Generated source authority is not limited to verified active sources")
    for index, activity in enumerate(calculator.get("activities", [])):
        _validate_activity(
            activity,
            sources,
            ledger,
            decisions,
            as_of,
            errors,
            f"calculator.activities[{index}]",
        )
    for index, activity in enumerate(catalog.get("activities", [])):
        _validate_activity(
            activity,
            sources,
            ledger,
            decisions,
            as_of,
            errors,
            f"catalog.activities[{index}]",
        )

    ai_records = (catalog.get("aiScenarios") or {}).get("records") or []
    for index, record in enumerate(ai_records):
        refs = record.get("sourceRefs")
        if not isinstance(refs, list) or not refs:
            errors.append(f"catalog.aiScenarios.records[{index}] lacks source references")
            continue
        for ref_index, ref in enumerate(refs):
            if not isinstance(ref, dict) or not isinstance(ref.get("sourceId"), str):
                errors.append(
                    f"catalog.aiScenarios.records[{index}].sourceRefs[{ref_index}] is malformed"
                )
                continue
            source_id = ref["sourceId"]
            _validate_source_summary(
                source_id,
                ref.get("citation"),
                ref.get("url"),
                sources,
                errors,
                f"catalog.aiScenarios.records[{index}].sourceRefs[{ref_index}]",
            )
            _validate_source_evidence(
                ref.get("sourceEvidence"),
                source_id,
                sources,
                ledger,
                decisions,
                as_of,
                errors,
                f"catalog.aiScenarios.records[{index}].sourceRefs[{ref_index}]",
            )
            source_evidence = ref.get("sourceEvidence")
            if isinstance(source_evidence, dict) and ref.get("retrievedAt") != source_evidence.get(
                "retrievedAt"
            ):
                errors.append(
                    f"catalog.aiScenarios.records[{index}].sourceRefs[{ref_index}]: "
                    "retrievedAt disagrees with source evidence"
                )
        if record.get("publicationStatus") == "unavailable" and (
            record.get("energyWh") is not None or record.get("carbonGPerUnit") is not None
        ):
            errors.append(
                f"catalog.aiScenarios.records[{index}] unavailable record exposes a value"
            )

    calculator_benchmarks = calculator.get("benchmarks") or {}
    for key, benchmark in calculator_benchmarks.items():
        if not isinstance(benchmark, dict):
            errors.append(f"calculator.benchmarks.{key} is malformed")
            continue
        source_id = benchmark.get("sourceId")
        if not isinstance(source_id, str) or not source_id:
            errors.append(f"calculator.benchmarks.{key} lacks source ID")
        else:
            _validate_source_summary(
                source_id,
                benchmark.get("sourceCitation"),
                benchmark.get("sourceUrl"),
                sources,
                errors,
                f"calculator.benchmarks.{key}",
            )
            _validate_source_evidence(
                benchmark.get("sourceEvidence"),
                source_id,
                sources,
                ledger,
                decisions,
                as_of,
                errors,
                f"calculator.benchmarks.{key}.sourceEvidence",
            )
        population_source_id = benchmark.get("populationSourceId")
        if not isinstance(population_source_id, str) or not population_source_id:
            errors.append(f"calculator.benchmarks.{key} lacks population source ID")
        else:
            _validate_source_summary(
                population_source_id,
                benchmark.get("populationCitation"),
                benchmark.get("populationSourceUrl"),
                sources,
                errors,
                f"calculator.benchmarks.{key}",
            )
            _validate_source_evidence(
                benchmark.get("populationSourceEvidence"),
                population_source_id,
                sources,
                ledger,
                decisions,
                as_of,
                errors,
                f"calculator.benchmarks.{key}.populationSourceEvidence",
            )
    authority_records = release.get("authorities")
    if not isinstance(authority_records, dict):
        errors.append("release authorities are missing")
    else:
        for name, authority in authority_records.items():
            if not isinstance(authority, dict):
                errors.append(f"release authority {name} is malformed")
                continue
            path_value = authority.get("path")
            expected_hash = str(authority.get("sha256") or "").lower()
            if not isinstance(path_value, str) or not path_value.startswith("/data/"):
                errors.append(f"release authority {name} has an invalid path")
                continue
            actual_path = root / generator.PUBLIC_DATA_ROOT / path_value.removeprefix("/data/")
            if not actual_path.is_file() or _sha256(actual_path.read_bytes()) != expected_hash:
                errors.append(f"release authority {name} hash does not match public bytes")

    owid_release = release.get("owid")
    raw_authorities = owid_release.get("rawAuthorities") if isinstance(owid_release, dict) else None
    context_available = isinstance(owid_release, dict) and owid_release.get("status") == "available"
    if context_available and not isinstance(raw_authorities, dict):
        errors.append("release OWID rawAuthorities are missing for an available snapshot")
    if not context_available and raw_authorities is not None:
        errors.append("release OWID rawAuthorities must be null when the snapshot is unavailable")
    if isinstance(raw_authorities, dict):
        for filename in generator.OWID_RAW_FILENAMES:
            authority = raw_authorities.get(filename)
            if not isinstance(authority, dict):
                errors.append(f"release OWID raw authority is missing: {filename}")
                continue
            actual_path = root / generator.PUBLIC_DATA_ROOT / "owid" / filename
            expected_hash = str(authority.get("sha256") or "").lower()
            if (
                authority.get("path") != f"/data/owid/{filename}"
                or not actual_path.is_file()
                or _sha256(actual_path.read_bytes()) != expected_hash
            ):
                errors.append(f"release OWID raw authority hash does not match: {filename}")

    forbidden = ("SRC.DEMO", "EF.DEMO")
    for payload_path in (root / generator.DEFAULT_OUTPUT, root / generator.DEFAULT_CATALOG_OUTPUT):
        text = payload_path.read_text(encoding="utf-8")
        for token in forbidden:
            if token in text:
                errors.append(f"Forbidden demo token in generated authority: {payload_path}")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit generated publication authorities")
    parser.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--as-of", required=True, help="Audit date in YYYY-MM-DD format")
    args = parser.parse_args(argv)
    try:
        as_of = date.fromisoformat(args.as_of)
    except ValueError as error:
        parser.error("--as-of must be YYYY-MM-DD")
        raise AssertionError from error
    errors = audit_publication(Path(args.repo_root).resolve(), as_of)
    if errors:
        for error in errors:
            print(f"::error::{error}")
        return 1
    print(f"Publication audit passed (as-of {as_of.isoformat()}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
