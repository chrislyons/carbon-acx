from __future__ import annotations

import csv
import fnmatch
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set

REFERENCE_EXTENSIONS = {".txt", ".md", ".json", ".yaml", ".yml"}
URL_RE = re.compile(r"https?://[^\s<>\"]+")
DOI_RE = re.compile(r"10\.\d{4,9}/\S+")
ARXIV_RE = re.compile(r"arXiv:(\S+)")
MANIFEST_HEADERS = [
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
LICENSE_NOTES = {
    "ok-public",
    "cc-by-4.0",
    "gov-open",
    "copyright-unknown",
    "paywalled",
    "robots-disallow",
}
DEFAULT_LICENSE_NOTE = "copyright-unknown"


@dataclass
class DiscoveredSource:
    source_id: str
    src_url: str
    discovered_from: Set[Path] = field(default_factory=set)
    notes: List[str] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass
class ManifestRow:
    data: Dict[str, str]

    def update(self, **fields: str) -> None:
        for key, value in fields.items():
            if value is None:
                continue
            self.data[key] = value

    @property
    def source_id(self) -> str:
        return self.data["source_id"]

    @property
    def stored_path(self) -> Optional[Path]:
        stored = self.data.get("stored_as", "").strip()
        if not stored:
            return None
        return Path(stored)

    @property
    def normalized_path(self) -> Optional[Path]:
        normalized = self.data.get("normalized_md", "").strip()
        if not normalized:
            return None
        return Path(normalized)


def _normalize_match(value: str) -> str:
    value = value.strip()
    value = value.rstrip(".,);]")
    return value


def _normalize_doi(doi: str) -> str:
    doi = _normalize_match(doi)
    return f"https://doi.org/{doi}"


def _normalize_arxiv(arxiv: str) -> str:
    arxiv = _normalize_match(arxiv)
    arxiv = arxiv.replace("arXiv:", "")
    return f"https://arxiv.org/abs/{arxiv}"


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", value)
    cleaned = cleaned.strip("-")
    return cleaned.upper() or "UNKNOWN"


def _host_slug(url: str) -> str:
    match = re.match(r"https?://([^/]+)/?", url)
    if not match:
        return "UNKNOWN"
    host = match.group(1).lower()
    host = host.replace("www.", "")
    parts = host.split(".")
    if len(parts) >= 2:
        host = parts[-2]
    return _slugify(host)


def _title_slug(metadata: Dict[str, str], fallback: str) -> str:
    citation = metadata.get("ieee_citation") or ""
    if citation:
        first_segment = citation.split("\n")[0]
        if first_segment:
            return _slugify(first_segment)
    return _slugify(fallback)


def _year_from_metadata(metadata: Dict[str, str]) -> str:
    year = metadata.get("year")
    if year and year.isdigit():
        return year
    return "UNKNOWN"


def load_overrides(path: Path) -> Dict[str, Dict[str, str]]:
    if not path.exists():
        return {"ids": {}, "urls": {}}
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return {
        "ids": data.get("ids", {}),
        "urls": data.get("urls", {}),
    }


def load_sources_metadata(path: Path) -> Dict[str, Dict[str, str]]:
    if not path.exists():
        return {}
    metadata: Dict[str, Dict[str, str]] = {}
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            source_id = row.get("source_id")
            if not source_id:
                continue
            metadata[source_id] = row
            url = row.get("url")
            if url:
                metadata[url] = row
    return metadata


def classify_license(metadata: Dict[str, str]) -> str:
    license_value = (metadata or {}).get("license", "").lower().strip()
    if "government" in license_value or "open data" in license_value:
        return "gov-open"
    if "creative commons" in license_value or "cc-by" in license_value:
        return "cc-by-4.0"
    if "public" in license_value and "domain" in license_value:
        return "ok-public"
    return DEFAULT_LICENSE_NOTE


def discover_sources(
    reference_root: Path,
    overrides: Dict[str, Dict[str, str]],
    sources_metadata: Dict[str, Dict[str, str]],
) -> Dict[str, DiscoveredSource]:
    discovered: Dict[str, DiscoveredSource] = {}
    for path in reference_root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in REFERENCE_EXTENSIONS:
            continue
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            content = handle.read()
        urls = [match.group(0) for match in URL_RE.finditer(content)]
        dois = [_normalize_doi(match.group(0)) for match in DOI_RE.finditer(content)]
        arxiv = [_normalize_arxiv(match.group(0)) for match in ARXIV_RE.finditer(content)]
        src_urls = urls + dois + arxiv
        default_id = path.stem
        for src_url in src_urls:
            metadata_hint = sources_metadata.get(default_id) or sources_metadata.get(src_url) or {}
            source_id = overrides.get("urls", {}).get(src_url)
            if not source_id:
                mapped = overrides.get("ids", {}).get(default_id)
                if mapped:
                    source_id = mapped
                elif default_id.upper().startswith("SRC."):
                    source_id = default_id
                else:
                    host_part = _host_slug(src_url)
                    year_part = _year_from_metadata(metadata_hint)
                    slug_part = _title_slug(metadata_hint, default_id)
                    source_id = f"SRC.{host_part}.{year_part}.{slug_part}"
            metadata = (
                sources_metadata.get(source_id) or sources_metadata.get(src_url) or metadata_hint
            )
            if not metadata and source_id in discovered:
                metadata = discovered[source_id].metadata
            if source_id in discovered:
                entry = discovered[source_id]
                entry.discovered_from.add(path)
                if src_url not in entry.notes:
                    entry.notes.append(src_url)
                continue
            license_note = classify_license(metadata)
            entry = DiscoveredSource(
                source_id=source_id,
                src_url=src_url,
                discovered_from={path},
                notes=[src_url],
                metadata={
                    "license_note": license_note,
                    "year": metadata.get("year", ""),
                    "ieee_citation": metadata.get("ieee_citation", ""),
                },
            )
            discovered[source_id] = entry
    return discovered


def load_manifest(manifest_path: Path) -> Dict[str, ManifestRow]:
    if not manifest_path.exists():
        return {}
    rows: Dict[str, ManifestRow] = {}
    with manifest_path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            source_id = row.get("source_id")
            if not source_id:
                continue
            rows[source_id] = ManifestRow(row)
    return rows


def write_manifest(manifest_path: Path, rows: Sequence[ManifestRow]) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_HEADERS)
        writer.writeheader()
        for row in sorted(rows, key=lambda item: item.source_id):
            writer.writerow({key: row.data.get(key, "") for key in MANIFEST_HEADERS})


def ensure_license_note(value: Optional[str]) -> str:
    if not value:
        return DEFAULT_LICENSE_NOTE
    value = value.strip()
    if value in LICENSE_NOTES:
        return value
    return DEFAULT_LICENSE_NOTE


def read_allow_missing(path: Path) -> Set[str]:
    if not path.exists():
        return set()
    results: Set[str] = set()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            results.add(line)
    return results


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def host_allowed(url: str, allowlist: Sequence[str]) -> bool:
    if not allowlist:
        return True
    host_match = re.match(r"https?://([^/]+)/?", url)
    if not host_match:
        return False
    host = host_match.group(1)
    for pattern in allowlist:
        if fnmatch.fnmatch(host, pattern) or fnmatch.fnmatch(host, f"*.{pattern.lstrip('*.')}"):
            return True
    return False
