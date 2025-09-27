from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

import calc.derive as derive_mod


class EmptyStore:
    def load_emission_factors(self):
        return []

    def load_profiles(self):
        return []

    def load_activity_schedule(self):
        return []

    def load_grid_intensity(self):
        return []

    def load_activities(self):
        return []


def _read_manifest_hash(manifest_path: Path) -> str:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    return payload["build_hash"]


def test_prepare_output_dir_rejects_external_path(monkeypatch, tmp_path):
    monkeypatch.delenv("ACX_ALLOW_OUTPUT_RM", raising=False)
    with pytest.raises(ValueError):
        derive_mod._prepare_output_dir(tmp_path / "unsafe")


def test_prepare_output_dir_requires_hash_under_artifacts(monkeypatch):
    monkeypatch.delenv("ACX_ALLOW_OUTPUT_RM", raising=False)
    unsafe_path = derive_mod.ARTIFACT_ROOT / "calc" / "outputs"
    with pytest.raises(ValueError):
        derive_mod._prepare_output_dir(unsafe_path)


def test_export_view_rejects_root_output(monkeypatch):
    monkeypatch.setenv("ACX_OUTPUT_ROOT", "/")
    monkeypatch.delenv("ACX_ALLOW_OUTPUT_RM", raising=False)
    with pytest.raises(ValueError):
        derive_mod.export_view(EmptyStore())


def test_default_export_writes_hashed_artifacts(monkeypatch):
    monkeypatch.delenv("ACX_OUTPUT_ROOT", raising=False)
    monkeypatch.delenv("ACX_ALLOW_OUTPUT_RM", raising=False)
    monkeypatch.setenv("ACX_GENERATED_AT", "2024-01-01T00:00:00+00:00")

    artifact_root = derive_mod.ARTIFACT_ROOT
    existing_names = set()
    if artifact_root.exists():
        existing_names = {item.name for item in artifact_root.iterdir()}

    try:
        derive_mod.export_view(EmptyStore())
        assert artifact_root.exists()
        new_dirs = [
            path
            for path in artifact_root.iterdir()
            if path.is_dir() and path.name not in existing_names
        ]
        assert new_dirs, "Expected export to create a hashed artifact directory"
        hashed_dir = new_dirs[0]
        manifest_path = hashed_dir / "calc" / "outputs" / "manifest.json"
        assert manifest_path.exists()
        manifest_hash = _read_manifest_hash(manifest_path)
        assert manifest_hash == hashed_dir.name

        pointer_path = artifact_root / "latest-build.json"
        assert pointer_path.exists()
        pointer_payload = json.loads(pointer_path.read_text(encoding="utf-8"))
        assert pointer_payload["build_hash"] == hashed_dir.name
        assert Path(pointer_payload["artifact_dir"]) == hashed_dir
    finally:
        if artifact_root.exists():
            for path in artifact_root.iterdir():
                if path.is_dir() and path.name not in existing_names:
                    shutil.rmtree(path)
            pointer_path = artifact_root / "latest-build.json"
            if pointer_path.exists():
                pointer_payload = json.loads(pointer_path.read_text(encoding="utf-8"))
                if pointer_payload.get("build_hash") not in existing_names:
                    pointer_path.unlink()
