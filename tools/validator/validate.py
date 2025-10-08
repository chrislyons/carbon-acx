"""CLI for validating ACX manifests and signed diffs."""

from __future__ import annotations

import argparse
import base64
import json
import math
import sys
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from pathlib import Path
from collections.abc import Iterable
from typing import Any, Iterator

from jsonschema import Draft202012Validator

try:  # Optional import for signature verification.
    from nacl import exceptions as nacl_exceptions
    from nacl.signing import VerifyKey
except ModuleNotFoundError:  # pragma: no cover - handled in runtime when not installed.
    VerifyKey = None  # type: ignore[assignment]
    nacl_exceptions = None  # type: ignore[assignment]

SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"

EXIT_OK = 0
EXIT_SCHEMA_ERROR = 2
EXIT_INTEGRITY_ERROR = 3
EXIT_SIGNATURE_ERROR = 4
EXIT_IO_ERROR = 5

FOUR_DP = Decimal("0.0001")


@dataclass
class ValidationFailure(Exception):
    """Exception carrying a message and exit code."""

    message: str
    exit_code: int

    def __str__(self) -> str:  # pragma: no cover - used for CLI output only.
        return self.message


@lru_cache(maxsize=4)
def _load_schema(name: str) -> Draft202012Validator:
    schema_path = SCHEMA_DIR / name
    try:
        with schema_path.open("r", encoding="utf-8") as handle:
            schema = json.load(handle)
    except FileNotFoundError as error:  # pragma: no cover - configuration error.
        raise ValidationFailure(f"Schema not found: {schema_path}", EXIT_IO_ERROR) from error
    except json.JSONDecodeError as error:  # pragma: no cover - configuration error.
        raise ValidationFailure(f"Schema is invalid JSON: {schema_path}", EXIT_IO_ERROR) from error
    return Draft202012Validator(schema)


def _load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as error:
        raise ValidationFailure(f"File not found: {path}", EXIT_IO_ERROR) from error
    except json.JSONDecodeError as error:
        raise ValidationFailure(f"Invalid JSON in {path}: {error}", EXIT_SCHEMA_ERROR) from error


def _iter_errors(validator: Draft202012Validator, payload: Any) -> Iterator[str]:
    for error in sorted(validator.iter_errors(payload), key=lambda item: item.json_path):
        yield error.message


