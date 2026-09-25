"""Audit the active source ledger and its optional local evidence files."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Mapping, Sequence

from .refs_util import (
    REFS_DIR,
    hash_file,
    load_active_source_ids,
    load_manifest,
    load_source_catalog,
    normalize_url,
)

REQUIRED_COLUMNS = {
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
}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _parse_date(value: str, field: str, source_id: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _parse_timestamp(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed


def _review_anniversary(value: datetime) -> date:
    try:
        return value.date().replace(year=value.year + 1)
    except ValueError:
        return value.date().replace(year=value.year + 1, day=28)


def _resolve_path(stored_as: str, evidence_root: Path | None = None) -> Path:
    """Resolve a ledger ``stored_as`` path.

    Raw evidence is never committed; a scheduled full audit materialises the
    downloaded artifacts somewhere and passes that directory as ``evidence_root``.
    Relative ledger paths are then resolved against it. Without an explicit root,
    relative paths keep resolving against the repository root (fail-closed).
    """

    path = Path(stored_as)
    if path.is_absolute():
        return path
    base = evidence_root if evidence_root is not None else REFS_DIR.parent
    return (base / path).resolve()


def _validate_columns(manifest: Sequence[Mapping[str, str]]) -> list[str]:
    if not manifest:
        return ["sources_manifest.csv is empty"]
    columns = set(manifest[0].keys())
    missing = REQUIRED_COLUMNS - columns
    if missing:
        return [f"Manifest missing required columns: {', '.join(sorted(missing))}"]
    return []


def _validate_duplicates(manifest: Sequence[Mapping[str, str]]) -> list[str]:
    seen: set[str] = set()
    errors: list[str] = []
    for row in manifest:
        source_id = (row.get("source_id") or "").strip()
        if not source_id:
            errors.append("Manifest row missing source_id")
            continue
        if source_id in seen:
            errors.append(f"Duplicate manifest row for {source_id}")
        seen.add(source_id)
    return errors


def _validate_metadata(
    manifest: Sequence[Mapping[str, str]],
    catalog: Mapping[str, object],
    active_ids: set[str],
    as_of: date,
) -> list[str]:
    errors: list[str] = []
    manifest_ids = {row.get("source_id", "").strip() for row in manifest}
    missing = sorted(active_ids - manifest_ids)
    unexpected = sorted((manifest_ids - active_ids) - {""})
    if missing:
        errors.append("Manifest missing active sources: " + ", ".join(missing))
    if unexpected:
        errors.append("Manifest contains inactive sources: " + ", ".join(unexpected))

    for row in manifest:
        source_id = (row.get("source_id") or "").strip()
        if not source_id:
            continue
        entry = catalog.get(source_id)
        if entry is None:
            errors.append(f"Unregistered source ID {source_id}")
            continue
        source_url = (getattr(entry, "url", None) or "").strip()
        source_license = (getattr(entry, "license", None) or "").strip()
        src_url = normalize_url((row.get("src_url") or "").strip())
        if not source_url:
            errors.append(f"Registered source URL missing for {source_id}")
        elif src_url != normalize_url(source_url):
            errors.append(f"Source URL mismatch for {source_id}")
        final_url = (row.get("final_url") or "").strip()
        if not re.match(r"^https?://[^\s]+$", final_url):
            errors.append(f"Final URL missing or invalid for {source_id}")
        try:
            status = int((row.get("http_status") or "").strip())
        except ValueError:
            status = 0
        if not 200 <= status < 300:
            errors.append(f"Non-2xx HTTP status for {source_id}: {row.get('http_status', '')}")
        if not (row.get("content_type") or "").strip():
            errors.append(f"Content type missing for {source_id}")
        try:
            size = int((row.get("filesize_bytes") or "").strip())
        except ValueError:
            size = 0
        if size <= 0:
            errors.append(f"Positive file size missing for {source_id}")
        digest = (row.get("sha256") or "").strip().lower()
        if not SHA256_RE.fullmatch(digest):
            errors.append(f"SHA-256 digest missing or malformed for {source_id}")
        fetched = _parse_timestamp((row.get("fetched_at") or "").strip())
        if not fetched:
            errors.append(f"Fetched timestamp must be timezone-aware for {source_id}")
        license_note = (row.get("license_note") or "").strip()
        if not source_license or license_note != source_license:
            errors.append(f"License mismatch for {source_id}")
        verification_url = (row.get("verification_run_url") or "").strip()
        if not re.match(r"^https://[^\s]+/actions/runs/\d+$", verification_url):
            errors.append(f"Immutable workflow run URL missing or invalid for {source_id}")
        if not (row.get("raw_artifact_name") or "").strip():
            errors.append(f"Immutable raw artifact name missing for {source_id}")
        due_value = (getattr(entry, "review_due_at", None) or "").strip()
        if not due_value:
            errors.append(f"Review due date missing for {source_id}")
        else:
            try:
                due = date.fromisoformat(due_value)
            except ValueError:
                due = None
            if due is None:
                errors.append(f"Review due date malformed for {source_id}")
            elif due < as_of:
                errors.append(f"Source review is overdue for {source_id}: {due_value}")
            elif fetched and due != _review_anniversary(fetched):
                errors.append(f"Review due date is not one year after fetch for {source_id}")

    return errors


def _validate_hashes(
    manifest: Sequence[Mapping[str, str]],
    metadata_only: bool = False,
    evidence_root: Path | None = None,
) -> list[str]:
    """Validate available evidence bytes; metadata-only intentionally skips I/O."""

    if metadata_only:
        return []
    errors: list[str] = []
    for row in manifest:
        source_id = row.get("source_id", "")
        stored_as = (row.get("stored_as") or "").strip()
        if not stored_as:
            errors.append(f"Raw evidence path missing for {source_id}")
            continue
        path = _resolve_path(stored_as, evidence_root)
        if not path.is_file():
            errors.append(f"Raw file missing for {source_id}: {path}")
            continue
        digest = (row.get("sha256") or "").strip().lower()
        if hash_file(path) != digest:
            errors.append(f"SHA mismatch for {source_id}")
        if str(path.stat().st_size) != (row.get("filesize_bytes") or "").strip():
            errors.append(f"Size mismatch for {source_id}")

        normalized_md = (row.get("normalized_md") or "").strip()
        normalized_digest = (row.get("normalized_sha256") or "").strip().lower()
        if normalized_md or normalized_digest:
            if not normalized_md or not SHA256_RE.fullmatch(normalized_digest):
                errors.append(f"Normalized evidence metadata malformed for {source_id}")
            else:
                normalized_path = _resolve_path(normalized_md, evidence_root)
                if not normalized_path.is_file():
                    errors.append(f"Normalized file missing for {source_id}: {normalized_path}")
                elif hash_file(normalized_path) != normalized_digest:
                    errors.append(f"Normalized SHA mismatch for {source_id}")
    return errors


def run(
    *,
    as_of: date,
    metadata_only: bool = False,
    evidence_root: Path | None = None,
) -> int:
    manifest = load_manifest()
    catalog = load_source_catalog()
    active_ids = load_active_source_ids()
    errors: list[str] = []
    errors.extend(_validate_columns(manifest))
    errors.extend(_validate_duplicates(manifest))
    errors.extend(_validate_metadata(manifest, catalog, active_ids, as_of))
    errors.extend(
        _validate_hashes(manifest, metadata_only=metadata_only, evidence_root=evidence_root)
    )

    if errors:
        for message in errors:
            print(f"::error::{message}")
        return 1

    mode = "metadata" if metadata_only else "metadata and evidence"
    location = f"; evidence root {evidence_root}" if evidence_root is not None else ""
    print(
        f"Manifest audit passed ({len(manifest)} rows; {mode}{location}; "
        f"as-of {as_of.isoformat()})."
    )
    return 0


DEFAULT_FRESHNESS_HORIZON_DAYS = 90


@dataclass(frozen=True)
class FreshnessEntry:
    """A single source review due date relative to the audit clock."""

    source_id: str
    review_due_at: date
    days_remaining: int

    @property
    def overdue(self) -> bool:
        return self.days_remaining < 0


@dataclass(frozen=True)
class FreshnessReport:
    """Offline view of overdue and upcoming source reviews."""

    as_of: date
    horizon_days: int
    overdue: tuple[FreshnessEntry, ...]
    upcoming: tuple[FreshnessEntry, ...]
    unparsable: tuple[str, ...]

    def render(self) -> str:
        lines = [
            f"Source review freshness (as of {self.as_of.isoformat()}; "
            f"horizon {self.horizon_days} days)",
            f"- Overdue: {len(self.overdue)}",
        ]
        for entry in self.overdue:
            lines.append(
                f"  - {entry.source_id}: due {entry.review_due_at.isoformat()} "
                f"(overdue by {abs(entry.days_remaining)} days)"
            )
        lines.append(f"- Upcoming: {len(self.upcoming)}")
        for entry in self.upcoming:
            lines.append(
                f"  - {entry.source_id}: due {entry.review_due_at.isoformat()} "
                f"({entry.days_remaining} days remaining)"
            )
        lines.append(f"- Unparsable review_due_at: {len(self.unparsable)}")
        for source_id in self.unparsable:
            lines.append(f"  - {source_id}")
        return "\n".join(lines)


def build_freshness_report(
    catalog: Mapping[str, object],
    *,
    as_of: date,
    horizon_days: int = DEFAULT_FRESHNESS_HORIZON_DAYS,
) -> FreshnessReport:
    """Classify registry reviews as overdue or due within ``horizon_days``.

    Purely offline: it reads the already-loaded source catalog and never performs
    network I/O, so the metadata-only release gate stays network-independent.
    """

    overdue: list[FreshnessEntry] = []
    upcoming: list[FreshnessEntry] = []
    unparsable: list[str] = []
    for source_id in sorted(catalog):
        raw = (getattr(catalog[source_id], "review_due_at", None) or "").strip()
        try:
            due = date.fromisoformat(raw) if raw else None
        except ValueError:
            due = None
        if due is None:
            unparsable.append(source_id)
            continue
        remaining = (due - as_of).days
        entry = FreshnessEntry(source_id=source_id, review_due_at=due, days_remaining=remaining)
        if entry.overdue:
            overdue.append(entry)
        elif remaining <= horizon_days:
            upcoming.append(entry)

    def _sort_key(entry: FreshnessEntry) -> tuple[date, str]:
        return (entry.review_due_at, entry.source_id)

    return FreshnessReport(
        as_of=as_of,
        horizon_days=horizon_days,
        overdue=tuple(sorted(overdue, key=_sort_key)),
        upcoming=tuple(sorted(upcoming, key=_sort_key)),
        unparsable=tuple(unparsable),
    )


def freshness_report(
    *, as_of: date, horizon_days: int = DEFAULT_FRESHNESS_HORIZON_DAYS
) -> FreshnessReport:
    """Build the offline freshness report from the canonical source catalog."""

    return build_freshness_report(load_source_catalog(), as_of=as_of, horizon_days=horizon_days)


def run_freshness(
    *,
    as_of: date,
    horizon_days: int = DEFAULT_FRESHNESS_HORIZON_DAYS,
    gate: bool = False,
) -> int:
    """Print the informational freshness report; ``gate`` opts into failure on overdue."""

    report = freshness_report(as_of=as_of, horizon_days=horizon_days)
    print(report.render())
    if gate and report.overdue:
        print(f"::error::{len(report.overdue)} source review(s) are overdue")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit the active source ledger")
    parser.add_argument("--as-of", required=True, help="Review date in YYYY-MM-DD format")
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="Validate ledger metadata without claiming to hash unavailable evidence bytes",
    )
    parser.add_argument(
        "--evidence-root",
        type=Path,
        help=(
            "Directory containing downloaded evidence; relative stored_as paths resolve "
            "against it. Required in practice to hash external bytes, which are never committed."
        ),
    )
    parser.add_argument(
        "--freshness",
        action="store_true",
        help="Print the offline overdue/upcoming source-review report instead of auditing",
    )
    parser.add_argument(
        "--horizon-days",
        type=int,
        default=DEFAULT_FRESHNESS_HORIZON_DAYS,
        help="Upcoming-review window for --freshness (default: 90)",
    )
    parser.add_argument(
        "--gate",
        action="store_true",
        help="With --freshness, exit non-zero when any review is overdue",
    )
    args = parser.parse_args()
    try:
        as_of = date.fromisoformat(args.as_of)
    except ValueError as exc:
        parser.error("--as-of must be YYYY-MM-DD")
        raise AssertionError from exc
    if args.freshness:
        return run_freshness(as_of=as_of, horizon_days=args.horizon_days, gate=args.gate)
    if args.evidence_root is not None and args.metadata_only:
        parser.error("--evidence-root cannot be combined with --metadata-only")
    evidence_root = args.evidence_root.resolve() if args.evidence_root is not None else None
    return run(as_of=as_of, metadata_only=args.metadata_only, evidence_root=evidence_root)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
