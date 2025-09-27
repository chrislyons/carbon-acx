from calc import schema
from calc.schema import RegionCode


def test_provincial_grid_vintage_matrix_complete():
    grid_rows = schema.load_grid_intensity()
    tracked_regions = (
        RegionCode.CA_QC,
        RegionCode.CA_AB,
        RegionCode.CA_BC,
    )
    expected_years = range(2021, 2026)

    matrix = {
        (row.region, row.vintage_year): row for row in grid_rows if row.vintage_year is not None
    }

    for region in tracked_regions:
        for year in expected_years:
            key = (region, year)
            assert key in matrix, f"missing grid intensity for {region.value} {year}"
            row = matrix[key]
            assert row.intensity_g_per_kwh is not None
            assert row.source_id

    ontario_rows = [
        row for row in grid_rows if row.region == RegionCode.CA_ON and row.vintage_year is not None
    ]
    assert ontario_rows, "expected at least one Ontario grid intensity row"
    latest_ontario = max(ontario_rows, key=lambda row: row.vintage_year)
    assert latest_ontario.vintage_year == 2025
    assert latest_ontario.source_id == "SRC.IESO.2025"

    qc_row = matrix[(RegionCode.CA_QC, 2025)]
    ab_row = matrix[(RegionCode.CA_AB, 2025)]
    bc_row = matrix[(RegionCode.CA_BC, 2025)]

    assert qc_row.source_id == "SRC.NIR.2025"

    qc_2025 = qc_row.intensity_g_per_kwh
    ab_2025 = ab_row.intensity_g_per_kwh
    bc_2025 = bc_row.intensity_g_per_kwh

    assert qc_2025 < latest_ontario.intensity_g_per_kwh
    assert bc_2025 < latest_ontario.intensity_g_per_kwh
    assert ab_2025 > latest_ontario.intensity_g_per_kwh
