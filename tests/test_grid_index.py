from calc.derive import get_grid_intensity
from calc.schema import Profile


def test_grid_precedence():
    profile = Profile(profile_id="p1", default_grid_region="profile_region")
    grid = {
        "override_region": 1,
        "mix_region": 2,
        "canada_average": 3,
        "profile_region": 4,
    }
    assert get_grid_intensity(profile, grid, region_override="override_region") == 1
    assert get_grid_intensity(profile, grid, mix_region="mix_region") == 2
    assert get_grid_intensity(profile, grid, use_canada_average=True) == 3
    assert get_grid_intensity(profile, grid) == 4
