from __future__ import annotations

import argparse
from pathlib import Path
from typing import Mapping
import json

from calc.copy_blocks import disclosure_markdown, na_markdown


def _load_manifest(path: Path | None) -> Mapping | None:
    if path is None:
        return None
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render reusable copy blocks to Markdown snippets."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("calc/outputs/manifest.json"),
        help="Path to manifest JSON used for disclosure metadata.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("site/components"),
        help="Directory to write Markdown snippets to.",
    )
    args = parser.parse_args()

    manifest = _load_manifest(args.manifest)

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    disclosure_path = output_dir / "Disclosure.md"
    na_path = output_dir / "NA.md"

    disclosure_path.write_text(disclosure_markdown(manifest), encoding="utf-8")
    na_path.write_text(na_markdown(), encoding="utf-8")

    print(f"Wrote disclosure snippet to {disclosure_path}")
    print(f"Wrote NA snippet to {na_path}")


if __name__ == "__main__":
    main()
