from __future__ import annotations

from pathlib import Path

from calc import refs_fetch
from calc.refs_util import SourceCatalogEntry


class _Response:
    def __init__(self, url: str, status: int, payload: bytes) -> None:
        self.url = url
        self.status_code = status
        self.content = payload
        self.headers = {"content-type": "text/plain"}
        self.text = payload.decode("utf-8", errors="replace")


class _Client:
    responses: list[_Response] = []

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url: str, **kwargs):
        return self.responses.pop(0)


def _catalog() -> dict[str, SourceCatalogEntry]:
    return {
        source_id: SourceCatalogEntry(
            source_id=source_id,
            url=f"https://example.test/{source_id}.txt",
            license="Test license",
            review_due_at="2027-08-17",
        )
        for source_id in ("SRC.ONE", "SRC.TWO")
    }


def test_fetch_uses_wayback_only_for_404(monkeypatch) -> None:
    candidate = refs_fetch._candidate_for_source("SRC.ONE", _catalog()["SRC.ONE"])
    response = _Response("https://example.test/SRC.ONE.txt", 500, b"failure")

    monkeypatch.setattr(refs_fetch, "_fetch_with_backoff", lambda *args, **kwargs: response)

    def fail_wayback(*args, **kwargs):
        raise AssertionError("Wayback fallback is restricted to 404 responses")

    monkeypatch.setattr(refs_fetch, "_attempt_wayback", fail_wayback)
    result = refs_fetch.fetch_candidate(
        client=object(),
        limiter=object(),
        robots=object(),
        candidate=candidate,
        allowlist=[],
    )

    assert result is None


def test_fetch_rolls_back_prior_tree_after_late_failure(monkeypatch, tmp_path: Path) -> None:
    refs_dir = tmp_path / "refs"
    raw_dir = refs_dir / "raw"
    normalized_dir = refs_dir / "normalized"
    raw_dir.mkdir(parents=True)
    normalized_dir.mkdir()
    (raw_dir / "prior.txt").write_bytes(b"prior raw")
    (normalized_dir / "prior.md").write_bytes(b"prior normalized")
    manifest_path = refs_dir / "sources_manifest.csv"
    manifest_before = (
        "source_id,src_url,final_url,http_status,content_type,filesize_bytes,sha256,stored_as,"
        "license_note,fetched_at,normalized_md,normalized_sha256,verification_run_url,"
        "raw_artifact_name,notes\n"
        "SRC.ONE,,,,,,,,,,,,,,\n"
    )
    manifest_path.write_text(manifest_before, encoding="utf-8")

    monkeypatch.setattr(refs_fetch, "REFS_DIR", refs_dir)
    monkeypatch.setattr(refs_fetch, "RAW_DIR", raw_dir)
    monkeypatch.setattr(refs_fetch, "NORMALIZED_DIR", normalized_dir)
    monkeypatch.setattr(refs_fetch, "load_source_catalog", _catalog)
    monkeypatch.setattr(refs_fetch, "load_active_source_ids", lambda: {"SRC.ONE", "SRC.TWO"})
    monkeypatch.setattr(refs_fetch, "load_manifest", lambda: [])
    monkeypatch.setattr(
        refs_fetch,
        "RobotsGate",
        lambda *args: type("Gate", (), {"allows": lambda self, url: True})(),
    )
    monkeypatch.setattr(
        refs_fetch,
        "HostRateLimiter",
        lambda *args: type("Limiter", (), {"wait": lambda self, host: None})(),
    )
    monkeypatch.setattr(refs_fetch.httpx, "Client", _Client)
    _Client.responses = [
        _Response("https://example.test/SRC.ONE.txt", 200, b"one"),
        _Response("https://example.test/SRC.TWO.txt", 400, b"failure"),
    ]

    assert (
        refs_fetch.run_fetch(
            ["SRC.ONE", "SRC.TWO"],
            None,
            verification_run_url="https://github.com/example/repo/actions/runs/123",
            raw_artifact_name="refs-raw-123",
        )
        == 1
    )
    assert (raw_dir / "prior.txt").read_bytes() == b"prior raw"
    assert (normalized_dir / "prior.md").read_bytes() == b"prior normalized"
    assert manifest_path.read_text(encoding="utf-8") == manifest_before


def test_fetch_promotes_raw_and_manifest_only_after_success(monkeypatch, tmp_path: Path) -> None:
    refs_dir = tmp_path / "refs"
    raw_dir = refs_dir / "raw"
    normalized_dir = refs_dir / "normalized"
    raw_dir.mkdir(parents=True)
    normalized_dir.mkdir()
    (refs_dir / "sources_manifest.csv").write_text(
        "source_id,src_url,final_url,http_status,content_type,filesize_bytes,sha256,stored_as,"
        "license_note,fetched_at,normalized_md,normalized_sha256,verification_run_url,"
        "raw_artifact_name,notes\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(refs_fetch, "REFS_DIR", refs_dir)
    monkeypatch.setattr(refs_fetch, "RAW_DIR", raw_dir)
    monkeypatch.setattr(refs_fetch, "NORMALIZED_DIR", normalized_dir)
    monkeypatch.setattr(
        refs_fetch, "load_source_catalog", lambda: {"SRC.ONE": _catalog()["SRC.ONE"]}
    )
    monkeypatch.setattr(refs_fetch, "load_active_source_ids", lambda: {"SRC.ONE"})
    monkeypatch.setattr(refs_fetch, "load_manifest", lambda: [])
    monkeypatch.setattr(
        refs_fetch,
        "RobotsGate",
        lambda *args: type("Gate", (), {"allows": lambda self, url: True})(),
    )
    monkeypatch.setattr(
        refs_fetch,
        "HostRateLimiter",
        lambda *args: type("Limiter", (), {"wait": lambda self, host: None})(),
    )
    monkeypatch.setattr(refs_fetch.httpx, "Client", _Client)
    _Client.responses = [_Response("https://example.test/SRC.ONE.txt", 200, b"one")]

    assert (
        refs_fetch.run_fetch(
            ["SRC.ONE"],
            None,
            verification_run_url="https://github.com/example/repo/actions/runs/123",
            raw_artifact_name="refs-raw-123",
        )
        == 0
    )
    assert (raw_dir / "SRC.ONE.txt").read_bytes() == b"one"
    assert "SRC.ONE" in (refs_dir / "sources_manifest.csv").read_text(encoding="utf-8")
