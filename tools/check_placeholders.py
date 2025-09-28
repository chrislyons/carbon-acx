#!/usr/bin/env python3
"""Fail if banned placeholder tokens appear in shipping data."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
BANNED_TOKENS: tuple[str, ...] = ("Awaiting", "placeholder", "SRC.OLD", "TBD")


@dataclass(frozen=True)
class PlaceholderHit:
    """Location information for a banned token."""

    line_number: int
    token: str
    line_text: str


def iter_data_csv_files() -> Iterable[Path]:
    """Yield CSV files that ship with the data package."""

    if not DATA_DIR.exists():
        raise SystemExit("data directory not found")

    yield from sorted(DATA_DIR.glob("*.csv"))


def scan_file(path: Path) -> list[PlaceholderHit]:
    """Return occurrences of banned tokens within *path*."""

    hits: list[PlaceholderHit] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        lower_line = raw_line.casefold()
        for token in BANNED_TOKENS:
            if token.casefold() in lower_line:
                hits.append(
                    PlaceholderHit(line_number=line_number, token=token, line_text=raw_line.strip())
                )
    return hits


def scan_data_files() -> dict[Path, list[PlaceholderHit]]:
    """Scan all shipping CSV files and collect placeholder hits."""

    findings: dict[Path, list[PlaceholderHit]] = {}
    for path in iter_data_csv_files():
        hits = scan_file(path)
        if hits:
            findings[path] = hits
    return findings


def format_hits(path: Path, hits: list[PlaceholderHit]) -> str:
    relative = path.relative_to(ROOT)
    lines = []
    for hit in hits:
        lines.append(
            f"{relative}:{hit.line_number}: contains banned token '{hit.token}' -> {hit.line_text}"
        )
    return "\n".join(lines)


def main() -> int:
    findings = scan_data_files()
    if findings:
        message_lines = [format_hits(path, hits) for path, hits in findings.items()]
        sys.stderr.write("\n".join(message_lines) + "\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
