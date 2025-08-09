from pathlib import Path

from calc import derive

DATA = Path("data")
CONFIG = Path("calc/config.yaml")


def test_calculation_and_null_propagation(tmp_path):
    export = derive.compute_export_view(DATA, tmp_path, CONFIG)
    coffee = export[export["activity_id"] == "coffee"].iloc[0]
    streaming = export[export["activity_id"] == "streaming"].iloc[0]
    unknown = export[export["activity_id"] == "unknown"].iloc[0]

    assert coffee["annual_frequency"] == 260
    assert coffee["annual_emission_g"] == 260

    assert streaming["annual_frequency"] == 365
    assert streaming["annual_emission_g"] == 36500

    assert unknown["annual_emission_g"] is None
