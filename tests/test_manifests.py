from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_ROOT = REPO_ROOT / "dist" / "artifacts"
MANIFEST_DIR = ARTIFACT_ROOT / "manifests"
SCHEMA_PATH = REPO_ROOT / "site" / "public" / "schemas" / "figure-manifest.schema.json"
INDEX_PATH = ARTIFACT_ROOT / "manifest.json"


@pytest.fixture(scope="session")
def figure_manifest_validator() -> Draft202012Validator:
    if not SCHEMA_PATH.exists():
        pytest.skip("Figure manifest schema is missing; run make build first")
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return Draft202012Validator(schema)


def _read_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _reference_lines(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return [line for line in text.splitlines() if line]


def test_figure_manifests_are_valid(figure_manifest_validator: Draft202012Validator) -> None:
    if not MANIFEST_DIR.exists():
        pytest.skip("No manifests directory; run make build first")

    manifest_files = sorted(MANIFEST_DIR.glob("*.manifest.json"))
    assert manifest_files, "expected per-figure manifests to exist"

    for manifest_path in manifest_files:
        manifest_payload = _read_manifest(manifest_path)
        figure_manifest_validator.validate(manifest_payload)

        figure_path_value = manifest_payload.get("figure_path")
        assert isinstance(figure_path_value, str) and figure_path_value
        figure_path = ARTIFACT_ROOT / figure_path_value
        assert figure_path.exists(), f"figure file missing: {figure_path_value}"
        assert _hash_file(figure_path) == manifest_payload["figure_sha256"]

        references_payload = manifest_payload["references"]
        references_path_value = references_payload["path"]
        assert isinstance(references_path_value, str) and references_path_value
        references_path = ARTIFACT_ROOT / references_path_value
        assert references_path.exists(), f"references file missing: {references_path_value}"
        references_lines = _reference_lines(references_path)
        assert len(references_lines) == references_payload["line_count"]
        order_entries = references_payload["order"]
        assert len(order_entries) == len(references_lines)
        for index, entry in enumerate(order_entries, start=1):
            assert entry["index"] == index

        invariance = manifest_payload["numeric_invariance"]
        assert invariance["passed"] is True
        assert float(invariance["tolerance_percent"]) <= 0.01


def test_manifest_index_matches_files() -> None:
    if not INDEX_PATH.exists():
        pytest.skip("Collection manifest index missing; run make build first")

    index_payload = _read_manifest(INDEX_PATH)
    dataset_entry = index_payload.get("dataset_manifest", {})
    dataset_path_value = dataset_entry.get("path")
    assert isinstance(dataset_path_value, str) and dataset_path_value
    dataset_path = ARTIFACT_ROOT / dataset_path_value
    assert dataset_path.exists(), "dataset manifest path missing"
    assert _hash_file(dataset_path) == dataset_entry.get("sha256")

    figures_payload = index_payload.get("figures")
    assert isinstance(figures_payload, list) and figures_payload
    for entry in figures_payload:
        assert isinstance(entry, dict)
        for key in ("manifests", "figures", "references"):
            artefacts = entry.get(key)
            assert isinstance(artefacts, list) and artefacts
            for artefact in artefacts:
                assert isinstance(artefact, dict)
                path_value = artefact.get("path")
                assert isinstance(path_value, str) and path_value
                path = ARTIFACT_ROOT / path_value
                assert path.exists(), f"missing artefact for {entry.get('figure_id')}: {path_value}"
                sha_value = artefact.get("sha256")
                assert isinstance(sha_value, str) and sha_value
                assert _hash_file(path) == sha_value

    hashed_env = os.getenv("ACX040_HASHED")
    hashed_enabled = bool(hashed_env and hashed_env.lower() not in {"0", "false", "no", "off"})
    if hashed_enabled:
        for entry in figures_payload:
            figures = entry.get("figures")
            assert isinstance(figures, list)
            assert any(bool(item.get("preferred")) for item in figures), "expected preferred figure artefact"
