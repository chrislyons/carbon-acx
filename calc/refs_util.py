"""Shared helpers for the source-registry retrieval workflow."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import MutableMapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
REFS_DIR = REPO_ROOT / "refs"
RAW_DIR = REFS_DIR / "raw"
NORMALIZED_DIR = REFS_DIR / "normalized"
MANIFEST_PATH = REFS_DIR / "sources_manifest.csv"
SOURCES_CSV_PATH = REPO_ROOT / "data" / "sources.csv"
DATAFLOW_MANIFEST_PATH = REPO_ROOT / "data" / "dataflow_manifest.csv"

INLINE_SRC_RE = re.compile(r"\bSRC[.\w-]+", re.IGNORECASE)


@dataclass(frozen=True)
class SourceCatalogEntry:
    """Row extracted from the canonical source registry."""

    source_id: str
    url: str | None = None
    year: str | None = None
    license: str | None = None
    review_due_at: str | None = None
    ieee_citation: str | None = None


@dataclass
class ReferenceCandidate:
    """A source-registry entry selected for retrieval."""

    source_id: str
    primary_url: str | None
    urls: list[str] = field(default_factory=list)
    catalog_entry: SourceCatalogEntry | None = None


ManifestRow = MutableMapping[str, str]


def normalize_url(raw: str) -> str:
    """Normalize URLs to reduce duplicates."""

    return raw.strip().strip(".);,]>")


def load_source_catalog(path: Path | None = None) -> dict[str, SourceCatalogEntry]:
    """Load source metadata from the canonical CSV registry."""

    target = path or SOURCES_CSV_PATH
    catalog: dict[str, SourceCatalogEntry] = {}
    if not target.exists():
        return catalog
    with target.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            source_id = (row.get("source_id") or "").strip()
            if not source_id:
                continue
            catalog[source_id] = SourceCatalogEntry(
                source_id=source_id,
                url=(row.get("url") or "").strip() or None,
                year=(row.get("year") or "").strip() or None,
                license=(row.get("license") or "").strip() or None,
                review_due_at=(row.get("review_due_at") or "").strip() or None,
                ieee_citation=(row.get("ieee_citation") or "").strip() or None,
            )
    return catalog


def load_manifest(path: Path | None = None) -> list[ManifestRow]:
    """Load the retrieval ledger, returning an empty list when absent."""

    target = path or MANIFEST_PATH
    if not target.exists():
        return []
    with target.open("r", encoding="utf-8", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def load_active_source_ids(
    dataflow_manifest_path: Path | None = None,
    repo_root: Path | None = None,
) -> set[str]:
    """Return source IDs referenced by publishable data inputs.

    The source registry itself is governance metadata, not a claim-bearing input;
    its rows therefore do not make every registry entry active.
    """

    manifest_path = dataflow_manifest_path or DATAFLOW_MANIFEST_PATH
    root = repo_root or REPO_ROOT
    if not manifest_path.exists():
        return set()

    active: set[str] = set()
    with manifest_path.open("r", encoding="utf-8", newline="") as handle:
        manifest_rows = list(csv.DictReader(handle))

    for spec in manifest_rows:
        dataset = (spec.get("dataset_path") or "").strip()
        source_columns = [
            item.split("=", 1)[0].strip()
            for item in (spec.get("source_columns") or "").split("|")
            if item.strip()
        ]
        path = root / "data" / dataset
        if dataset == "sources.csv" or not path.exists():
            continue
        if path.suffix.lower() == ".json":
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            source_id = payload.get("sourceId") or payload.get("source_id")
            if isinstance(source_id, str) and source_id.strip():
                active.add(source_id.strip())
            continue
        if not source_columns:
            continue
        try:
            lines = [
                line
                for line in path.read_text(encoding="utf-8").splitlines()
                if line.strip() and not line.lstrip().startswith("#")
            ]
            rows = csv.DictReader(lines)
        except OSError:
            continue
        for row in rows:
            for column in source_columns:
                value = (row.get(column) or "").strip()
                active.update(
                    match.group(0).rstrip(".,;") for match in INLINE_SRC_RE.finditer(value)
                )
    return active


def write_manifest(rows: Sequence[ManifestRow], path: Path | None = None) -> None:
    """Write a deterministic retrieval ledger."""

    target = path or MANIFEST_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
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
        "verification_run_url",
        "raw_artifact_name",
        "notes",
    ]
    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({name: row.get(name, "") for name in fieldnames})


def hash_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def hash_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def timestamp_now() -> str:
    return datetime.now(timezone.utc).isoformat()
