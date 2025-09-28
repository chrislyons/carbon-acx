"""Diff export_view payloads produced by different data backends."""

from __future__ import annotations

import argparse
import difflib
import json
import sys
from pathlib import Path
from typing import Any


def _normalize(value: Any) -> Any:
    """Return a canonical, order-insensitive representation of ``value``."""

    if isinstance(value, dict):
        return {key: _normalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return sorted((_normalize(item) for item in value), key=_sort_key)
    return value


def _sort_key(value: Any) -> str:
    """Stable sort key for normalized data structures."""

    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        raise SystemExit(f"Failed to parse JSON from {path}: {exc}") from exc


def diff_exports(csv_path: Path, duckdb_path: Path) -> int:
    csv_payload = _normalize(_load_json(csv_path))
    duckdb_payload = _normalize(_load_json(duckdb_path))

    if csv_payload == duckdb_payload:
        return 0

    csv_dump = json.dumps(csv_payload, indent=2, sort_keys=True, ensure_ascii=False)
    duckdb_dump = json.dumps(duckdb_payload, indent=2, sort_keys=True, ensure_ascii=False)

    diff = "\n".join(
        difflib.unified_diff(
            csv_dump.splitlines(),
            duckdb_dump.splitlines(),
            fromfile=str(csv_path),
            tofile=str(duckdb_path),
            lineterm="",
        )
    )

    message = [
        "Detected differences between export_view.json outputs.",
        "CSV backend is authoritative. Please investigate the DuckDB output.",
    ]
    if diff:
        message.append(diff)

    print("\n".join(message))
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_export", type=Path, help="Path to CSV backend export_view.json")
    parser.add_argument("duckdb_export", type=Path, help="Path to DuckDB backend export_view.json")
    args = parser.parse_args(argv)

    return diff_exports(args.csv_export, args.duckdb_export)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    sys.exit(main())
