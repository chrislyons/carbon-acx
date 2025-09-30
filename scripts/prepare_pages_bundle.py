from __future__ import annotations

import argparse
import shutil
import textwrap
from pathlib import Path

HEADERS_TEMPLATE = textwrap.dedent(
    """
    /index.html
      Cache-Control: no-cache

    /artifacts/*
      Cache-Control: public, max-age=31536000, immutable
      Content-Type: application/json; charset=utf-8
      Access-Control-Allow-Origin: https://boot.industries
      Access-Control-Allow-Methods: GET, HEAD, OPTIONS
      Access-Control-Allow-Headers: Content-Type
    """
).strip() + "\n"

REDIRECTS_TEMPLATE = "/carbon-acx\t/carbon-acx/\t301\n"


def _write_headers(site_root: Path) -> None:
    headers_path = site_root / "_headers"
    headers_path.write_text(HEADERS_TEMPLATE, encoding="utf-8")


def _write_redirects(site_root: Path) -> None:
    redirects_path = site_root / "_redirects"
    redirects_path.write_text(REDIRECTS_TEMPLATE, encoding="utf-8")


def prepare_pages_bundle(site_root: Path, artifacts_dir: Path) -> None:
    """Copy packaged artefacts into the static bundle and emit Pages metadata."""

    if not site_root.is_dir():
        raise FileNotFoundError(f"Static site directory not found: {site_root}")

    if not artifacts_dir.is_dir():
        raise FileNotFoundError(f"Packaged artefacts directory not found: {artifacts_dir}")

    target = site_root / "artifacts"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(artifacts_dir, target)

    _write_headers(site_root)
    _write_redirects(site_root)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare the Cloudflare Pages bundle with artefacts and metadata.",
    )
    parser.add_argument(
        "--site",
        type=Path,
        default=Path("dist/site"),
        help="Path to the built static site root (default: dist/site)",
    )
    parser.add_argument(
        "--artifacts",
        type=Path,
        default=Path("dist/packaged-artifacts"),
        help="Directory containing packaged artefacts to publish",
    )
    args = parser.parse_args()

    prepare_pages_bundle(args.site, args.artifacts)


if __name__ == "__main__":
    main()
