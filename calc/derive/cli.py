"""Command-line entry points for the derive pipeline."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Sequence

from ..dal import choose_backend
from .io import ARTIFACT_ROOT
from .pipeline import build_intensity_matrix, export_view

__all__ = ["main"]


def _parse_export_args(argv: Sequence[str]) -> Any:
    parser = argparse.ArgumentParser(description="Generate ACX derived outputs")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help="Base directory for generated artifacts (defaults to dist/artifacts)",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to the SQL database when using sqlite or duckdb backends",
    )
    parser.add_argument(
        "--backend",
        choices=("csv", "sqlite", "duckdb"),
        default=None,
        help="Override ACX_DATA_BACKEND for this invocation",
    )
    return parser.parse_args(argv)


def _parse_intensity_args(argv: Sequence[str]) -> Any:
    parser = argparse.ArgumentParser(description="Generate intensity matrix outputs")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ARTIFACT_ROOT,
        help="Directory to store intensity artifacts (defaults to dist/artifacts)",
    )
    parser.add_argument(
        "--fu",
        dest="functional_unit",
        default=None,
        help="Functional unit identifier to filter on; use 'all' for every unit",
    )
    parser.add_argument(
        "--profile",
        dest="profile_id",
        default=None,
        help="Profile identifier to filter on",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to the SQL database when using sqlite or duckdb backends",
    )
    parser.add_argument(
        "--backend",
        choices=("csv", "sqlite", "duckdb"),
        default=None,
        help="Override ACX_DATA_BACKEND for this invocation",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    argv = list(argv or [])
    command = "export"
    if argv and argv[0] in {"export", "intensity"}:
        command = str(argv.pop(0))

    if command == "export":
        args = _parse_export_args(argv)
        datastore = choose_backend(backend=args.backend, db_path=args.db)
        export_view(datastore, output_root=args.output_root)
        return

    if command == "intensity":
        args = _parse_intensity_args(argv)
        datastore = choose_backend(backend=args.backend, db_path=args.db)
        fu_option = args.functional_unit
        fu_id = None if fu_option is None or str(fu_option).lower() == "all" else fu_option
        build_intensity_matrix(
            profile_id=args.profile_id,
            fu_id=fu_id,
            ds=datastore,
            output_dir=args.output_dir,
        )
        return

    raise ValueError(f"Unsupported command: {command}")
