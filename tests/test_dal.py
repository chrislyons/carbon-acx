from calc.dal import CsvStore


def test_csv_store_loads():
    ds = CsvStore()
    acts = ds.load_activities()
    efs = ds.load_emission_factors()
    profs = ds.load_profiles()
    sched = ds.load_activity_schedule()
    grid = ds.load_grid_intensity()
    # Types: Pydantic models conforming to schema
    assert all(hasattr(a, "activity_id") for a in acts)
    assert all(hasattr(e, "activity_id") for e in efs)
    assert all(hasattr(p, "profile_id") for p in profs)
    assert all(hasattr(s, "activity_id") and hasattr(s, "profile_id") for s in sched)
    assert all(hasattr(g, "region") for g in grid)
