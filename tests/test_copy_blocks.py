from pathlib import Path

from calc import copy_blocks


def test_disclosure_markdown_includes_manifest_values(tmp_path: Path) -> None:
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        "{"
        '"generated_at": "2024-05-01T12:00:00Z",'
        ' "regions": ["Region A", "Region B"],'
        ' "sources": ["SRC.1", "SRC.2"]'
        "}",
        encoding="utf-8",
    )
    manifest = copy_blocks.load_manifest(manifest_path)

    markdown = copy_blocks.disclosure_markdown(manifest)

    assert "**Latest snapshot:** 2024-05-01T12:00:00Z" in markdown
    assert "**Regions:** Region A, Region B" in markdown
    assert "**Total sources:** 2" in markdown


def test_na_markdown_matches_expected_copy() -> None:
    markdown = copy_blocks.na_markdown()
    assert 'Sectors labelled "NA"' in markdown
    assert markdown.endswith("\n")
