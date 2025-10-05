from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from collections.abc import Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = REPO_ROOT / "site" / "public" / "artifacts"
SOURCES_PATH = REPO_ROOT / "data" / "sources.csv"


def _load_sources(path: Path) -> dict[str, str]:
    if not path.exists():
        raise SystemExit(f"Missing sources catalog: {path}")
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        mapping: dict[str, str] = {}
        for row in reader:
            source_id = (row.get("source_id") or "").strip()
            citation = (row.get("ieee_citation") or "").strip()
            if not source_id:
                continue
            mapping[source_id] = citation
    return mapping


REFERENCE_KEYS = {
    "source_id",
    "source_ids",
    "source_ids_csv",
    "sources",
    "citation_keys",
}


def _iter_source_candidates(payload: object) -> Iterable[str]:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in REFERENCE_KEYS:
                yield from _normalize_source_value(value)
            else:
                yield from _iter_source_candidates(value)
    elif isinstance(payload, list):
        for item in payload:
            yield from _iter_source_candidates(item)


def _normalize_source_value(value: object) -> Iterable[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = [item.strip() for item in value.split(",") if item.strip()]
        return parts or [value]
    if isinstance(value, dict):
        collected: list[str] = []
        for inner in value.values():
            collected.extend(_normalize_source_value(inner))
        return collected
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
        collected: list[str] = []
        for item in value:
            collected.extend(_normalize_source_value(item))
        return collected
    return []


def _collect_source_ids(payload: object) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for candidate in _iter_source_candidates(payload):
        key = candidate.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append(key)
    return ordered


def _write_references(path: Path, citations: list[str]) -> None:
    text = "\n".join(citations)
    if text:
        text += "\n"
    path.write_text(text, encoding="utf-8")


def _process_artifact(path: Path, sources: dict[str, str]) -> None:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    source_ids = _collect_source_ids(payload)
    references_path = path.with_suffix(".References.txt")
    citations: list[str] = []
    for source_id in source_ids:
        if source_id not in sources:
            raise SystemExit(f"Artifact {path} references unknown source_id '{source_id}'")
        citations.append(sources[source_id])
    references_path.parent.mkdir(parents=True, exist_ok=True)
    _write_references(references_path, citations)


def _resolve_artifacts(all_artifacts: bool, inputs: list[str]) -> list[Path]:
    if all_artifacts:
        return sorted(ARTIFACTS_DIR.glob("*.json"))
    if not inputs:
        raise SystemExit("No artifact paths provided; pass --all or explicit files")
    resolved: list[Path] = []
    for arg in inputs:
        candidate = Path(arg)
        if not candidate.is_absolute():
            candidate = (REPO_ROOT / candidate).resolve()
        if not candidate.exists():
            raise SystemExit(f"Artifact does not exist: {arg}")
        resolved.append(candidate)
    return resolved


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Generate References.txt files for artifacts")
    parser.add_argument("paths", nargs="*", help="Specific artifact JSON paths")
    parser.add_argument("--all", action="store_true", help="Process all known artifacts")
    args = parser.parse_args(argv)

    artifacts = _resolve_artifacts(args.all, args.paths)
    if not artifacts:
        return

    sources = _load_sources(SOURCES_PATH)
    for artifact in artifacts:
        _process_artifact(artifact, sources)


if __name__ == "__main__":
    main()
