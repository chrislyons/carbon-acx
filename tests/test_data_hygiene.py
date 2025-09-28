"""Data quality checks for placeholder content."""

from tools import check_placeholders


def test_no_banned_tokens_in_shipping_data() -> None:
    findings = check_placeholders.scan_data_files()
    assert not findings, "Shipping data contains placeholder tokens: " + "; ".join(
        f"{path.name}: {len(hits)}" for path, hits in sorted(findings.items())
    )