def _sha256_for(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _resolve_artifact_path(candidate: str, base: Path) -> Path | None:
    if not candidate:
        return None
    paths = []
    candidate_path = Path(candidate)
    if candidate_path.is_absolute():
        paths.append(candidate_path)
    else:
        paths.append((base / candidate_path).resolve())
        paths.append((Path.cwd() / candidate_path).resolve())
    for option in paths:
        try:
            if option.exists():
                return option
        except OSError:
            continue
    return None


def _check_references_order(manifest: dict[str, Any], path: Path) -> None:
    references = manifest.get("references")
    if not isinstance(references, dict):
        return
    order = references.get("order")
    if not isinstance(order, list) or not order:
        return
    indices: list[int] = []
    for entry in order:
        if not isinstance(entry, dict):
            raise ValidationFailure(
                f"{path}: references.order entries must be objects.", EXIT_INTEGRITY_ERROR
            )
        index = entry.get("index")
        if not isinstance(index, int):
            raise ValidationFailure(
                f"{path}: references.order index must be an integer.", EXIT_INTEGRITY_ERROR
            )
        indices.append(index)
    expected = list(range(1, len(order) + 1))
    if indices != expected:
        raise ValidationFailure(
            f"{path}: references.order indexes must be sequential starting from 1.",
            EXIT_INTEGRITY_ERROR,
        )


def _verify_payload_hashes(manifest: dict[str, Any], path: Path) -> None:
    figure_path = manifest.get("figure_path")
    if isinstance(figure_path, str):
        resolved = _resolve_artifact_path(figure_path, path.parent)
        if resolved is not None and resolved.exists():
            digest = _sha256_for(resolved)
            expected = manifest.get("figure_sha256")
            if digest != expected:
                raise ValidationFailure(
                    f"{path}: figure_sha256 does not match contents of {resolved}.",
                    EXIT_INTEGRITY_ERROR,
                )
    references = manifest.get("references")
    if isinstance(references, dict):
        ref_path = references.get("path")
        if isinstance(ref_path, str):
            resolved = _resolve_artifact_path(ref_path, path.parent)
            if resolved is not None and resolved.exists():
                digest = _sha256_for(resolved)
                expected = references.get("sha256")
                if digest != expected:
                    raise ValidationFailure(
                        f"{path}: references.sha256 does not match contents of {resolved}.",
                        EXIT_INTEGRITY_ERROR,
                    )


def validate_manifest_file(path: Path) -> None:
    payload = _load_json(path)
    validator = _load_schema("figure-manifest.schema.json")
    errors = list(_iter_errors(validator, payload))
    if errors:
        message = "; ".join(errors)
        raise ValidationFailure(f"{path}: {message}", EXIT_SCHEMA_ERROR)
    if isinstance(payload, dict):
        _verify_payload_hashes(payload, path)
        _check_references_order(payload, path)


def _ensure_within_cwd(path: Path) -> None:
    cwd = Path.cwd().resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(cwd):
        raise ValidationFailure(
            f"Manifest directory must be within the current working directory: {path}",
            EXIT_IO_ERROR,
        )


def _find_manifest_file(manifest_dir: Path, manifest_hash: str) -> Path:
    candidates = [
        manifest_dir / f"{manifest_hash}.json",
        manifest_dir / f"{manifest_hash}.manifest.json",
        manifest_dir / manifest_hash / "manifest.json",
        manifest_dir / manifest_hash / f"{manifest_hash}.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise ValidationFailure(
        f"Manifest with hash {manifest_hash} not found in {manifest_dir}.",
        EXIT_INTEGRITY_ERROR,
    )


def _collect_sources(manifest: Any) -> list[str]:
    if not isinstance(manifest, dict):
        return []
    sources = manifest.get("sources")
    if isinstance(sources, str):
        source_iterable: Iterable[Any] = [sources]
    elif isinstance(sources, Iterable):
        source_iterable = sources
    else:
        return []
    collected: set[str] = set()
    for entry in source_iterable:
        if isinstance(entry, str) and entry.strip():
            collected.add(entry)
    return sorted(collected)


def _ensure_four_dp(payload: Any, path: str = "$") -> None:
    if isinstance(payload, dict):
        for key in sorted(payload.keys()):
            _ensure_four_dp(payload[key], f"{path}.{key}")
        return
    if isinstance(payload, list):
        for index, item in enumerate(payload):
            _ensure_four_dp(item, f"{path}[{index}]")
        return
    if isinstance(payload, bool) or payload is None:
        return
    if isinstance(payload, (int, float)):
        if isinstance(payload, bool):  # pragma: no cover - redundant guard for mypy.
            return
        if isinstance(payload, float):
            if not math.isfinite(payload):
                return
            try:
                decimal = Decimal(str(payload))
                quantised = decimal.quantize(FOUR_DP)
            except (InvalidOperation, ValueError) as error:
                raise ValidationFailure(
                    f"{path}: unable to evaluate decimal precision for {payload}.",
                    EXIT_INTEGRITY_ERROR,
                ) from error
            if (quantised - decimal).copy_abs() > Decimal("0"):
                raise ValidationFailure(
                    f"{path}: value {payload} must be rounded to 4 decimal places.",
                    EXIT_INTEGRITY_ERROR,
                )
        return


def _round_like_js(value: float) -> float:
    if not math.isfinite(value):
        return value
    scaled = value * 10000.0
    if scaled >= 0:
        rounded = math.floor(scaled + 0.5)
    else:
        rounded = math.ceil(scaled - 0.5)
    result = rounded / 10000.0
    if result == -0.0:
        result = 0.0
    return result


def _canonicalise(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, bool):  # pragma: no cover - redundant guard for mypy.
            return value
        if isinstance(value, float):
            return _round_like_js(value)
        return value
    if isinstance(value, list):
        return [_canonicalise(item) for item in value]
    if isinstance(value, dict):
        return {key: _canonicalise(value[key]) for key in sorted(value.keys())}
    return value


def _serialise_for_signature(payload: dict[str, Any]) -> str:
    canonical = _canonicalise(payload)
    return json.dumps(canonical, indent=2, ensure_ascii=False, separators=(",", ": ")) + "\n"


def _verify_signature(payload: dict[str, Any], pubkey_b64: str) -> None:
    if VerifyKey is None or nacl_exceptions is None:
        raise ValidationFailure(
            "PyNaCl is required for signature verification but is not installed.",
            EXIT_SIGNATURE_ERROR,
        )
    signer = payload.get("signer")
    signature = payload.get("signature")
    if signature is None or signer is None:
        return
    algo = signer.get("algo") if isinstance(signer, dict) else None
    if algo != "ed25519":
        raise ValidationFailure("Unsupported signature algorithm.", EXIT_SIGNATURE_ERROR)
    try:
        key_bytes = base64.b64decode(pubkey_b64)
    except (base64.binascii.Error, ValueError) as error:
        raise ValidationFailure("Public key is not valid base64.", EXIT_SIGNATURE_ERROR) from error
    try:
        signature_bytes = base64.b64decode(signature)
    except (base64.binascii.Error, ValueError) as error:
        raise ValidationFailure("Signature is not valid base64.", EXIT_SIGNATURE_ERROR) from error
    unsigned = dict(payload)
    unsigned.pop("signature", None)
    unsigned.pop("signer", None)
    message = _serialise_for_signature(unsigned).encode("utf-8")
    try:
        verify_key = VerifyKey(key_bytes)
        verify_key.verify(message, signature_bytes)
    except (ValueError, nacl_exceptions.CryptoError) as error:
        raise ValidationFailure("Signature verification failed.", EXIT_SIGNATURE_ERROR) from error


def validate_diff_file(path: Path, manifest_dir: Path | None, pubkey_b64: str | None) -> None:
    payload = _load_json(path)
    validator = _load_schema("signed-diff.schema.json")
    errors = list(_iter_errors(validator, payload))
    if errors:
        message = "; ".join(errors)
        raise ValidationFailure(f"{path}: {message}", EXIT_SCHEMA_ERROR)
    if not isinstance(payload, dict):
        raise ValidationFailure(f"{path}: payload must be an object.", EXIT_SCHEMA_ERROR)
    _ensure_four_dp(payload.get("scenario_diff"))
    if manifest_dir is not None:
        _ensure_within_cwd(manifest_dir)
        manifest_dir = manifest_dir.resolve()
        base_hash = payload.get("base_hash")
        compare_hash = payload.get("compare_hash")
        if not isinstance(base_hash, str) or not isinstance(compare_hash, str):
            raise ValidationFailure(
                f"{path}: base_hash and compare_hash must be strings.", EXIT_SCHEMA_ERROR
            )
        base_manifest = _load_json(_find_manifest_file(manifest_dir, base_hash))
        compare_manifest = _load_json(_find_manifest_file(manifest_dir, compare_hash))
        union_sources = sorted(set(_collect_sources(base_manifest)) | set(_collect_sources(compare_manifest)))
        declared_union = payload.get("sources_union")
        if union_sources != declared_union:
            raise ValidationFailure(
                f"{path}: sources_union does not match manifests (expected {union_sources}).",
                EXIT_INTEGRITY_ERROR,
            )
    if pubkey_b64 and isinstance(payload, dict):
        _verify_signature(payload, pubkey_b64)


def _manifest_paths(target: Path) -> list[Path]:
    if not target.exists():
        raise ValidationFailure(f"Path does not exist: {target}", EXIT_IO_ERROR)
    if target.is_file():
        return [target]
    if target.is_dir():
        return sorted(
            p
            for p in target.rglob("*.json")
            if p.is_file() and "manifest" in p.name.lower()
        )
    raise ValidationFailure(f"Unsupported path type: {target}", EXIT_IO_ERROR)


def _run_validate_manifest(args: argparse.Namespace) -> int:
    try:
        paths = _manifest_paths(Path(args.path))
    except ValidationFailure as failure:
        print(failure.message, file=sys.stderr)
        return failure.exit_code
    status = EXIT_OK
    for candidate in paths:
        try:
            validate_manifest_file(candidate)
            print(f"OK {candidate}")
        except ValidationFailure as failure:
            print(failure.message, file=sys.stderr)
            status = max(status, failure.exit_code)
    return status


def _run_validate_diff(args: argparse.Namespace) -> int:
    manifest_dir = Path(args.manifests) if args.manifests else None
    try:
        validate_diff_file(Path(args.diff), manifest_dir, args.pubkey)
        print(f"OK {args.diff}")
        return EXIT_OK
    except ValidationFailure as failure:
        print(failure.message, file=sys.stderr)
        return failure.exit_code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    manifest_parser = subparsers.add_parser("validate-manifest", help="Validate figure manifests.")
    manifest_parser.add_argument("path", help="Path to a manifest JSON file or directory containing manifests.")
    manifest_parser.set_defaults(func=_run_validate_manifest)

    diff_parser = subparsers.add_parser("validate-diff", help="Validate signed diff payloads.")
    diff_parser.add_argument("diff", help="Path to a diff JSON payload.")
    diff_parser.add_argument("--manifests", help="Directory containing manifests referenced by the diff.")
    diff_parser.add_argument("--pubkey", help="Base64-encoded Ed25519 public key for signature verification.")
    diff_parser.set_defaults(func=_run_validate_diff)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
