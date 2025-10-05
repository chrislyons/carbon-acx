"""Discover and fetch reference source material."""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence
from urllib.parse import urlparse
from urllib import robotparser

import httpx

from .refs_util import (
    RAW_DIR,
    REFS_DIR,
    ReferenceCandidate,
    discover_reference_candidates,
    load_manifest,
    load_overrides,
    load_source_catalog,
    timestamp_now,
    write_manifest,
)
from .refs_util import hash_bytes  # noqa: WPS347 (re-export for clarity)

USER_AGENT = "Carbon-ACX-RefBot/1.0 (+https://boot.industries/carbon-acx)"
MIN_INTERVAL_SECONDS = 2.0
MAX_BINARY_BYTES = 50 * 1024 * 1024
WAYBACK_CDX = "https://web.archive.org/cdx/search/cdx"
WAYBACK_FETCH = "https://web.archive.org/web/{timestamp}/{original}"


@dataclass
class FetchResult:
    source_id: str
    final_url: str
    status_code: int
    content_type: str
    payload: bytes
    size_bytes: int
    stored_as: str


class HostRateLimiter:
    def __init__(self, minimum_interval: float = MIN_INTERVAL_SECONDS) -> None:
        self.minimum_interval = minimum_interval
        self._last_seen: dict[str, float] = {}

    def wait(self, host: str) -> None:
        now = time.monotonic()
        last = self._last_seen.get(host)
        if last is not None:
            delta = now - last
            if delta < self.minimum_interval:
                time.sleep(self.minimum_interval - delta)
        self._last_seen[host] = time.monotonic()


class RobotsGate:
    def __init__(self, user_agent: str) -> None:
        self.user_agent = user_agent
        self._cache: dict[str, robotparser.RobotFileParser] = {}

    def allows(self, url: str) -> bool:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        if base not in self._cache:
            parser = robotparser.RobotFileParser()
            parser.set_url(f"{base}/robots.txt")
            try:
                parser.read()
            except Exception:
                # If robots.txt is unreachable, assume allowed but respect rate limits.
                self._cache[base] = parser
                return True
            self._cache[base] = parser
        parser = self._cache[base]
        try:
            return parser.can_fetch(self.user_agent, url)
        except Exception:
            return True


def _load_allowlist(path: Path | None) -> list[str]:
    if not path:
        return []
    if not path.exists():
        raise SystemExit(f"Allowlist file not found: {path}")
    hosts: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        candidate = line.strip()
        if candidate and not candidate.startswith("#"):
            hosts.append(candidate.lower())
    return hosts


def _host_allowed(host: str, allowlist: Sequence[str]) -> bool:
    if not allowlist:
        return True
    host_lower = host.lower()
    return any(pattern in host_lower for pattern in allowlist)


