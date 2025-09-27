from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Iterable

from ._artifact_paths import MANIFEST_FILENAME, resolve_artifact_outputs

ALLOWED_SUFFIXES = {".json", ".csv", ".txt"}


def _iter_artifact_files(source: Path) -> Iterable[Path]:
    for path in sorted(source.rglob("*")):
        if path.is_file() and path.suffix.lower() in ALLOWED_SUFFIXES:
            yield path


def package_artifacts(source: Path, destination: Path) -> dict:
    source = source.resolve()
    destination = destination.resolve()

    if destination == source or destination in source.parents or source in destination.parents:
        raise ValueError("Destination directory must be outside the source artifact tree.")

    if not source.exists():
        raise FileNotFoundError(f"Artifact source directory not found: {source}")

    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)

    copied_files: list[str] = []
    for file_path in _iter_artifact_files(source):
        relative = file_path.relative_to(source)
        target_path = destination / relative
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, target_path)
        copied_files.append(str(relative))

    manifest_path = destination / MANIFEST_FILENAME
    if not manifest_path.exists():
        raise FileNotFoundError(
            "Packaged artifacts are missing manifest.json. "
            "Ensure calc.derive has produced outputs before packaging."
        )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {"files": copied_files, "manifest": manifest}


def main() -> None:
    parser = argparse.ArgumentParser(description="Package derived artifacts for distribution.")
    parser.add_argument(
        "--src", default="dist/artifacts", type=Path, help="Source directory of derived data"
    )
    parser.add_argument(
        "--dest",
        default="dist/packaged-artifacts",
        type=Path,
        help="Destination directory for packaged artifacts",
    )
    args = parser.parse_args()

    source_dir = resolve_artifact_outputs(args.src)
    summary = package_artifacts(source_dir, args.dest)
    manifest_path = args.dest / MANIFEST_FILENAME
    generated_at = (
        summary["manifest"].get("generated_at") if isinstance(summary["manifest"], dict) else None
    )
    if generated_at:
        print(f"Packaged {len(summary['files'])} artifacts (generated at {generated_at}).")
    else:
        print(f"Packaged {len(summary['files'])} artifacts.")
    print(f"Manifest location: {manifest_path}")


if __name__ == "__main__":
    main()
