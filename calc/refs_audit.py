"""Audit manifest coverage for reference materials."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Mapping, Sequence

from .refs_util import (
    REFS_DIR,
    discover_reference_candidates,
    hash_file,
    load_allow_missing,
    load_manifest,
    load_overrides,
    load_source_catalog,
)

REQUIRED_COLUMNS = {
    "source_id",
    "src_url",
    "final_url",
    "http_status",
    "content_type",
    "filesize_bytes",
    "sha256",
    "stored_as",
    "license_note",
    "fetched_at",
    "normalized_md",
    "normalized_sha256",
    "notes",
}


def _validate_columns(manifest: Sequence[Mapping[str, str]]) -> list[str]:
    if not manifest:
        return ["sources_manifest.csv is empty"]
    columns = set(manifest[0].keys())
    missing = REQUIRED_COLUMNS - columns
    if missing:
        return [f"Manifest missing required columns: {', '.join(sorted(missing))}"]
    return []


def _validate_duplicates(manifest: Sequence[Mapping[str, str]]) -> list[str]:
    seen: set[str] = set()
    duplicates: list[str] = []
    for row in manifest:
        source_id = (row.get("source_id") or "").strip()
        if not source_id:
            duplicates.append("Manifest row missing source_id")
            continue
        if source_id in seen:
            duplicates.append(f"Duplicate manifest row for {source_id}")
        seen.add(source_id)
    return duplicates


def _validate_hashes(manifest: Sequence[Mapping[str, str]], is_ci: bool) -> list[str]:
    if is_ci:
        return []
    errors: list[str] = []
    for row in manifest:
        source_id = row.get("source_id", "")
        stored_as = row.get("stored_as", "")
        sha_expected = row.get("sha256", "")
        size_expected = row.get("filesize_bytes", "")
        if not stored_as:
            continue
        path = Path(stored_as)
        if not path.is_absolute():
            path = (REFS_DIR.parent / path).resolve()
        if not path.exists():
            errors.append(f"Raw file missing for {source_id}: {path}")
            continue
        sha_actual = hash_file(path)
        size_actual = str(path.stat().st_size)
        if sha_expected and sha_expected != sha_actual:
            errors.append(f"SHA mismatch for {source_id}: expected {sha_expected}, got {sha_actual}")
        if size_expected and size_expected != size_actual:
            errors.append(f"Size mismatch for {source_id}: expected {size_expected}, got {size_actual}")
    return errors


def _validate_coverage(
    manifest: Sequence[Mapping[str, str]],
    allow_missing: set[str],
    reference_candidates: Mapping[str, object],
    catalog: Mapping[str, object],
) -> list[str]:
    manifest_ids = {row.get("source_id", "") for row in manifest}
    expected = set(reference_candidates.keys()) | {key for key in catalog.keys() if key}
    missing = [
        source_id
        for source_id in expected
        if source_id not in manifest_ids and source_id not in allow_missing
    ]
    if missing:
        return [
            "Manifest missing rows for: " + ", ".join(sorted(missing)),
        ]
    return []


def run() -> int:
    manifest = load_manifest()
    allow_missing = load_allow_missing()
    catalog = load_source_catalog()
    overrides = load_overrides()
    candidates = discover_reference_candidates(overrides=overrides, catalog=catalog)
    errors: list[str] = []
    errors.extend(_validate_columns(manifest))
    errors.extend(_validate_duplicates(manifest))
    errors.extend(_validate_hashes(manifest, is_ci=bool(os.getenv("CI"))))
    errors.extend(_validate_coverage(manifest, allow_missing, candidates, catalog))

    if errors:
        for message in errors:
            print(f"::error::{message}")
        return 1

    print(f"Manifest audit passed ({len(manifest)} rows).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit reference manifest consistency")
    parser.parse_args()
    return run()


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
