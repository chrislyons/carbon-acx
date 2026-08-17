from __future__ import annotations

from datetime import date
from pathlib import Path

from scripts.audit_publication import _validate_source_evidence, audit_publication


ROOT = Path(__file__).resolve().parents[1]


def test_generated_publication_is_hash_bound() -> None:
    assert audit_publication(ROOT, date(2026, 8, 17)) == []


def test_publication_rejects_mismatched_evidence_hash() -> None:
    errors: list[str] = []
    evidence = {
        "sourceId": "SRC.TEST",
        "retrievedAt": "2026-08-17T00:00:00+00:00",
        "reviewDueAt": "2027-08-17",
        "evidenceSha256": "a" * 64,
        "verificationRunUrl": "https://github.com/example/repo/actions/runs/1",
        "rawArtifactName": "refs-raw-1",
    }
    source = {
        "review_due_at": "2027-08-17",
    }
    ledger = {
        "sha256": "b" * 64,
        "verification_run_url": evidence["verificationRunUrl"],
        "raw_artifact_name": evidence["rawArtifactName"],
    }
    decision = {
        "decision": "verified",
        "evidence_sha256": "b" * 64,
    }

    _validate_source_evidence(
        evidence,
        "SRC.TEST",
        {"SRC.TEST": source},
        {"SRC.TEST": ledger},
        {"SRC.TEST": decision},
        date(2026, 8, 17),
        errors,
        "fixture",
    )

    assert any("evidence hash does not match" in error for error in errors)
