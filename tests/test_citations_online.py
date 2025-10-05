import pandas as pd

from calc import citations, derive, schema
from calc.api import collect_activity_source_keys
from calc.schema import ActivitySchedule, LayerId, Profile, RegionCode

ONLINE_ACTIVITY_SOURCES = {
    "MEDIA.STREAM.HD.HOUR.TV": "SRC.DIMPACT.2021",
    "CONF.HD.PARTICIPANT_HOUR": "SRC.NETFLIX.SR.2023",
    "CLOUD.DOWNLOAD.GB": "SRC.SCOPE3.DATA_TRANSFER.2024",
    "SOCIAL.SCROLL.HOUR.MOBILE": "SRC.DIMPACT.2021",
    "AI.LLM.INFER.1K_TOKENS.GENERIC": "SRC.LBNL.DC.2024",
}

PROVINCES = (
    RegionCode.CA_ON,
    RegionCode.CA_QC,
    RegionCode.CA_AB,
    RegionCode.CA_BC,
)


def _latest_grid_rows() -> dict[RegionCode, schema.GridIntensity]:
    latest: dict[RegionCode, schema.GridIntensity] = {}
    for row in schema.load_grid_intensity():
        if not isinstance(row.region, RegionCode):
            continue
        current = latest.get(row.region)
        year = row.vintage_year or 0
        if current is None or (current.vintage_year or 0) <= year:
            latest[row.region] = row
    return latest


def test_online_emission_factors_have_registered_sources():
    activities = {activity.activity_id: activity for activity in schema.load_activities()}
    emission_factors = {ef.activity_id: ef for ef in schema.load_emission_factors()}

    sources_df = pd.read_csv(schema.DATA_DIR / "sources.csv", dtype=str)
    registered_sources = set(sources_df["source_id"].dropna())

    for activity_id, expected_source in ONLINE_ACTIVITY_SOURCES.items():
        assert activity_id in activities
        assert activity_id in emission_factors

        activity = activities[activity_id]
        assert activity.layer_id == LayerId.ONLINE

        ef = emission_factors[activity_id]
        assert ef.source_id == expected_source
        assert expected_source in registered_sources

        refs = citations.references_for([expected_source])
        assert refs and refs[0].key == expected_source


def test_dynamic_online_figures_reference_expected_sources():
    activities = {activity.activity_id: activity for activity in schema.load_activities()}
    emission_factors = {ef.activity_id: ef for ef in schema.load_emission_factors()}
    grid_rows = _latest_grid_rows()
    assert set(grid_rows.keys()) >= set(PROVINCES)

    schedules: list[ActivitySchedule] = []
    profile_regions: dict[str, RegionCode] = {}
    profiles: dict[str, Profile] = {}

    for region in PROVINCES:
        profile = Profile(
            profile_id=f"TEST.{region.value}",
            layer_id=LayerId.ONLINE,
            default_grid_region=region,
        )
        profile_regions[profile.profile_id] = region
        profiles[profile.profile_id] = profile
        for activity_id in ONLINE_ACTIVITY_SOURCES:
            schedules.append(
                ActivitySchedule(
                    profile_id=profile.profile_id,
                    activity_id=activity_id,
                    layer_id=LayerId.ONLINE,
                    freq_per_day=1,
                )
            )

    grid_lookup: dict[RegionCode | str, float | None] = {}
    for region, grid_row in grid_rows.items():
        grid_lookup[region] = grid_row.intensity_g_per_kwh
        if hasattr(region, "value"):
            grid_lookup[region.value] = grid_row.intensity_g_per_kwh

    rows = []
    for schedule in schedules:
        activity = activities[schedule.activity_id]
        assert activity.layer_id == LayerId.ONLINE
        ef = emission_factors[schedule.activity_id]
        region = profile_regions[schedule.profile_id]
        grid_row = grid_rows[region]
        emission = derive.compute_emission(
            schedule,
            profiles[schedule.profile_id],
            ef,
            grid_lookup,
        )
        assert emission is not None
        rows.append(
            {
                "annual_emissions_g": emission,
                "emission_factor": ef,
                "grid_intensity": grid_row,
            }
        )

    citation_keys = collect_activity_source_keys(rows)

    expected_sources = set(ONLINE_ACTIVITY_SOURCES.values())
    expected_sources.update(
        grid_rows[region].source_id
        for region in PROVINCES
        if grid_rows[region].source_id is not None
    )

    assert citation_keys == expected_sources
    for key in citation_keys:
        refs = citations.references_for([key])
        assert refs and refs[0].key == key
