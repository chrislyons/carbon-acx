"""Shared utilities for the reference ingestion pipeline."""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse

MANIFEST_FIELDNAMES = [
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
]

DISCOVERY_EXTENSIONS = {".txt", ".md", ".json", ".yaml", ".yml"}

URL_REGEX = re.compile(r"https?://[^\s)\]>]+", re.IGNORECASE)
DOI_REGEX = re.compile(r"10\.\d{4,9}/[^\s>]+", re.IGNORECASE)
ARXIV_REGEX = re.compile(r"arXiv:([\w.-]+)", re.IGNORECASE)
YEAR_REGEX = re.compile(r"(19|20)\d{2}")


@dataclass
class SourceIdOverrides:
    """Simple helper that loads manual overrides for discovery heuristics."""

    by_url: Dict[str, str] = field(default_factory=dict)
    by_doi: Dict[str, str] = field(default_factory=dict)
    rename: Dict[str, str] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path) -> "SourceIdOverrides":
        if not path.exists():
            return cls()
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive
            raise RuntimeError(f"Failed to parse overrides file {path}: {exc}") from exc

        return cls(
            by_url={k.strip(): v.strip() for k, v in data.get("by_url", {}).items()},
            by_doi={k.strip(): v.strip() for k, v in data.get("by_doi", {}).items()},
            rename={k.strip(): v.strip() for k, v in data.get("rename", {}).items()},
        )

    def resolve_url(self, url: str) -> Optional[str]:
        return self.by_url.get(url.strip())

    def resolve_doi(self, doi: str) -> Optional[str]:
        return self.by_doi.get(doi.strip())

    def rename_id(self, source_id: str) -> str:
        return self.rename.get(source_id, source_id)


@dataclass
class DiscoveredSource:
    source_id: str
    src_url: str
    discovered_from: Set[Path] = field(default_factory=set)
    note: str = ""
    metadata: Dict[str, str] = field(default_factory=dict)

    def add_path(self, path: Path) -> None:
        self.discovered_from.add(path)


@dataclass
class ManifestRow:
    source_id: str
    src_url: str
    final_url: str = ""
    http_status: str = ""
    content_type: str = ""
    filesize_bytes: str = ""
    sha256: str = ""
    stored_as: str = ""
    license_note: str = ""
    fetched_at: str = ""
    normalized_md: str = ""
    normalized_sha256: str = ""
    notes: str = ""

    @classmethod
    def from_row(cls, row: Dict[str, str]) -> "ManifestRow":
        kwargs = {field: row.get(field, "") for field in MANIFEST_FIELDNAMES}
        return cls(**kwargs)

    def to_row(self) -> Dict[str, str]:
        return {field: getattr(self, field, "") for field in MANIFEST_FIELDNAMES}


def _slugify(text: str, min_length: int = 6) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", ".", text).strip(".")
    cleaned = cleaned or "SOURCE"
    if len(cleaned) < min_length:
        cleaned = f"{cleaned}.{('X' * (min_length - len(cleaned)))}"
    return cleaned.upper()


def _derive_base_id(
    file_path: Path,
    url: str,
    existing_ids: Set[str],
    overrides: SourceIdOverrides,
    text: str,
) -> str:
    stem = file_path.stem.upper()
    if stem.startswith("SRC."):
        return overrides.rename_id(stem)

    parsed = urlparse(url)
    host = _slugify(parsed.hostname or "HOST")
    year_match = YEAR_REGEX.search(text)
    year = year_match.group(0) if year_match else "UNKNOWN"
    title_line = next((line for line in text.splitlines() if line.strip()), "")
    slug = _slugify(title_line or stem)
    base = f"SRC.{host}.{year}.{slug}".upper()
    candidate = overrides.rename_id(base)
    if candidate in existing_ids:
        suffix = 1
        while f"{candidate}.{suffix}" in existing_ids:
            suffix += 1
        candidate = f"{candidate}.{suffix}"
    return candidate


def _clean_url(url: str) -> str:
    trimmed = url.strip()
    while trimmed and trimmed[-1] in {'.', ',', ';', ')', ']', '"', '\''}:
        trimmed = trimmed[:-1]
    return trimmed


