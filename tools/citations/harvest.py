from __future__ import annotations

import argparse
import csv
import datetime as dt
from pathlib import Path
from collections.abc import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES_PATH = REPO_ROOT / "data" / "sources.csv"
REFERENCES_DIR = REPO_ROOT / "references"
MANIFEST_PATH = REFERENCES_DIR / "manifest.csv"
ERROR_LOG_PATH = REFERENCES_DIR / "harvest_errors.txt"
USER_AGENT = "carbon-acx-harvester/1.0"

MANIFEST_FIELDS = ["source_id", "url", "local_path", "archive_url", "fetched_at"]


def _load_sources() -> list[dict[str, str]]:
    if not SOURCES_PATH.exists():
        raise SystemExit(f"Missing sources.csv at {SOURCES_PATH}")
    with SOURCES_PATH.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _determine_extension(url: str) -> str:
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix == ".pdf":
        # We cannot commit binary payloads to the repository, so represent PDF
        # snapshots with a text-based Internet shortcut that points to the
        # original source URL.
        return ".url"
    if suffix in {".html", ".htm"}:
        return ".html"
    return ".html"


def _expected_local_path(source_id: str, url: str) -> Path:
    extension = _determine_extension(url)
    return REFERENCES_DIR / f"{source_id}{extension}"


def _write_manifest(rows: Iterable[dict[str, str]]) -> None:
    with MANIFEST_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _load_existing_manifest() -> dict[str, dict[str, str]]:
    if not MANIFEST_PATH.exists():
        return {}
    with MANIFEST_PATH.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return {row.get("source_id", ""): row for row in reader if row.get("source_id")}


def _write_url_shortcut(destination: Path, url: str) -> None:
    shortcut = "[InternetShortcut]\nURL={url}\n".format(url=url)
    destination.write_text(shortcut, encoding="utf-8")


def _download(url: str, destination: Path) -> tuple[str, str] | None:
    extension = destination.suffix.lower()
    fetched_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    if extension == ".url":
        _write_url_shortcut(destination, url)
        archive_url = _attempt_archive(url)
        return fetched_at, archive_url
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request) as response:
            data = response.read()
    except (HTTPError, URLError):  # pragma: no cover - network errors
        return None
    destination.write_bytes(data)
    archive_url = _attempt_archive(url)
    return fetched_at, archive_url


def _attempt_archive(url: str) -> str:
    archive_endpoint = f"https://web.archive.org/save/{url}"
    request = Request(archive_endpoint, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request) as response:  # pragma: no cover - network dependent
            location = response.headers.get("Content-Location")
    except (HTTPError, URLError):  # pragma: no cover - network errors
        return ""
    if not location:
        return ""
    if location.startswith("http"):
        return location
    return f"https://web.archive.org{location}"


def _append_error(errors: list[str], message: str) -> None:
    errors.append(message)


def _write_errors(errors: list[str]) -> None:
    if errors:
        ERROR_LOG_PATH.write_text("\n".join(errors) + "\n", encoding="utf-8")
    elif ERROR_LOG_PATH.exists():
        ERROR_LOG_PATH.unlink()


def _relpath(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def run(check_only: bool) -> int:
    REFERENCES_DIR.mkdir(parents=True, exist_ok=True)
    sources = _load_sources()
    existing_manifest = _load_existing_manifest()

    manifest_rows: list[dict[str, str]] = []
    errors: list[str] = []

    for row in sources:
        source_id = (row.get("source_id") or "").strip()
        url = (row.get("url") or "").strip()
        if not source_id or not url:
            continue

        local_path = _expected_local_path(source_id, url)
        fetched_at = ""
        archive_url = ""

        previous = existing_manifest.get(source_id, {})
        if check_only:
            if not local_path.exists():
                _append_error(
                    errors, f"Missing harvested file for {source_id}: expected {local_path}"
                )
            fetched_at = previous.get("fetched_at", "")
            archive_url = previous.get("archive_url", "")
        else:
            result = _download(url, local_path)
            if result is None:
                _append_error(errors, f"Failed to download {source_id} from {url}")
            else:
                fetched_at, archive_url = result

        manifest_rows.append(
            {
                "source_id": source_id,
                "url": url,
                "local_path": _relpath(local_path) if local_path.exists() else _relpath(local_path),
                "archive_url": archive_url or previous.get("archive_url", ""),
                "fetched_at": fetched_at or previous.get("fetched_at", ""),
            }
        )

    _write_manifest(manifest_rows)
    _write_errors(errors)
    if errors and not check_only:
        return 1
    return 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Harvest source material for references")
    parser.add_argument(
        "--check", action="store_true", help="Verify harvest state without downloading"
    )
    args = parser.parse_args(argv)

    exit_code = run(check_only=args.check)
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
