from __future__ import annotations

from pathlib import Path

from scripts.build_site import build_site


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "artifacts_minimal"


def test_static_site_builds_index(tmp_path) -> None:
    output_dir = tmp_path / "site"

    index_path = build_site(FIXTURE_DIR, output_dir)

    assert index_path.exists()
    assert index_path.parent == output_dir

    html = index_path.read_text(encoding="utf-8")

    assert "Carbon ACX emissions overview" in html
    assert "Annual emissions by activity category" in html
    assert "Activity bubble chart" in html
    assert "Activity flow" in html
    assert '<aside class="references-panel">' in html

    styles_path = output_dir / "styles.css"
    assert styles_path.exists(), "Expected styles.css to be copied alongside the build output"
