from __future__ import annotations

import json
from pathlib import Path

from tools.sbom import generate_sbom


def test_sbom_covers_python_and_node_locks_and_is_deterministic(tmp_path: Path) -> None:
    first = generate_sbom(tmp_path / "first.json")
    second = generate_sbom(tmp_path / "second.json")
    first_payload = json.loads(first.read_text(encoding="utf-8"))
    second_payload = json.loads(second.read_text(encoding="utf-8"))

    assert first.read_bytes() == second.read_bytes()
    assert first_payload["serialNumber"] == second_payload["serialNumber"]
    assert first_payload["metadata"]["timestamp"] == "1970-01-01T00:00:00+00:00"
    names = {component["name"] for component in first_payload["components"]}
    assert "next" in names
    assert "jsonschema" in names
    assert any(
        component.get("purl", "").startswith("pkg:npm/")
        for component in first_payload["components"]
    )
    assert any(
        component.get("purl", "").startswith("pkg:pypi/")
        for component in first_payload["components"]
    )
