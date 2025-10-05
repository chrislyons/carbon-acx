"""Helper functions for integrating reference content into the library UI."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from .refs_common import ManifestRow, load_manifest


def load_manifest_map(path: Optional[Path] = None) -> Dict[str, ManifestRow]:
    manifest_path = path or Path("refs") / "sources_manifest.csv"
    return load_manifest(manifest_path)


def load_reference_payload(source_id: str, refs_root: Optional[Path] = None) -> Optional[dict]:
    refs_dir = refs_root or Path("refs")
    manifest = load_manifest_map(refs_dir / "sources_manifest.csv")
    row = manifest.get(source_id)
    if not row:
        return None

    normalized_path = refs_dir / row.normalized_md if row.normalized_md else None
    normalized_content: Optional[str] = None
    if normalized_path and normalized_path.exists():
        if row.license_note not in {"copyright-unknown", "paywalled", "robots-disallow"}:
            normalized_content = normalized_path.read_text(encoding="utf-8")

    payload = row.to_row()
    payload["normalized_content"] = normalized_content
    payload["normalized_path"] = row.normalized_md
    return payload
