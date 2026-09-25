"""Generate a deterministic CycloneDX SBOM from Python and Node lockfiles."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote
from uuid import NAMESPACE_URL, uuid5

import tomllib
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "dist" / "sbom" / "cyclonedx.json"
POETRY_LOCK = PROJECT_ROOT / "poetry.lock"
PNPM_LOCK = PROJECT_ROOT / "pnpm-lock.yaml"
VALIDATOR_REQUIREMENTS = PROJECT_ROOT / "tools" / "validator" / "requirements.txt"
DEFAULT_GENERATED_AT = "1970-01-01T00:00:00+00:00"


def _load_toml(path: Path) -> dict[str, Any]:
    with path.open("rb") as fh:
        return tomllib.load(fh)


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fh:
        payload = yaml.safe_load(fh)
    return payload if isinstance(payload, dict) else {}


def _build_metadata(pyproject: dict[str, Any], *, serial_seed: str) -> dict[str, Any]:
    poetry_meta = pyproject.get("tool", {}).get("poetry", {})
    component: dict[str, Any] = {
        "type": "application",
        "name": poetry_meta.get("name", "unknown"),
    }
    if version := poetry_meta.get("version"):
        component["version"] = version
    if description := poetry_meta.get("description"):
        component["description"] = description
    if authors := poetry_meta.get("authors"):
        component["author"] = authors

    return {
        "timestamp": os.getenv("ACX_GENERATED_AT", DEFAULT_GENERATED_AT),
        "component": component,
        "tools": [
            {
                "vendor": "carbon-acx",
                "name": "sbom-generator",
                "version": "2.0",
            }
        ],
        "properties": [
            {
                "name": "carbon-acx:lockfile-digest",
                "value": serial_seed,
            }
        ],
        "serialNumber": f"urn:uuid:{uuid5(NAMESPACE_URL, serial_seed)}",
    }


def _build_python_components(lock_data: dict[str, Any]) -> list[dict[str, Any]]:
    packages = lock_data.get("package", [])
    components: list[dict[str, Any]] = []
    for package in packages:
        name = package.get("name")
        version = package.get("version")
        if not name or not version:
            continue
        component: dict[str, Any] = {
            "type": "library",
            "name": name,
            "version": version,
            "purl": f"pkg:pypi/{name}@{version}",
        }
        if (licenses := package.get("license")) is not None:
            component["licenses"] = [
                (
                    {"license": {"id": licenses}}
                    if isinstance(licenses, str)
                    else {"expression": str(licenses)}
                )
            ]
        components.append(component)
    return components


def _split_pnpm_key(key: str) -> tuple[str, str] | None:
    """Extract a package name/version from a pnpm v9 lockfile key."""
    value = str(key).lstrip("/")
    if value.startswith(("file:", "link:", "workspace:")):
        return None
    value = value.split("(", 1)[0]
    at_index = value.rfind("@")
    if at_index <= 0:
        return None
    name = value[:at_index]
    version = value[at_index + 1 :]
    if not name or not version or "/" not in name and not re.fullmatch(r"[^@\s]+", name):
        return None
    return name, version


def _build_pnpm_components(lock_data: dict[str, Any]) -> list[dict[str, Any]]:
    components: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for key in lock_data.get("packages", {}) or {}:
        identity = _split_pnpm_key(str(key))
        if identity is None or identity in seen:
            continue
        name, version = identity
        seen.add(identity)
        components.append(
            {
                "type": "library",
                "name": name,
                "version": version,
                "purl": f"pkg:npm/{quote(name, safe='/')}@{version}",
            }
        )
    return components


def _build_requirement_components(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    components: list[dict[str, Any]] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.fullmatch(r"([A-Za-z0-9_.-]+)==([^\s]+)", line)
        if match is None:
            continue
        name, version = match.groups()
        components.append(
            {
                "type": "library",
                "name": name,
                "version": version,
                "purl": f"pkg:pypi/{name}@{version}",
            }
        )
    return components


def _dedupe_components(components: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[tuple[str, str], dict[str, Any]] = {}
    for component in components:
        key = (str(component.get("name", "")), str(component.get("version", "")))
        unique.setdefault(key, component)
    return sorted(unique.values(), key=lambda item: (str(item["name"]), str(item["version"])))


def generate_sbom(output_path: Path | None = None) -> Path:
    """Generate the combined Python/Node SBOM JSON and return its path."""

    if output_path is None:
        output_path = DEFAULT_OUTPUT
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    pyproject_data = _load_toml(PROJECT_ROOT / "pyproject.toml")
    poetry_data = _load_toml(POETRY_LOCK)
    pnpm_data = _load_yaml(PNPM_LOCK) if PNPM_LOCK.exists() else {}
    requirements = _build_requirement_components(VALIDATOR_REQUIREMENTS)

    lock_digest = hashlib.sha256()
    for path in (POETRY_LOCK, PNPM_LOCK, VALIDATOR_REQUIREMENTS):
        if path.exists():
            lock_digest.update(path.read_bytes())
    serial_seed = lock_digest.hexdigest()

    components = _dedupe_components(
        [
            *_build_python_components(poetry_data),
            *_build_pnpm_components(pnpm_data),
            *requirements,
        ]
    )
    bom: dict[str, Any] = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid5(NAMESPACE_URL, serial_seed)}",
        "version": 1,
        "metadata": _build_metadata(pyproject_data, serial_seed=serial_seed),
        "components": components,
    }

    with output_path.open("w", encoding="utf-8") as fh:
        json.dump(bom, fh, indent=2, sort_keys=False)
        fh.write("\n")

    return output_path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Path to write the SBOM JSON (default: dist/sbom/cyclonedx.json)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    generate_sbom(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
