from __future__ import annotations

import base64
import json
from pathlib import Path

import pytest
from nacl.signing import SigningKey

from tools.validator.validate import (
    EXIT_INTEGRITY_ERROR,
    EXIT_IO_ERROR,
    EXIT_SCHEMA_ERROR,
    EXIT_SIGNATURE_ERROR,
    ValidationFailure,
    _serialise_for_signature,
    validate_diff_file,
    validate_manifest_file,
)

FIXTURES = Path(__file__).resolve().parents[1] / "tools" / "validator" / "fixtures"


def read_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_validate_manifest_success() -> None:
    path = FIXTURES / "sample_manifest.json"
    validate_manifest_file(path)


def test_validate_manifest_schema_error(tmp_path: Path) -> None:
    payload = read_fixture("sample_manifest.json")
    payload.pop("figure_id", None)
    target = tmp_path / "invalid.json"
    target.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_manifest_file(target)
    assert exc.value.exit_code == EXIT_SCHEMA_ERROR


def test_validate_manifest_reference_order_enforced(tmp_path: Path) -> None:
    payload = read_fixture("sample_manifest.json")
    payload["references"]["order"] = [
        {"index": 1, "source_id": "SRC.A"},
        {"index": 3, "source_id": "SRC.B"},
    ]
    target = tmp_path / "bad_order.json"
    target.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_manifest_file(target)
    assert exc.value.exit_code == EXIT_INTEGRITY_ERROR


def test_validate_diff_success(tmp_path: Path) -> None:
    manifest_dir = FIXTURES / "manifests"
    path = tmp_path / "diff.json"
    path.write_text((FIXTURES / "sample_diff.json").read_text(encoding="utf-8"), encoding="utf-8")
    validate_diff_file(path, manifest_dir, None)


def test_validate_diff_union_mismatch(tmp_path: Path) -> None:
    manifest_dir = FIXTURES / "manifests"
    payload = read_fixture("sample_diff.json")
    payload["sources_union"] = ["SRC.ALPHA", "SRC.GAMMA"]
    path = tmp_path / "bad_union.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_diff_file(path, manifest_dir, None)
    assert exc.value.exit_code == EXIT_INTEGRITY_ERROR


def test_validate_diff_enforces_four_decimal_places(tmp_path: Path) -> None:
    manifest_dir = FIXTURES / "manifests"
    payload = read_fixture("sample_diff.json")
    payload["scenario_diff"]["changed"][0]["delta"] = 1.23456
    path = tmp_path / "bad_precision.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_diff_file(path, manifest_dir, None)
    assert exc.value.exit_code == EXIT_INTEGRITY_ERROR


def test_validate_diff_signature_success(tmp_path: Path) -> None:
    manifest_dir = FIXTURES / "manifests"
    payload = read_fixture("sample_diff.json")
    signing_key = SigningKey.generate()
    verify_key = signing_key.verify_key
    unsigned = dict(payload)
    message = _serialise_for_signature(unsigned).encode("utf-8")
    signature = signing_key.sign(message).signature
    payload["signer"] = {"algo": "ed25519", "key_id": "test"}
    payload["signature"] = base64.b64encode(signature).decode("ascii")
    pubkey_b64 = base64.b64encode(verify_key.encode()).decode("ascii")
    path = tmp_path / "signed.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    validate_diff_file(path, manifest_dir, pubkey_b64)


def test_validate_diff_signature_failure(tmp_path: Path) -> None:
    manifest_dir = FIXTURES / "manifests"
    payload = read_fixture("sample_diff.json")
    signing_key = SigningKey.generate()
    wrong_key = SigningKey.generate()
    unsigned = dict(payload)
    message = _serialise_for_signature(unsigned).encode("utf-8")
    payload["signer"] = {"algo": "ed25519", "key_id": "test"}
    payload["signature"] = base64.b64encode(signing_key.sign(message).signature).decode("ascii")
    pubkey_b64 = base64.b64encode(wrong_key.verify_key.encode()).decode("ascii")
    path = tmp_path / "signed.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_diff_file(path, manifest_dir, pubkey_b64)
    assert exc.value.exit_code == EXIT_SIGNATURE_ERROR


def test_validate_diff_rejects_path_traversal(tmp_path: Path) -> None:
    payload = read_fixture("sample_diff.json")
    path = tmp_path / "diff.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationFailure) as exc:
        validate_diff_file(path, Path(".."), None)
    assert exc.value.exit_code == EXIT_IO_ERROR
