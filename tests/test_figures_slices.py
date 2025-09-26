import pandas as pd

from calc import figures


def _build_df():
    return pd.DataFrame(
        [
            {
                "activity_id": "a1",
                "activity_name": "Laptop",
                "activity_category": "Devices",
                "annual_emissions_g": 10.0,
                "annual_emissions_g_low": 9.0,
                "annual_emissions_g_high": 12.0,
            },
            {
                "activity_id": "a2",
                "activity_name": "",
                "activity_category": "Travel",
                "annual_emissions_g": 5.0,
                "annual_emissions_g_low": 4.0,
                "annual_emissions_g_high": 6.0,
            },
            {
                "activity_id": "a1",
                "activity_name": "Laptop",
                "activity_category": "Devices",
                "annual_emissions_g": 3.0,
                "annual_emissions_g_low": None,
                "annual_emissions_g_high": None,
            },
        ]
    )


def test_slice_stacked_groups_by_category():
    df = _build_df()
    data = figures.slice_stacked(df)
    assert data[0]["category"] == "Devices"
    assert data[0]["values"]["mean"] == 13.0
    assert data[0]["values"]["low"] == 9.0
    assert "high" in data[0]["values"]


def test_slice_bubble_sums_by_activity():
    df = _build_df()
    points = figures.slice_bubble(df)
    by_id = {point.activity_id: point for point in points}
    assert by_id["a1"].values["mean"] == 13.0
    assert by_id["a1"].values["low"] == 9.0
    assert by_id["a2"].activity_name == "a2"


def test_slice_sankey_links_include_bounds():
    df = _build_df()
    payload = figures.slice_sankey(df)
    assert payload["links"][0]["values"]["mean"] == 13.0
    assert payload["links"][0]["values"]["low"] == 9.0
    assert payload["links"][0]["category"] == "Devices"
