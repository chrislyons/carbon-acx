from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

OWID_SOURCE_SCHEMA_VERSION = "acx.owid-source/1-0-0"
OWID_PROVIDER = "Our World in Data"
OWID_SOURCE_ID = "SRC.OWID.CO2.2025"
OWID_CHART_ID = "annual-co2-emissions-per-country"
OWID_METRIC = "Annual CO₂ emissions"
OWID_DATA_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv"
OWID_METADATA_URL = (
    "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.metadata.json"
)
OWID_CHART_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country"
OWID_LICENSE = "CC BY 4.0"
OWID_ENTITY = "Canada"
OWID_ENTITY_CODE = "CAN"


class OwidValidationError(ValueError):
    """Raised when the configured OWID source contract is not satisfied."""


def _retrieved_at() -> str:
    override = os.getenv("ACX_OWID_RETRIEVED_AT")
    return override or datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _metadata_column(metadata: dict[str, Any]) -> dict[str, Any]:
    chart = metadata.get("chart")
    columns = metadata.get("columns")
    if not isinstance(chart, dict):
        raise OwidValidationError("OWID metadata is missing chart metadata")
    if chart.get("originalChartUrl") != OWID_CHART_URL:
        raise OwidValidationError("OWID metadata chart URL does not match the configured chart")
    if chart.get("title") != "Annual CO₂ emissions":
        raise OwidValidationError("OWID metadata chart title does not match the configured chart")
    if chart.get("citation") != "Global Carbon Budget (2025)":
        raise OwidValidationError("OWID metadata citation does not match the configured source")
    if not isinstance(columns, dict) or set(columns) != {OWID_METRIC}:
        raise OwidValidationError(
            "OWID metadata does not expose the exact configured metric column"
        )
    column = columns[OWID_METRIC]
    if not isinstance(column, dict):
        raise OwidValidationError("OWID metric metadata is not an object")
    if column.get("unit") != "tonnes":
        raise OwidValidationError("OWID metric unit must be tonnes")
    timespan = column.get("timespan")
    last_updated = column.get("lastUpdated")
    if not isinstance(timespan, str) or not timespan.strip():
        raise OwidValidationError("OWID metric metadata is missing an upstream timespan")
    if not isinstance(last_updated, str) or not last_updated.strip():
        raise OwidValidationError("OWID metric metadata is missing an upstream lastUpdated vintage")

    descriptions = " ".join(
        str(column.get(key) or "")
        for key in ("descriptionShort", "descriptionKey", "descriptionProcessing")
    ).lower()
    required_descriptions = (
        "territorial",
        "land-use change",
        "international aviation",
        "shipping",
    )
    missing = [phrase for phrase in required_descriptions if phrase not in descriptions]
    if missing:
        raise OwidValidationError(
            "OWID metadata descriptions are missing required accounting statements: "
            + ", ".join(missing)
        )
    return column


def _parse_points(csv_bytes: bytes) -> list[dict[str, object]]:
    try:
        text = csv_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise OwidValidationError("OWID CSV is not valid UTF-8") from error

    reader = csv.DictReader(text.splitlines())
    fieldnames = reader.fieldnames or []
    required_fields = {"Entity", "Code", "Year", OWID_METRIC}
    if not required_fields.issubset(fieldnames):
        raise OwidValidationError("OWID CSV is missing a required field")
    if fieldnames.count(OWID_METRIC) != 1:
        raise OwidValidationError("OWID CSV does not contain exactly one configured metric column")

    points: list[dict[str, object]] = []
    years: set[int] = set()
    for row in reader:
        entity = row.get("Entity")
        code = row.get("Code")
        if entity == OWID_ENTITY and code != OWID_ENTITY_CODE:
            raise OwidValidationError("OWID CSV pairs Canada with a code other than CAN")
        if code == OWID_ENTITY_CODE and entity != OWID_ENTITY:
            raise OwidValidationError("OWID CSV pairs CAN with an entity other than Canada")
        if entity != OWID_ENTITY or code != OWID_ENTITY_CODE:
            continue
        raw_year = (row.get("Year") or "").strip()
        if not raw_year or not raw_year.isdecimal():
            raise OwidValidationError("OWID Canada row has a non-integer year")
        year = int(raw_year)
        raw_value = (row.get(OWID_METRIC) or "").strip()
        try:
            value = float(raw_value)
        except (TypeError, ValueError) as error:
            raise OwidValidationError("OWID Canada row has a non-numeric value") from error
        if not math.isfinite(value):
            raise OwidValidationError("OWID Canada row has a non-finite value")
        if year in years:
            raise OwidValidationError("OWID Canada series contains duplicate years")
        years.add(year)
        points.append({"year": year, "value": value})

    if not points:
        raise OwidValidationError("OWID CSV contains no Canada/CAN rows")
    return sorted(points, key=lambda point: int(point["year"]))


