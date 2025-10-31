"""Lint Markdown files for banned terminology.

This script scans Markdown documents for disallowed tokens that have caused
compliance regressions in previous pull requests. It exits with a non-zero
status code if any banned term is detected so the check can be wired into CI or
local lint pipelines.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable, Mapping, Set

# Token -> human friendly guidance explaining the preferred alternative.
BANNED_TOKENS: Mapping[str, str] = {
    "fastapi": "Use framework-neutral language instead of referencing FastAPI.",
}

# Specific documents that are permitted to reference otherwise banned tokens.
# This is useful for retrospective docs that must quote prior incidents.
ALLOWED_TOKEN_PATHS: Mapping[str, Set[Path]] = {
    "fastapi": {Path("docs/audits/pr_history_review.md")},
}


def iter_markdown_files(paths: Iterable[Path]) -> Iterable[Path]:
    """Yield Markdown files from an iterable of filesystem paths."""
    for path in paths:
        if path.is_dir():
            yield from iter_markdown_files(sorted(path.rglob("*.md")))
        else:
            yield path


def scan_file(path: Path) -> list[str]:
    """Return a list of lint errors for the provided Markdown file."""
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        errors.append(f"Missing file: {path}")
        return errors

    try:
        relative_path = path.resolve().relative_to(Path.cwd())
    except ValueError:
        relative_path = path

    lowered_lines = text.lower().splitlines()
    original_lines = text.splitlines()

    for line_no, line in enumerate(lowered_lines, start=1):
        for token, guidance in BANNED_TOKENS.items():
            allowed_paths = ALLOWED_TOKEN_PATHS.get(token, set())
            if relative_path in allowed_paths:
                continue
            if token in line:
                original_line = original_lines[line_no - 1]
                errors.append(
                    f"{relative_path}:{line_no}: banned term '{token}' detected. {guidance}"
                    f"\n> {original_line.strip()}"
                )
    return errors


def lint_markdown(paths: Iterable[Path]) -> list[str]:
    files = list(iter_markdown_files(paths))
    errors: list[str] = []
    for file_path in files:
        if file_path.suffix.lower() != ".md":
            continue
        errors.extend(scan_file(file_path))
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=[Path("README.md")],
        help="Files or directories to scan. Defaults to README.md if omitted.",
    )
    args = parser.parse_args(argv)

    errors = lint_markdown(args.paths)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print("Documentation lint passed: no banned terminology found.")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    sys.exit(main())
