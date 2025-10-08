# AXC019 Project Status Report

## 
Overview

- **Project scope.** carbon-acx is a minimal scaffold for a carbon-accounting demo, shipping with Poetry-managed dependencies (Dash, Plotly, pandas, pydantic, etc.) and Makefile targets for installation, linting, testing, building the calculation pipeline, running the Dash app, and migrating demo data.

## Data & calculation pipeline

- **Schema & validation.** The `calc.schema` module loads CSV-backed reference data, enforces unit registries, enumerates Canadian region codes, and validates emission-factor, activity-schedule, and grid-intensity records using Pydantic models.
- **Data access.** `calc.dal.CsvStore` provides the default datastore, reading CSV inputs from `data/` with pandas, and `choose_backend` lets callers swap implementations via `ACX_DATA_BACKEND` (future backends are stubbed).
- **Emissions derivation.** `calc.derive` computes weekly quantities, resolves grid-intensity precedence (including Canada-average fallbacks), calculates annual emissions for each scheduled activity, and exports both CSV/JSON views plus an example figure payload enriched with citations.
- **Aggregation API.** `calc.api.get_aggregates` ingests activities, profiles, schedules, emission factors, and grid intensities; resolves the active profile (from `calc/config.yaml` or data); accumulates per-activity totals; and returns structured aggregates alongside the deduplicated reference keys feeding the UI.
- **Reporting helpers.** `calc.figures.export_total_by_activity` turns derived data into metadata-annotated CSV/JSON outputs while formatting IEEE-style references, leveraging `calc.citations` for de-duplication and number stripping.

## Data assets

- The repository includes small demo datasets: activities (coffee cup, streaming), emission factors (fixed coffee intensity, grid-indexed streaming factor), a single activity schedule tied to a hybrid Toronto profile, two profiles, grid intensity for Ontario/Canada, a units registry, and IEEE-formatted source metadata.
- Reference snippets for coffee, streaming, and supporting sources live under `calc/references/`, aligning with the citation keys referenced in data and figure exports.

## Application layer

- `app/app.py` bootstraps a Dash application that loads aggregates, then renders a simple layout composed of stacked, bubble, and sankey placeholders plus a real references section that formats citations for the current dataset.
- Visualization components for stacked, bubble, and sankey views currently return placeholder `<div>` elements, indicating UI work remains, while the references component enumerates IEEE-formatted sources from the citation system.

## Tooling & scripts

- A migration utility (`scripts/migrate_to_v1_1.py`) rewrites legacy CSV demos into the current v1.1 schema, ensuring idempotent headers and seeding required reference rows and unit definitions, helping keep sample data aligned with schema expectations.

## Test suite

- Tests cover key pathways: end-to-end export metadata and reference formatting, emission calculations (including null handling), citation ordering and component hygiene, CSV datastore loading, grid-intensity precedence, and schema validation edge cases.

## Outstanding gaps / risks

- Front-end visualizations remain placeholders, so charting work is still pending despite the data pipeline being in place.
- Demo datasets are intentionally minimal (single schedule, limited activities/factors), which is sufficient for testing but may not exercise edge cases like multiple profiles or richer activity sets.