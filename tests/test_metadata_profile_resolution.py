import functools
import json
import shutil
from pathlib import Path

import calc.derive as derive_mod
import calc.figures as figures
from calc.schema import ActivitySchedule, EmissionFactor, GridIntensity, Profile


def test_export_metadata_reports_resolved_profiles(monkeypatch):
    figures.invalidate_cache()
    fake_loader = functools.lru_cache(maxsize=1)(lambda: {"default_profile": "WRONG"})
    monkeypatch.setattr(figures, "_load_config", fake_loader)
    monkeypatch.setattr(derive_mod.figures, "_load_config", fake_loader)

    class FakeStore:
        def load_emission_factors(self):
            return [EmissionFactor(activity_id="coffee", value_g_per_unit=1)]

        def load_profiles(self):
            return [Profile(profile_id="p1", office_days_per_week=3, default_grid_region="CA-ON")]

        def load_activity_schedule(self):
            return [
                ActivitySchedule(
                    profile_id="p1", activity_id="coffee", freq_per_week=5, office_days_only=True
                ),
            ]

        def load_grid_intensity(self):
            return [GridIntensity(region="CA-ON", intensity_g_per_kwh=100)]

        def load_activities(self):
            return []

    out_dir = Path("calc/outputs")
    if out_dir.exists():
        shutil.rmtree(out_dir)

    try:
        derive_mod.export_view(FakeStore())
        data = json.loads((out_dir / "export_view.json").read_text())
        assert data["profile"] == "p1"
        assert data["profile_resolution"] == {
            "requested": "WRONG",
            "used": ["p1"],
        }
        assert data["profile_resolution"]["requested"] != data["profile_resolution"]["used"][0]
    finally:
        figures.invalidate_cache()
