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


def _build_rows() -> list[dict[str, object]]:
    return [
        {
            "activity_id": "A1",
            "activity_name": "Alpha",
            "activity_category": "Mobility",
            "annual_emissions_g": 1_000.0,
            "layer_id": "professional",
            "sector": "Transport",
        },
        {
            "activity_id": "A2",
            "activity_name": "Bravo",
            "activity_category": "Energy",
            "annual_emissions_g": 500.0,
            "layer_id": "professional",
            "sector": "Transport",
        },
    ]


def test_sector_is_preserved_in_figure_payloads() -> None:
    payload = _serialise_payload(pd.DataFrame(_build_rows()))

    stacked_entry = payload["stacked"][0]
    assert stacked_entry.get("sector") == "Transport"

    bubble_entry = payload["bubble"][0]
    assert bubble_entry.get("sector") == "Transport"

    sankey_nodes = payload["sankey"]["nodes"]
    assert all("segment" not in json.dumps(node) for node in sankey_nodes)
