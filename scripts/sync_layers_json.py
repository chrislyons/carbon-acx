from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Iterable

DEFAULT_INPUT = Path("data/layers.csv")
DEFAULT_OUTPUT = Path("site/public/artifacts/layers.json")


def _read_rows(path: Path) -> Iterable[dict[str, str]]:
  if not path.exists():
    raise FileNotFoundError(f"Layer catalog CSV not found: {path}")
  with path.open(newline="", encoding="utf-8") as handle:
    reader = csv.DictReader(handle)
    for row in reader:
      yield {key: value or "" for key, value in row.items()}


def _normalise_boolean(value: str | None) -> bool | None:
  if value is None:
    return None
  normalised = value.strip().lower()
  if not normalised:
    return None
  if normalised in {"true", "1", "yes"}:
    return True
  if normalised in {"false", "0", "no"}:
    return False
  return None


def _extract_examples(value: str | None) -> list[str]:
  if not value:
    return []
  return [part.strip() for part in value.split(";") if part.strip()]


def build_layer_entries(path: Path) -> list[dict[str, object]]:
  entries: list[dict[str, object]] = []
  for row in _read_rows(path):
    layer_id = (row.get("layer_id") or "").strip()
    if not layer_id:
      continue
    title = (row.get("title") or layer_id.replace("_", " ")).strip()
    summary = (row.get("summary") or "").strip()
    optional = _normalise_boolean(row.get("ui_optional"))
    icon = (row.get("icon_slug") or "").strip() or None
    examples = _extract_examples(row.get("example_activities"))
    entry: dict[str, object] = {
      "id": layer_id,
      "title": title,
    }
    if summary:
      entry["summary"] = summary
    if optional is not None:
      entry["optional"] = optional
    if icon:
      entry["icon"] = icon
    if examples:
      entry["examples"] = examples
    entries.append(entry)
  entries.sort(key=lambda item: item["id"])
  return entries


def write_layers(entries: list[dict[str, object]], destination: Path) -> None:
  destination.parent.mkdir(parents=True, exist_ok=True)
  with destination.open("w", encoding="utf-8") as handle:
    json.dump(entries, handle, indent=2, sort_keys=False)
    handle.write("\n")


def main() -> None:
  parser = argparse.ArgumentParser(description="Synchronise layers.json for the static site.")
  parser.add_argument("--csv", type=Path, default=DEFAULT_INPUT, help="Source CSV file (default: data/layers.csv)")
  parser.add_argument(
    "--output",
    type=Path,
    default=DEFAULT_OUTPUT,
    help="Destination JSON file (default: site/public/artifacts/layers.json)",
  )
  args = parser.parse_args()

  entries = build_layer_entries(args.csv)
  write_layers(entries, args.output)
  print(f"Wrote {len(entries)} layers to {args.output}")


if __name__ == "__main__":
  main()
