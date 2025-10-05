"""Shared helpers for the reference retrieval workflow."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Mapping, MutableMapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
REFERENCES_DIR = REPO_ROOT / "calc" / "references"
REFS_DIR = REPO_ROOT / "refs"
RAW_DIR = REFS_DIR / "raw"
NORMALIZED_DIR = REFS_DIR / "normalized"
MANIFEST_PATH = REFS_DIR / "sources_manifest.csv"
ALLOW_MISSING_PATH = REFS_DIR / "ALLOW_MISSING.txt"
OVERRIDES_PATH = REFS_DIR / "source_id_overrides.json"
SOURCES_CSV_PATH = REPO_ROOT / "data" / "sources.csv"

URL_RE = re.compile(r"https?://[^\s>'\"]+")
DOI_RE = re.compile(r"10\.\d{4,9}/\S+")
ARXIV_RE = re.compile(r"arXiv:(\S+)", re.IGNORECASE)
INLINE_SRC_RE = re.compile(r"\bSRC[.\w-]+", re.IGNORECASE)
YEAR_RE = re.compile(r"(19|20)\d{2}")


@dataclass
class SourceCatalogEntry:
    """Row extracted from ``data/sources.csv``."""

    source_id: str
    url: str | None = None
    year: str | None = None
    license: str | None = None
    ieee_citation: str | None = None


@dataclass
class ReferenceCandidate:
    """A discovered reference candidate from ``calc/references``."""

    source_id: str
    primary_url: str | None
    urls: list[str] = field(default_factory=list)
    origin_paths: list[Path] = field(default_factory=list)
    inline_ids: set[str] = field(default_factory=set)
    citation_text: str | None = None
    catalog_entry: SourceCatalogEntry | None = None

    def merged_metadata(self) -> dict[str, str]:
        data: dict[str, str] = {}
        if self.catalog_entry:
            if self.catalog_entry.ieee_citation:
                data["ieee_citation"] = self.catalog_entry.ieee_citation
            if self.catalog_entry.year:
                data["year"] = self.catalog_entry.year
            if self.catalog_entry.license:
                data["license"] = self.catalog_entry.license
        return data


ManifestRow = MutableMapping[str, str]


def normalize_url(raw: str) -> str:
    """Normalize URLs to reduce duplicates."""

    cleaned = raw.strip().strip(".);,]>")
    return cleaned


def doi_to_url(doi: str) -> str:
    cleaned = doi.strip().strip(".")
    return f"https://doi.org/{cleaned}"


def arxiv_to_url(identifier: str) -> str:
    value = identifier.strip().replace("arXiv:", "", 1)
    return f"https://arxiv.org/abs/{value}"


def _slugify(token: str) -> str:
    token = re.sub(r"[^A-Za-z0-9]+", "_", token)
    token = re.sub(r"_+", "_", token)
    return token.strip("_") or "REF"


def synthesize_source_id(url: str, fallback_label: str | None = None) -> str:
    parsed = re.sub(r"^https?://", "", url)
    host = parsed.split("/", 1)[0]
    host_slug = _slugify(host.split(":")[0]) or "HOST"
    year_match = YEAR_RE.search(url)
    year = year_match.group(0) if year_match else "UNK"
    slug_source = fallback_label or parsed.split("/", 1)[-1]
    slug = _slugify(slug_source)[:40]
    return f"SRC.{host_slug.upper()}.{year}.{slug.upper()}"


def _extract_inline_ids(text: str) -> list[str]:
    return [match.group(0).rstrip(".,;") for match in INLINE_SRC_RE.finditer(text)]


def _extract_urls(text: str) -> list[str]:
    return [normalize_url(match.group(0)) for match in URL_RE.finditer(text)]


def _extract_dois(text: str) -> list[str]:
    return [match.group(0).rstrip(".,;") for match in DOI_RE.finditer(text)]


def _extract_arxiv(text: str) -> list[str]:
    return [match.group(1).rstrip(".,;") for match in ARXIV_RE.finditer(text)]


def load_source_catalog(path: Path | None = None) -> dict[str, SourceCatalogEntry]:
    target = path or SOURCES_CSV_PATH
    catalog: dict[str, SourceCatalogEntry] = {}
    if not target.exists():
        return catalog
    with target.open("r", encoding="utf-8") as handle:
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
                ieee_citation=(row.get("ieee_citation") or "").strip() or None,
            )
    return catalog


def load_overrides(path: Path | None = None) -> dict[str, str]:
    target = path or OVERRIDES_PATH
    if not target.exists():
        return {}
    data = json.loads(target.read_text(encoding="utf-8"))
    mapping: dict[str, str] = {}
    if isinstance(data, Mapping):
        by_url = data.get("by_url") if isinstance(data.get("by_url"), Mapping) else {}
        for key, value in by_url.items():
            if isinstance(key, str) and isinstance(value, str):
                mapping[normalize_url(key)] = value
    return mapping


def load_manifest(path: Path | None = None) -> list[ManifestRow]:
    target = path or MANIFEST_PATH
    if not target.exists():
        return []
    with target.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[ManifestRow] = [dict(row) for row in reader]
    return rows


def write_manifest(rows: Sequence[ManifestRow], path: Path | None = None) -> None:
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
        "notes",
    ]
    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
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


def load_allow_missing(path: Path | None = None) -> set[str]:
    target = path or ALLOW_MISSING_PATH
    if not target.exists():
        return set()
    allow: set[str] = set()
    for line in target.read_text(encoding="utf-8").splitlines():
        candidate = line.strip()
        if not candidate or candidate.startswith("#"):
            continue
        allow.add(candidate)
    return allow


def discover_reference_candidates(
    reference_root: Path | None = None,
    overrides: Mapping[str, str] | None = None,
    catalog: Mapping[str, SourceCatalogEntry] | None = None,
) -> dict[str, ReferenceCandidate]:
    root = reference_root or REFERENCES_DIR
    override_map = dict(overrides or {})
    catalog_map = dict(catalog or {})
    candidates: dict[str, ReferenceCandidate] = {}
    if not root.exists():
        return candidates

    for path in sorted(root.rglob("*.txt")):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="ignore")
        inline_ids = _extract_inline_ids(text)
        urls = _extract_urls(text)
        doi_urls = [doi_to_url(doi) for doi in _extract_dois(text)]
        arxiv_urls = [arxiv_to_url(identifier) for identifier in _extract_arxiv(text)]

        combined_urls = urls + doi_urls + arxiv_urls
        combined_urls = [normalize_url(url) for url in combined_urls]

        if not combined_urls:
            fallback_entry = catalog_map.get(path.stem)
            if fallback_entry and fallback_entry.url:
                combined_urls = [normalize_url(fallback_entry.url)]

        unique_urls: list[str] = []
        seen = set()
        for url in combined_urls:
            if not url:
                continue
            if url not in seen:
                unique_urls.append(url)
                seen.add(url)

        if not unique_urls and not inline_ids:
            # nothing to record
            continue

        canonical_id = None
        for candidate_id in inline_ids:
            if candidate_id.upper().startswith("SRC."):
                canonical_id = candidate_id.strip().upper()
                break

        if not canonical_id:
            canonical_id = path.stem

        if canonical_id not in catalog_map and unique_urls:
            for url in unique_urls:
                override_id = override_map.get(url)
                if override_id:
                    canonical_id = override_id
                    break

        if canonical_id not in catalog_map and unique_urls:
            canonical_id = synthesize_source_id(unique_urls[0], canonical_id)

        entry = catalog_map.get(canonical_id)
        primary_url = (
            entry.url if entry and entry.url else (unique_urls[0] if unique_urls else None)
        )

        existing = candidates.get(canonical_id)
        if existing:
            existing.urls = sorted({*existing.urls, *unique_urls})
            existing.origin_paths.append(path)
            existing.inline_ids.update(inline_ids)
            if not existing.citation_text:
                existing.citation_text = text
        else:
            candidates[canonical_id] = ReferenceCandidate(
                source_id=canonical_id,
                primary_url=primary_url,
                urls=unique_urls,
                origin_paths=[path],
                inline_ids=set(inline_ids),
                citation_text=text,
                catalog_entry=entry,
            )
    return candidates


def merge_manifest(
    existing: Sequence[ManifestRow], updates: Mapping[str, ManifestRow]
) -> list[ManifestRow]:
    lookup = {row.get("source_id", ""): dict(row) for row in existing if row.get("source_id")}
    for key, row in updates.items():
        lookup[key] = {**lookup.get(key, {}), **row, "source_id": key}
    ordered_keys = sorted(lookup)
    return [lookup[key] for key in ordered_keys]


def iter_discovered_source_ids(reference_root: Path | None = None) -> Iterator[str]:
    catalog = load_source_catalog()
    overrides = load_overrides()
    candidates = discover_reference_candidates(reference_root, overrides, catalog)
    for source_id in sorted(candidates):
        yield source_id
