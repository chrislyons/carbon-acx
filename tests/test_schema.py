import pytest
from pydantic import ValidationError

from calc.schema import EmissionFactor


def test_fixed_vs_grid_mutual_exclusion():
    EmissionFactor(activity_id="coffee", value_g_per_unit=1)
    EmissionFactor(
        activity_id="stream",
        is_grid_indexed=True,
        electricity_kwh_per_unit=1,
    )
    with pytest.raises(ValidationError):
        EmissionFactor(
            activity_id="bad",
            value_g_per_unit=1,
            is_grid_indexed=True,
            electricity_kwh_per_unit=1,
        )
    with pytest.raises(ValidationError):
        EmissionFactor(activity_id="none")
    with pytest.raises(ValidationError):
        EmissionFactor(activity_id="half", is_grid_indexed=True)
    with pytest.raises(ValidationError):
        EmissionFactor(activity_id="half2", electricity_kwh_per_unit=1)
