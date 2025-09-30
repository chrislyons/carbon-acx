from __future__ import annotations

import math

import pandas as pd
import pytest

from calc.derive import build_intensity_matrix
from calc.schema import (
    Activity,
    ActivityFunctionalUnitMap,
    ActivitySchedule,
    EmissionFactor,
    FunctionalUnit,
    FunctionalUnitDomain,
    LayerId,
    Profile,
)


@pytest.fixture
def person_km_dataset():
    functional_unit = FunctionalUnit(
        functional_unit_id="FU.PERSON_KM",
        name="Person-kilometre",
        domain=FunctionalUnitDomain.MOBILITY,
    )

    activities = [
        Activity(
            activity_id="TRAN.SCHOOLRUN.CAR.KM",
            layer_id=LayerId.PROFESSIONAL,
            name="School run by car",
            default_unit="km",
        ),
        Activity(
            activity_id="TRAN.SCHOOLRUN.BIKE.KM",
            layer_id=LayerId.PROFESSIONAL,
            name="School run by bike",
            default_unit="km",
        ),
    ]

    emission_factors = [
        EmissionFactor(
            activity_id="TRAN.SCHOOLRUN.CAR.KM",
            unit="km",
            value_g_per_unit=200.0,
            uncert_low_g_per_unit=150.0,
            uncert_high_g_per_unit=250.0,
            source_id="SRC.DEMO",
            scope_boundary="WTT+TTW",
        ),
        EmissionFactor(
            activity_id="TRAN.SCHOOLRUN.BIKE.KM",
            unit="km",
            value_g_per_unit=15.0,
            source_id="SRC.DIMPACT.2021",
            scope_boundary="WTT+TTW",
        ),
    ]

    profiles = [
        Profile(profile_id="ALT.CAR1", layer_id=LayerId.PROFESSIONAL),
        Profile(profile_id="ALT.CAR2", layer_id=LayerId.PROFESSIONAL),
        Profile(profile_id="ALT.BIKE", layer_id=LayerId.PROFESSIONAL),
    ]

    schedules = [
        ActivitySchedule(
            profile_id="ALT.CAR1",
            activity_id="TRAN.SCHOOLRUN.CAR.KM",
            layer_id=LayerId.PROFESSIONAL,
            freq_per_day=1.0,
            distance_km=4.0,
            passengers=1.2,
        ),
        ActivitySchedule(
            profile_id="ALT.CAR2",
            activity_id="TRAN.SCHOOLRUN.CAR.KM",
            layer_id=LayerId.PROFESSIONAL,
            freq_per_week=5.0,
            distance_km=6.0,
            passengers=1.5,
        ),
        ActivitySchedule(
            profile_id="ALT.BIKE",
            activity_id="TRAN.SCHOOLRUN.BIKE.KM",
            layer_id=LayerId.PROFESSIONAL,
            freq_per_day=1.0,
            distance_km=3.0,
        ),
    ]

    mappings = [
        ActivityFunctionalUnitMap(
            activity_id="TRAN.SCHOOLRUN.CAR.KM",
            functional_unit_id="FU.PERSON_KM",
            conversion_formula="fu = distance_km * passengers",
        ),
        ActivityFunctionalUnitMap(
            activity_id="TRAN.SCHOOLRUN.BIKE.KM",
            functional_unit_id="FU.PERSON_KM",
            conversion_formula="fu = distance_km * 1",
        ),
    ]

    return {
        "functional_units": [functional_unit],
        "activities": activities,
        "emission_factors": emission_factors,
        "profiles": profiles,
        "schedules": schedules,
        "mappings": mappings,
    }


def test_intensity_matrix_person_km_rows(tmp_path, person_km_dataset):
    df = build_intensity_matrix(
        fu_id="FU.PERSON_KM",
        output_dir=tmp_path,
        emission_factors=person_km_dataset["emission_factors"],
        activity_fu_map=person_km_dataset["mappings"],
        functional_units=person_km_dataset["functional_units"],
        profiles=person_km_dataset["profiles"],
        activity_schedule=person_km_dataset["schedules"],
        activities=person_km_dataset["activities"],
    )

    subset = df[df["functional_unit_id"] == "FU.PERSON_KM"]
    assert len(subset) >= 3

    car_row = subset[subset["alt_id"] == "ALT.CAR1"].iloc[0]
    assert math.isclose(car_row["intensity_g_per_fu"], 200.0 * (4 / (4 * 1.2)), rel_tol=1e-6)
    assert math.isclose(car_row["intensity_low_g_per_fu"], 150.0 * (4 / (4 * 1.2)), rel_tol=1e-6)
    assert math.isclose(car_row["intensity_high_g_per_fu"], 250.0 * (4 / (4 * 1.2)), rel_tol=1e-6)

    expected_fu = 4.0 * 1.2 * 365
    assert math.isclose(car_row["annual_fu"], expected_fu, rel_tol=1e-6)
    assert math.isclose(car_row["annual_kg"], expected_fu * car_row["intensity_g_per_fu"] / 1000, rel_tol=1e-6)
    assert car_row["source_ids_csv"] == "SRC.DEMO"

    csv_path = tmp_path / "intensity_matrix.csv"
    assert csv_path.exists()
    parsed = pd.read_csv(csv_path)
    assert "intensity_g_per_fu" in parsed.columns

    references_path = tmp_path / "references" / "intensity_refs.txt"
    assert references_path.exists()
    references = references_path.read_text().strip().splitlines()
    assert references
    assert references[0].startswith("[1]")
