from pathlib import Path
import csv
import re

from calc import citations


def test_citation_ordering():
    refs = citations.references_for(["SRC.POORE2018", "SRC.DIMPACT.2021"])
    formatted = [citations.format_ieee(ref.numbered(idx)) for idx, ref in enumerate(refs, start=1)]
    assert [ref.key for ref in refs] == ["SRC.POORE2018", "SRC.DIMPACT.2021"]
    assert formatted[0].startswith("[1] J. Poore and T. Nemecek")
    assert formatted[1].startswith("[2] Carbon Trust and DIMPACT")


def test_format_ieee_strips_existing_numbers():
    ref = citations.Reference(key="demo", citation="[4] Demo reference.").numbered(7)
    assert citations.format_ieee(ref) == "[7] Demo reference."


def test_components_do_not_embed_ieee_citations():
    component_dir = Path("app/components")
    pattern = re.compile(r"\[\d+\]")
    for path in component_dir.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert pattern.search(source) is None, f"{path} should not inline citations"


def test_canonical_registry_has_no_embedded_numbers():
    registry = Path("data/sources.csv")
    with registry.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows
    offenders = [
        row["source_id"]
        for row in rows
        if citations.has_embedded_number(row.get("ieee_citation", ""))
    ]
    assert not offenders, (
        "Citation numbers must be derived per emitted reference set, not stored in "
        "the registry. Embedded numbers found for: " + ", ".join(offenders)
    )


def test_format_references_numbers_each_emitted_set_sequentially():
    keys = ["SRC.POORE2018", "SRC.DIMPACT.2021", "SRC.POORE2018"]
    formatted = citations.format_references(keys)
    assert len(formatted) == 2
    assert citations.validate_reference_numbering(formatted) == []
    assert formatted[0].startswith("[1]") and formatted[1].startswith("[2]")


def test_validate_reference_numbering_flags_gaps_and_duplicates():
    errors = citations.validate_reference_numbering(["[1] a", "[3] b", "c"])
    assert len(errors) == 2
    assert "reference 2" in errors[0]
    assert "reference 3" in errors[1]
