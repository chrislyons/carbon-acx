from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

REFERENCES_DIR = Path(__file__).parent / "references"


def load_citations(keys: Iterable[str]) -> List[str]:
    citations: List[str] = []
    for idx, key in enumerate(keys, start=1):
        text = (REFERENCES_DIR / f"{key}.txt").read_text().strip()
        citations.append(f"[{idx}] {text}")
    return citations
