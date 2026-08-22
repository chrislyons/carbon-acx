"""Shared OWID snapshot contract: constants, parsing, and manifest validation.

Private helper module (same convention as ``_artifact_paths.py``) consumed by
``scripts/fetch_owid_context.py`` and ``scripts/generate_web_calculator_data.py``
so the pinned-source parse/validate/metadata rules live in exactly one place.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from typing import Any

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


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def metadata_column(metadata: dict[str, Any]) -> dict[str, Any]:
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


def parse_points(csv_bytes: bytes) -> list[dict[str, object]]:
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
    column = metadata_column(metadata)
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
        "points": parse_points(csv_bytes),
    }


def manifest_from_context(
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
        "dataSha256": sha256_hex(data_bytes),
        "metadataSha256": sha256_hex(metadata_bytes),
        "citation": "Global Carbon Budget (2025)",
    }


def validate_manifest(
    manifest: dict[str, Any],
    *,
    data_bytes: bytes | None = None,
    metadata_bytes: bytes | None = None,
) -> None:
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
    if data_bytes is not None and manifest["dataSha256"] != sha256_hex(data_bytes):
        raise OwidValidationError("OWID raw data digest does not match its manifest")
    if metadata_bytes is not None and manifest["metadataSha256"] != sha256_hex(metadata_bytes):
        raise OwidValidationError("OWID metadata digest does not match its manifest")
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
