from __future__ import annotations

import json
from pathlib import Path

import pytest

from calc.manifest import DATASET_FILES, generate_all
from calc.utils.hashio import sha256_bytes, sha256_concat, sha256_text


@pytest.fixture()
def sample_output(tmp_path: Path) -> Path:
    figures = tmp_path / "figures"
    references = tmp_path / "references"
    figures.mkdir()
    references.mkdir()

    payload = {
        "citation_keys": ["SRC-001"],
        "data": [
            {
                "layer_id": "professional",
                "category": "Cooling",
                "values": {"mean": 1.0},
            }
        ],
    }
    (figures / "stacked.json").write_text(json.dumps(payload), encoding="utf-8")
    references_text = "[1] Example Citation"
    (references / "stacked_refs.txt").write_text(references_text + "\n", encoding="utf-8")

    return tmp_path


def _dataset_hash() -> str:
    paths = [
        (Path.cwd() / path)
        for path in DATASET_FILES
        if (Path.cwd() / path).resolve().exists()
    ]
    if not paths:
        return sha256_bytes(b"")
    return sha256_concat(paths)


def test_manifest_round_trip(sample_output: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")
    manifests = generate_all(sample_output)
    assert manifests, "No manifests generated for sample output"

    manifest_path = manifests[0]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    dataset_hash = _dataset_hash()
    figure_bytes = (sample_output / "figures" / "stacked.json").read_bytes()
    references_bytes = (sample_output / "references" / "stacked_refs.txt").read_bytes()

    assert manifest["inputs"]["dataset_hash"] == dataset_hash
    assert manifest["inputs"]["figure_data_hash"] == sha256_bytes(figure_bytes)
    assert manifest["inputs"]["references_hash"] == sha256_bytes(references_bytes)

    recomputed = sha256_bytes(
        (
            manifest["inputs"]["dataset_hash"]
            + manifest["inputs"]["figure_data_hash"]
            + manifest["inputs"]["references_hash"]
        ).encode("utf-8")
    )
    assert manifest["hash"] == recomputed

    citations = manifest.get("citations", [])
    assert len(citations) == 1
    assert citations[0]["order"] == 1
    assert citations[0]["source_id"] == "SRC-001"
    assert citations[0]["ieee_citation"].startswith("[1]")
    assert citations[0]["hash"] == sha256_text(citations[0]["ieee_citation"])


def test_manifest_missing_references_generates_empty_hash(tmp_path: Path) -> None:
    figures = tmp_path / "figures"
    references = tmp_path / "references"
    figures.mkdir()
    references.mkdir()

    payload = {"citation_keys": []}
    (figures / "bubble.json").write_text(json.dumps(payload), encoding="utf-8")

    manifests = generate_all(tmp_path)
    manifest = json.loads((tmp_path / "manifests" / "bubble.json").read_text(encoding="utf-8"))

    assert manifests
    assert manifest["inputs"]["references_hash"] == sha256_bytes(b"")
    assert manifest["citations"] == []


@pytest.mark.skipif(
    not (Path("calc") / "outputs" / "figures").exists(),
    reason="calc outputs not packaged with repository snapshot",
)
def test_repo_outputs_have_manifests() -> None:
    output_root = Path("calc") / "outputs"
    figure_dir = output_root / "figures"
    manifest_dir = output_root / "manifests"

    generate_all(output_root)

    for figure_path in figure_dir.glob("*.json"):
        manifest_path = manifest_dir / figure_path.name
        assert manifest_path.exists(), f"Missing manifest for {figure_path.name}"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        recomputed = sha256_bytes(
            (
                manifest["inputs"]["dataset_hash"]
                + manifest["inputs"]["figure_data_hash"]
                + manifest["inputs"]["references_hash"]
            ).encode("utf-8")
        )
        assert manifest["hash"] == recomputed
