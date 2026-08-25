from __future__ import annotations

from pathlib import Path

import pytest

from calc import refs_util
from tools.citations import scan_claims


MANIFEST_HEADER = (
    "stream_id,dataset_path,schema_version,record_key,transport,cadence,retention,"
    "timestamp_policy,null_policy,provenance_columns,source_columns,derived_from,"
    "publication_surfaces\n"
)


@pytest.fixture()
def inventory_fixture(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "records.csv").write_text(
        "record_id,source_id,value\nrow-1,SRC.TEST,1\n", encoding="utf-8"
    )
    (data_dir / "sources.csv").write_text(
        "source_id,ieee_citation,url,year,license,review_due_at\n"
        "SRC.TEST,Test citation,https://example.test/source,2026,CC BY 4.0,2027-08-17\n",
        encoding="utf-8",
    )
    owid_dir = data_dir / "owid"
    owid_dir.mkdir()
    (owid_dir / "manifest.json").write_text(
        '{"chartId":"chart","entityCode":"CAN","sourceId":"SRC.TEST"}\n',
        encoding="utf-8",
    )
    (data_dir / "source_decisions.csv").write_text(
        "dataset_path,record_id,source_id,decision,reason,evidence_sha256,"
        "replacement_record_id,replacement_source_id,replacement_value_sha256,"
        "reviewed_at,reviewer,affected_outputs\n"
        + "\n".join(
            [
                "sources.csv,SRC.TEST,SRC.TEST,verified,fixture,"
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,,,"
                "2026-08-17T00:00:00+00:00,fixture,web-sources",
                "records.csv,row-1,SRC.TEST,verified,fixture,"
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,,,"
                "2026-08-17T00:00:00+00:00,fixture,derive",
                "owid/manifest.json,chart|CAN,SRC.TEST,verified,fixture,"
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,,,"
                "2026-08-17T00:00:00+00:00,fixture,owid-context",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (tmp_path / "ledger.csv").write_text(
        "source_id,sha256\nSRC.TEST,"
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
        encoding="utf-8",
    )
    (data_dir / "dataflow_manifest.csv").write_text(
        MANIFEST_HEADER
        + 'acx.records,records.csv,acx.records/1-0-0,record_id,repository-csv,release-gated,git-history,none,blank,"record_id=structural|source_id=structural|value=external",source_id,,derive\n'
        + 'acx.sources,sources.csv,acx.sources/1-0-0,source_id,repository-csv,release-gated,git-history,iso-date,blank,"source_id=structural|ieee_citation=external|url=external|year=external|license=external|review_due_at=external",, ,web-sources\n'
        + 'acx.owid-source,owid/manifest.json,acx.owid-source/1-0-0,chartId|entityCode,repository-json,manual-snapshot,git-history,rfc3339-utc,blank,"chartId=structural|entityCode=structural|sourceId=structural",sourceId,,owid-context\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(scan_claims, "DATA_DIR", data_dir)
    monkeypatch.setattr(scan_claims, "MANIFEST_PATH", data_dir / "dataflow_manifest.csv")
    monkeypatch.setattr(scan_claims, "SOURCES_PATH", data_dir / "sources.csv")
    monkeypatch.setattr(scan_claims, "DECISIONS_PATH", data_dir / "source_decisions.csv")
    monkeypatch.setattr(refs_util, "MANIFEST_PATH", tmp_path / "ledger.csv")
    monkeypatch.setattr(scan_claims, "SITE_ARTIFACTS_DIR", tmp_path / "site-artifacts")
    monkeypatch.setattr(scan_claims, "ARTIFACTS_DIR", tmp_path / "artifacts")
    return data_dir


def test_manifest_inventory_passes_clean_fixture(inventory_fixture: Path) -> None:
    report, errors = scan_claims.run_scan("2026-08-17")
    assert not errors
    assert {dataset.name for dataset in report.datasets} == {
        "records.csv",
        "sources.csv",
        "owid/manifest.json",
    }


def test_duplicate_record_key_fails_with_path_and_key(inventory_fixture: Path) -> None:
    path = inventory_fixture / "records.csv"
    path.write_text(
        "record_id,source_id,value\nrow-1,SRC.TEST,1\nrow-1,SRC.TEST,2\n",
        encoding="utf-8",
    )
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("records.csv" in error and "row-1" in error for error in errors)


def test_undeclared_root_csv_fails(inventory_fixture: Path) -> None:
    (inventory_fixture / "undeclared.csv").write_text("record_id\nrow-2\n", encoding="utf-8")
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("undeclared.csv" in error for error in errors)


def test_unregistered_source_id_fails(inventory_fixture: Path) -> None:
    path = inventory_fixture / "records.csv"
    path.write_text("record_id,source_id,value\nrow-1,SRC.UNKNOWN,1\n", encoding="utf-8")
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("records.csv" in error and "SRC.UNKNOWN" in error for error in errors)


def test_header_order_drift_fails(inventory_fixture: Path) -> None:
    path = inventory_fixture / "records.csv"
    path.write_text("source_id,record_id,value\nSRC.TEST,row-1,1\n", encoding="utf-8")
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any(
        "header must exactly match provenance_columns field order" in error for error in errors
    )


def test_noncanonical_null_literal_fails(inventory_fixture: Path) -> None:
    path = inventory_fixture / "records.csv"
    path.write_text("record_id,source_id,value\nrow-1,SRC.TEST,N/A\n", encoding="utf-8")
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("noncanonical null literal in value" in error for error in errors)


def test_invalid_stream_metadata_fails(inventory_fixture: Path) -> None:
    manifest_path = inventory_fixture / "dataflow_manifest.csv"
    manifest_path.write_text(
        manifest_path.read_text(encoding="utf-8").replace("repository-csv", "network-csv", 1),
        encoding="utf-8",
    )
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("invalid transport: network-csv" in error for error in errors)


def test_report_is_opt_in(inventory_fixture: Path, tmp_path: Path) -> None:
    report_path = tmp_path / "inventory.md"
    assert scan_claims.main(["--as-of", "2026-08-17", "--report", str(report_path)]) == 0
    assert report_path.exists()
    assert "records.csv" in report_path.read_text(encoding="utf-8")


def test_missing_source_decision_fails_closed(inventory_fixture: Path) -> None:
    decisions = inventory_fixture / "source_decisions.csv"
    lines = decisions.read_text(encoding="utf-8").splitlines()
    decisions.write_text(
        "\n".join(line for line in lines if not line.startswith("records.csv,row-1,")) + "\n",
        encoding="utf-8",
    )
    _, errors = scan_claims.run_scan("2026-08-17")
    assert any("Missing source decisions" in error for error in errors)