def parse_owid_context(
    csv_bytes: bytes, metadata_bytes: bytes, *, retrieved_at: str
) -> dict[str, object]:
    try:
        metadata = json.loads(metadata_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise OwidValidationError("OWID metadata is not valid JSON") from error
    if not isinstance(metadata, dict):
        raise OwidValidationError("OWID metadata is not a JSON object")
    column = _metadata_column(metadata)
    return {
        "schemaVersion": OWID_SOURCE_SCHEMA_VERSION,
        "provider": OWID_PROVIDER,
        "chartId": OWID_CHART_ID,
        "metric": OWID_METRIC,
        "citation": "Global Carbon Budget (2025)",
        "license": OWID_LICENSE,
        "dataUrl": OWID_DATA_URL,
        "metadataUrl": OWID_METADATA_URL,
        "upstreamTimespan": column["timespan"],
        "upstreamLastUpdated": column["lastUpdated"],
        "accountingBasis": "territorial",
        "landUseChange": "excluded",
        "unit": "tonnes",
        "entity": OWID_ENTITY,
        "entityCode": OWID_ENTITY_CODE,
        "retrievedAt": retrieved_at,
        "points": _parse_points(csv_bytes),
    }


def _manifest_from_context(
    context: dict[str, object],
    *,
    resolved_data_url: str,
    resolved_metadata_url: str,
    data_bytes: bytes,
    metadata_bytes: bytes,
) -> dict[str, object]:
    return {
        "schemaVersion": OWID_SOURCE_SCHEMA_VERSION,
        "provider": OWID_PROVIDER,
        "sourceId": OWID_SOURCE_ID,
        "chartId": OWID_CHART_ID,
        "metric": OWID_METRIC,
        "dataUrl": OWID_DATA_URL,
        "metadataUrl": OWID_METADATA_URL,
        "resolvedDataUrl": resolved_data_url,
        "resolvedMetadataUrl": resolved_metadata_url,
        "retrievedAt": context["retrievedAt"],
        "upstreamTimespan": context["upstreamTimespan"],
        "upstreamLastUpdated": context["upstreamLastUpdated"],
        "license": OWID_LICENSE,
        "accountingBasis": "territorial",
        "landUseChange": "excluded",
        "unit": "tonnes",
        "entity": OWID_ENTITY,
        "entityCode": OWID_ENTITY_CODE,
        "dataSha256": _sha256(data_bytes),
        "metadataSha256": _sha256(metadata_bytes),
        "citation": "Global Carbon Budget (2025)",
    }


def _validate_manifest(manifest: dict[str, object]) -> None:
    required = {
        "schemaVersion",
        "provider",
        "sourceId",
        "chartId",
        "metric",
        "dataUrl",
        "metadataUrl",
        "resolvedDataUrl",
        "resolvedMetadataUrl",
        "retrievedAt",
        "upstreamTimespan",
        "upstreamLastUpdated",
        "license",
        "accountingBasis",
        "landUseChange",
        "unit",
        "entity",
        "entityCode",
        "dataSha256",
        "metadataSha256",
        "citation",
    }
    if not required.issubset(manifest):
        raise OwidValidationError("OWID manifest is missing a required selection field")
    expected = {
        "schemaVersion": OWID_SOURCE_SCHEMA_VERSION,
        "sourceId": OWID_SOURCE_ID,
        "provider": OWID_PROVIDER,
        "chartId": OWID_CHART_ID,
        "metric": OWID_METRIC,
        "dataUrl": OWID_DATA_URL,
        "metadataUrl": OWID_METADATA_URL,
        "license": OWID_LICENSE,
        "accountingBasis": "territorial",
        "landUseChange": "excluded",
        "unit": "tonnes",
        "entity": OWID_ENTITY,
        "entityCode": OWID_ENTITY_CODE,
        "citation": "Global Carbon Budget (2025)",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            raise OwidValidationError(
                f"OWID manifest field {key} does not match the configured contract"
            )
    for key in (
        "resolvedDataUrl",
        "resolvedMetadataUrl",
        "retrievedAt",
        "upstreamTimespan",
        "upstreamLastUpdated",
    ):
        if not isinstance(manifest.get(key), str) or not str(manifest[key]).strip():
            raise OwidValidationError(f"OWID manifest field {key} must be non-empty")
    for key in ("dataSha256", "metadataSha256"):
        value = manifest.get(key)
        if (
            not isinstance(value, str)
            or len(value) != 64
            or any(char not in "0123456789abcdef" for char in value)
        ):
            raise OwidValidationError(f"OWID manifest field {key} must be a SHA-256 digest")


def _json_bytes(value: dict[str, object]) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def _replace_directory(source: Path, destination: Path) -> None:
    source.rename(destination)


def _atomic_snapshot_replace(output_dir: Path, files: dict[str, bytes]) -> None:
    output_dir = output_dir.resolve()
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    staging_dir = Path(
        tempfile.mkdtemp(prefix=f".{output_dir.name}.staging-", dir=output_dir.parent)
    )
    backup_dir = Path(tempfile.mkdtemp(prefix=f".{output_dir.name}.backup-", dir=output_dir.parent))
    backup_dir.rmdir()
    previous_moved = False
    try:
        for relative_path, content in files.items():
            staged_path = staging_dir / relative_path
            staged_path.parent.mkdir(parents=True, exist_ok=True)
            staged_path.write_bytes(content)
            if staged_path.read_bytes() != content:
                raise OSError(f"Staged OWID snapshot bytes changed: {relative_path}")

        if output_dir.exists():
            _replace_directory(output_dir, backup_dir)
            previous_moved = True
        _replace_directory(staging_dir, output_dir)
        if previous_moved and backup_dir.exists():
            shutil.rmtree(backup_dir)
            previous_moved = False
    except Exception:
        if backup_dir.exists():
            if output_dir.exists():
                shutil.rmtree(output_dir, ignore_errors=True)
            _replace_directory(backup_dir, output_dir)
        raise
    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)
        shutil.rmtree(backup_dir, ignore_errors=True)


def fetch_owid_snapshot(
    output_dir: Path,
    *,
    client: httpx.Client | None = None,
    dry_run: bool = False,
) -> dict[str, object]:
    owns_client = client is None
    http_client = client or httpx.Client(follow_redirects=True, timeout=60.0)
    try:
        data_response = http_client.get(OWID_DATA_URL)
        data_response.raise_for_status()
        metadata_response = http_client.get(OWID_METADATA_URL)
        metadata_response.raise_for_status()
        data_bytes = data_response.content
        metadata_bytes = metadata_response.content
        context = parse_owid_context(data_bytes, metadata_bytes, retrieved_at=_retrieved_at())
        manifest = _manifest_from_context(
            context,
            resolved_data_url=str(data_response.url),
            resolved_metadata_url=str(metadata_response.url),
            data_bytes=data_bytes,
            metadata_bytes=metadata_bytes,
        )
        _validate_manifest(manifest)
        files = {
            "annual-co2-emissions-per-country.csv": data_bytes,
            "annual-co2-emissions-per-country.metadata.json": metadata_bytes,
            "manifest.json": _json_bytes(manifest),
        }
        if not dry_run:
            _atomic_snapshot_replace(output_dir, files)
        return manifest
    finally:
        if owns_client:
            http_client.close()


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch and pin the configured OWID context snapshot."
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent.parent / "data/owid"),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    manifest = fetch_owid_snapshot(Path(args.output_dir), dry_run=args.dry_run)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
