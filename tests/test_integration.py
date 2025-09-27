import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import calc.derive as derive_mod
import calc.figures as figures
from calc.schema import (
    Activity,
    ActivitySchedule,
    EmissionFactor,
    GridIntensity,
    LayerId,
    Profile,
    RegionCode,
)


class FrozenDateTime:
    _fixed = datetime(2024, 1, 2, 3, 4, 5, tzinfo=timezone.utc)

    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return cls._fixed
        return cls._fixed.astimezone(tz)


def _patch_time(monkeypatch):
    monkeypatch.setattr(derive_mod, "datetime", FrozenDateTime)
    monkeypatch.setattr(derive_mod.figures, "datetime", FrozenDateTime)
    monkeypatch.setattr(figures, "datetime", FrozenDateTime)


class GoldenStore:
    def load_emission_factors(self):
        return [
            EmissionFactor(
                activity_id="coffee",
                value_g_per_unit=2.0,
                source_id="coffee",
                vintage_year=2022,
            ),
            EmissionFactor(
                activity_id="stream",
                is_grid_indexed=True,
                electricity_kwh_per_unit=0.25,
                source_id="streaming",
                vintage_year=2023,
            ),
        ]

    def load_profiles(self):
        return [
            Profile(
                profile_id="p1",
                layer_id=LayerId.PROFESSIONAL,
                office_days_per_week=5,
                default_grid_region=RegionCode.CA_ON,
            )
        ]

    def load_activity_schedule(self):
        return [
            ActivitySchedule(
                profile_id="p1",
                activity_id="coffee",
                layer_id=LayerId.PROFESSIONAL,
                freq_per_week=5,
            ),
            ActivitySchedule(
                profile_id="p1",
                activity_id="stream",
                layer_id=LayerId.PROFESSIONAL,
                freq_per_day=2,
                region_override=RegionCode.CA_ON,
            ),
        ]

    def load_grid_intensity(self):
        return [
            GridIntensity(
                region=RegionCode.CA_ON,
                intensity_g_per_kwh=100,
                intensity_low_g_per_kwh=90,
                intensity_high_g_per_kwh=110,
                source_id="SRC.IESO.2024",
                vintage_year=2024,
            )
        ]

    def load_activities(self):
        return [
            Activity(
                activity_id="coffee",
                layer_id=LayerId.PROFESSIONAL,
                name="Coffee",
                category="Food",
            ),
            Activity(
                activity_id="stream",
                layer_id=LayerId.PROFESSIONAL,
                name="Streaming",
                category="Digital",
            ),
        ]


def _normalise(value):
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, list):
        return [_normalise(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalise(val) for key, val in value.items()}
    return value


def test_export_view_matches_golden(monkeypatch):
    figures.invalidate_cache()
    _patch_time(monkeypatch)

    out_dir = Path("calc/outputs")
    if out_dir.exists():
        shutil.rmtree(out_dir)

    try:
        derive_mod.export_view(GoldenStore())
        payload = json.loads((out_dir / "export_view.json").read_text())
    finally:
        if out_dir.exists():
            shutil.rmtree(out_dir)
        figures.invalidate_cache()

    golden_path = Path("tests/fixtures/export_view.golden.json")
    golden_payload = json.loads(golden_path.read_text())

    assert _normalise(payload) == golden_payload
