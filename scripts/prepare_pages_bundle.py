from __future__ import annotations

import argparse
import json
import shutil
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_LAYERS_PATH = REPO_ROOT / "site" / "public" / "artifacts" / "layers.json"

HEADERS_TEMPLATE = (
    textwrap.dedent(
        """
    /index.html
      Cache-Control: no-cache

    /artifacts/*
      Cache-Control: public, max-age=31536000, immutable
      Content-Type: application/json; charset=utf-8
      Access-Control-Allow-Origin: *
      Access-Control-Allow-Methods: GET, HEAD, OPTIONS
      Access-Control-Allow-Headers: Content-Type
    """
    ).strip()
    + "\n"
)

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

    fallback_layers = target / "layers.json"
    if not fallback_layers.exists() and DEV_LAYERS_PATH.is_file():
        fallback_layers.write_bytes(DEV_LAYERS_PATH.read_bytes())

    index_path = target / "index.json"
    if index_path.exists():
        index_path.unlink()

    entries: list[dict[str, object]] = []
    for file_path in sorted(target.rglob("*")):
        if file_path.is_file():
            relative = file_path.relative_to(target).as_posix()
            size = file_path.stat().st_size
            entries.append({"path": relative, "bytes": size})

    index_payload = {"files": entries}
    index_path.write_text(json.dumps(index_payload, indent=2) + "\n", encoding="utf-8")

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
