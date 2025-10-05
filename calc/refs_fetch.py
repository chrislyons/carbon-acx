"""Fetch references discovered under ``calc/references``."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import logging
import time
from fnmatch import fnmatch
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set
from urllib.parse import quote, urlparse

import requests

from .refs_common import (
    DiscoveredSource,
    ManifestRow,
    SourceIdOverrides,
    discover_sources,
    load_allow_missing,
    load_manifest,
    write_manifest,
)


LOGGER = logging.getLogger(__name__)

USER_AGENT = "Carbon-ACX-RefBot/1.0 (+https://boot.industries/carbon-acx)"
REQUEST_TIMEOUT = 60
RATE_LIMIT_SECONDS = 2
MAX_BINARY_BYTES = 50 * 1024 * 1024

WAYBACK_AVAILABILITY_API = "https://web.archive.org/wayback/available?url={url}"

CONTENT_TYPE_EXTENSION = {
    "application/pdf": ".pdf",
    "text/html": ".html",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
}

PUBLIC_LICENSE_HOSTS = {
    "gov-open": (".gc.ca", ".canada.ca", ".gov", ".gouv.qc.ca"),
    "ok-public": (
        "ipcc.ch",
        "iea.org",
        "oecd.org",
        "who.int",
        "unfccc.int",
        "ieso.ca",
        "canada.ca",
        "gc.ca",
    ),
}


class HostRateLimiter:
    def __init__(self, wait_seconds: int = RATE_LIMIT_SECONDS) -> None:
        self.wait_seconds = wait_seconds
        self._last_request: Dict[str, float] = {}

    def wait(self, host: str) -> None:
        now = time.monotonic()
        last = self._last_request.get(host)
        if last is not None:
            remaining = self.wait_seconds - (now - last)
            if remaining > 0:
                time.sleep(remaining)
        self._last_request[host] = time.monotonic()


class RobotsCache:
    def __init__(self, session: requests.Session) -> None:
        self.session = session
        self._cache: Dict[str, bool] = {}

    def allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        cache_key = f"{base}|{parsed.path}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        robots_url = f"{base}/robots.txt"
        try:
            response = self.session.get(robots_url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
            if response.status_code >= 400:
                allowed = True
            else:
                allowed = self._parse_robots(response.text, url)
        except requests.RequestException:
            allowed = True
        self._cache[cache_key] = allowed
        return allowed

    @staticmethod
    def _parse_robots(body: str, url: str) -> bool:
        import urllib.robotparser

        parser = urllib.robotparser.RobotFileParser()
        parser.parse(body.splitlines())
        return parser.can_fetch(USER_AGENT, url)


def load_domain_allowlist(path: Optional[Path]) -> List[str]:
    if not path:
        return []
    if not path.exists():
        raise FileNotFoundError(f"Domain allowlist file not found: {path}")
    patterns = [
        line.strip()
        for line in path.read_text().splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    return patterns


def host_allowed(host: str, allowlist: Sequence[str]) -> bool:
    if not allowlist:
        return True
    return any(fnmatch(host, pattern) or fnmatch(f"*.{host}", pattern) for pattern in allowlist)


def infer_license(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    for note, hosts in PUBLIC_LICENSE_HOSTS.items():
        for suffix in hosts:
            if host.endswith(suffix.lower()):
                return note
    return "copyright-unknown"


def determine_extension(url: str, content_type: str) -> str:
    if content_type:
        normalized = content_type.split(";")[0].lower()
        if normalized in CONTENT_TYPE_EXTENSION:
            return CONTENT_TYPE_EXTENSION[normalized]
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix
    return suffix or ""


def apply_only_filter(
    discovered: List[DiscoveredSource], manifest: Dict[str, ManifestRow], only: Optional[Set[str]]
) -> List[DiscoveredSource]:
    if not only:
        return discovered

    selected = [item for item in discovered if item.source_id in only]
    discovered_ids = {item.source_id for item in selected}
    for source_id in only - discovered_ids:
        existing = manifest.get(source_id)
        if existing and (existing.src_url or existing.final_url):
            selected.append(
                DiscoveredSource(
                    source_id=source_id,
                    src_url=existing.src_url or existing.final_url,
                    discovered_from=set(),
                    metadata={},
                )
            )
        else:
            LOGGER.warning("Requested source %s not found in discovery or manifest", source_id)
    return selected


def fetch_single_source(
    source,
    manifest_row: ManifestRow,
    session: requests.Session,
    limiter: HostRateLimiter,
    robots: RobotsCache,
    raw_dir: Path,
    allowlist: Sequence[str],
    dry_run: bool,
) -> ManifestRow:
    url = source.src_url
    parsed = urlparse(url)
    host = parsed.hostname or ""

    if not host_allowed(host, allowlist):
        manifest_row.http_status = "skipped"
        manifest_row.notes = "Domain not allowlisted"
        return manifest_row

    if not robots.allowed(url):
        manifest_row.http_status = "robots-disallow"
        manifest_row.license_note = "robots-disallow"
        manifest_row.notes = "Robots disallow retrieval"
        return manifest_row

    limiter.wait(host)
    try:
        response = session.get(url, allow_redirects=True, timeout=REQUEST_TIMEOUT, stream=True)
    except requests.RequestException as exc:
        manifest_row.http_status = "error"
        manifest_row.notes = str(exc)
        return manifest_row

    if response.status_code == 404:
        snapshot = fetch_from_wayback(session, url)
        if snapshot is not None:
            response.close()
            response = snapshot

    manifest_row.final_url = response.url
    manifest_row.http_status = str(response.status_code)
    manifest_row.content_type = response.headers.get("content-type", "")
    manifest_row.license_note = manifest_row.license_note or infer_license(response.url)

    if response.status_code != 200:
        manifest_row.notes = manifest_row.notes or f"HTTP {response.status_code}"
        response.close()
        return manifest_row

    extension = determine_extension(response.url, manifest_row.content_type)
    stored_name = f"{manifest_row.source_id}{extension}"
    stored_path = raw_dir / stored_name

    if dry_run:
        manifest_row.stored_as = str(Path("raw") / stored_name)
        manifest_row.filesize_bytes = "0"
        manifest_row.sha256 = ""
        response.close()
        return manifest_row

    stored_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = stored_path.with_suffix(f"{stored_path.suffix}.tmp")
    hasher = hashlib.sha256()
    total_bytes = 0
    size_limit_hit = False

    with temp_path.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=8192):
            if not chunk:
                continue
            total_bytes += len(chunk)
            if total_bytes > MAX_BINARY_BYTES:
                size_limit_hit = True
                break
            handle.write(chunk)
            hasher.update(chunk)

    response.close()

    if size_limit_hit:
        temp_path.unlink(missing_ok=True)
        manifest_row.notes = "File larger than 50MB; not stored"
        manifest_row.stored_as = ""
        manifest_row.sha256 = ""
        manifest_row.filesize_bytes = str(total_bytes)
        return manifest_row

    temp_path.replace(stored_path)
    manifest_row.stored_as = str(Path("raw") / stored_name)
    manifest_row.filesize_bytes = str(total_bytes)
    manifest_row.sha256 = hasher.hexdigest()
    manifest_row.fetched_at = dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    return manifest_row


def fetch_from_wayback(session: requests.Session, url: str) -> Optional[requests.Response]:
    try:
        resp = session.get(
            WAYBACK_AVAILABILITY_API.format(url=quote(url, safe="")),
            timeout=REQUEST_TIMEOUT,
        )
        data = resp.json()
    except (requests.RequestException, json.JSONDecodeError):
        return None

    closest = data.get("archived_snapshots", {}).get("closest", {})
    snapshot_url = closest.get("url") if closest.get("available") else None
    if not snapshot_url:
        return None

    try:
        return session.get(snapshot_url, timeout=REQUEST_TIMEOUT, stream=True)
    except requests.RequestException:
        return None


def run_check(manifest_path: Path, allow_missing_path: Path, discovered) -> int:
    allow_missing = load_allow_missing(allow_missing_path)
    manifest = load_manifest(manifest_path)
    missing = [src for src in discovered if src.source_id not in manifest and src.source_id not in allow_missing]
    if missing:
        LOGGER.error("Manifest missing %s sources", len(missing))
        for src in missing[:20]:
            LOGGER.error("Missing source %s (%s)", src.source_id, src.src_url)
        return 1
    LOGGER.info("Manifest covers all %s discovered sources", len(discovered))
    return 0


def run_fetch(
    manifest_path: Path,
    raw_dir: Path,
    discovered: List[DiscoveredSource],
    only_ids: Optional[Set[str]],
    allowlist: Sequence[str],
    dry_run: bool,
) -> int:
    manifest = load_manifest(manifest_path)
    targets = apply_only_filter(discovered, manifest, only_ids)
    if not targets:
        LOGGER.info("No sources to fetch")
        return 0

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    limiter = HostRateLimiter()
    robots = RobotsCache(session)

    for source in targets:
        row = manifest.get(source.source_id) or ManifestRow(source_id=source.source_id, src_url=source.src_url)
        row.src_url = source.src_url
        row = fetch_single_source(source, row, session, limiter, robots, raw_dir, allowlist, dry_run)
        manifest[source.source_id] = row

    write_manifest(manifest_path, manifest)
    LOGGER.info("Updated manifest with %s entries", len(targets))
    return 0


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fetch references for the Carbon ACX library")
    parser.add_argument("--mode", choices={"check", "fetch"}, default="check")
    parser.add_argument("--only", help="Comma-separated list of source IDs to limit fetches", default="")
    parser.add_argument("--domains", type=Path, help="Optional domain allowlist file")
    parser.add_argument("--dry-run", action="store_true", help="Fetch metadata without storing files")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = build_argument_parser()
    args = parser.parse_args(argv)

    repo_root = Path.cwd()
    references_root = repo_root / "calc" / "references"
    refs_root = repo_root / "refs"
    manifest_path = refs_root / "sources_manifest.csv"
    overrides_path = refs_root / "source_id_overrides.json"
    allow_missing_path = refs_root / "ALLOW_MISSING.txt"

    overrides = SourceIdOverrides.load(overrides_path)
    discovered = discover_sources(references_root, overrides, repo_root / "data" / "sources.csv")

    if args.mode == "check":
        return run_check(manifest_path, allow_missing_path, discovered)

    only_ids = {part.strip() for part in args.only.split(",") if part.strip()}
    allowlist = load_domain_allowlist(args.domains) if args.domains else []
    return run_fetch(
        manifest_path,
        refs_root / "raw",
        discovered,
        only_ids if only_ids else None,
        allowlist,
        args.dry_run,
    )


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
