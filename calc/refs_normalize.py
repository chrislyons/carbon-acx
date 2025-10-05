from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Dict, Optional, Sequence

from .refs_common import (
    ManifestRow,
    ensure_license_note,
    hash_file,
    load_manifest,
    write_manifest,
)

NORMALIZED_ROOT = Path("refs/normalized")
MANIFEST_PATH = Path("refs/sources_manifest.csv")
RESTRICTED_LICENSES = {"copyright-unknown", "paywalled", "robots-disallow"}

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def extract_pdf(path: Path) -> str:
    try:
        import fitz  # type: ignore

        doc = fitz.open(path)
        texts = [page.get_text("text") for page in doc]
        return "\n\n".join(texts)
    except ImportError:
        pass
    try:
        from pdfminer.high_level import extract_text  # type: ignore

        return extract_text(path)
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pdfminer.six is required to normalize PDF files") from exc


def extract_html(path: Path) -> str:
    raw_html = path.read_text(encoding="utf-8", errors="ignore")
    try:
        import trafilatura  # type: ignore

        extracted = trafilatura.extract(raw_html, favor_precision=True) or raw_html
    except ImportError:
        extracted = raw_html
    try:
        from markdownify import markdownify as md  # type: ignore

        return md(extracted)
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("markdownify is required to normalize HTML files") from exc


def build_stub(row: ManifestRow) -> str:
    link = row.data.get("final_url") or row.data.get("src_url")
    lines = [f"# {row.source_id}", "", "Summary/notes only; see source link."]
    if link:
        lines.append("")
        lines.append(f"Source: {link}")
    return "\n".join(lines) + "\n"


def normalize_row(row: ManifestRow, force: bool) -> Optional[ManifestRow]:
    stored = row.stored_path
    if not stored or not stored.exists():
        logger.debug("No stored binary for %s", row.source_id)
        return None
    license_note = ensure_license_note(row.data.get("license_note"))
    target = NORMALIZED_ROOT / f"{row.source_id}.md"
    if not force and target.exists():
        logger.info("Normalized already exists for %s", row.source_id)
        row.update(normalized_md=str(target), normalized_sha256=hash_file(target))
        return row
    NORMALIZED_ROOT.mkdir(parents=True, exist_ok=True)
    if license_note in RESTRICTED_LICENSES:
        content = build_stub(row)
    else:
        suffix = stored.suffix.lower()
        if suffix == ".pdf":
            content = extract_pdf(stored)
        elif suffix in {".html", ".htm"}:
            content = extract_html(stored)
        else:
            content = build_stub(row)
    target.write_text(content, encoding="utf-8")
    row.update(normalized_md=str(target), normalized_sha256=hash_file(target))
    logger.info("Normalized %s -> %s", row.source_id, target)
    return row


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize reference sources to Markdown")
    parser.add_argument("--only", default="", help="Comma separated list of source_ids")
    parser.add_argument("--force", action="store_true", help="Regenerate even if present")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    only = {item.strip() for item in args.only.split(",") if item.strip()}
    manifest = load_manifest(MANIFEST_PATH)
    updated: Dict[str, ManifestRow] = {sid: row for sid, row in manifest.items()}
    for source_id, row in manifest.items():
        if only and source_id not in only:
            continue
        result = normalize_row(row, args.force)
        if result is not None:
            updated[source_id] = result
    write_manifest(MANIFEST_PATH, updated.values())


if __name__ == "__main__":
    main()
