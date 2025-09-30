#!/usr/bin/env python3
"""Resolve calc build outputs from manifest and record them in GITHUB_ENV."""
from __future__ import annotations

import json
import os
import pathlib
import sys
from typing import Final

MANIFEST_PATH: Final = pathlib.Path("dist/artifacts/latest-build.json")


def main(label: str, env_var: str) -> None:
    if "GITHUB_ENV" not in os.environ:
        raise SystemExit("GITHUB_ENV is not set")

    manifest_path = MANIFEST_PATH
    if not manifest_path.exists():
        raise SystemExit("latest-build.json not found")

    manifest = json.loads(manifest_path.read_text())
    try:
        artifact_dir_raw = manifest["artifact_dir"]
    except KeyError as exc:  # pragma: no cover - defensive guard for CI
        raise SystemExit("latest-build manifest missing 'artifact_dir'") from exc

    artifact_dir = pathlib.Path(artifact_dir_raw).expanduser().resolve()
    outputs_dir = artifact_dir / "calc" / "outputs"
    if not outputs_dir.is_dir():
        raise SystemExit(f"{label} build outputs not found at {outputs_dir}")

    print(f"{label} build outputs: {outputs_dir}")
    with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as env_file:
        print(f"{env_var}={outputs_dir}", file=env_file)

    cache_dir = pathlib.Path("dist/.calc-outputs")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{env_var}.path"
    cache_file.write_text(f"{outputs_dir}\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: record_calc_outputs.py <label> <env-var>")
    main(sys.argv[1], sys.argv[2])
