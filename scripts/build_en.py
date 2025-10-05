from __future__ import annotations

import argparse
from pathlib import Path

from calc.pack import EnglishPackBuilder, load_signing_key


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the English WordNet SQLite pack.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("dist/wordnet-cache"),
        help="Directory used for cached WordNet downloads",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dist/packs/english-wordnet.sqlite"),
        help="Destination SQLite file for the generated pack",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Optional manifest output path (defaults to <output>.json)",
    )
    parser.add_argument(
        "--lexicon",
        action="append",
        dest="lexicons",
        help="Lexicon identifier to include (defaults to omw-en31)",
    )
    parser.add_argument(
        "--project",
        action="append",
        dest="projects",
        help="Explicit wn download project identifier (defaults to omw-en31:1.4 and omw-en:1.4)",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Skip downloading upstream resources if the cache is already populated",
    )
    parser.add_argument(
        "--signing-key",
        type=Path,
        help="Path to an Ed25519 private key (hex or base64 encoded) used to sign the pack",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    builder = EnglishPackBuilder(
        data_dir=args.data_dir,
        output_path=args.output,
        manifest_path=args.manifest,
        downloads=tuple(args.projects) if args.projects else None,
        lexicon_ids=tuple(args.lexicons) if args.lexicons else None,
    )

    if not args.skip_download:
        builder.download_sources()

    signing_key = load_signing_key(args.signing_key) if args.signing_key else None
    result = builder.build(signing_key=signing_key)

    signature_status = "signed" if result.signature else "unsigned"
    print(f"Generated English pack at {result.pack_path} ({signature_status}).")
    print(f"Manifest available at {result.manifest_path}.")


if __name__ == "__main__":
    main()