def _normalize_doi(doi: str) -> str:
    canonical = doi.strip().strip('.')
    return f"https://doi.org/{canonical}"


def _normalize_arxiv(arxiv: str) -> str:
    return f"https://arxiv.org/abs/{arxiv.strip()}"


def load_data_sources(path: Path) -> Dict[str, Dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        return {row["source_id"]: row for row in reader if row.get("source_id")}


def discover_sources(
    reference_root: Path,
    overrides: SourceIdOverrides,
    data_sources_path: Optional[Path] = None,
) -> List[DiscoveredSource]:
    """Parse reference seed files for URLs, DOIs, and arXiv IDs."""

    existing_sources = load_data_sources(data_sources_path) if data_sources_path else {}
    existing_by_url = {
        row.get("url", "").strip(): source_id
        for source_id, row in existing_sources.items()
        if row.get("url")
    }
    existing_ids: Set[str] = set(existing_sources)

    discovered: Dict[str, DiscoveredSource] = {}

    for file_path in sorted(reference_root.rglob("*")):
        if file_path.is_dir():
            continue
        if file_path.suffix and file_path.suffix.lower() not in DISCOVERY_EXTENSIONS:
            continue
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1", errors="ignore")

        urls = {_clean_url(match.group(0)) for match in URL_REGEX.finditer(text)}
        dois = {match.group(0) for match in DOI_REGEX.finditer(text)}
        arxiv_ids = {match.group(1) for match in ARXIV_REGEX.finditer(text)}

        doi_lookup = {}
        for doi in dois:
            normalized = _normalize_doi(doi)
            doi_lookup[normalized] = doi
            urls.add(normalized)
        for arxiv_id in arxiv_ids:
            normalized = _normalize_arxiv(arxiv_id)
            urls.add(normalized)

        for url in sorted(urls):
            if not url:
                continue
            override_id = overrides.resolve_url(url)
            if not override_id and url in doi_lookup:
                override_id = overrides.resolve_doi(doi_lookup[url])
            existing_match = existing_by_url.get(url)
            if override_id:
                candidate_id = override_id
                reuse_existing = True
            elif existing_match:
                candidate_id = existing_match
                reuse_existing = True
            else:
                candidate_id = _derive_base_id(file_path, url, existing_ids, overrides, text)
                reuse_existing = False
            candidate_id = overrides.rename_id(candidate_id)

            existing_entry = discovered.get(candidate_id)
            if existing_entry:
                if existing_entry.src_url == url:
                    existing_entry.add_path(file_path)
                    continue
                base_id = candidate_id
            else:
                base_id = candidate_id

            if not reuse_existing and candidate_id in existing_ids and (
                not existing_entry or existing_entry.src_url != url
            ):
                suffix = 1
                while f"{base_id}.{suffix}" in existing_ids or f"{base_id}.{suffix}" in discovered:
                    suffix += 1
                candidate_id = f"{base_id}.{suffix}"

            if candidate_id not in discovered:
                metadata = existing_sources.get(candidate_id, {}).copy()
                discovered[candidate_id] = DiscoveredSource(
                    source_id=candidate_id,
                    src_url=url,
                    metadata=metadata,
                )
                existing_ids.add(candidate_id)
            discovered[candidate_id].add_path(file_path)

    return sorted(discovered.values(), key=lambda item: item.source_id)


def load_manifest(path: Path) -> Dict[str, ManifestRow]:
    if not path.exists():
        return {}
    with path.open(newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        manifest: Dict[str, ManifestRow] = {}
        for row in reader:
            source_id = row.get("source_id")
            if not source_id:
                continue
            manifest[source_id] = ManifestRow.from_row(row)
        return manifest


def write_manifest(path: Path, manifest: Dict[str, ManifestRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=MANIFEST_FIELDNAMES)
        writer.writeheader()
        for source_id in sorted(manifest):
            writer.writerow(manifest[source_id].to_row())


def load_allow_missing(path: Path) -> Set[str]:
    if not path.exists():
        return set()
    entries = {
        line.strip()
        for line in path.read_text().splitlines()
        if line.strip() and not line.strip().startswith("#")
    }
    return set(entries)
