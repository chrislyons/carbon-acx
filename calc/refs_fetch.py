from __future__ import annotations

import argparse
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from .refs_common import (
    MANIFEST_HEADERS,
    DiscoveredSource,
    ManifestRow,
    discover_sources,
    ensure_license_note,
    hash_file,
    host_allowed,
    load_manifest,
    load_overrides,
    load_sources_metadata,
    timestamp,
    write_manifest,
)

USER_AGENT = "Carbon-ACX-RefBot/1.0 (+https://boot.industries/carbon-acx)"
RAW_ROOT = Path("refs/raw")
MANIFEST_PATH = Path("refs/sources_manifest.csv")
REFERENCES_ROOT = Path("calc/references")
OVERRIDES_PATH = Path("refs/source_id_overrides.json")
SOURCES_CSV_PATH = Path("data/sources.csv")
WAYBACK_PREFIX = "https://web.archive.org/web/"
MIN_REQUEST_SPACING = 2.0
MAX_RETRIES = 3

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    row: ManifestRow
    fetched: bool


class RateLimiter:
    def __init__(self, min_spacing: float) -> None:
        self.min_spacing = min_spacing
        self.last_request: Dict[str, float] = {}

    def wait(self, host: str) -> None:
        now = time.monotonic()
        last = self.last_request.get(host)
        if last is not None:
            elapsed = now - last
            if elapsed < self.min_spacing:
                time.sleep(self.min_spacing - elapsed)
        self.last_request[host] = time.monotonic()


class RobotsCache:
    def __init__(self) -> None:
        self.cache: Dict[str, RobotFileParser] = {}

    def allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        if robots_url not in self.cache:
            parser = RobotFileParser()
            try:
                parser.set_url(robots_url)
                parser.read()
            except Exception:
                parser = None
            self.cache[robots_url] = parser
        parser = self.cache.get(robots_url)
        if parser is None:
            return True
        return parser.can_fetch(USER_AGENT, url)


