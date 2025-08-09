from calc import citations


def test_citation_mapping(tmp_path):
    cfg = {"fig": ["Ref A", "Ref B"]}
    result = citations.create_citations(tmp_path, cfg)
    mapping = result["fig"]
    assert list(mapping.keys()) == [1, 2]
    lines = (tmp_path / "fig.txt").read_text().splitlines()
    assert lines[0] == "[1] Ref A"
    assert lines[1] == "[2] Ref B"
