from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from scripts.prepare_pages_bundle import HEADERS_TEMPLATE, REDIRECTS_TEMPLATE, prepare_pages_bundle
from scripts.validate_pages_bundle import BundleValidationError, validate_pages_bundle


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


def test_headers_template_carries_security_policies() -> None:
    lines = [line.strip() for line in HEADERS_TEMPLATE.splitlines() if line.strip()]
    assert lines[0] == "/*"
    for expected in (
        "X-Content-Type-Options: nosniff",
        "Referrer-Policy: strict-origin-when-cross-origin",
        "X-Frame-Options: DENY",
        "Permissions-Policy: camera=(), microphone=(), geolocation=()",
        "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    ):
        assert expected in lines
    csp = next(line for line in lines if line.startswith("Content-Security-Policy:"))
    for directive in ("default-src 'self'", "frame-ancestors 'none'", "object-src 'none'"):
        assert directive in csp


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _write_valid_bundle(site_root: Path) -> None:
    site_root.mkdir(parents=True, exist_ok=True)
    (site_root / "index.html").write_text("<!doctype html>", encoding="utf-8")
    (site_root / "_headers").write_text(HEADERS_TEMPLATE, encoding="utf-8")
    (site_root / "_redirects").write_text(REDIRECTS_TEMPLATE, encoding="utf-8")

    artifacts = site_root / "artifacts"
    figure = artifacts / "figures" / "bubble.json"
    reference = artifacts / "references" / "bubble_refs.txt"
    figure_manifest = artifacts / "manifests" / "bubble.manifest.json"
    dataset_manifest = artifacts / "calc" / "outputs" / "manifest.json"
    for path in (figure, reference, figure_manifest, dataset_manifest):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('{"ok": true}', encoding="utf-8")

    collection = {
        "figures": [
            {
                "figure_id": "bubble",
                "figure_method": "figures.bubble",
                "hash_prefix": "00000000",
                "manifests": [
                    {"path": "manifests/bubble.manifest.json", "sha256": _sha256(figure_manifest)}
                ],
                "figures": [{"path": "figures/bubble.json", "sha256": _sha256(figure)}],
                "references": [
                    {"path": "references/bubble_refs.txt", "sha256": _sha256(reference)}
                ],
            }
        ],
        "dataset_manifest": {
            "path": "calc/outputs/manifest.json",
            "sha256": _sha256(dataset_manifest),
        },
    }
    (artifacts / "manifest.json").write_text(json.dumps(collection), encoding="utf-8")

    files = [
        {"path": path.relative_to(artifacts).as_posix(), "bytes": path.stat().st_size}
        for path in sorted(artifacts.rglob("*"))
        if path.is_file() and path.name != "index.json"
    ]
    (artifacts / "index.json").write_text(json.dumps({"files": files}), encoding="utf-8")


def _read_index(artifacts: Path) -> dict:
    return json.loads((artifacts / "index.json").read_text(encoding="utf-8"))


def test_validate_pages_bundle_accepts_packaged_site(tmp_path: Path) -> None:
    site_root = tmp_path / "dist" / "site"
    _write_valid_bundle(site_root)

    report = validate_pages_bundle(site_root)

    assert report.indexed_files == 5
    assert report.manifest_hashes == 4
    assert report.figures == 1
    assert report.references == 1


def test_validate_pages_bundle_rejects_unsafe_artifact_path(tmp_path: Path) -> None:
    site_root = tmp_path / "dist" / "site"
    _write_valid_bundle(site_root)

    artifacts = site_root / "artifacts"
    index = _read_index(artifacts)
    index["files"][0]["path"] = "../../etc/passwd"
    (artifacts / "index.json").write_text(json.dumps(index), encoding="utf-8")

    with pytest.raises(BundleValidationError) as excinfo:
        validate_pages_bundle(site_root)
    assert any("escapes the artifact root" in message for message in excinfo.value.errors)


def test_validate_pages_bundle_rejects_tampered_figure(tmp_path: Path) -> None:
    site_root = tmp_path / "dist" / "site"
    _write_valid_bundle(site_root)

    figure = site_root / "artifacts" / "figures" / "bubble.json"
    figure.write_text('{"ok": false}', encoding="utf-8")

    with pytest.raises(BundleValidationError) as excinfo:
        validate_pages_bundle(site_root)
    assert any("hash mismatch" in message for message in excinfo.value.errors)


def test_validate_pages_bundle_requires_pages_metadata(tmp_path: Path) -> None:
    site_root = tmp_path / "dist" / "site"
    _write_valid_bundle(site_root)
    (site_root / "_redirects").unlink()

    with pytest.raises(BundleValidationError) as excinfo:
        validate_pages_bundle(site_root)
    assert any("_redirects" in message for message in excinfo.value.errors)
