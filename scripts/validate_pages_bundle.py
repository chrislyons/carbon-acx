from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Any

DEFAULT_SITE_DIR = Path("dist/site")
ARTIFACT_SUBDIR = "artifacts"
INDEX_FILENAME = "index.json"
COLLECTION_MANIFEST_FILENAME = "manifest.json"
FIGURE_DIRNAME = "figures"
REFERENCE_DIRNAME = "references"

REQUIRED_HEADERS = (
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "X-Frame-Options: DENY",
    "Strict-Transport-Security:",
    "Content-Security-Policy:",
)

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


class BundleValidationError(RuntimeError):
    """Raised when the packaged Pages bundle is missing or inconsistent."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = list(errors)
        joined = "\n".join(f" - {error}" for error in self.errors)
        super().__init__(f"Pages bundle validation failed:\n{joined}")


@dataclass
class BundleReport:
    """Summary of a validated Pages bundle."""

    site_root: Path
    indexed_files: int = 0
    manifest_hashes: int = 0
    figures: int = 0
    references: int = 0


@dataclass
class _Errors:
    messages: list[str] = field(default_factory=list)

    def add(self, message: str) -> None:
        self.messages.append(message)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_json(path: Path, errors: _Errors, label: str) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        errors.add(f"{label} could not be read: {path} ({exc})")
    except json.JSONDecodeError as exc:
        errors.add(f"{label} is not valid JSON: {path} ({exc})")
    return None


def _safe_artifact_path(root: Path, raw: object, errors: _Errors, label: str) -> Path | None:
    """Resolve ``raw`` beneath ``root``, rejecting traversal and unsafe names."""

    if not isinstance(raw, str) or not raw:
        errors.add(f"{label}: artifact path must be a non-empty string (got {raw!r})")
        return None

    if raw != raw.strip() or any(ord(char) < 0x20 for char in raw):
        errors.add(f"{label}: artifact path contains whitespace or control characters: {raw!r}")
        return None

    if "\\" in raw:
        errors.add(f"{label}: artifact path must use POSIX separators: {raw!r}")
        return None

    pure = PurePosixPath(raw)
    if pure.is_absolute():
        errors.add(f"{label}: artifact path must be relative: {raw!r}")
        return None

    for part in pure.parts:
        if part in ("", ".", ".."):
            errors.add(f"{label}: artifact path escapes the artifact root: {raw!r}")
            return None

    root_resolved = root.resolve()
    candidate = root_resolved.joinpath(*pure.parts)
    resolved = candidate.resolve()
    if not resolved.is_relative_to(root_resolved):
        errors.add(f"{label}: artifact path escapes the artifact root: {raw!r}")
        return None
    return resolved


def _check_site_root(site_root: Path, errors: _Errors) -> None:
    if not site_root.is_dir():
        errors.add(f"site root is not a directory: {site_root}")
        return
    index_html = site_root / "index.html"
    if not index_html.is_file():
        errors.add(f"site root is missing index.html: {index_html}")
    elif index_html.stat().st_size == 0:
        errors.add(f"site root index.html is empty: {index_html}")


def _check_headers(site_root: Path, errors: _Errors) -> None:
    headers_path = site_root / "_headers"
    if not headers_path.is_file():
        errors.add(f"missing Pages _headers file: {headers_path}")
        return
    content = headers_path.read_text(encoding="utf-8")
    if not content.strip():
        errors.add(f"Pages _headers file is empty: {headers_path}")
        return
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if "/*" not in lines:
        errors.add("Pages _headers file must define a '/*' block")
    if "/artifacts/*" not in lines:
        errors.add("Pages _headers file must define an '/artifacts/*' cache block")
    for required in REQUIRED_HEADERS:
        if not any(line.startswith(required) for line in lines):
            errors.add(f"Pages _headers file is missing required directive: {required}")


def _check_redirects(site_root: Path, errors: _Errors) -> None:
    redirects_path = site_root / "_redirects"
    if not redirects_path.is_file():
        errors.add(f"missing Pages _redirects file: {redirects_path}")
        return
    content = redirects_path.read_text(encoding="utf-8")
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if not lines:
        errors.add(f"Pages _redirects file is empty: {redirects_path}")
        return
    for line in lines:
        parts = line.split()
        if len(parts) not in (2, 3) or not parts[0].startswith("/") or not parts[1].startswith("/"):
            errors.add(f"malformed redirect rule: {line!r}")
            continue
        if len(parts) == 3 and not parts[2].isdigit():
            errors.add(f"malformed redirect status code: {line!r}")


def _check_artifact_index(artifacts_root: Path, errors: _Errors) -> int:
    index_path = artifacts_root / INDEX_FILENAME
    if not index_path.is_file():
        errors.add(f"missing artifact index: {index_path}")
        return 0

    payload = _load_json(index_path, errors, "artifact index")
    if payload is None:
        return 0
    if not isinstance(payload, dict) or not isinstance(payload.get("files"), list):
        errors.add(f"artifact index must contain a 'files' list: {index_path}")
        return 0

    files = payload["files"]
    if not files:
        errors.add(f"artifact index lists no files: {index_path}")
        return 0

    for entry in files:
        if not isinstance(entry, dict):
            errors.add(f"artifact index entry must be an object: {entry!r}")
            continue
        raw = entry.get("path")
        resolved = _safe_artifact_path(artifacts_root, raw, errors, "artifact index")
        if resolved is None:
            continue
        expected_bytes = entry.get("bytes")
        if not isinstance(expected_bytes, int) or expected_bytes < 0:
            errors.add(f"artifact index entry has invalid byte count: {entry!r}")
            continue
        if not resolved.is_file():
            errors.add(f"artifact index references a missing file: {raw!r}")
            continue
        actual_bytes = resolved.stat().st_size
        if actual_bytes != expected_bytes:
            errors.add(
                f"artifact index byte count mismatch for {raw!r}: "
                f"indexed {expected_bytes}, actual {actual_bytes}"
            )
    return len(files)


def _check_collection_manifest(artifacts_root: Path, errors: _Errors) -> tuple[int, int, int]:
    manifest_path = artifacts_root / COLLECTION_MANIFEST_FILENAME
    if not manifest_path.is_file():
        errors.add(f"missing collection manifest: {manifest_path}")
        return 0, 0, 0

    payload = _load_json(manifest_path, errors, "collection manifest")
    if payload is None:
        return 0, 0, 0
    if not isinstance(payload, dict):
        errors.add(f"collection manifest must be an object: {manifest_path}")
        return 0, 0, 0

    figures = payload.get("figures")
    if not isinstance(figures, list) or not figures:
        errors.add(f"collection manifest lists no figures: {manifest_path}")
        return 0, 0, 0

    hash_count = 0
    figure_count = 0
    reference_count = 0

    dataset_manifest = payload.get("dataset_manifest")
    if isinstance(dataset_manifest, dict):
        raw = dataset_manifest.get("path")
        resolved = _safe_artifact_path(artifacts_root, raw, errors, "collection manifest dataset")
        expected = dataset_manifest.get("sha256")
        if resolved is not None:
            if not isinstance(expected, str) or not _HEX64.match(expected):
                errors.add(f"collection manifest dataset has an invalid sha256: {expected!r}")
            elif not resolved.is_file():
                errors.add(f"collection manifest references a missing dataset manifest: {raw!r}")
            elif _sha256(resolved) != expected:
                errors.add(f"collection manifest dataset hash mismatch: {raw!r}")
            else:
                hash_count += 1
    else:
        errors.add(f"collection manifest is missing dataset_manifest: {manifest_path}")

    for figure in figures:
        if not isinstance(figure, dict):
            errors.add(f"collection manifest figure entry must be an object: {figure!r}")
            continue
        for group, counter in (
            ("manifests", None),
            (FIGURE_DIRNAME, "figure"),
            (REFERENCE_DIRNAME, "reference"),
        ):
            entries = figure.get(group)
            if not isinstance(entries, list) or not entries:
                errors.add(
                    f"collection manifest figure {figure.get('figure_id')!r} missing {group}"
                )
                continue
            for entry in entries:
                if not isinstance(entry, dict):
                    errors.add(f"collection manifest {group} entry must be an object: {entry!r}")
                    continue
                raw = entry.get("path")
                resolved = _safe_artifact_path(
                    artifacts_root, raw, errors, f"collection manifest {group}"
                )
                if resolved is None:
                    continue
                expected = entry.get("sha256")
                if not isinstance(expected, str) or not _HEX64.match(expected):
                    errors.add(f"collection manifest {group} entry has an invalid sha256: {raw!r}")
                    continue
                if not resolved.is_file():
                    errors.add(f"collection manifest references a missing {group} file: {raw!r}")
                    continue
                if _sha256(resolved) != expected:
                    errors.add(f"collection manifest {group} hash mismatch: {raw!r}")
                    continue
                hash_count += 1
                if counter == "figure":
                    figure_count += 1
                elif counter == "reference":
                    reference_count += 1

    if figure_count == 0:
        errors.add(f"collection manifest references no figure artifacts: {manifest_path}")
    if reference_count == 0:
        errors.add(f"collection manifest references no reference artifacts: {manifest_path}")

    return hash_count, figure_count, reference_count


def _check_artifact_dirs(artifacts_root: Path, errors: _Errors) -> None:
    for dirname in (FIGURE_DIRNAME, REFERENCE_DIRNAME):
        directory = artifacts_root / dirname
        if not directory.is_dir():
            errors.add(f"missing artifact directory: {directory}")
            continue
        files = [item for item in directory.iterdir() if item.is_file()]
        if not files:
            errors.add(f"artifact directory is empty: {directory}")


def validate_pages_bundle(site_root: Path, artifact_subdir: str = ARTIFACT_SUBDIR) -> BundleReport:
    """Validate a packaged Cloudflare Pages bundle rooted at ``site_root``.

    Raises :class:`BundleValidationError` aggregating every failed check.
    """

    site_root = Path(site_root)
    errors = _Errors()
    report = BundleReport(site_root=site_root)

    _check_site_root(site_root, errors)
    _check_headers(site_root, errors)
    _check_redirects(site_root, errors)

    artifacts_root = site_root / artifact_subdir
    if not artifacts_root.is_dir():
        errors.add(f"missing artifact root: {artifacts_root}")
    else:
        report.indexed_files = _check_artifact_index(artifacts_root, errors)
        (
            report.manifest_hashes,
            report.figures,
            report.references,
        ) = _check_collection_manifest(artifacts_root, errors)
        _check_artifact_dirs(artifacts_root, errors)

    if errors.messages:
        raise BundleValidationError(errors.messages)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate the packaged Cloudflare Pages bundle under dist/site.",
    )
    parser.add_argument(
        "--site",
        type=Path,
        default=DEFAULT_SITE_DIR,
        help=f"Path to the packaged static site root (default: {DEFAULT_SITE_DIR})",
    )
    parser.add_argument(
        "--artifact-subdir",
        default=ARTIFACT_SUBDIR,
        help=f"Subdirectory holding packaged artifacts (default: {ARTIFACT_SUBDIR})",
    )
    args = parser.parse_args(argv)

    try:
        report = validate_pages_bundle(args.site, args.artifact_subdir)
    except BundleValidationError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(
        "Pages bundle OK: "
        f"{report.indexed_files} indexed files, "
        f"{report.manifest_hashes} verified hashes, "
        f"{report.figures} figure artifacts, "
        f"{report.references} reference artifacts."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
