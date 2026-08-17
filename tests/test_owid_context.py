from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from scripts import fetch_owid_context as fetcher


CSV_BYTES = (
    "Entity,Code,Year,Annual CO₂ emissions\n" "Canada,CAN,2023,1\n" "Canada,CAN,2024,2\n"
).encode()
METADATA_BYTES = json.dumps(
    {
        "chart": {
            "title": "Annual CO₂ emissions",
            "originalChartUrl": fetcher.OWID_CHART_URL,
            "citation": "Global Carbon Budget (2025)",
        },
        "columns": {
            fetcher.OWID_METRIC: {
                "unit": "tonnes",
                "timespan": "1750-2024",
                "lastUpdated": "2025-11-13",
                "descriptionShort": "Territorial emissions; land-use change is excluded.",
                "descriptionKey": "International aviation and shipping are excluded.",
            }
        },
    }
).encode()


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)


def _seed_snapshot(output_dir: Path) -> dict[str, bytes]:
    files = {
        "annual-co2-emissions-per-country.csv": b"before-data",
        "annual-co2-emissions-per-country.metadata.json": b"before-metadata",
        "manifest.json": b"before-manifest",
    }
    output_dir.mkdir(parents=True)
    for filename, content in files.items():
        (output_dir / filename).write_bytes(content)
    return files


def test_fetch_preserves_snapshot_when_metadata_request_fails(tmp_path: Path) -> None:
    output_dir = tmp_path / "owid"
    before = _seed_snapshot(output_dir)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url == httpx.URL(fetcher.OWID_DATA_URL):
            return httpx.Response(200, content=CSV_BYTES, request=request)
        raise httpx.ConnectError("metadata unavailable", request=request)

    with pytest.raises(httpx.ConnectError):
        fetcher.fetch_owid_snapshot(output_dir, client=_client(handler))

    assert {path.name: path.read_bytes() for path in output_dir.iterdir()} == before


def test_fetch_preserves_snapshot_when_metadata_parses_but_csv_is_invalid(tmp_path: Path) -> None:
    output_dir = tmp_path / "owid"
    before = _seed_snapshot(output_dir)
    invalid_csv = CSV_BYTES.replace(b"Canada,CAN,2024,2", b"Canada,CAN,2023,2")

    def handler(request: httpx.Request) -> httpx.Response:
        content = invalid_csv if request.url == httpx.URL(fetcher.OWID_DATA_URL) else METADATA_BYTES
        return httpx.Response(200, content=content, request=request)

    with pytest.raises(fetcher.OwidValidationError, match="duplicate years"):
        fetcher.fetch_owid_snapshot(output_dir, client=_client(handler))

    assert {path.name: path.read_bytes() for path in output_dir.iterdir()} == before


def test_fetch_replaces_complete_snapshot_after_both_responses_validate(tmp_path: Path) -> None:
    output_dir = tmp_path / "owid"

    def handler(request: httpx.Request) -> httpx.Response:
        content = CSV_BYTES if request.url == httpx.URL(fetcher.OWID_DATA_URL) else METADATA_BYTES
        return httpx.Response(200, content=content, request=request)

    manifest = fetcher.fetch_owid_snapshot(
        output_dir,
        client=_client(handler),
    )

    assert manifest["dataSha256"] == fetcher._sha256(CSV_BYTES)
    assert manifest["metadataSha256"] == fetcher._sha256(METADATA_BYTES)
    assert (output_dir / "annual-co2-emissions-per-country.csv").read_bytes() == CSV_BYTES
    assert json.loads((output_dir / "manifest.json").read_bytes())["entityCode"] == "CAN"
    assert (
        json.loads((output_dir / "manifest.json").read_bytes())["sourceId"]
        == fetcher.OWID_SOURCE_ID
    )


def test_fetch_atomic_directory_rollback_restores_prior_bytes(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    output_dir = tmp_path / "owid"
    before = _seed_snapshot(output_dir)
    original_replace = fetcher._replace_directory
    calls = 0

    def fail_on_staging_replace(source: Path, destination: Path) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("injected directory replacement failure")
        original_replace(source, destination)

    monkeypatch.setattr(fetcher, "_replace_directory", fail_on_staging_replace)
    with pytest.raises(OSError, match="injected directory replacement failure"):
        fetcher._atomic_snapshot_replace(
            output_dir,
            {
                "annual-co2-emissions-per-country.csv": CSV_BYTES,
                "annual-co2-emissions-per-country.metadata.json": METADATA_BYTES,
                "manifest.json": b"new-manifest",
            },
        )

    assert {path.name: path.read_bytes() for path in output_dir.iterdir()} == before
