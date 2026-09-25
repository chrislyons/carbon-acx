"""Deterministic DDL/Pydantic drift gate for the canonical relational schema.

``db/schema.sql`` and the Pydantic models in :mod:`calc.schema` are two faces of
the same contract: the importer validates CSV rows through the models, then
inserts them into the SQLite tables, and the exporter round-trips those tables
back to CSV. If a column disappears from one side or a required model field is
backed by a nullable column, rows can validate in Python and still be rejected
(or silently nulled) by SQLite.

These tests introspect SQLite's own ``PRAGMA table_info`` output and compare it
field-by-field against the canonical models so any divergence fails with the
exact table and column named. The check is offline and deterministic: it never
reads CSVs, the network, or the clock.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from calc import schema

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"

# Canonical table -> Pydantic model. Only tables that the importer validates and
# the exporter round-trips are registered. Lookup-only tables (sources, units,
# sectors, icons) have no canonical model and are intentionally excluded.
TABLE_MODELS = {
    "activities": schema.Activity,
    "activity_schedule": schema.ActivitySchedule,
    "assets": schema.Asset,
    "dependencies": schema.ActivityDependency,
    "emission_factors": schema.EmissionFactor,
    "entities": schema.Entity,
    "feedback_loops": schema.FeedbackLoop,
    "grid_intensity": schema.GridIntensity,
    "layers": schema.Layer,
    "operations": schema.Operation,
    "profiles": schema.Profile,
    "sites": schema.Site,
    "functional_units": schema.FunctionalUnit,
    "activity_fu_map": schema.ActivityFunctionalUnitMap,
}

# Optional, backward-compatible factor-quality metadata shared by both
# factor-bearing tables. The names are part of the approved hardening contract;
# the SQL columns and the Pydantic fields must agree and both must stay
# optional/nullable so older snapshots remain loadable.
QUALITY_COLUMNS = (
    "evidence_type",
    "quality_grade",
    "applicability_boundary",
    "uncertainty_status",
    "uncertainty_reason",
    "claim_locator",
)
QUALITY_TABLES = ("emission_factors", "grid_intensity")


@pytest.fixture(scope="module")
def schema_sql() -> str:
    return SCHEMA_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def connection(schema_sql: str) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(schema_sql)
    yield conn
    conn.close()


def _sql_columns(connection: sqlite3.Connection, table: str) -> dict[str, bool]:
    """Return ``{column: not_null}`` from SQLite's own DDL introspection.

    ``PRAGMA table_info`` reports ``notnull=0`` for a non-INTEGER ``TEXT PRIMARY
    KEY`` column because of SQLite's legacy rowid semantics, so primary-key
    columns are folded into the not-null signal here.
    """
    rows = connection.execute(f'PRAGMA table_info("{table}")').fetchall()
    return {name: bool(not_null) or bool(pk) for _cid, name, _type, not_null, _default, pk in rows}


def _model_columns(model: type) -> dict[str, tuple[str, bool]]:
    """Return ``{storage_name: (field_name, required)}`` for ``model``.

    Pydantic aliases are the on-disk storage names: CSV headers and SQL columns
    use the alias when one is declared (``populate_by_name`` still accepts the
    field name on input). This keeps the drift check alias-resilient.
    """
    columns: dict[str, tuple[str, bool]] = {}
    for field_name, field in model.model_fields.items():
        alias = field.alias
        storage = alias if isinstance(alias, str) and alias else field_name
        columns[storage] = (field_name, field.is_required())
    return columns


@pytest.mark.parametrize(
    "table,model",
    [pytest.param(table, model, id=table) for table, model in sorted(TABLE_MODELS.items())],
)
def test_sql_schema_matches_pydantic_model(
    table: str,
    model: type,
    connection: sqlite3.Connection,
) -> None:
    """Columns, aliases, nullability and requiredness must agree per table."""

    sql_columns = _sql_columns(connection, table)
    if not sql_columns:
        pytest.fail(
            f"Schema drift: table '{table}' ({model.__name__}) is missing from db/schema.sql"
        )

    model_columns = _model_columns(model)
    problems: list[str] = []

    missing = sorted(set(model_columns) - set(sql_columns))
    if missing:
        problems.append(f"columns on {model.__name__} but missing from '{table}': {missing}")

    extra = sorted(set(sql_columns) - set(model_columns))
    if extra:
        problems.append(f"columns on '{table}' but missing from {model.__name__}: {extra}")

    # A model-required field must be backed by a NOT NULL column (primary keys
    # count as NOT NULL). A nullable column under a required field is the drift
    # that lets a validated row fail or silently null on insert.
    not_nullable = sorted(
        column
        for column in set(sql_columns) & set(model_columns)
        if model_columns[column][1] and not sql_columns[column]
    )
    if not_nullable:
        problems.append(f"model-required columns declared nullable in '{table}': {not_nullable}")

    if problems:
        detail = "\n  - ".join(problems)
        pytest.fail(f"Schema drift for table '{table}' ({model.__name__}):\n  - {detail}")


@pytest.mark.parametrize("table", QUALITY_TABLES)
def test_quality_metadata_columns_are_optional(
    table: str,
    connection: sqlite3.Connection,
) -> None:
    """Factor-quality metadata must exist on both sides and stay optional."""

    sql_columns = _sql_columns(connection, table)
    model_columns = _model_columns(TABLE_MODELS[table])
    problems: list[str] = []

    missing_sql = sorted(column for column in QUALITY_COLUMNS if column not in sql_columns)
    if missing_sql:
        problems.append(f"missing SQL columns on '{table}': {missing_sql}")

    missing_model = sorted(column for column in QUALITY_COLUMNS if column not in model_columns)
    if missing_model:
        problems.append(
            f"missing {TABLE_MODELS[table].__name__} fields for '{table}': {missing_model}"
        )

    not_null = sorted(
        column for column in QUALITY_COLUMNS if column in sql_columns and sql_columns[column]
    )
    if not_null:
        problems.append(
            f"quality columns on '{table}' must stay nullable, but are NOT NULL: {not_null}"
        )

    required = sorted(
        model_columns[column][0]
        for column in QUALITY_COLUMNS
        if column in model_columns and model_columns[column][1]
    )
    if required:
        problems.append(
            f"quality fields on {TABLE_MODELS[table].__name__} must stay optional, "
            f"but are required: {required}"
        )

    if problems:
        detail = "\n  - ".join(problems)
        pytest.fail(f"Quality metadata drift for table '{table}':\n  - {detail}")
