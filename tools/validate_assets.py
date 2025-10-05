"""Validate that static site asset references resolve to files."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "site" / "public"
ICON_RE = re.compile(r'src="([^"\s]+\.(?:svg|png|ico))"')


def main() -> int:
    missing: list[str] = []
    for html_path in ROOT.rglob("*.html"):
        try:
            text = html_path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:  # pragma: no cover - file disappeared between glob/read
            print(f"warning: unable to read {html_path}: {exc}", file=sys.stderr)
            continue
        for match in ICON_RE.finditer(text):
            rel_path = match.group(1)
            asset_path = ROOT / rel_path.lstrip("/")
            if not asset_path.exists():
                missing.append(str(asset_path))
    if missing:
        print("Missing assets:")
        for path in missing:
            print(f"- {path}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
