from __future__ import annotations

import json
from pathlib import Path

POINTER_FILENAME = "latest-build.json"
MANIFEST_FILENAME = "manifest.json"


def _manifest_dir(path: Path) -> Path | None:
    manifest = path / MANIFEST_FILENAME
    if manifest.is_file():
        return path
    candidate = path / "calc" / "outputs"
    manifest = candidate / MANIFEST_FILENAME
    if manifest.is_file():
        return candidate
    return None


def _load_pointer(pointer_path: Path) -> Path:
    payload = json.loads(pointer_path.read_text(encoding="utf-8"))
    artifact_dir = payload.get("artifact_dir")
    if not artifact_dir:
        raise FileNotFoundError(f"latest-build pointer is missing artifact_dir: {pointer_path}")
    target = Path(artifact_dir)
    if not target.is_absolute():
        target = (pointer_path.parent / target).resolve()
    else:
        target = target.resolve()
    return target


def resolve_artifact_outputs(path: Path) -> Path:
    """Resolve ``path`` to a directory containing calc outputs.

    The provided ``path`` may point directly at a ``calc/outputs`` directory,
    a hashed artifact root under ``dist/artifacts/<hash>/...``, or the
    ``dist/artifacts`` directory that contains a ``latest-build.json`` pointer.
    """

    search_queue: list[Path] = [path]
    seen: set[Path] = set()
    pointer_seen: set[Path] = set()

    while search_queue:
        current = search_queue.pop(0)
        if current in seen:
            continue
        seen.add(current)

        candidate = _manifest_dir(current)
        if candidate is not None:
            return candidate

        pointer = current / POINTER_FILENAME
        if pointer.exists() and pointer not in pointer_seen:
            pointer_seen.add(pointer)
            target = _load_pointer(pointer)
            search_queue.append(target)
            continue

        for parent in current.parents:
            pointer = parent / POINTER_FILENAME
            if pointer.exists() and pointer not in pointer_seen:
                pointer_seen.add(pointer)
                target = _load_pointer(pointer)
                search_queue.append(target)

    raise FileNotFoundError(f"Artifact directory not found: {path}")
