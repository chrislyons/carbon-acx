from pathlib import Path

import pytest
from pydantic import ValidationError

from calc import schema

DATA = Path("data")


def test_emission_factor_mutual_exclusion():
    df = schema.load_emission_factors(DATA / "emission_factors.csv")
    coffee = df[df["id"] == "coffee_ef"].iloc[0]
    stream = df[df["id"] == "stream_ef"].iloc[0]
    assert coffee["value_g_per_unit"] == 1
    assert coffee["is_grid_indexed"] is None
    assert stream["is_grid_indexed"] is True
    assert stream["value_g_per_unit"] is None


def test_bounds_both_or_null():
    with pytest.raises(ValidationError):
        schema.EmissionFactor.model_validate(
            {
                "id": "bad",
                "activity_id": "coffee",
                "source_id": "source1",
                "is_grid_indexed": False,
                "min_value_g_per_unit": 1,
            }
        )
