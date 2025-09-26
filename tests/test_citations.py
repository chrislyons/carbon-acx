from pathlib import Path
import re

from calc import citations


def test_citation_ordering():
    refs = citations.references_for(["coffee", "streaming"])
    formatted = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(refs, start=1)
    ]
    assert formatted == ["[1] Coffee reference.", "[2] Streaming reference."]


def test_format_ieee_strips_existing_numbers():
    ref = citations.Reference(key="demo", citation="[4] Demo reference.").numbered(7)
    assert citations.format_ieee(ref) == "[7] Demo reference."


def test_components_do_not_embed_ieee_citations():
    component_dir = Path("app/components")
    pattern = re.compile(r"\[\d+\]")
    for path in component_dir.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert pattern.search(source) is None, f"{path} should not inline citations"
