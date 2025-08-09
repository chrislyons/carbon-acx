from pathlib import Path

from calc import derive, schema

DATA = Path("data")


def test_grid_intensity_precedence():
    profiles = schema.load_profiles(DATA / "profiles.csv")
    grid = schema.load_grid_intensity(DATA / "grid_intensity.csv")
    assert derive.grid_intensity_value("p2", profiles, grid) == 10
    assert derive.grid_intensity_value("p3", profiles, grid) == 20
    assert derive.grid_intensity_value("p4", profiles, grid) == 30
    assert derive.grid_intensity_value("p1", profiles, grid) == 100
