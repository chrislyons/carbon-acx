import pandas as pd
import pytest

from calc import figures


@pytest.fixture
def emissions_df():
    return pd.DataFrame(
        [
            {
                "activity_id": "coffee",
                "activity_name": "Coffee",
                "activity_category": "Food",
                "annual_emissions_g": 120.0,
                "annual_emissions_g_low": 100.0,
                "annual_emissions_g_high": 150.0,
            },
            {
                "activity_id": "stream",
                "activity_name": "Streaming",
                "activity_category": None,
                "annual_emissions_g": 80.0,
                "annual_emissions_g_low": 70.0,
                "annual_emissions_g_high": 90.0,
            },
            {
                "activity_id": "coffee",
                "activity_name": "Coffee",
                "activity_category": "Food",
                "annual_emissions_g": 30.0,
                "annual_emissions_g_low": None,
                "annual_emissions_g_high": None,
            },
        ]
    )


def test_slice_totals_match_source(emissions_df):
    total = emissions_df["annual_emissions_g"].sum()

    stacked = figures.slice_stacked(emissions_df)
    bubble = figures.slice_bubble(emissions_df)
    sankey = figures.slice_sankey(emissions_df)

    stacked_total = sum(item["values"]["mean"] for item in stacked)
    bubble_total = sum(point.values["mean"] for point in bubble)
    sankey_total = sum(link["values"]["mean"] for link in sankey["links"])

    assert stacked_total == pytest.approx(total)
    assert bubble_total == pytest.approx(total)
    assert sankey_total == pytest.approx(total)


def test_slice_outputs_include_uncategorized(emissions_df):
    data = figures.slice_stacked(emissions_df)
    categories = {row["category"] for row in data}
    assert "uncategorized" in categories

    points = figures.slice_bubble(emissions_df)
    assert any(point.category == "uncategorized" for point in points)

    sankey = figures.slice_sankey(emissions_df)
    assert any(link["category"] == "uncategorized" for link in sankey["links"])
