from __future__ import annotations

from pathlib import Path
from typing import Dict, List


def build_citation_map(sources: List[str]) -> Dict[int, str]:
    return {i + 1: text for i, text in enumerate(sources)}


def write_references(name: str, sources: List[str], directory: Path) -> Dict[int, str]:
    directory.mkdir(parents=True, exist_ok=True)
    mapping = build_citation_map(sources)
    lines = [f"[{k}] {v}" for k, v in mapping.items()]
    (directory / f"{name}.txt").write_text("\n".join(lines))
    return mapping


def create_citations(directory: Path, config: Dict[str, List[str]]) -> Dict[str, Dict[int, str]]:
    result: Dict[str, Dict[int, str]] = {}
    for fig, sources in config.items():
        result[fig] = write_references(fig, sources, directory)
    return result