def _ext_from_content_type(content_type: str) -> str:
    if not content_type:
        return ""
    lowered = content_type.split(";")[0].strip().lower()
    if lowered == "application/pdf":
        return ".pdf"
    if lowered in ("text/html", "application/xhtml+xml"):
        return ".html"
    if lowered in ("text/plain",):
        return ".txt"
    if lowered in ("application/json",):
        return ".json"
    if lowered in ("text/csv", "application/csv", "application/vnd.ms-excel"):
        return ".csv"
    if lowered in (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroenabled.12",
    ):
        return ".xlsx"
    if lowered in (
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        return ".docx"
    return ""


def _ext_from_url(url: str) -> str:
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix
    return suffix


def _expected_storage(source_id: str, url: str, content_type: str) -> str:
    extension = _ext_from_url(url) or _ext_from_content_type(content_type) or ".bin"
    return str(Path("refs/raw") / f"{source_id}{extension}")


def _filter_candidates(
    candidates: Mapping[str, ReferenceCandidate], only: Sequence[str] | None
) -> list[ReferenceCandidate]:
    if only:
        target = {key.strip() for key in only if key.strip()}
        return [candidates[key] for key in sorted(candidates) if key in target]
    return [candidates[key] for key in sorted(candidates)]


def _ensure_raw_dir() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_repo_path(fragment: str) -> Path:
    path = Path(fragment)
    if path.is_absolute():
        return path
    return (REFS_DIR.parent / path).resolve()


def _save_payload(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def _fetch_with_backoff(
    client: httpx.Client,
    limiter: HostRateLimiter,
    robots: RobotsGate,
    url: str,
    max_attempts: int = 4,
) -> httpx.Response | None:
    parsed = urlparse(url)
    host = parsed.netloc
    if not robots.allows(url):
        print(f"[robots] Skipping disallowed URL {url}")
        return None

    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        limiter.wait(host)
        try:
            response = client.get(url)
        except Exception as exc:  # pragma: no cover - network failures in workflow
            print(f"[error] {url} -> {exc}")
            time.sleep(min(2**attempt, 10))
            continue
        if response.status_code in (429, 500, 502, 503, 504):
            wait_for = min(2**attempt, 30)
            print(f"[retry] {url} -> {response.status_code}, sleeping {wait_for}s")
            time.sleep(wait_for)
            continue
        return response
    return None


def _attempt_wayback(client: httpx.Client, limiter: HostRateLimiter, url: str) -> httpx.Response | None:
    params = {
        "url": url,
        "output": "json",
        "limit": "1",
        "filter": "statuscode:200",
        "fl": "timestamp,original",
        "sort": "closest",
    }
    try:
        response = client.get(WAYBACK_CDX, params=params)
        if response.status_code != 200:
            return None
        payload = json.loads(response.text)
    except Exception:
        return None
    if not isinstance(payload, list) or len(payload) < 2:
        return None
    snapshot = payload[1]
    if not isinstance(snapshot, list) or len(snapshot) < 2:
        return None
    timestamp, original = snapshot[0], snapshot[1]
    archive_url = WAYBACK_FETCH.format(timestamp=timestamp, original=original)
    print(f"[wayback] Using snapshot {archive_url}")
    robots = RobotsGate(USER_AGENT)
    response = _fetch_with_backoff(client, limiter, robots, archive_url)
    return response


def fetch_candidate(
    client: httpx.Client,
    limiter: HostRateLimiter,
    robots: RobotsGate,
    candidate: ReferenceCandidate,
    allowlist: Sequence[str],
    dry_run: bool,
) -> FetchResult | None:
    url = candidate.primary_url or (candidate.urls[0] if candidate.urls else None)
    if not url:
        print(f"[skip] {candidate.source_id}: no URL available")
        return None
    parsed = urlparse(url)
    if not _host_allowed(parsed.netloc, allowlist):
        print(f"[skip] {candidate.source_id}: host {parsed.netloc} not in allowlist")
        return None

    response = _fetch_with_backoff(client, limiter, robots, url)
    if response is None:
        return None

    final_url = str(response.url)
    status = response.status_code
    content_type = response.headers.get("content-type", "")

    if status == 404:
        alt = _attempt_wayback(client, limiter, url)
        if alt is None:
            print(f"[miss] {candidate.source_id}: 404 and no archive snapshot")
            return None
        response = alt
        final_url = str(response.url)
        status = response.status_code
        content_type = response.headers.get("content-type", "")

    payload = response.content
    size_bytes = len(payload)
    if size_bytes > MAX_BINARY_BYTES:
        print(
            f"[warn] {candidate.source_id}: payload exceeds 50MB ({len(payload)} bytes), skipping storage"
        )
        stored_as = ""
        payload = b""
    else:
        stored_as = _expected_storage(candidate.source_id, final_url, content_type)
        if not dry_run and payload:
            _ensure_raw_dir()
            _save_payload(_resolve_repo_path(stored_as), payload)

    return FetchResult(
        source_id=candidate.source_id,
        final_url=final_url,
        status_code=status,
        content_type=content_type,
        payload=payload,
        size_bytes=size_bytes,
        stored_as=stored_as,
    )


def _update_manifest(
    result: FetchResult,
    candidate: ReferenceCandidate,
    manifest_rows: Sequence[Mapping[str, str]],
) -> list[Mapping[str, str]]:
    src_url = candidate.primary_url or (candidate.urls[0] if candidate.urls else "")
    sha_value = hash_bytes(result.payload) if result.payload else ""
    update_row = {
        "source_id": candidate.source_id,
        "src_url": src_url,
        "final_url": result.final_url,
        "http_status": str(result.status_code),
        "content_type": result.content_type,
        "filesize_bytes": str(result.size_bytes) if result.size_bytes else "",
        "sha256": sha_value,
        "stored_as": result.stored_as,
        "license_note": (candidate.catalog_entry.license if candidate.catalog_entry else ""),
        "fetched_at": timestamp_now(),
    }
    manifest_map = {row.get("source_id", ""): dict(row) for row in manifest_rows}
    existing = manifest_map.get(candidate.source_id, {})
    preserved = {
        "normalized_md": existing.get("normalized_md", ""),
        "normalized_sha256": existing.get("normalized_sha256", ""),
        "notes": existing.get("notes", ""),
    }
    update_row.update(preserved)
    manifest_map[candidate.source_id] = update_row
    ordered = [manifest_map[key] for key in sorted(manifest_map) if key]
    return ordered


def run_check(only: Sequence[str] | None = None) -> int:
    catalog = load_source_catalog()
    overrides = load_overrides()
    candidates = discover_reference_candidates(overrides=overrides, catalog=catalog)
    subset = _filter_candidates(candidates, only)
    manifest_rows = load_manifest()
    manifest_ids = {row.get("source_id", "") for row in manifest_rows}
    missing = [c.source_id for c in subset if c.source_id not in manifest_ids]
    if missing:
        print("Missing manifest rows for:")
        for source_id in missing:
            print(f"  - {source_id}")
        return 1
    print(f"All {len(subset)} sources accounted for in manifest.")
    return 0


def run_fetch(
    only: Sequence[str] | None,
    allowlist_path: Path | None,
    dry_run: bool = False,
) -> int:
    allowlist = _load_allowlist(allowlist_path)
    catalog = load_source_catalog()
    overrides = load_overrides()
    candidates = discover_reference_candidates(overrides=overrides, catalog=catalog)
    selected = _filter_candidates(candidates, only)

    if not selected:
        print("No sources to fetch.")
        return 0

    limiter = HostRateLimiter()
    robots = RobotsGate(USER_AGENT)
    manifest_rows = load_manifest()

    with httpx.Client(follow_redirects=True, headers={"User-Agent": USER_AGENT}, timeout=60.0) as client:
        for candidate in selected:
            result = fetch_candidate(client, limiter, robots, candidate, allowlist, dry_run)
            if result is None:
                continue
            manifest_rows = _update_manifest(result, candidate, manifest_rows)

    if not dry_run:
        write_manifest(manifest_rows)
    else:
        print("Dry-run complete; manifest not updated.")
    return 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reference discovery and fetching tool")
    parser.add_argument("--mode", choices={"check", "fetch"}, required=True)
    parser.add_argument("--only", help="Comma-separated source_ids", default="")
    parser.add_argument("--domains", type=Path, help="Allowlist file", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Skip writing files/manifest")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    only = [item.strip() for item in args.only.split(",") if item.strip()]
    if args.mode == "check":
        return run_check(only)
    return run_fetch(only, args.domains, dry_run=args.dry_run)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
