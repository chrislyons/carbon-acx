from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .dal import choose_backend
from .service import compute_profile


def _load_overrides(args: argparse.Namespace) -> dict[str, Any]:
    if args.overrides_json and args.overrides_file:
        raise ValueError("Use either --overrides-json or --overrides-file, not both.")
    if args.overrides_file:
        return json.loads(Path(args.overrides_file).read_text(encoding="utf-8"))
    if args.overrides_json:
        return json.loads(args.overrides_json)
    return {}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Emit the canonical Carbon ACX compute-profile JSON payload."
    )
    parser.add_argument("--profile-id", required=True, help="Profile identifier to compute.")
    parser.add_argument(
        "--backend",
        choices=("csv", "sqlite", "duckdb"),
        default="csv",
        help="Data backend to use (default: csv).",
    )
    parser.add_argument("--db", help="Database path for sqlite or duckdb backends.")
    parser.add_argument("--overrides-json", help="Inline JSON object of activity overrides.")
    parser.add_argument(
        "--overrides-file", help="Path to a JSON file containing activity overrides."
    )
    parser.add_argument("--output", help="Optional file path for writing the payload.")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output with indentation.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    overrides = _load_overrides(args)

    datastore = choose_backend(backend=args.backend, db_path=args.db)
    should_close = hasattr(datastore, "close")
    try:
        payload = compute_profile(args.profile_id, overrides=overrides, datastore=datastore)
    finally:
        if should_close:
            datastore.close()  # type: ignore[call-arg]

    dump_kwargs: dict[str, Any] = {"ensure_ascii": True}
    if args.pretty or args.output:
        dump_kwargs["indent"] = 2

    if args.output:
        Path(args.output).write_text(json.dumps(payload, **dump_kwargs) + "\n", encoding="utf-8")
    else:
        json.dump(payload, sys.stdout, **dump_kwargs)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
