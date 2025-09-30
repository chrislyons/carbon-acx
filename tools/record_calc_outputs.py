#!/usr/bin/env python3
"""Resolve calc build outputs from manifest and record them in GITHUB_ENV."""
from __future__ import annotations

import json
import os
import pathlib
import sys
from typing import Final, Optional

MANIFEST_PATH: Final = pathlib.Path("dist/artifacts/latest-build.json")
ARTIFACT_ROOT: Final = pathlib.Path("dist/artifacts")


def _manifest_outputs_dir() -> Optional[pathlib.Path]:
    """Resolve the calc outputs directory from ``latest-build.json`` if present."""

    manifest_path = MANIFEST_PATH
    if not manifest_path.exists():
        return None

    manifest = json.loads(manifest_path.read_text())
    try:
        artifact_dir_raw = manifest["artifact_dir"]
    except KeyError as exc:  # pragma: no cover - defensive guard for CI
        raise SystemExit("latest-build manifest missing 'artifact_dir'") from exc

    artifact_dir = pathlib.Path(artifact_dir_raw).expanduser().resolve()
    outputs_dir = artifact_dir / "calc" / "outputs"
    if outputs_dir.is_dir():
        return outputs_dir
    return None


def _scan_backend_outputs(backend: str) -> pathlib.Path:
    """Locate the newest calc outputs directory for ``backend``."""

    if not ARTIFACT_ROOT.is_dir():
        raise SystemExit("dist/artifacts not found")

    candidates: list[pathlib.Path] = []
    for hashed_dir in ARTIFACT_ROOT.iterdir():
        if not hashed_dir.is_dir():
            continue
        candidate = hashed_dir / backend / "calc" / "outputs"
        if candidate.is_dir():
            candidates.append(candidate.resolve())

    if not candidates:
        raise SystemExit(f"No calc outputs found for backend '{backend}'")

    candidates.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    return candidates[0]


def main(label: str, env_var: str, backend: str | None) -> None:
    if "GITHUB_ENV" not in os.environ:
        raise SystemExit("GITHUB_ENV is not set")

    outputs_dir = _manifest_outputs_dir()
    if backend and outputs_dir is not None:
        expected = outputs_dir.parent.parent.name
        if expected != backend:
            outputs_dir = None

    if outputs_dir is None:
        if not backend:
            raise SystemExit("Unable to resolve calc outputs without backend hint")
        outputs_dir = _scan_backend_outputs(backend)

    print(f"{label} build outputs: {outputs_dir}")
    with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as env_file:
        print(f"{env_var}={outputs_dir}", file=env_file)

    cache_dir = pathlib.Path("dist/.calc-outputs")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{env_var}.path"
    cache_file.write_text(f"{outputs_dir}\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) not in {3, 4}:
        raise SystemExit("Usage: record_calc_outputs.py <label> <env-var> [backend]")
    backend_arg = sys.argv[3] if len(sys.argv) == 4 else None
    main(sys.argv[1], sys.argv[2], backend_arg)
