import pandas as pd

from calc import schema
from calc.schema import LayerId, RegionCode


def test_provincial_professional_profiles_present():
    profiles = schema.load_profiles()
    index = {profile.profile_id: profile for profile in profiles}

    expected_profiles = {
        RegionCode.CA_QC: (
            "PRO.QC.24_39.HYBRID.2025",
            "PRO.QC.40_56.HYBRID.2025",
        ),
        RegionCode.CA_AB: (
            "PRO.AB.24_39.HYBRID.2025",
            "PRO.AB.40_56.HYBRID.2025",
        ),
        RegionCode.CA_BC: (
            "PRO.BC.24_39.HYBRID.2025",
            "PRO.BC.40_56.HYBRID.2025",
        ),
    }

    for region, profile_ids in expected_profiles.items():
        for profile_id in profile_ids:
            assert profile_id in index, f"missing profile {profile_id}"
            profile = index[profile_id]
            assert profile.layer_id == LayerId.PROFESSIONAL
            assert profile.default_grid_region == region


def test_grid_sources_registered():
    grid_rows = schema.load_grid_intensity()
    tracked_regions = {
        RegionCode.CA_QC,
        RegionCode.CA_AB,
        RegionCode.CA_BC,
    }
    source_ids = {
        row.source_id
        for row in grid_rows
        if row.region in tracked_regions and row.source_id is not None
    }

    assert source_ids, "expected regional grid sources to be registered"

    sources_df = pd.read_csv(schema.DATA_DIR / "sources.csv", dtype=str)
    registered_sources = set(sources_df["source_id"].dropna())

    missing = source_ids - registered_sources
    assert not missing, f"unregistered source ids: {sorted(missing)}"
