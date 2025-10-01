import pytest
from datetime import date
from pydantic import ValidationError

from calc import schema
from calc.schema import Activity, ActivitySchedule, EmissionFactor, LayerId, Profile


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


def test_uncert_bounds_and_vintage_year():
    current_year = date.today().year
    EmissionFactor(
        activity_id="ok",
        value_g_per_unit=5,
        uncert_low_g_per_unit=1,
        uncert_high_g_per_unit=10,
        vintage_year=current_year,
    )
    with pytest.raises(ValidationError):
        EmissionFactor(
            activity_id="bad_bounds",
            value_g_per_unit=5,
            uncert_low_g_per_unit=6,
            uncert_high_g_per_unit=7,
        )
    with pytest.raises(ValidationError):
        EmissionFactor(
            activity_id="future",
            value_g_per_unit=1,
            vintage_year=current_year + 1,
        )


def test_schedule_freq_mutual_exclusion():
    ActivitySchedule(
        profile_id="p",
        activity_id="a",
        layer_id=LayerId.PROFESSIONAL,
        freq_per_day=1,
    )
    ActivitySchedule(
        profile_id="p",
        activity_id="b",
        layer_id=LayerId.PROFESSIONAL,
        freq_per_week=1,
    )
    with pytest.raises(ValidationError):
        ActivitySchedule(
            profile_id="p",
            activity_id="c",
            layer_id=LayerId.PROFESSIONAL,
            freq_per_day=1,
            freq_per_week=1,
        )


def test_region_and_scope_literals():
    EmissionFactor(
        activity_id="region_ok",
        value_g_per_unit=1,
        region="CA-ON",
        scope_boundary="gate-to-gate",
    )
    with pytest.raises(ValidationError):
        EmissionFactor(activity_id="bad_region", value_g_per_unit=1, region="US-CA")
    with pytest.raises(ValidationError):
        EmissionFactor(
            activity_id="bad_scope",
            value_g_per_unit=1,
            scope_boundary="bad",
        )


def test_units_registry_validation():
    Activity(activity_id="a", layer_id=LayerId.PROFESSIONAL, default_unit="km")
    with pytest.raises(ValidationError):
        Activity(activity_id="b", layer_id=LayerId.PROFESSIONAL, default_unit="badunit")

    EmissionFactor(activity_id="c", unit="hour", value_g_per_unit=1)
    with pytest.raises(ValidationError):
        EmissionFactor(activity_id="d", unit="badunit", value_g_per_unit=1)


def test_layer_id_validation():
    Profile(profile_id="p", layer_id=LayerId.PROFESSIONAL)
    with pytest.raises(ValidationError):
        Profile(profile_id="bad", layer_id="student")


def test_online_emission_factors_are_grid_indexed():
    activities = {activity.activity_id: activity for activity in schema.load_activities()}
    current_year = date.today().year

    for ef in schema.load_emission_factors():
        activity = activities.get(ef.activity_id)
        if activity is None or activity.layer_id != LayerId.ONLINE:
            continue

        assert ef.scope_boundary == "Operational electricity"
        assert ef.unit == activity.default_unit

        if ef.is_grid_indexed:
            assert ef.value_g_per_unit is None
            assert ef.electricity_kwh_per_unit is not None
            assert ef.electricity_kwh_per_unit > 0
        else:
            assert ef.value_g_per_unit is not None
            assert ef.electricity_kwh_per_unit is None

        if ef.vintage_year is not None:
            assert ef.vintage_year <= current_year
        else:
            pytest.fail(f"Online EF for {ef.activity_id} is missing a vintage year")
