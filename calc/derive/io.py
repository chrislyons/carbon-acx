"""Stable serialisation, output-path guardrails, and shared column contracts."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, List, Mapping

import pandas as pd

from ..utils.env import env_flag

__all__ = [
    "ALLOW_OUTPUT_RM_ENV",
    "ARTIFACT_ROOT",
    "BUILD_HASH_RE",
    "EXPORT_COLUMNS",
    "FLOAT_QUANTISER",
    "INTENSITY_COLUMNS",
    "OUTPUT_ROOT_ENV",
    "REPO_ROOT",
    "apply_build_hash",
    "compute_build_hash",
    "is_safe_output_dir",
    "normalise_mapping",
    "normalise_value",
    "prepare_output_dir",
    "resolve_output_root",
    "sort_export_rows",
    "stable_json_dumps",
    "write_json",
    "write_reference_file",
]

FLOAT_QUANTISER = Decimal("0.000001")
OUTPUT_ROOT_ENV = "ACX_OUTPUT_ROOT"
ALLOW_OUTPUT_RM_ENV = "ACX_ALLOW_OUTPUT_RM"
REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = Path(
    os.getenv("ACX_ARTIFACT_ROOT", str(REPO_ROOT / "dist" / "artifacts"))
).resolve()
BUILD_HASH_RE = re.compile(r"^[0-9a-f]{12}$")

EXPORT_COLUMNS = [
    "profile_id",
    "activity_id",
    "layer_id",
    "activity_name",
    "activity_category",
    "scope_boundary",
    "emission_factor_vintage_year",
    "grid_region",
    "grid_vintage_year",
    "annual_emissions_g",
    "annual_emissions_g_low",
    "annual_emissions_g_high",
    "upstream_chain",
]

INTENSITY_COLUMNS = [
    "alt_id",
    "alternative",
    "record_type",
    "activity_id",
    "activity_name",
    "functional_unit_id",
    "fu_name",
    "intensity_g_per_fu",
    "intensity_low_g_per_fu",
    "intensity_high_g_per_fu",
    "annual_fu",
    "annual_kg",
    "method_notes",
    "scope_boundary",
    "region",
    "source_ids_csv",
]


def quantize_float(value: float) -> float:
    if math.isnan(value) or math.isinf(value):
        return value
    quantised = Decimal(str(value)).quantize(FLOAT_QUANTISER, rounding=ROUND_HALF_UP)
    return float(quantised)


def coerce_none(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (list, tuple, dict, set)):
        return value
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    return value


def normalise_value(value: Any) -> Any:
    coerced = coerce_none(value)
    if coerced is None:
        return None
    if isinstance(coerced, float):
        return quantize_float(coerced)
    if isinstance(coerced, Decimal):
        return quantize_float(float(coerced))
    if isinstance(coerced, dict):
        return {key: normalise_value(val) for key, val in coerced.items()}
    if isinstance(coerced, list):
        return [normalise_value(item) for item in coerced]
    if isinstance(coerced, tuple):
        return tuple(normalise_value(item) for item in coerced)
    return coerced


def normalise_mapping(record: dict) -> dict:
    return {key: normalise_value(record.get(key)) for key in EXPORT_COLUMNS if key in record} | {
        key: normalise_value(value) for key, value in record.items() if key not in EXPORT_COLUMNS
    }


def is_safe_output_dir(path: Path, repo_root: Path) -> bool:
    if env_flag(ALLOW_OUTPUT_RM_ENV):
        return True

    repo_artifacts = (repo_root / "dist" / "artifacts").resolve()
    resolved = path.resolve()
    try:
        relative = resolved.relative_to(repo_artifacts)
    except ValueError:
        return False

    if not relative.parts:
        return False

    build_segment = relative.parts[0]
    return bool(BUILD_HASH_RE.fullmatch(build_segment))


def prepare_output_dir(path: Path) -> None:
    if not is_safe_output_dir(path, REPO_ROOT):
        raise ValueError(
            "Refusing to clear output directory outside dist/artifacts build guardrails: "
            f"{path}. Set ACX_ALLOW_OUTPUT_RM=1 to override."
        )

    if path.exists():
        for child in path.iterdir():
            if child.name == ".gitkeep":
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    path.mkdir(parents=True, exist_ok=True)


def resolve_output_root(output_root: Path | str | None, repo_root: Path) -> Path:
    if output_root is not None:
        candidate = Path(output_root)
    else:
        env_root = os.getenv(OUTPUT_ROOT_ENV)
        if env_root:
            candidate = Path(env_root)
        else:
            candidate = ARTIFACT_ROOT

    if not candidate.is_absolute():
        candidate = (repo_root / candidate).resolve()
    else:
        candidate = candidate.resolve()

    return candidate


def apply_build_hash(base_root: Path, repo_root: Path, build_hash: str) -> Path:
    repo_artifacts = (repo_root / "dist" / "artifacts").resolve()
    base_resolved = base_root.resolve()
    try:
        relative = base_resolved.relative_to(repo_artifacts)
    except ValueError:
        return base_resolved

    parts = relative.parts
    if parts and BUILD_HASH_RE.fullmatch(parts[0]):
        return base_resolved

    return repo_artifacts.joinpath(build_hash, *parts)


def compute_build_hash(manifest_payload: Mapping[str, Any], rows: List[dict]) -> str:
    digest_source = json.dumps(
        {"manifest": manifest_payload, "rows": rows},
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(digest_source).hexdigest()[:12]


def sort_export_rows(rows: List[dict]) -> List[dict]:
    def sort_key(row: dict) -> tuple:
        grid_year = row.get("grid_vintage_year")
        ef_year = row.get("emission_factor_vintage_year")
        return (
            str(row.get("profile_id") or ""),
            str(row.get("activity_id") or ""),
            str(row.get("layer_id") or ""),
            str(row.get("grid_region") or ""),
            -1 if grid_year in (None, "") else int(grid_year),
            -1 if ef_year in (None, "") else int(ef_year),
        )

    return sorted(rows, key=sort_key)


def write_json(path: Path, payload: Any) -> None:
    normalised = normalise_value(payload)
    path.write_text(json.dumps(normalised, indent=2, sort_keys=True), encoding="utf-8")


def stable_json_dumps(payload: Any) -> str:
    normalised = normalise_value(payload)
    return json.dumps(normalised, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def write_reference_file(directory: Path, stem: str, references: List[str]) -> str:
    directory.mkdir(parents=True, exist_ok=True)
    text = "\n".join(references)
    if references:
        text += "\n"
    (directory / f"{stem}_refs.txt").write_text(text, encoding="utf-8")
    return text
