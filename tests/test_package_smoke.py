from __future__ import annotations

import json
import calc.derive as derive_mod
from scripts import build_site as build_site_module
from scripts import package_artifacts as package_artifacts_module
from tools import sbom as sbom_module


def test_package_creates_dist_tree(monkeypatch, tmp_path, derived_output_root, derived_output_dir):
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")

    derive_mod.export_view(output_root=derived_output_root)

    dist_dir = tmp_path / "dist"
    artifacts_dir = dist_dir / "artifacts"
    site_dir = dist_dir / "site"

    summary = package_artifacts_module.package_artifacts(derived_output_dir, artifacts_dir)
    index_path = build_site_module.build_site(artifacts_dir, site_dir)

    assert (artifacts_dir / "manifest.json").is_file()
    assert index_path == site_dir / "index.html"
    assert index_path.is_file()
    assert any(path.suffix == ".json" for path in artifacts_dir.rglob("*.json"))
    assert list(site_dir.glob("index.*"))
    assert summary["manifest"].get("generated_at") == "1970-01-01T00:00:00+00:00"


def test_generate_sbom(tmp_path):
    output_path = tmp_path / "dist" / "sbom.cdx.json"

    sbom_file = sbom_module.generate_sbom(output_path)

    assert sbom_file == output_path
    assert sbom_file.is_file()

    with sbom_file.open(encoding="utf-8") as fh:
        sbom_content = json.load(fh)

    assert sbom_content["bomFormat"] == "CycloneDX"
    assert sbom_content["components"]
