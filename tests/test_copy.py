from __future__ import annotations

from pathlib import Path


def _project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _text_paths() -> list[Path]:
    root = _project_root()
    targets = [root / "README.md"]
    site_dir = root / "site"
    if site_dir.exists():
        targets.extend(
            path
            for path in site_dir.rglob("*")
            if path.is_file() and "node_modules" not in path.parts
        )
    return targets


def test_no_fastapi_mentions() -> None:
    needle = "Fast" + "API"
    offending: list[Path] = []
    for path in _text_paths():
        text = path.read_text(encoding="utf-8")
        if needle in text:
            offending.append(path)
    assert not offending, f"Unexpected {needle} mentions in: {offending}"
