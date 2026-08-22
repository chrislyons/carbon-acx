from __future__ import annotations

import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import httpx

try:
    from ._owid_snapshot import (
        OWID_CHART_ID,
        OWID_CHART_URL,
        OWID_DATA_URL,
        OWID_ENTITY,
        OWID_ENTITY_CODE,
        OWID_LICENSE,
        OWID_METADATA_URL,
        OWID_METRIC,
        OWID_PROVIDER,
        OWID_SOURCE_ID,
        OWID_SOURCE_SCHEMA_VERSION,
        OwidValidationError,
        manifest_from_context,
        parse_owid_context,
        sha256_hex as _sha256,
        validate_manifest,
    )
except ImportError:  # direct execution: python3 scripts/fetch_owid_context.py
    from _owid_snapshot import (
        OWID_CHART_ID,
        OWID_CHART_URL,
        OWID_DATA_URL,
        OWID_ENTITY,
        OWID_ENTITY_CODE,
        OWID_LICENSE,
        OWID_METADATA_URL,
        OWID_METRIC,
        OWID_PROVIDER,
        OWID_SOURCE_ID,
        OWID_SOURCE_SCHEMA_VERSION,
        OwidValidationError,
        manifest_from_context,
        parse_owid_context,
        sha256_hex as _sha256,
        validate_manifest,
    )

__all__ = [
    "OWID_CHART_ID",
    "OWID_CHART_URL",
    "OWID_DATA_URL",
    "OWID_ENTITY",
    "OWID_ENTITY_CODE",
    "OWID_LICENSE",
    "OWID_METADATA_URL",
    "OWID_METRIC",
    "OWID_PROVIDER",
    "OWID_SOURCE_ID",
    "OWID_SOURCE_SCHEMA_VERSION",
    "OwidValidationError",
    "fetch_owid_snapshot",
    "main",
    "manifest_from_context",
    "parse_owid_context",
    "validate_manifest",
]


def _retrieved_at() -> str:
    override = os.getenv("ACX_OWID_RETRIEVED_AT")
    return override or datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _json_bytes(value: dict[str, object]) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def _replace_directory(source: Path, destination: Path) -> None:
    source.rename(destination)


def _atomic_snapshot_replace(output_dir: Path, files: dict[str, bytes]) -> None:
    output_dir = output_dir.resolve()
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    staging_dir = Path(
        tempfile.mkdtemp(prefix=f".{output_dir.name}.staging-", dir=output_dir.parent)
    )
    backup_dir = Path(tempfile.mkdtemp(prefix=f".{output_dir.name}.backup-", dir=output_dir.parent))
    backup_dir.rmdir()
    previous_moved = False
    try:
        for relative_path, content in files.items():
            staged_path = staging_dir / relative_path
            staged_path.parent.mkdir(parents=True, exist_ok=True)
            staged_path.write_bytes(content)
            if staged_path.read_bytes() != content:
                raise OSError(f"Staged OWID snapshot bytes changed: {relative_path}")

        if output_dir.exists():
            _replace_directory(output_dir, backup_dir)
            previous_moved = True
        _replace_directory(staging_dir, output_dir)
        if previous_moved and backup_dir.exists():
            shutil.rmtree(backup_dir)
            previous_moved = False
    except Exception:
        if backup_dir.exists():
            if output_dir.exists():
                shutil.rmtree(output_dir, ignore_errors=True)
            _replace_directory(backup_dir, output_dir)
        raise
    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)
        shutil.rmtree(backup_dir, ignore_errors=True)


def fetch_owid_snapshot(
    output_dir: Path,
    *,
    client: httpx.Client | None = None,
    dry_run: bool = False,
) -> dict[str, object]:
    owns_client = client is None
    http_client = client or httpx.Client(follow_redirects=True, timeout=60.0)
    try:
        data_response = http_client.get(OWID_DATA_URL)
        data_response.raise_for_status()
        metadata_response = http_client.get(OWID_METADATA_URL)
        metadata_response.raise_for_status()
        data_bytes = data_response.content
        metadata_bytes = metadata_response.content
        context = parse_owid_context(data_bytes, metadata_bytes, retrieved_at=_retrieved_at())
        manifest = manifest_from_context(
            context,
            resolved_data_url=str(data_response.url),
            resolved_metadata_url=str(metadata_response.url),
            data_bytes=data_bytes,
            metadata_bytes=metadata_bytes,
        )
        validate_manifest(manifest)
        files = {
            "annual-co2-emissions-per-country.csv": data_bytes,
            "annual-co2-emissions-per-country.metadata.json": metadata_bytes,
            "manifest.json": _json_bytes(manifest),
        }
        if not dry_run:
            _atomic_snapshot_replace(output_dir, files)
        return manifest
    finally:
        if owns_client:
            http_client.close()


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch and pin the configured OWID context snapshot."
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent.parent / "data/owid"),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    manifest = fetch_owid_snapshot(Path(args.output_dir), dry_run=args.dry_run)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
