"""Generate ACX041 provenance manifests for derived figures."""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
import subprocess
from pathlib import Path
from typing import Mapping, Sequence

from .figures import _resolve_generated_at
from .utils.hashio import sha256_bytes, sha256_concat, sha256_text

SCHEMA_VERSION = "1.2.0"
GENERATOR = "carbon-acx.calc.manifest v1.2.0"

REPO_ROOT = Path(__file__).resolve().parents[1]

DATASET_FILES = [
    Path("data/activities.csv"),
    Path("data/emission_factors.csv"),
    Path("data/activity_schedule.csv"),
    Path("data/layers.csv"),
    Path("data/profiles.csv"),
    Path("data/sources.csv"),
]

PROMPTWARE_ENV = {
    "promptware_job_id": "ACX_PROMPT_JOB_ID",
    "agent_model": "ACX_AGENT_MODEL",
    "codex_prompt_hash": "ACX_PROMPT_HASH",
    "executor": "ACX_EXECUTOR",
}


@dataclass(frozen=True)
class ManifestContext:
    output_dir: Path
    figure_dir: Path
    reference_dir: Path
    manifest_dir: Path


def _git_commit() -> str:
    try:
        value = (
            subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT)
            .decode("utf-8")
            .strip()
        )
        return value
    except Exception:  # pragma: no cover - defensive fallback
        return "UNKNOWN"


def _resolve_dataset_paths(files: Sequence[Path]) -> list[Path]:
    resolved: list[Path] = []
    for path in files:
        candidate = (REPO_ROOT / path).resolve()
        if not candidate.exists():
            continue
        resolved.append(candidate)
    return resolved


def _source_filenames(paths: Sequence[Path]) -> list[str]:
    names: list[str] = []
    for path in paths:
        try:
            names.append(str(path.relative_to(REPO_ROOT)))
        except ValueError:
            names.append(str(path))
    return names


def _ensure_context(output_dir: Path | str | None) -> ManifestContext:
    base = Path(output_dir or REPO_ROOT / "calc" / "outputs")
    figure_dir = base / "figures"
    reference_dir = base / "references"
    manifest_dir = base / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    return ManifestContext(
        output_dir=base,
        figure_dir=figure_dir,
        reference_dir=reference_dir,
        manifest_dir=manifest_dir,
    )


def _read_json(path: Path) -> Mapping[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _figure_layer(payload: Mapping[str, object]) -> str | None:
    data = payload.get("data")
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, Mapping):
            layer_value = first.get("layer_id")
            if isinstance(layer_value, str) and layer_value:
                return layer_value
    layer = payload.get("layer")
    return layer if isinstance(layer, str) else None


def _figure_filters(payload: Mapping[str, object]) -> Mapping[str, object]:
    candidate = payload.get("filters")
    if isinstance(candidate, Mapping):
        return dict(candidate)
    return {}


def _figure_ui_state(payload: Mapping[str, object]) -> Mapping[str, object | None]:
    candidate = payload.get("ui_state")
    if isinstance(candidate, Mapping):
        viewport = candidate.get("viewport")
        return {"viewport": viewport}
    return {"viewport": None}


def _load_references(path: Path) -> list[str]:
    if not path.exists():
        return []
    lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return lines


def _build_citations(keys: Sequence[str], refs: Sequence[str]) -> list[dict[str, object]]:
    citations: list[dict[str, object]] = []
    for index, source_id in enumerate(keys, start=1):
        ieee_text = refs[index - 1] if index - 1 < len(refs) else ""
        citations.append(
            {
                "order": index,
                "source_id": source_id,
                "ieee_citation": ieee_text,
                "hash": sha256_text(ieee_text),
            }
        )
    return citations


def _provenance_payload() -> dict[str, str]:
    payload = {
        "commit_hash": _git_commit(),
        "build_env": os.getenv("ACX_BUILD_ENV", "local"),
    }
    for key, env_var in PROMPTWARE_ENV.items():
        payload[key] = os.getenv(env_var, "")
    return payload


def _render_payload(figure_payload: Mapping[str, object]) -> dict[str, object | None]:
    return {
        "layer": _figure_layer(figure_payload),
        "region": figure_payload.get("region"),
        "year": figure_payload.get("year"),
        "filters": _figure_filters(figure_payload),
        "ui_state": _figure_ui_state(figure_payload),
    }


def _figure_type(stem: str, figure_payload: Mapping[str, object]) -> str:
    method = figure_payload.get("method")
    if isinstance(method, str) and method:
        return method
    return stem


def generate_all(output_dir: Path | str | None = None) -> list[Path]:
    """Generate manifests for all known figure artefacts."""

    context = _ensure_context(output_dir)
    figure_dir = context.figure_dir
    reference_dir = context.reference_dir

    dataset_paths = _resolve_dataset_paths(DATASET_FILES)
    dataset_hash = sha256_concat(dataset_paths) if dataset_paths else sha256_bytes(b"")
    source_files = _source_filenames(dataset_paths) if dataset_paths else [str(path) for path in DATASET_FILES]
    created_at = _resolve_generated_at()
    manifest_paths: list[Path] = []

    if not figure_dir.exists():
        return manifest_paths

    for figure_path in sorted(figure_dir.glob("*.json")):
        references_path = reference_dir / f"{figure_path.stem}_refs.txt"
        figure_bytes = figure_path.read_bytes()
        references_bytes = references_path.read_bytes() if references_path.exists() else b""

        figure_hash = sha256_bytes(figure_bytes)
        references_hash = sha256_bytes(references_bytes)
        top_hash = sha256_bytes(
            (dataset_hash + figure_hash + references_hash).encode("utf-8")
        )

        figure_payload = _read_json(figure_path)
        citation_keys = []
        if isinstance(figure_payload, Mapping):
            candidate_keys = figure_payload.get("citation_keys")
            if isinstance(candidate_keys, Sequence) and not isinstance(candidate_keys, (str, bytes)):
                citation_keys = [str(key) for key in candidate_keys]

        references_ieee = _load_references(references_path)
        citations = _build_citations(citation_keys, references_ieee)

        manifest_payload = {
            "schema_version": SCHEMA_VERSION,
            "figure_id": figure_path.stem,
            "figure_type": _figure_type(figure_path.stem, figure_payload),
            "created_at": created_at,
            "generator": GENERATOR,
            "inputs": {
                "dataset_hash": dataset_hash,
                "figure_data_hash": figure_hash,
                "references_hash": references_hash,
                "source_files": source_files,
            },
            "render": _render_payload(figure_payload),
            "citations": citations,
            "provenance": _provenance_payload(),
            "hash": top_hash,
        }

        manifest_path = context.manifest_dir / f"{figure_path.stem}.json"
        manifest_path.write_text(json.dumps(manifest_payload, indent=2) + "\n", encoding="utf-8")
        manifest_paths.append(manifest_path)

    return manifest_paths
