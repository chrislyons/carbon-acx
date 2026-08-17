"""Fetch active source evidence with atomic publication semantics."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence
from urllib import robotparser
from urllib.parse import urlparse

import httpx

from .refs_util import (
    NORMALIZED_DIR,
    RAW_DIR,
    REFS_DIR,
    ReferenceCandidate,
    SourceCatalogEntry,
    hash_bytes,
    load_active_source_ids,
    load_manifest,
    load_source_catalog,
    timestamp_now,
    write_manifest,
)

USER_AGENT = "Carbon-ACX-RefBot/1.0 (+https://boot.industries/carbon-acx)"
MIN_INTERVAL_SECONDS = 2.0
MAX_BINARY_BYTES = 50 * 1024 * 1024
WAYBACK_CDX = "https://web.archive.org/cdx/search/cdx"
WAYBACK_FETCH = "https://web.archive.org/web/{timestamp}/{original}"


@dataclass
class FetchResult:
    source_id: str
    source_url: str
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
    return [
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def _host_allowed(host: str, allowlist: Sequence[str]) -> bool:
    if not allowlist:
        return True
    host_lower = host.lower()
    return any(pattern in host_lower for pattern in allowlist)


def _ext_from_content_type(content_type: str) -> str:
    lowered = content_type.split(";", 1)[0].strip().lower()
    if lowered == "application/pdf":
        return ".pdf"
    if lowered in ("text/html", "application/xhtml+xml"):
        return ".html"
    if lowered == "text/plain":
        return ".txt"
    if lowered == "application/json":
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
    return Path(urlparse(url).path).suffix


def _expected_storage(source_id: str, url: str, content_type: str) -> str:
    extension = _ext_from_url(url) or _ext_from_content_type(content_type) or ".bin"
    return str(Path("refs/raw") / f"{source_id}{extension}")


def _candidate_for_source(source_id: str, entry: SourceCatalogEntry) -> ReferenceCandidate:
    url = (entry.url or "").strip()
    return ReferenceCandidate(
        source_id=source_id,
        primary_url=url or None,
        urls=[url] if url else [],
        catalog_entry=entry,
    )


def _active_candidates(
    catalog: Mapping[str, SourceCatalogEntry], only: Sequence[str] | None
) -> list[ReferenceCandidate]:
    active_ids = load_active_source_ids()
    if only:
        requested = {item.strip() for item in only if item.strip()}
        unknown = sorted(requested - active_ids)
        if unknown:
            raise ValueError("Requested source is not active: " + ", ".join(unknown))
        active_ids &= requested
    missing_registry = sorted(active_ids - set(catalog))
    if missing_registry:
        raise ValueError("Active source is not registered: " + ", ".join(missing_registry))
    return [
        _candidate_for_source(source_id, catalog[source_id]) for source_id in sorted(active_ids)
    ]


def _filter_candidates(
    candidates: Mapping[str, ReferenceCandidate], only: Sequence[str] | None
) -> list[ReferenceCandidate]:
    if only:
        target = {key.strip() for key in only if key.strip()}
        return [candidates[key] for key in sorted(candidates) if key in target]
    return [candidates[key] for key in sorted(candidates)]


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
    for attempt in range(1, max_attempts + 1):
        limiter.wait(host)
        try:
            response = client.get(url)
        except Exception as exc:  # pragma: no cover - network failures in workflow
            print(f"[error] {url} -> {exc}")
            if attempt < max_attempts:
                time.sleep(min(2**attempt, 10))
            continue
        if response.status_code in (429, 500, 502, 503, 504) and attempt < max_attempts:
            wait_for = min(2**attempt, 30)
            print(f"[retry] {url} -> {response.status_code}, sleeping {wait_for}s")
            time.sleep(wait_for)
            continue
        return response
    return None


def _attempt_wayback(
    client: httpx.Client, limiter: HostRateLimiter, url: str
) -> httpx.Response | None:
    limiter.wait(urlparse(WAYBACK_CDX).netloc)
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
    archive_url = WAYBACK_FETCH.format(timestamp=snapshot[0], original=snapshot[1])
    print(f"[wayback] Using snapshot {archive_url}")
    response = _fetch_with_backoff(client, limiter, RobotsGate(USER_AGENT), archive_url)
    return response if response is not None and 200 <= response.status_code < 300 else None


def fetch_candidate(
    client: httpx.Client,
    limiter: HostRateLimiter,
    robots: RobotsGate,
    candidate: ReferenceCandidate,
    allowlist: Sequence[str],
    dry_run: bool = False,
) -> FetchResult | None:
    """Fetch one source without mutating the repository.

    ``dry_run`` remains part of the public helper signature for compatibility;
    storage is now performed only by the transaction coordinator.
    """

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
    if response.status_code == 404:
        response = _attempt_wayback(client, limiter, url)
        if response is None:
            print(f"[miss] {candidate.source_id}: 404 and no archive snapshot")
            return None
    if not 200 <= response.status_code < 300:
        print(f"[miss] {candidate.source_id}: HTTP {response.status_code}")
        return None
    payload = response.content
    if not payload or len(payload) > MAX_BINARY_BYTES:
        print(f"[miss] {candidate.source_id}: invalid payload size {len(payload)}")
        return None
    final_url = str(response.url)
    content_type = response.headers.get("content-type", "").strip()
    return FetchResult(
        source_id=candidate.source_id,
        source_url=url,
        final_url=final_url,
        status_code=response.status_code,
        content_type=content_type,
        payload=payload,
        size_bytes=len(payload),
        stored_as=_expected_storage(candidate.source_id, final_url, content_type),
    )


def _attestation_defaults() -> tuple[str, str]:
    url = os.getenv("ACX_REFERENCE_ATTESTATION_URL", "").strip()
    artifact = os.getenv("ACX_REFERENCE_ARTIFACT_NAME", "").strip()
    if not url:
        server = os.getenv("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
        repository = os.getenv("GITHUB_REPOSITORY", "").strip()
        run_id = os.getenv("GITHUB_RUN_ID", "").strip()
        if repository and run_id:
            url = f"{server}/{repository}/actions/runs/{run_id}"
    return url, artifact


def _update_manifest(
    result: FetchResult,
    candidate: ReferenceCandidate,
    manifest_rows: Sequence[Mapping[str, str]],
    *,
    verification_run_url: str,
    raw_artifact_name: str,
    fetched_at: str | None = None,
) -> list[dict[str, str]]:
    manifest_map = {row.get("source_id", ""): dict(row) for row in manifest_rows}
    existing = manifest_map.get(candidate.source_id, {})
    manifest_map[candidate.source_id] = {
        "source_id": candidate.source_id,
        "src_url": result.source_url,
        "final_url": result.final_url,
        "http_status": str(result.status_code),
        "content_type": result.content_type,
        "filesize_bytes": str(result.size_bytes),
        "sha256": hash_bytes(result.payload),
        "stored_as": result.stored_as,
        "license_note": (candidate.catalog_entry.license if candidate.catalog_entry else "") or "",
        "fetched_at": fetched_at or timestamp_now(),
        "normalized_md": existing.get("normalized_md", ""),
        "normalized_sha256": existing.get("normalized_sha256", ""),
        "verification_run_url": verification_run_url,
        "raw_artifact_name": raw_artifact_name,
        "notes": existing.get("notes", ""),
    }
    return [manifest_map[key] for key in sorted(manifest_map) if key]


def _copy_tree(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination)
    else:
        destination.mkdir(parents=True, exist_ok=True)


def _promote_transaction(stage_root: Path, stage_manifest: Path) -> None:
    """Replace raw, normalized, and manifest as one rollback-capable transaction."""

    targets = [RAW_DIR, NORMALIZED_DIR, REFS_DIR / "sources_manifest.csv"]
    staged = [stage_root / "raw", stage_root / "normalized", stage_manifest]
    backup_root = Path(tempfile.mkdtemp(prefix="refs-backup-", dir=REFS_DIR.parent))
    moved: list[tuple[Path, Path]] = []
    installed: list[Path] = []
    try:
        for index, target in enumerate(targets):
            backup = backup_root / str(index)
            if target.exists():
                os.replace(target, backup)
                moved.append((target, backup))
            os.replace(staged[index], target)
            installed.append(target)
    except Exception:
        for target in reversed(installed):
            if target.exists():
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()
        for target, backup in reversed(moved):
            if backup.exists():
                os.replace(backup, target)
        raise
    finally:
        shutil.rmtree(backup_root, ignore_errors=True)


def run_check(only: Sequence[str] | None = None) -> int:
    try:
        selected = _active_candidates(load_source_catalog(), only)
    except ValueError as exc:
        print(f"::error::{exc}")
        return 1
    manifest_ids = {row.get("source_id", "") for row in load_manifest()}
    missing = [
        candidate.source_id for candidate in selected if candidate.source_id not in manifest_ids
    ]
    if missing:
        print("Missing manifest rows for:")
        for source_id in missing:
            print(f"  - {source_id}")
        return 1
    print(f"All {len(selected)} active sources accounted for in manifest.")
    return 0


def run_fetch(
    only: Sequence[str] | None,
    allowlist_path: Path | None,
    dry_run: bool = False,
    *,
    verification_run_url: str = "",
    raw_artifact_name: str = "",
) -> int:
    allowlist = _load_allowlist(allowlist_path)
    catalog = load_source_catalog()
    try:
        selected = _active_candidates(catalog, only)
    except ValueError as exc:
        print(f"::error::{exc}")
        return 1
    if not selected:
        print("No active sources to fetch.")
        return 0
    if dry_run:
        print(f"Dry-run selected {len(selected)} active sources; repository unchanged.")
        return 0

    default_url, default_artifact = _attestation_defaults()
    verification_run_url = verification_run_url.strip() or default_url
    raw_artifact_name = raw_artifact_name.strip() or default_artifact
    limiter = HostRateLimiter()
    robots = RobotsGate(USER_AGENT)
    manifest_rows = load_manifest()
    staging_root = Path(tempfile.mkdtemp(prefix="refs-stage-", dir=REFS_DIR.parent))
    stage_refs = staging_root / "refs"
    stage_raw = stage_refs / "raw"
    stage_normalized = stage_refs / "normalized"
    stage_manifest = stage_refs / "sources_manifest.csv"
    try:
        _copy_tree(RAW_DIR, stage_raw)
        _copy_tree(NORMALIZED_DIR, stage_normalized)
        with httpx.Client(
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
            timeout=60.0,
        ) as client:
            updates: list[FetchResult] = []
            for candidate in selected:
                result = fetch_candidate(client, limiter, robots, candidate, allowlist)
                if result is None:
                    print(
                        "::error::Fetch transaction aborted; no files or manifest rows were changed."
                    )
                    return 1
                updates.append(result)

        updated_rows = manifest_rows
        for result in updates:
            candidate = catalog[result.source_id]
            updated_rows = _update_manifest(
                result,
                _candidate_for_source(result.source_id, candidate),
                updated_rows,
                verification_run_url=verification_run_url,
                raw_artifact_name=raw_artifact_name,
            )
            target = staging_root / result.stored_as
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(result.payload)
        write_manifest(updated_rows, stage_manifest)
        _promote_transaction(stage_refs, stage_manifest)
    finally:
        shutil.rmtree(staging_root, ignore_errors=True)
    print(f"Fetched and atomically published {len(selected)} active sources.")
    return 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch active source evidence")
    parser.add_argument("--mode", choices={"check", "fetch"}, required=True)
    parser.add_argument("--only", help="Comma-separated active source IDs", default="")
    parser.add_argument("--domains", type=Path, help="Allowlist file", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Do not fetch or write files")
    parser.add_argument("--verification-run-url", default="", help="Immutable workflow run URL")
    parser.add_argument(
        "--raw-artifact-name", default="", help="Immutable raw evidence artifact name"
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    only = [item.strip() for item in args.only.split(",") if item.strip()]
    if args.mode == "check":
        return run_check(only)
    return run_fetch(
        only,
        args.domains,
        dry_run=args.dry_run,
        verification_run_url=args.verification_run_url,
        raw_artifact_name=args.raw_artifact_name,
    )


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
