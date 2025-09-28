import json
from collections.abc import Iterable, Sequence

import pandas as pd
import pytest

from calc import citations, derive, figures


@pytest.fixture
def emissions_df():
    return pd.DataFrame(
        [
            {
                "activity_id": "coffee",
                "activity_name": "Coffee",
                "activity_category": "Food",
                "layer_id": "professional",
                "annual_emissions_g": 120.0,
                "annual_emissions_g_low": 100.0,
                "annual_emissions_g_high": 150.0,
            },
            {
                "activity_id": "stream",
                "activity_name": "Streaming",
                "activity_category": None,
                "layer_id": "professional",
                "annual_emissions_g": 80.0,
                "annual_emissions_g_low": 70.0,
                "annual_emissions_g_high": 90.0,
            },
            {
                "activity_id": "coffee",
                "activity_name": "Coffee",
                "activity_category": "Food",
                "layer_id": "professional",
                "annual_emissions_g": 30.0,
                "annual_emissions_g_low": 20.0,
                "annual_emissions_g_high": 40.0,
            },
        ]
    )


@pytest.fixture
def derived_artifacts(derived_output_dir, derived_output_root):
    df = derive.export_view(derive.choose_backend(), output_root=derived_output_root)
    figure_dir = derived_output_dir / "figures"
    reference_dir = derived_output_dir / "references"
    return {
        "data_frame": df,
        "figure_dir": figure_dir,
        "reference_dir": reference_dir,
    }


def _iter_value_dicts(name: str, payload: dict) -> Iterable[dict]:
    data = payload.get("data")
    if name == "sankey":
        entries = data.get("links", []) if isinstance(data, dict) else []
    else:
        entries = data if isinstance(data, list) else []
    for entry in entries:
        values = entry.get("values") if isinstance(entry, dict) else None
        if isinstance(values, dict) and values.get("mean") is not None:
            yield values


def _iter_hover_indices(name: str, payload: dict) -> Iterable[list[int]]:
    data = payload.get("data")
    if name == "sankey":
        entries = data.get("links", []) if isinstance(data, dict) else []
    else:
        entries = data if isinstance(data, list) else []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        indices: list[int] = []
        for key in ("hover_reference_indices", "hover_indices"):
            value = entry.get(key)
            if value is None:
                continue
            if isinstance(value, int):
                indices.append(int(value))
            elif isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
                for item in value:
                    if isinstance(item, (int, float)):
                        indices.append(int(item))
        if indices:
            yield indices


def _expected_totals(df: pd.DataFrame) -> dict[str, float]:
    subset = df[df["annual_emissions_g"].notna()]
    totals: dict[str, float] = {}
    if not subset.empty:
        totals["mean"] = float(subset["annual_emissions_g"].sum())
        for bound in ("low", "high"):
            column = f"annual_emissions_g_{bound}"
            if column in subset.columns:
                cleaned = subset[column].dropna()
                if not cleaned.empty:
                    totals[bound] = float(cleaned.sum())
    return totals


def test_slice_totals_match_source(emissions_df):
    total = emissions_df["annual_emissions_g"].sum()
    low_total = emissions_df["annual_emissions_g_low"].dropna().sum()
    high_total = emissions_df["annual_emissions_g_high"].dropna().sum()

    stacked = figures.slice_stacked(emissions_df)
    bubble = figures.slice_bubble(emissions_df)
    sankey = figures.slice_sankey(emissions_df)

    stacked_total = sum(item["values"]["mean"] for item in stacked)
    bubble_total = sum(point.values["mean"] for point in bubble)
    sankey_total = sum(link["values"]["mean"] for link in sankey["links"])

    assert stacked_total == pytest.approx(total)
    assert bubble_total == pytest.approx(total)
    assert sankey_total == pytest.approx(total)

    food_stacked = next(item for item in stacked if item["category"] == "Food")
    assert food_stacked["values"]["low"] == pytest.approx(120.0)
    assert food_stacked["values"]["high"] == pytest.approx(190.0)

    coffee_point = next(point for point in bubble if point.activity_id == "coffee")
    assert coffee_point.values["low"] == pytest.approx(120.0)
    assert coffee_point.values["high"] == pytest.approx(190.0)

    coffee_link = next(link for link in sankey["links"] if link["activity_id"] == "coffee")
    assert coffee_link["values"]["low"] == pytest.approx(120.0)
    assert coffee_link["values"]["high"] == pytest.approx(190.0)

    assert sum(item["values"].get("low", 0.0) for item in stacked) == pytest.approx(low_total)
    assert sum(item["values"].get("high", 0.0) for item in stacked) == pytest.approx(high_total)


def test_slice_outputs_include_uncategorized(emissions_df):
    data = figures.slice_stacked(emissions_df)
    categories = {row["category"] for row in data}
    assert "uncategorized" in categories

    points = figures.slice_bubble(emissions_df)
    assert any(point.category == "uncategorized" for point in points)

    sankey = figures.slice_sankey(emissions_df)
    assert any(link["category"] == "uncategorized" for link in sankey["links"])


def test_exported_figures_have_consistent_references(derived_artifacts):
    df = derived_artifacts["data_frame"]
    figure_dir = derived_artifacts["figure_dir"]
    reference_dir = derived_artifacts["reference_dir"]

    totals = _expected_totals(df)
    assert "mean" in totals, "derived dataset should include at least one emission value"

    for figure_path in sorted(figure_dir.glob("*.json")):
        payload = json.loads(figure_path.read_text(encoding="utf-8"))

        references_path = reference_dir / f"{figure_path.stem}_refs.txt"
        reference_lines = [
            line
            for line in references_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

        assert payload.get("references") == reference_lines
        for idx, line in enumerate(reference_lines, start=1):
            assert line.startswith(f"[{idx}]")

        expected_refs = [
            citations.format_ieee(ref.numbered(idx))
            for idx, ref in enumerate(
                citations.references_for(payload.get("citation_keys")), start=1
            )
        ]
        assert reference_lines == expected_refs

        value_dicts = list(_iter_value_dicts(figure_path.stem, payload))
        if value_dicts:
            total_mean = sum(item["mean"] for item in value_dicts)
            assert total_mean == pytest.approx(totals["mean"], rel=1e-6, abs=1e-6)

            for bound in ("low", "high"):
                expected_total = totals.get(bound)
                collected = [item[bound] for item in value_dicts if bound in item]
                if expected_total is None:
                    assert not collected
                elif collected:
                    assert sum(collected) == pytest.approx(expected_total, rel=1e-6, abs=1e-6)

        valid_indices = set(range(1, len(reference_lines) + 1))
        for indices in _iter_hover_indices(figure_path.stem, payload):
            assert set(indices).issubset(valid_indices)
