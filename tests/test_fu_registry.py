import pytest

from calc import schema
from calc.derive import evaluate_functional_unit_formula


def test_functional_units_seeded():
    units = schema.load_functional_units()
    ids = {unit.functional_unit_id for unit in units}
    assert {"FU.PERSON_KM", "FU.LITRE_DELIVERED", "FU.VIEW_HOUR"}.issubset(ids)


def test_activity_fu_map_validates_references():
    mappings = schema.load_activity_fu_map()
    pairs = {(mapping.activity_id, mapping.functional_unit_id) for mapping in mappings}
    assert (
        ("TRAN.SCHOOLRUN.CAR.KM", "FU.PERSON_KM") in pairs
        and ("TRAN.SCHOOLRUN.BIKE.KM", "FU.PERSON_KM") in pairs
        and ("MEDIA.STREAM.HD.HOUR", "FU.VIEW_HOUR") in pairs
    )


def test_activity_fu_map_rejects_unknowns():
    with pytest.raises(ValueError):
        schema.load_activity_fu_map(activities=[])
    with pytest.raises(ValueError):
        schema.load_activity_fu_map(functional_units=[])


@pytest.mark.parametrize(
    "variables,expected",
    [({"distance_km": 5, "passengers": 1.5}, 7.5), ({"distance_km": 5}, None)],
)
def test_evaluate_functional_unit_formula(variables, expected):
    formula = "fu = distance_km * passengers"
    assert evaluate_functional_unit_formula(formula, variables) == expected
