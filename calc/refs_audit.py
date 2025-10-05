"""Offline audits for the reference ingestion pipeline."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import List

from .refs_common import SourceIdOverrides, discover_sources, load_allow_missing, load_manifest


LOGGER = logging.getLogger(__name__)


def compute_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def audit_manifest(repo_root: Path) -> int:
    refs_root = repo_root / "refs"
    references_root = repo_root / "calc" / "references"
    manifest_path = refs_root / "sources_manifest.csv"
    allow_missing_path = refs_root / "ALLOW_MISSING.txt"
    overrides_path = refs_root / "source_id_overrides.json"

    overrides = SourceIdOverrides.load(overrides_path)
    discovered = discover_sources(references_root, overrides, repo_root / "data" / "sources.csv")
    manifest = load_manifest(manifest_path)
    allow_missing = load_allow_missing(allow_missing_path)

    errors: List[str] = []

    discovered_ids = {item.source_id for item in discovered}
    for item in discovered:
        if item.source_id not in manifest and item.source_id not in allow_missing:
            errors.append(f"Missing manifest entry for {item.source_id}")

    for source_id, row in manifest.items():
        if row.src_url and source_id not in discovered_ids:
            LOGGER.warning("Manifest entry %s not discovered in seed files", source_id)

        if row.stored_as:
            raw_path = refs_root / row.stored_as
            if not raw_path.exists():
                errors.append(f"Stored file missing for {source_id}: {raw_path}")
            else:
                actual_size = raw_path.stat().st_size
                if row.filesize_bytes and row.filesize_bytes.isdigit():
                    expected_size = int(row.filesize_bytes)
                    if expected_size != actual_size:
                        errors.append(
                            f"Size mismatch for {source_id}: manifest {expected_size}, actual {actual_size}"
                        )
                actual_hash = compute_sha256(raw_path)
                if row.sha256 and row.sha256 != actual_hash:
                    errors.append(f"SHA mismatch for {source_id}")

        if row.normalized_md:
            normalized_path = refs_root / row.normalized_md
            if not normalized_path.exists():
                errors.append(f"Normalized Markdown missing for {source_id}")
            else:
                if row.normalized_sha256:
                    actual_hash = compute_sha256(normalized_path)
                    if row.normalized_sha256 != actual_hash:
                        errors.append(f"Normalized SHA mismatch for {source_id}")
                if normalized_path.stat().st_size == 0:
                    errors.append(f"Normalized Markdown empty for {source_id}")

    if errors:
        for message in errors:
            LOGGER.error(message)
        return 1

    LOGGER.info("Reference audit passed (%s entries)", len(manifest))
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    repo_root = Path.cwd()
    return audit_manifest(repo_root)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
