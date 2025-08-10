from calc.derive import compute_emission, get_grid_intensity
from calc.schema import ActivitySchedule, EmissionFactor, Profile


def test_emission_calculation_and_nulls():
    profile = Profile(profile_id="p1", office_days_per_week=3, default_grid_region="CA-ON")
    grid = {"CA-ON": 100}
    assert get_grid_intensity(profile, grid) == 100

    ef_coffee = EmissionFactor(activity_id="coffee", value_g_per_unit=1)
    sched_coffee = ActivitySchedule(
        profile_id="p1", activity_id="coffee", quantity_per_week=5, office_only=True
    )
    emission = compute_emission(sched_coffee, profile, ef_coffee, grid)
    assert emission == 5 * 52 * (3 / 5) * 1

    ef_stream = EmissionFactor(
        activity_id="stream", is_grid_indexed=True, electricity_kwh_per_unit=1
    )
    sched_stream = ActivitySchedule(
        profile_id="p1", activity_id="stream", quantity_per_week=14, office_only=False
    )
    emission_stream = compute_emission(sched_stream, profile, ef_stream, grid)
    assert emission_stream == 14 * 52 * 100

    sched_null = ActivitySchedule(profile_id="p1", activity_id="stream", quantity_per_week=None)
    assert compute_emission(sched_null, profile, ef_stream, grid) is None
