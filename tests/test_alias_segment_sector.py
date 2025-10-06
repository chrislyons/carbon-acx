from __future__ import annotations

import json
from dataclasses import asdict

import pandas as pd

from calc import figures


def _serialise_payload(df: pd.DataFrame) -> dict[str, object]:
    stacked = figures.slice_stacked(df)
    bubble = [asdict(point) for point in figures.slice_bubble(df)]
    sankey = figures.slice_sankey(df)
    return {
        "stacked": json.loads(json.dumps(stacked, sort_keys=True)),
        "bubble": json.loads(json.dumps(bubble, sort_keys=True)),
        "sankey": json.loads(json.dumps(sankey, sort_keys=True)),
    }


def _build_rows(column_name: str) -> list[dict[str, object]]:
    return [
        {
            "activity_id": "A1",
            "activity_name": "Alpha",
            "activity_category": "Mobility",
            "annual_emissions_g": 1_000.0,
            "layer_id": "professional",
            column_name: "Transport",
        },
        {
            "activity_id": "A2",
            "activity_name": "Bravo",
            "activity_category": "Energy",
            "annual_emissions_g": 500.0,
            "layer_id": "professional",
            column_name: "Transport",
        },
    ]


def test_alias_reads_match_for_segment_and_sector() -> None:
    segment_only = pd.DataFrame(_build_rows("segment"))
    sector_only = pd.DataFrame(_build_rows("sector"))
    mixed_rows = _build_rows("segment")
    for index, row in enumerate(mixed_rows):
        if index % 2 == 1:
            row["sector"] = row.pop("segment")
    mixed = pd.DataFrame(mixed_rows)

    canonical_segment = _serialise_payload(segment_only)
    canonical_sector = _serialise_payload(sector_only)
    canonical_mixed = _serialise_payload(mixed)

    assert canonical_segment == canonical_sector == canonical_mixed

    # Forward outputs should only emit sector terminology.
    stacked_entry = canonical_segment["stacked"][0]
    assert "sector" in stacked_entry
    assert stacked_entry.get("sector") == "Transport"
    assert "segment" not in json.dumps(canonical_segment)

    bubble_entry = canonical_segment["bubble"][0]
    assert bubble_entry.get("sector") == "Transport"

    sankey_nodes = canonical_segment["sankey"]["nodes"]
    assert all("segment" not in json.dumps(node) for node in sankey_nodes)

