import json

import calc.derive as derive_mod
from calc import schema


def test_manifest_includes_regions_and_vintage_matrix(derived_output_root):
    derive_mod.export_view(output_root=derived_output_root)

    manifest_path = derived_output_root / "calc" / "outputs" / "manifest.json"
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))

    regions = payload.get("regions")
    assert isinstance(regions, list) and regions, "expected regions in manifest"

    matrix = payload.get("vintage_matrix")
    assert isinstance(matrix, dict) and matrix, "expected vintage_matrix entries"

    reference_year = max(row.vintage_year or 0 for row in schema.load_grid_intensity())
    assert reference_year > 0

    for region, year in matrix.items():
        assert isinstance(region, str) and region
        assert isinstance(year, int)
        assert year <= reference_year
        assert region in regions
