from calc.citations import load_citations


def test_citation_ordering():
    citations = load_citations(["coffee", "streaming"])
    assert citations == ["[1] Coffee reference.", "[2] Streaming reference."]
