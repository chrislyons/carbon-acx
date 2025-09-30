from __future__ import annotations

from pathlib import Path

import pytest

from scripts.prepare_pages_bundle import HEADERS_TEMPLATE, REDIRECTS_TEMPLATE, prepare_pages_bundle


def _write_site_stub(site_root: Path) -> None:
    site_root.mkdir(parents=True, exist_ok=True)
    # create placeholder to ensure the copy step replaces existing content
    old_headers = site_root / "_headers"
    old_headers.write_text("stale", encoding="utf-8")
    stale_artifact = site_root / "artifacts"
    stale_artifact.mkdir()
    (stale_artifact / "old.json").write_text("{}", encoding="utf-8")


def _write_artifacts_stub(artifacts_dir: Path) -> None:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "manifest.json").write_text(
        '{"generated_at": "2024-01-01T00:00:00Z"}', encoding="utf-8"
    )
    nested = artifacts_dir / "figures"
    nested.mkdir()
    (nested / "stacked.json").write_text("{}", encoding="utf-8")


def test_prepare_pages_bundle_copies_artifacts_and_metadata(tmp_path: Path) -> None:
    site_root = tmp_path / "dist" / "site"
    artifacts_dir = tmp_path / "dist" / "packaged-artifacts"

    _write_site_stub(site_root)
    _write_artifacts_stub(artifacts_dir)

    prepare_pages_bundle(site_root, artifacts_dir)

    copied_manifest = (site_root / "artifacts" / "manifest.json").read_text(encoding="utf-8")
    assert "generated_at" in copied_manifest

    headers_content = (site_root / "_headers").read_text(encoding="utf-8")
    assert headers_content == HEADERS_TEMPLATE

    redirects_content = (site_root / "_redirects").read_text(encoding="utf-8")
    assert redirects_content == REDIRECTS_TEMPLATE


def test_prepare_pages_bundle_requires_directories(tmp_path: Path) -> None:
    site_root = tmp_path / "missing-site"
    artifacts_dir = tmp_path / "missing-artifacts"

    with pytest.raises(FileNotFoundError):
        prepare_pages_bundle(site_root, artifacts_dir)

    site_root.mkdir()
    with pytest.raises(FileNotFoundError):
        prepare_pages_bundle(site_root, artifacts_dir)
