from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from .refs_common import ManifestRow, ensure_license_note, load_manifest

MANIFEST_PATH = Path("refs/sources_manifest.csv")
NORMALIZED_ROOT = Path("refs/normalized")
EMBED_ALLOWED = {"ok-public", "cc-by-4.0", "gov-open"}


def load_reference_manifest() -> Dict[str, ManifestRow]:
    return load_manifest(MANIFEST_PATH)


def normalized_content_path(source_id: str) -> Path:
    return NORMALIZED_ROOT / f"{source_id}.md"


def get_reference_payload(source_id: str) -> Optional[Dict[str, str]]:
    manifest = load_reference_manifest()
    row = manifest.get(source_id)
    if not row:
        return None
    license_note = ensure_license_note(row.data.get("license_note"))
    normalized_path = normalized_content_path(source_id)
    content = ""
    if license_note in EMBED_ALLOWED and normalized_path.exists():
        content = normalized_path.read_text(encoding="utf-8", errors="ignore")
    return {
        "source_id": source_id,
        "license_note": license_note,
        "src_url": row.data.get("src_url", ""),
        "final_url": row.data.get("final_url", ""),
        "content_type": row.data.get("content_type", ""),
        "filesize_bytes": row.data.get("filesize_bytes", ""),
        "sha256": row.data.get("sha256", ""),
        "stored_as": row.data.get("stored_as", ""),
        "normalized_content": content,
        "normalized_path": str(normalized_path) if normalized_path.exists() else "",
    }
