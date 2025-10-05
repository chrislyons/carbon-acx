"""Helpers for embedding reference materials into downstream builds."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from .refs_util import REFS_DIR, load_manifest, load_source_catalog

BLOCKED_LICENSE_TOKENS = {"paywall", "copyright-unknown"}


@dataclass
class ReferenceMaterial:
    source_id: str
    src_url: str | None
    final_url: str | None
    content_type: str | None
    filesize_bytes: int | None
    sha256: str | None
    license_note: str | None
    normalized_content: str | None
    normalized_sha256: str | None

    def allows_embedding(self) -> bool:
        if not self.license_note:
            return True
        lowered = self.license_note.lower()
        return not any(token in lowered for token in BLOCKED_LICENSE_TOKENS)

    def provenance_panel(self) -> Mapping[str, str | int | None]:
        return {
            "source_id": self.source_id,
            "src_url": self.src_url,
            "final_url": self.final_url,
            "content_type": self.content_type,
            "filesize_bytes": self.filesize_bytes,
            "sha256": self.sha256,
            "license_note": self.license_note,
        }


def _read_normalized(path_fragment: str | None) -> str | None:
    if not path_fragment:
        return None
    path = Path(path_fragment)
    if not path.is_absolute():
        path = (REFS_DIR.parent / path).resolve()
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")


def load_reference_material(source_id: str) -> ReferenceMaterial | None:
    manifest = load_manifest()
    catalog = load_source_catalog()
    rows = [row for row in manifest if row.get("source_id") == source_id]
    if not rows:
        return None
    row = rows[0]
    normalized_md = row.get("normalized_md") or ""
    normalized_sha256 = row.get("normalized_sha256") or None
    content = _read_normalized(normalized_md)
    filesize = int(row["filesize_bytes"]) if row.get("filesize_bytes") else None
    catalog_entry = catalog.get(source_id)
    license_note = row.get("license_note") or (catalog_entry.license if catalog_entry else None)
    return ReferenceMaterial(
        source_id=source_id,
        src_url=row.get("src_url") or None,
        final_url=row.get("final_url") or None,
        content_type=row.get("content_type") or None,
        filesize_bytes=filesize,
        sha256=row.get("sha256") or None,
        license_note=license_note,
        normalized_content=content,
        normalized_sha256=normalized_sha256,
    )


def load_all_reference_materials() -> dict[str, ReferenceMaterial]:
    manifest = load_manifest()
    catalog = load_source_catalog()
    materials: dict[str, ReferenceMaterial] = {}
    for row in manifest:
        source_id = row.get("source_id") or ""
        if not source_id:
            continue
        normalized_md = row.get("normalized_md") or ""
        content = _read_normalized(normalized_md)
        filesize = int(row["filesize_bytes"]) if row.get("filesize_bytes") else None
        catalog_entry = catalog.get(source_id)
        license_note = row.get("license_note") or (catalog_entry.license if catalog_entry else None)
        materials[source_id] = ReferenceMaterial(
            source_id=source_id,
            src_url=row.get("src_url") or None,
            final_url=row.get("final_url") or None,
            content_type=row.get("content_type") or None,
            filesize_bytes=filesize,
            sha256=row.get("sha256") or None,
            license_note=license_note,
            normalized_content=content,
            normalized_sha256=row.get("normalized_sha256") or None,
        )
    return materials
