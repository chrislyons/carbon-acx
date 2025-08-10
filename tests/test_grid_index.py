from calc.derive import get_grid_intensity
from calc.schema import Profile


def test_grid_precedence():
    profile = Profile(profile_id="p1", default_grid_region="CA-ON")
    grid = {
        "CA-AB": 1,
        "CA-BC": 2,
        "CA": 3,
        "CA-ON": 4,
    }
    assert get_grid_intensity(profile, grid, region_override="CA-AB") == 1
    assert get_grid_intensity(profile, grid, mix_region="CA-BC") == 2
    assert get_grid_intensity(profile, grid, use_canada_average=True) == 3
    assert get_grid_intensity(profile, grid) == 4
