"""Generate a minimal CycloneDX SBOM from the Poetry lock file."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import tomllib

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "dist" / "sbom" / "cyclonedx.json"
POETRY_LOCK = PROJECT_ROOT / "poetry.lock"
PYPROJECT = PROJECT_ROOT / "pyproject.toml"


def _load_toml(path: Path) -> dict[str, Any]:
    with path.open("rb") as fh:
        return tomllib.load(fh)


def _build_metadata(pyproject: dict[str, Any]) -> dict[str, Any]:
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

    metadata: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "component": component,
        "tools": [
            {
                "vendor": "carbon-acx",
                "name": "sbom-generator",
                "version": "1.0",
            }
        ],
    }
    return metadata


def _build_components(lock_data: dict[str, Any]) -> list[dict[str, Any]]:
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
        }
        component["purl"] = f"pkg:pypi/{name}@{version}"
        if (licenses := package.get("license")) is not None:
            component["licenses"] = [
                (
                    {"license": {"id": licenses}}
                    if isinstance(licenses, str)
                    else {"expression": str(licenses)}
                )
            ]
        components.append(component)
    components.sort(key=lambda item: (item["name"], item["version"]))
    return components


def generate_sbom(output_path: Path | None = None) -> Path:
    """Generate the SBOM JSON at ``output_path`` and return the file path."""

    if output_path is None:
        output_path = DEFAULT_OUTPUT
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lock_data = _load_toml(POETRY_LOCK)
    pyproject_data = _load_toml(PYPROJECT)

    bom: dict[str, Any] = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid4()}",
        "version": 1,
        "metadata": _build_metadata(pyproject_data),
        "components": _build_components(lock_data),
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
