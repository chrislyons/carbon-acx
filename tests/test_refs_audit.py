from __future__ import annotations

from dataclasses import replace
from datetime import date

from calc import refs_audit
from calc.refs_util import SourceCatalogEntry, hash_bytes


def _catalog() -> dict[str, SourceCatalogEntry]:
    return {
        "SRC.TEST": SourceCatalogEntry(
            source_id="SRC.TEST",
            url="https://example.test/source.txt",
            year="2024",
            license="Test license",
            review_due_at="2027-08-17",
        )
    }


def _row(payload: bytes = b"evidence") -> dict[str, str]:
    return {
        "source_id": "SRC.TEST",
        "src_url": "https://example.test/source.txt",
        "final_url": "https://example.test/source.txt",
        "http_status": "200",
        "content_type": "text/plain",
        "filesize_bytes": str(len(payload)),
        "sha256": hash_bytes(payload),
        "stored_as": "refs/raw/SRC.TEST.txt",
        "license_note": "Test license",
        "fetched_at": "2026-08-17T00:00:00+00:00",
        "normalized_md": "",
        "normalized_sha256": "",
        "verification_run_url": "https://github.com/example/repo/actions/runs/123",
        "raw_artifact_name": "refs-raw-123",
        "notes": "",
    }


def _patch(monkeypatch, row: dict[str, str]) -> None:
    monkeypatch.setattr(refs_audit, "load_manifest", lambda: [row])
    monkeypatch.setattr(refs_audit, "load_source_catalog", _catalog)
    monkeypatch.setattr(refs_audit, "load_active_source_ids", lambda: {"SRC.TEST"})


def test_metadata_predicate_accepts_complete_row(monkeypatch) -> None:
    row = _row()
    _patch(monkeypatch, row)
    assert refs_audit.run(as_of=date(2026, 8, 17), metadata_only=True) == 0


def test_metadata_predicate_rejects_invalid_status_url_size_hash_license_and_date(
    monkeypatch,
) -> None:
    invalid_cases = {
        "http_status": "404",
        "final_url": "",
        "filesize_bytes": "0",
        "sha256": "not-a-digest",
        "license_note": "Wrong license",
        "fetched_at": "2026-08-17T00:00:00",
        "verification_run_url": "https://github.com/example/repo/actions/runs/local",
        "raw_artifact_name": "",
    }
    for field, value in invalid_cases.items():
        row = _row()
        row[field] = value
        _patch(monkeypatch, row)
        assert refs_audit.run(as_of=date(2026, 8, 17), metadata_only=True) == 1


def test_review_due_date_must_be_fetch_anniversary(monkeypatch) -> None:
    row = _row()
    catalog = _catalog()
    monkeypatch.setattr(refs_audit, "load_manifest", lambda: [row])
    monkeypatch.setattr(refs_audit, "load_source_catalog", lambda: catalog)
    monkeypatch.setattr(refs_audit, "load_active_source_ids", lambda: {"SRC.TEST"})
    assert refs_audit.run(as_of=date(2026, 8, 17), metadata_only=True) == 0
    catalog["SRC.TEST"] = replace(catalog["SRC.TEST"], review_due_at="2027-08-18")
    assert refs_audit.run(as_of=date(2026, 8, 17), metadata_only=True) == 1


def test_raw_hash_and_size_are_checked(monkeypatch, tmp_path) -> None:
    payload = b"evidence"
    raw_path = tmp_path / "refs" / "raw" / "SRC.TEST.txt"
    raw_path.parent.mkdir(parents=True)
    raw_path.write_bytes(payload)
    row = _row(payload)
    row["stored_as"] = str(raw_path)
    row["sha256"] = hash_bytes(b"different")
    _patch(monkeypatch, row)
    assert refs_audit.run(as_of=date(2026, 8, 17)) == 1


def test_full_verification_uses_explicit_evidence_root(monkeypatch, tmp_path) -> None:
    payload = b"evidence"
    row = _row(payload)
    row["stored_as"] = "refs/raw/SRC.TEST.txt"
    _patch(monkeypatch, row)

    # No evidence root in the repo: fail-closed on the missing bytes.
    assert refs_audit.run(as_of=date(2026, 8, 17)) == 1

    raw_path = tmp_path / "refs" / "raw" / "SRC.TEST.txt"
    raw_path.parent.mkdir(parents=True)
    raw_path.write_bytes(payload)
    assert refs_audit.run(as_of=date(2026, 8, 17), evidence_root=tmp_path) == 0

    raw_path.write_bytes(b"tampered")
    assert refs_audit.run(as_of=date(2026, 8, 17), evidence_root=tmp_path) == 1


def test_freshness_report_classifies_overdue_and_upcoming() -> None:
    catalog = {
        "SRC.PAST": SourceCatalogEntry(
            source_id="SRC.PAST", url="https://example.test/past", review_due_at="2026-01-01"
        ),
        "SRC.SOON": SourceCatalogEntry(
            source_id="SRC.SOON", url="https://example.test/soon", review_due_at="2026-10-01"
        ),
        "SRC.FAR": SourceCatalogEntry(
            source_id="SRC.FAR", url="https://example.test/far", review_due_at="2030-01-01"
        ),
        "SRC.BAD": SourceCatalogEntry(
            source_id="SRC.BAD", url="https://example.test/bad", review_due_at="not-a-date"
        ),
    }
    report = refs_audit.build_freshness_report(catalog, as_of=date(2026, 9, 25), horizon_days=90)
    assert [entry.source_id for entry in report.overdue] == ["SRC.PAST"]
    assert report.overdue[0].days_remaining == -267
    assert [entry.source_id for entry in report.upcoming] == ["SRC.SOON"]
    assert report.unparsable == ("SRC.BAD",)


def test_freshness_gate_is_opt_in(monkeypatch) -> None:
    catalog = {
        "SRC.PAST": SourceCatalogEntry(
            source_id="SRC.PAST", url="https://example.test/past", review_due_at="2026-01-01"
        )
    }
    monkeypatch.setattr(refs_audit, "load_source_catalog", lambda: catalog)
    assert refs_audit.run_freshness(as_of=date(2026, 9, 25)) == 0
    assert refs_audit.run_freshness(as_of=date(2026, 9, 25), gate=True) == 1
