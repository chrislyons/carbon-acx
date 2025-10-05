"""Normalize fetched references into Markdown."""

from __future__ import annotations

import argparse
import hashlib
import logging
from pathlib import Path
from typing import Optional, Sequence, Set

from .refs_common import ManifestRow, load_manifest, write_manifest


LOGGER = logging.getLogger(__name__)

RESTRICTED_LICENSES = {"copyright-unknown", "paywalled", "robots-disallow"}


def convert_pdf(path: Path) -> str:
    try:
        import fitz  # type: ignore[import-not-found]

        with fitz.open(path) as document:
            pages = [page.get_text("markdown") or page.get_text("text") for page in document]
            return "\n\n".join(pages)
    except ImportError as exc:  # pragma: no cover - defensive
        raise RuntimeError("PyMuPDF is required for PDF normalization") from exc
    except Exception as exc:
        LOGGER.warning("PyMuPDF failed for %s (%s); falling back to pdfminer", path, exc)

    try:
        from pdfminer.high_level import extract_text  # type: ignore[import-not-found]

        return extract_text(path)
    except ImportError as exc:  # pragma: no cover - defensive
        raise RuntimeError("pdfminer.six is required for PDF normalization fallback") from exc


def convert_html(path: Path) -> str:
    html = path.read_text(encoding="utf-8", errors="ignore")

    try:
        import trafilatura  # type: ignore[import-not-found]

        extracted = trafilatura.extract(html, output_format="markdown")
        if extracted:
            return extracted
    except ImportError:
        pass
    except Exception as exc:  # pragma: no cover - robustness
        LOGGER.warning("Trafilatura failed for %s: %s", path, exc)

    try:
        from readability import Document  # type: ignore[import-not-found]
        from markdownify import markdownify as to_markdown  # type: ignore[import-not-found]

        document = Document(html)
        return to_markdown(document.summary(html_partial=True))
    except ImportError as exc:  # pragma: no cover - defensive
        raise RuntimeError("readability-lxml and markdownify are required for HTML normalization") from exc


def convert_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def write_stub(row: ManifestRow) -> str:
    link = row.final_url or row.src_url
    return (
        f"# {row.source_id}\n\n"
        "Content not available for redistribution. Please consult the original source:\n"
        f"{link}\n"
    )


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_source(
    refs_root: Path,
    normalized_dir: Path,
    row: ManifestRow,
    force: bool,
) -> Optional[ManifestRow]:
    if not row.stored_as:
        LOGGER.debug("Skipping %s: no stored binary", row.source_id)
        return None

    source_path = refs_root / row.stored_as
    if not source_path.exists():
        LOGGER.warning("Raw file missing for %s at %s", row.source_id, source_path)
        return None

    output_path = normalized_dir / f"{row.source_id}.md"
    if output_path.exists() and not force and row.normalized_md:
        LOGGER.debug("Skipping %s: normalized Markdown already present", row.source_id)
        return None

    if row.license_note in RESTRICTED_LICENSES and not force:
        content = write_stub(row)
    else:
        suffix = source_path.suffix.lower()
        if suffix == ".pdf":
            content = convert_pdf(source_path)
        elif suffix in {".html", ".htm"}:
            content = convert_html(source_path)
        else:
            content = convert_text(source_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")

    row.normalized_md = str(Path("normalized") / output_path.name)
    row.normalized_sha256 = sha256_text(content)
    return row


def normalize_all(
    refs_root: Path,
    manifest_path: Path,
    only: Optional[Set[str]],
    force: bool,
) -> int:
    manifest = load_manifest(manifest_path)
    normalized_dir = refs_root / "normalized"
    updated = False

    for source_id, row in manifest.items():
        if only and source_id not in only:
            continue
        updated_row = normalize_source(refs_root, normalized_dir, row, force)
        if updated_row is not None:
            manifest[source_id] = updated_row
            updated = True

    if updated:
        write_manifest(manifest_path, manifest)
        LOGGER.info("Updated manifest with normalized Markdown metadata")
    else:
        LOGGER.info("No sources required normalization")
    return 0


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Normalize reference sources into Markdown")
    parser.add_argument("--only", help="Comma-separated list of source IDs to normalize", default="")
    parser.add_argument("--force", action="store_true", help="Regenerate Markdown even if it exists")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = build_argument_parser()
    args = parser.parse_args(argv)

    only_ids = {part.strip() for part in args.only.split(",") if part.strip()}

    repo_root = Path.cwd()
    refs_root = repo_root / "refs"
    manifest_path = refs_root / "sources_manifest.csv"

    return normalize_all(refs_root, manifest_path, only_ids or None, args.force)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
