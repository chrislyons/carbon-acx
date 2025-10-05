"""Normalize fetched reference materials into Markdown."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

import markdownify
import trafilatura

from .refs_util import (
    NORMALIZED_DIR,
    REFS_DIR,
    load_manifest,
    load_source_catalog,
    write_manifest,
)
from .refs_util import hash_file

BLOCKED_LICENSE_TOKENS = {"paywall", "copyright-unknown"}

try:  # pragma: no cover - optional dependency in workflow
    import fitz  # type: ignore
except Exception:  # pragma: no cover - fallback handled at runtime
    fitz = None

try:  # pragma: no cover - optional dependency in workflow
    from pdfminer.high_level import extract_text as pdfminer_extract
except Exception:  # pragma: no cover - fallback handled at runtime
    pdfminer_extract = None


def _normalize_html(payload: bytes) -> str:
    text = payload.decode("utf-8", errors="ignore")
    extracted = trafilatura.extract(text) or text
    return markdownify.markdownify(extracted, heading_style="ATX")


def _normalize_pdf(path: Path) -> str:
    if fitz is not None:
        try:
            with fitz.open(path) as document:  # type: ignore[attr-defined]
                parts = [page.get_text() for page in document]
            return "\n".join(parts)
        except Exception:
            pass
    if pdfminer_extract is not None:
        try:
            return pdfminer_extract(str(path))
        except Exception:
            pass
    return ""


def _normalize_plain(payload: bytes) -> str:
    return payload.decode("utf-8", errors="ignore")


def _should_stub(license_note: str | None) -> bool:
    if not license_note:
        return False
    lowered = license_note.lower()
    return any(token in lowered for token in BLOCKED_LICENSE_TOKENS)


def _stub_content(source_id: str, src_url: str | None) -> str:
    lines = [
        f"# {source_id}",
        "",
        "Content not redistributed due to licensing restrictions.",
    ]
    if src_url:
        lines.extend(["", f"Read at source: {src_url}"])
    return "\n".join(lines) + "\n"


def _extract_markdown(raw_path: Path, content_type: str) -> str:
    payload = raw_path.read_bytes()
    if content_type.startswith("text/html") or raw_path.suffix.lower() == ".html":
        return _normalize_html(payload)
    if content_type.startswith("application/pdf") or raw_path.suffix.lower() == ".pdf":
        return _normalize_pdf(raw_path)
    if content_type.startswith("text/"):
        return _normalize_plain(payload)
    return _normalize_plain(payload)


def _update_manifest_row(
    row: dict[str, str], normalized_path: Path, sha_value: str
) -> dict[str, str]:
    updated = dict(row)
    updated["normalized_md"] = str(Path("refs/normalized") / normalized_path.name)
    updated["normalized_sha256"] = sha_value
    updated.setdefault("notes", "")
    return updated


def run(only: Sequence[str] | None = None, force: bool = False) -> int:
    manifest = load_manifest()
    catalog = load_source_catalog()
    if not manifest:
        print("Manifest empty; nothing to normalize.")
        return 0

    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    updated_rows: list[dict[str, str]] = []

    only_set = {item.strip() for item in (only or []) if item.strip()}

    for row in manifest:
        source_id = row.get("source_id", "")
        if not source_id:
            continue
        if only_set and source_id not in only_set:
            updated_rows.append(row)
            continue

        stored_as = row.get("stored_as", "")
        if not stored_as:
            updated_rows.append(row)
            continue
        raw_path = Path(stored_as)
        if not raw_path.is_absolute():
            raw_path = (REFS_DIR.parent / raw_path).resolve()
        if not raw_path.exists():
            print(f"[skip] {source_id}: raw file missing at {raw_path}")
            updated_rows.append(row)
            continue

        catalog_entry = catalog.get(source_id)
        license_note = row.get("license_note") or (catalog_entry.license if catalog_entry else None)
        if _should_stub(license_note):
            content = _stub_content(source_id, row.get("final_url") or row.get("src_url"))
        else:
            content = _extract_markdown(raw_path, row.get("content_type", ""))
            if not content.strip():
                content = _stub_content(source_id, row.get("final_url") or row.get("src_url"))

        normalized_path = NORMALIZED_DIR / f"{source_id}.md"
        if normalized_path.exists() and not force:
            print(f"[keep] {source_id}: normalized file already exists")
        else:
            normalized_path.write_text(content, encoding="utf-8")
        sha_value = hash_file(normalized_path)
        updated_rows.append(_update_manifest_row(row, normalized_path, sha_value))

    write_manifest(updated_rows)
    return 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize reference binaries into Markdown")
    parser.add_argument("--only", default="", help="Comma-separated source_ids")
    parser.add_argument("--force", action="store_true", help="Overwrite existing normalized files")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    only = [item.strip() for item in args.only.split(",") if item.strip()]
    return run(only, force=args.force)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
