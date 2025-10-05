from __future__ import annotations

import csv
import sys
from pathlib import Path
from typing import Dict, List

from .refs_common import (
    MANIFEST_HEADERS,
    DiscoveredSource,
    ManifestRow,
    discover_sources,
    hash_file,
    load_overrides,
    load_sources_metadata,
    read_allow_missing,
)

MANIFEST_PATH = Path("refs/sources_manifest.csv")
REFERENCES_ROOT = Path("calc/references")
ALLOW_MISSING_PATH = Path("refs/ALLOW_MISSING.txt")
OVERRIDES_PATH = Path("refs/source_id_overrides.json")
SOURCES_CSV_PATH = Path("data/sources.csv")


class AuditError(Exception):
    pass


def validate_manifest_structure() -> Dict[str, ManifestRow]:
    if not MANIFEST_PATH.exists():
        raise AuditError("Manifest does not exist. Run refs-fetch first.")
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(MANIFEST_HEADERS):
            raise AuditError("Manifest headers do not match expected schema")
        rows: Dict[str, ManifestRow] = {}
        seen = set()
        for raw_row in reader:
            source_id = (raw_row.get("source_id") or "").strip()
            if not source_id:
                raise AuditError("Manifest row missing source_id")
            if source_id in seen:
                raise AuditError(f"Duplicate source_id in manifest: {source_id}")
            seen.add(source_id)
            rows[source_id] = ManifestRow(raw_row)
    return rows


def validate_discovery(
    discovered: Dict[str, DiscoveredSource], manifest: Dict[str, ManifestRow]
) -> List[str]:
    allow_missing = read_allow_missing(ALLOW_MISSING_PATH)
    errors: List[str] = []
    for source_id in discovered:
        if source_id not in manifest and source_id not in allow_missing:
            errors.append(f"Missing manifest row for {source_id}")
    return errors


def validate_storage(manifest: Dict[str, ManifestRow]) -> List[str]:
    errors: List[str] = []
    for row in manifest.values():
        stored = row.stored_path
        if stored:
            if not stored.exists():
                errors.append(f"Stored file missing for {row.source_id}: {stored}")
                continue
            size = str(stored.stat().st_size)
            if row.data.get("filesize_bytes") and row.data.get("filesize_bytes") != size:
                errors.append(f"Size mismatch for {row.source_id}")
            digest = hash_file(stored)
            if row.data.get("sha256") and row.data.get("sha256") != digest:
                errors.append(f"Hash mismatch for {row.source_id}")
        normalized = row.normalized_path
        if row.data.get("normalized_md"):
            if not normalized or not normalized.exists():
                errors.append(f"Normalized file missing for {row.source_id}")
            else:
                content = normalized.read_text(encoding="utf-8", errors="ignore")
                if not content.strip():
                    errors.append(f"Normalized file empty for {row.source_id}")
    return errors


def main() -> None:
    overrides = load_overrides(OVERRIDES_PATH)
    metadata = load_sources_metadata(SOURCES_CSV_PATH)
    discovered = discover_sources(REFERENCES_ROOT, overrides, metadata)
    try:
        manifest = validate_manifest_structure()
    except AuditError as exc:
        print(f"refs-audit: {exc}")
        sys.exit(1)
    errors: List[str] = []
    errors.extend(validate_discovery(discovered, manifest))
    errors.extend(validate_storage(manifest))
    if errors:
        for error in errors:
            print(f"refs-audit: {error}")
        sys.exit(1)
    print("refs-audit: OK")


if __name__ == "__main__":
    main()
