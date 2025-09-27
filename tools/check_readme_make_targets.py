#!/usr/bin/env python3
"""Verify README make targets are still defined in the Makefile."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
MAKEFILE = ROOT / "Makefile"

TARGET_PATTERN = re.compile(r"^([A-Za-z0-9_.-]+)\s*:(?!=)")


def load_make_targets() -> set[str]:
    if not MAKEFILE.exists():
        raise SystemExit("Makefile not found")

    targets: set[str] = set()
    for line in MAKEFILE.read_text().splitlines():
        if line.startswith("\t") or not line.strip():
            continue
        match = TARGET_PATTERN.match(line)
        if not match:
            continue
        target = match.group(1)
        if target == ".PHONY":
            continue
        targets.add(target)
    return targets


def extract_targets_from_readme() -> set[str]:
    if not README.exists():
        raise SystemExit("README.md not found")

    content = README.read_text()
    targets: set[str] = set()

    # Inline code snippets like `make build`
    for snippet in re.findall(r"`make ([^`]+)`", content):
        command = snippet.split("#", 1)[0].strip()
        for token in command.split():
            token = token.strip(".,")
            if not token or token.startswith("-") or "=" in token:
                continue
            targets.add(token)

    # Code blocks or standalone lines starting with make commands
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("$ make "):
            command = stripped[2:]
        elif stripped.startswith("make "):
            command = stripped
        else:
            continue
        command = command.split("#", 1)[0].strip()
        parts = command.split()[1:]
        for token in parts:
            token = token.strip(".,")
            if not token or token.startswith("-") or "=" in token:
                continue
            targets.add(token)

    return targets


def main() -> int:
    declared_targets = load_make_targets()
    referenced_targets = extract_targets_from_readme()

    missing = sorted(target for target in referenced_targets if target not in declared_targets)
    if missing:
        sys.stderr.write(
            "README.md references undefined make targets: " + ", ".join(missing) + "\n"
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