def parse_allowlist(path: Optional[Path]) -> List[str]:
    if not path:
        return []
    if not path.exists():
        raise FileNotFoundError(f"Domain allowlist not found: {path}")
    values: List[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            values.append(line)
    return values


def build_manifest_rows(discovered: Dict[str, DiscoveredSource]) -> Dict[str, ManifestRow]:
    existing = load_manifest(MANIFEST_PATH)
    for source_id, entry in discovered.items():
        if source_id in existing:
            row = existing[source_id]
        else:
            row = ManifestRow({header: "" for header in MANIFEST_HEADERS})
            row.data["source_id"] = source_id
            existing[source_id] = row
        src_url = row.data.get("src_url") or entry.src_url
        license_source = row.data.get("license_note") or entry.metadata.get("license_note")
        row.update(
            src_url=src_url,
            license_note=ensure_license_note(license_source),
        )
        existing_notes = set(
            filter(None, (row.data.get("notes", "").split("; ") if row.data.get("notes") else []))
        )
        combined_notes = existing_notes.union(entry.notes)
        if combined_notes:
            row.update(notes="; ".join(sorted(combined_notes)))
    return existing


def extension_from_content_type(content_type: str, url: str) -> str:
    mapping = {
        "application/pdf": ".pdf",
        "text/html": ".html",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/msword": ".doc",
        "application/vnd.ms-excel": ".xls",
    }
    if content_type in mapping:
        return mapping[content_type]
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix
    return suffix or ""


def fetch_url(session: requests.Session, url: str) -> requests.Response:
    headers = {"User-Agent": USER_AGENT}
    response = session.get(url, headers=headers, allow_redirects=True, stream=True, timeout=60)
    return response


def save_response_content(source_id: str, response: requests.Response) -> Path:
    content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
    extension = extension_from_content_type(content_type, response.url)
    target = RAW_ROOT / f"{source_id}{extension}"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                handle.write(chunk)
    return target


def attempt_wayback(session: requests.Session, url: str) -> Optional[requests.Response]:
    snapshot_url = f"{WAYBACK_PREFIX}0/{url}"
    headers = {"User-Agent": USER_AGENT}
    try:
        response = session.get(snapshot_url, headers=headers, stream=True, timeout=60)
    except requests.RequestException:
        return None
    if response.status_code == 200:
        return response
    return None


def handle_fetch(
    entry: DiscoveredSource,
    row: ManifestRow,
    allowlist: Sequence[str],
    robots: RobotsCache,
    limiter: RateLimiter,
    session: requests.Session,
    dry_run: bool,
) -> FetchResult:
    url = row.data.get("src_url") or entry.src_url
    if not host_allowed(url, allowlist):
        logger.info("Skipping %s (outside allowlist)", entry.source_id)
        return FetchResult(row=row, fetched=False)
    if not robots.allowed(url):
        row.update(license_note="robots-disallow")
        logger.info("Robots disallow for %s", entry.source_id)
        return FetchResult(row=row, fetched=False)
    if row.data.get("sha256") and row.data.get("stored_as"):
        logger.info("Already fetched %s", entry.source_id)
        return FetchResult(row=row, fetched=False)
    parsed = urlparse(url)
    limiter.wait(parsed.netloc)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = fetch_url(session, url)
        except requests.RequestException as exc:
            logger.warning(
                "Request failed for %s (attempt %s/%s): %s",
                entry.source_id,
                attempt,
                MAX_RETRIES,
                exc,
            )
            time.sleep(min(2**attempt, 10))
            continue
        status = response.status_code
        if status == 404:
            wayback = attempt_wayback(session, url)
            if wayback:
                response = wayback
                status = response.status_code
        if status in {429, 500, 502, 503, 504}:
            time.sleep(min(2**attempt, 10))
            continue
        if status != 200:
            logger.warning("Failed to fetch %s (%s)", entry.source_id, status)
            row.update(http_status=str(status), final_url=response.url)
            return FetchResult(row=row, fetched=False)
        if dry_run:
            logger.info("Dry run: fetched %s (%s)", entry.source_id, response.url)
            row.update(http_status=str(status), final_url=response.url)
            return FetchResult(row=row, fetched=False)
        path = save_response_content(entry.source_id, response)
        content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
        filesize = path.stat().st_size
        sha256 = hash_file(path)
        row.update(
            final_url=response.url,
            http_status=str(status),
            content_type=content_type,
            filesize_bytes=str(filesize),
            sha256=sha256,
            stored_as=str(path),
            fetched_at=timestamp(),
        )
        logger.info("Fetched %s -> %s", entry.source_id, path)
        return FetchResult(row=row, fetched=True)
    logger.error("Exceeded retries for %s", entry.source_id)
    return FetchResult(row=row, fetched=False)


def run_check(discovered: Dict[str, DiscoveredSource], allowlist: Sequence[str]) -> None:
    manifest_rows = build_manifest_rows(discovered)
    missing = [sid for sid, row in manifest_rows.items() if not row.data.get("stored_as")]
    logger.info("Discovered %s sources", len(discovered))
    if missing:
        logger.info("%s sources missing binaries: %s", len(missing), ", ".join(sorted(missing)))
    write_manifest(MANIFEST_PATH, manifest_rows.values())


def run_fetch(
    discovered: Dict[str, DiscoveredSource],
    allowlist: Sequence[str],
    only: Optional[Sequence[str]],
    dry_run: bool,
) -> None:
    manifest_rows = build_manifest_rows(discovered)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    robots = RobotsCache()
    limiter = RateLimiter(MIN_REQUEST_SPACING)
    selected_ids = set(only or [])
    for source_id, entry in discovered.items():
        if selected_ids and source_id not in selected_ids:
            continue
        row = manifest_rows[source_id]
        result = handle_fetch(entry, row, allowlist, robots, limiter, session, dry_run)
        manifest_rows[source_id] = result.row
    write_manifest(MANIFEST_PATH, manifest_rows.values())


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Discover and fetch reference sources")
    parser.add_argument("--mode", choices=["check", "fetch"], required=True)
    parser.add_argument("--only", help="Comma separated list of source_ids", default="")
    parser.add_argument("--domains", help="Path to domain allowlist", default="")
    parser.add_argument("--dry-run", action="store_true", help="Fetch without writing files")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    overrides = load_overrides(OVERRIDES_PATH)
    metadata = load_sources_metadata(SOURCES_CSV_PATH)
    discovered = discover_sources(REFERENCES_ROOT, overrides, metadata)
    allowlist_path = Path(args.domains) if args.domains else None
    allowlist = parse_allowlist(allowlist_path)
    only = [value.strip() for value in args.only.split(",") if value.strip()]
    if args.mode == "check":
        run_check(discovered, allowlist)
    else:
        run_fetch(discovered, allowlist, only, args.dry_run)


if __name__ == "__main__":
    main()
