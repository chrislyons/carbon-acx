import itertools
import math

from calc import derive, schema
from calc.schema import ActivitySchedule, LayerId, Profile, RegionCode


ONLINE_ACTIVITIES = (
    "MEDIA.STREAM.HD.HOUR.TV",
    "CONF.HD.PARTICIPANT_HOUR",
    "CLOUD.DOWNLOAD.GB",
    "SOCIAL.SCROLL.HOUR.MOBILE",
    "AI.LLM.INFER.1K_TOKENS.GENERIC",
)

PROVINCES = (
    RegionCode.CA_ON,
    RegionCode.CA_QC,
    RegionCode.CA_AB,
    RegionCode.CA_BC,
)


def _latest_grid_lookup():
    lookup: dict[object, float] = {}
    for row in schema.load_grid_intensity():
        if row.intensity_g_per_kwh is None:
            continue
        lookup[row.region] = float(row.intensity_g_per_kwh)
        if hasattr(row.region, "value"):
            lookup[row.region.value] = float(row.intensity_g_per_kwh)
    return lookup


def test_grid_indexed_online_activities_scale_with_provincial_intensity():
    grid_lookup = _latest_grid_lookup()
    intensity_by_region = {
        region: grid_lookup[region] for region in PROVINCES if region in grid_lookup
    }
    assert set(intensity_by_region.keys()) == set(PROVINCES)

    emission_factors = {ef.activity_id: ef for ef in schema.load_emission_factors()}

    for activity_id in ONLINE_ACTIVITIES:
        ef = emission_factors[activity_id]
        emissions = {}
        for region in PROVINCES:
            profile = Profile(
                profile_id=f"TEST.{region.value}",
                layer_id=LayerId.ONLINE,
                region_code_default=region,
            )
            schedule = ActivitySchedule(
                profile_id=profile.profile_id,
                activity_id=activity_id,
                layer_id=LayerId.ONLINE,
                freq_per_day=1,
            )
            emission = derive.compute_emission(schedule, profile, ef, grid_lookup)
            assert emission is not None
            emissions[region] = emission

        # Annual totals must vary with grid intensity for the same activity
        values = list(emissions.values())
        assert len({round(val, 6) for val in values}) > 1

        for province_a, province_b in itertools.combinations(PROVINCES, 2):
            ratio_emissions = emissions[province_a] / emissions[province_b]
            ratio_intensity = intensity_by_region[province_a] / intensity_by_region[province_b]
            assert math.isclose(ratio_emissions, ratio_intensity, rel_tol=1e-6)
