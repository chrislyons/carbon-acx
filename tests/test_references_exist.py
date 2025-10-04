from calc import citations
from calc.dal import choose_backend


def test_emission_factor_sources_have_references():
    store = choose_backend(backend="csv")
    emission_factors = store.load_emission_factors()
    keys = sorted({ef.source_id for ef in emission_factors if getattr(ef, "source_id", None)})
    references = citations.references_for(keys)
    assert len(references) == len(keys)
