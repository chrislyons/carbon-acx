from __future__ import annotations

from pathlib import Path

from dash import html


def references_pane(path: Path = Path("calc/outputs/references")):
    texts = []
    if path.exists():
        for file in sorted(path.glob("*.txt")):
            texts.append(file.read_text())
    return html.Pre("\n\n".join(texts))
