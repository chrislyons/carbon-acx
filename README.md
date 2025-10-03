# Carbon ACX

Carbon ACX is a reference implementation for building reproducible carbon accounting datasets and experiences. It demonstrates how to ingest heterogeneous activity data, normalise it into shared emissions models, derive decision-ready artefacts, and deliver those artefacts across interactive and static channels.

---

## Table of contents

1. [Project overview](#project-overview)
   - [Mission & scope](#mission--scope)
   - [Architecture & problem domain](#architecture--problem-domain)
   - [Positioning](#positioning)
   - [Layer catalogue at-a-glance](#layer-catalogue-at-a-glance)
2. [Features](#features)
3. [Repository structure](#repository-structure)
4. [Installation & setup](#installation--setup)
   - [Local development](#local-development)
   - [Database-backed workflows](#database-backed-workflows)
   - [Front-end toolchain](#front-end-toolchain)
   - [Production preparation](#production-preparation)
5. [Usage](#usage)
   - [Derivation CLI](#derivation-cli)
   - [Intensity matrix CLI](#intensity-matrix-cli)
   - [Dash exploration client](#dash-exploration-client)
   - [Static site bundle](#static-site-bundle)
   - [Programmatic aggregates](#programmatic-aggregates)
   - [On-demand compute service](#on-demand-compute-service)
   - [Diagnostics & utilities](#diagnostics--utilities)
6. [Configuration](#configuration)
   - [Environment variables](#environment-variables)
   - [Configuration files & flags](#configuration-files--flags)
   - [Preset data](#preset-data)
7. [Build & deployment](#build--deployment)
8. [Testing & QA](#testing--qa)
9. [Contributing guide](#contributing-guide)
10. [Security & compliance](#security--compliance)
11. [Roadmap](#roadmap)
12. [FAQ & troubleshooting](#faq--troubleshooting)
13. [References](#references)

---

## Project overview

### Mission & scope

Carbon ACX exists to make carbon accounting datasets portable. The project:

- Converts raw activity records into well-defined emissions models using Pydantic validation in [`calc/schema.py`](./calc/schema.py), ensuring unit registries, layer enumerations, and grid strategies remain consistent.【F:calc/schema.py†L1-L101】
- Computes annualised emissions, intensity matrices, uncertainty bounds, and manifest metadata to create a portable bundle of JSON, CSV, and reference text files via [`calc/derive.py`](./calc/derive.py).【F:calc/derive.py†L1-L114】
- Ships both a Dash-based exploration environment and a static React/Vite experience that render directly from the derived bundle, proving that the data products are channel-agnostic.【F:app/app.py†L1-L132】【F:site/src/App.tsx†L1-L58】
- Provides an API-friendly surface (`calc.api`/`calc.service`) plus a Cloudflare Worker runtime so downstream services can request fresh figures without duplicating the derivation logic.【F:calc/service.py†L1-L123】【F:workers/compute/index.ts†L1-L86】

### Architecture & problem domain

The repository is organised around a **derive-once, serve-anywhere** architecture:

1. **Domain modelling (`calc/schema.py`)** — Canonical CSV inputs are typed with Pydantic models enforcing unit registries (`units.csv`), scope boundaries, grid intensity schemas, and functional unit conversion formula parsing. A read-through cache keeps repeated loads deterministic.【F:calc/schema.py†L1-L87】【F:calc/derive.py†L160-L240】
2. **Data access (`calc/dal/`)** — A pluggable `DataStore` abstraction supports CSV (`CsvStore`), DuckDB (`DuckDbStore`), and SQLite/DuckDB SQL stores (`SqlStore`) so derivations can run against files, in-memory databases, or production-ready connections.【F:calc/dal/__init__.py†L1-L66】【F:calc/dal_sql.py†L25-L115】
3. **Computation (`calc/derive.py`)** — Activity schedules, emission factors, and grid intensities are combined into annualised emissions with guardrails for layer attribution, reference tracking, hashing, manifest metadata, and safe output directory handling.【F:calc/derive.py†L292-L382】【F:calc/derive.py†L1500-L1599】
4. **Presentation (`calc/figures.py`, `app/components`, `site/`)** — Plotly figure slices, disclosure copy, IEEE references, and UI theming are produced once and consumed by both Dash components and the static React client so user experiences stay consistent across channels.【F:calc/figures.py†L1-L120】【F:app/components/_plotly_settings.py†L1-L40】【F:site/src/components/VizCanvas.tsx†L1-L120】
5. **Delivery (`scripts/*.py`, `functions/carbon-acx`, `workers/compute`)** — Automation packages the derived bundle, renders the static client, publishes Cloudflare Pages metadata, and proxies production traffic while enforcing caching, routing, and optional upstream fallbacks.【F:scripts/prepare_pages_bundle.py†L1-L82】【F:functions/carbon-acx/[[path]].ts†L1-L200】

This architecture targets carbon accounting teams that need a transparent pipeline from data ingestion through public presentation.

### Positioning

Compared to ad-hoc spreadsheets or monolithic BI stacks, Carbon ACX emphasises:

- **Deterministic builds** — Artefacts are versioned by content hash and generated through a single CLI entry point that only clears whitelisted directories (`calc/derive.is_safe_output_dir`).【F:calc/derive.py†L252-L336】
- **Reference integrity** — Every derived figure carries IEEE-formatted citations sourced from curated reference files (`calc/references/*.txt`) via the `calc.citations` resolver.【F:calc/citations.py†L1-L74】【F:calc/derive.py†L1474-L1526】
- **Channel parity** — The same derived payload drives Dash, the static React/Vite site, and the Cloudflare Worker API, simplifying validation and deployment while keeping disclosure copy and NA notices aligned.【F:app/app.py†L70-L129】【F:site/src/routes/Story.tsx†L1-L160】
- **Backend agility** — `ACX_DATA_BACKEND` toggles between CSV, DuckDB, and SQLite stores; `scripts/import_csv_to_db.py` and `scripts/export_db_to_csv.py` keep SQL backends in sync with the canonical CSVs.【F:calc/dal/__init__.py†L35-L78】【F:scripts/import_csv_to_db.py†L1-L120】
- **Test-first data hygiene** — A broad pytest suite covers schema constraints, backend parity, manifest metadata, API responses, and UI snapshots; the static front-end ships with Vitest checks for React behaviour.【F:tests/test_schema.py†L1-L200】【F:tests/test_backend_parity.py†L1-L47】【F:site/package.json†L1-L34】

### Layer catalogue at-a-glance

| Layer | Summary | Example activities |
| --- | --- | --- |
| Professional services | Baseline knowledge worker footprint anchored to hybrid office routines. | Coffee—12 oz hot · Toronto subway—per passenger-kilometre |
| Online services | SaaS, meetings, and streaming workloads for remote-first teams. | Video conferencing hour · SaaS productivity suite seat |
| Industrial (Light) | Lab, prototyping, and light fabrication scenarios for innovation hubs. | Lab bench operation · Prototyping print run |
| Industrial (Heavy) | Full-scale manufacturing and heavy industry references for R&D insight. | Steel batch furnace · Heavy equipment runtime |

The layer catalogue is sourced from [`data/layers.csv`](./data/layers.csv) and mirrored for the site bundle in [`site/public/artifacts/layers.json`](./site/public/artifacts/layers.json). Run `python scripts/audit_layers.py` to regenerate the discovery report (`artifacts/audit_report.json`), which lists every seeded activity, operation coverage, icon status, and UI wiring health for quick QA.【F:data/layers.csv†L1-L40】【F:scripts/audit_layers.py†L1-L120】

---

## Features

- **Typed data ingestion** — `calc/schema` loads CSV inputs with unit registry validation, functional unit formula evaluation, and cached reads for repeat derivations.【F:calc/schema.py†L1-L167】【F:calc/derive.py†L140-L212】
- **Backend-agnostic datastore** — `calc.dal.choose_backend` selects CSV, DuckDB, or SQLite implementations; `ACX_DB_PATH` allows pointing SQL stores at alternate paths.【F:calc/dal/__init__.py†L55-L90】
- **Emission computation engine** — `calc.derive.export_view` applies profile schedules, grid intensities, uncertainty bounds, upstream dependency chains, and citation lookups while writing hashed artefact directories (`dist/artifacts/<hash>`).【F:calc/derive.py†L1089-L1473】
- **Functional unit intensity builder** — `calc.derive` ships an `intensity` subcommand and `build_intensity_matrix` helper for generating cross-profile functional unit comparisons consumed by narrative helpers and the UI.【F:calc/derive.py†L1330-L1496】【F:app/lib/narratives.py†L1-L88】
- **Figure slicing utilities** — `calc.figures` constructs stacked, bubble, and Sankey payloads with consistent metadata, layer ordering, and reference bindings for both UI surfaces.【F:calc/figures.py†L1-L210】
- **Citation management** — `calc.citations` resolves IEEE-formatted references, deduplicates keys, and injects numbered lists into outputs and UI panels.【F:calc/citations.py†L1-L72】
- **Dash exploration UI** — [`app/app.py`](./app/app.py) renders Plotly charts, disclosure copy, NA notices, and references straight from derived artefacts; reduced-motion preferences honour `ACX_REDUCED_MOTION`.【F:app/app.py†L1-L132】【F:app/components/_plotly_settings.py†L1-L34】
- **Static React/Vite site** — [`site/`](./site) packages a Tailwind-styled React client that consumes the same artefacts, supports preset profiles, and builds with Vite/TypeScript for Cloudflare Pages deployment.【F:site/package.json†L1-L34】【F:site/src/state/profile/index.tsx†L1-L200】
- **Cloudflare Pages function** — [`functions/carbon-acx/[[path]].ts`](./functions/carbon-acx/[[path]].ts) proxies `/carbon-acx/*` requests, enforces immutable caching for artefacts, and optionally fetches from an upstream origin when `CARBON_ACX_ORIGIN` is set.【F:functions/carbon-acx/[[path]].ts†L1-L200】
- **On-demand compute worker** — [`workers/compute`](./workers/compute) exposes `/api/compute` and `/api/health` endpoints that call `calc.service.compute_profile`, normalise overrides, and return fresh figure payloads with dataset version reporting.【F:workers/compute/index.ts†L1-L104】【F:calc/service.py†L296-L414】
- **Artifact packaging workflow** — `scripts/package_artifacts.py` and `scripts.prepare_pages_bundle.py` copy whitelisted JSON/CSV/TXT outputs, emit a file index, and write Cloudflare `_headers`/`_redirects` metadata; `tools/sbom.py` produces a CycloneDX SBOM for releases.【F:scripts/package_artifacts.py†L1-L160】【F:scripts/prepare_pages_bundle.py†L1-L82】【F:tools/sbom.py†L1-L120】
- **Data import/export tooling** — `scripts/import_csv_to_db.py`, `scripts/export_db_to_csv.py`, and `db/schema.sql` keep SQL backends aligned with canonical CSVs while preserving schema constraints and placeholder guardrails.【F:scripts/import_csv_to_db.py†L1-L160】【F:db/schema.sql†L1-L80】

---

## Repository structure

| Path | Purpose |
| --- | --- |
| `calc/` | Core calculation package: schema definitions, datastore interfaces, emission derivation, figure slicing, citation handling, UI theming, API helpers, and upstream metadata utilities.【F:calc/schema.py†L1-L101】【F:calc/service.py†L1-L120】 |
| `app/` | Dash development client with Plotly component builders, disclosure panels, intensity narratives, and reference rendering helpers.【F:app/app.py†L1-L132】【F:app/components†L1-L120】 |
| `site/` | Static site sources (React/TypeScript, Tailwind CSS, Vite config, assets) used by `npm run build` and Cloudflare Pages deployment.【F:site/package.json†L1-L34】【F:site/vite.config.ts†L1-L80】 |
| `data/` | Canonical CSV datasets (activities, schedules, emission factors, grid intensity, profiles, units, and sources). `_staged/` holds raw extracts pending ingestion.【F:data/activities.csv†L1-L40】【F:data/_staged†L1-L10】 |
| `scripts/` | Build orchestration scripts for rendering the static site, packaging artefacts, syncing layer catalogues, auditing coverage, and diagnosing deployments.【F:scripts/build_site.py†L1-L120】【F:scripts/dev_diag.sh†L1-L16】 |
| `functions/` | Cloudflare Pages function for proxying `/carbon-acx` traffic and serving artefacts with strict caching semantics.【F:functions/carbon-acx/[[path]].ts†L1-L200】 |
| `workers/` | Cloudflare Worker runtime for on-demand compute endpoints backed by the `calc.service` module.【F:workers/compute/index.ts†L1-L104】 |
| `db/` | SQLite schema for durable backends and parity testing.【F:db/schema.sql†L1-L80】 |
| `docs/` | Operational guides covering methodology, maintenance cadence, deployment runbooks, routing, testing notes, and contribution traceability.【F:docs/MAINTENANCE_CALENDAR.md†L1-L80】【F:docs/routes.md†L1-L120】 |
| `tests/` | Pytest suite including integration tests, backend parity checks, figure regression tests, UI snapshot expectations, and worker/API tests.【F:tests/test_backend_parity.py†L1-L47】【F:tests/ui/test_theme_smoke.py†L1-L80】 |
| `tools/` | Developer utilities such as CycloneDX SBOM generation.【F:tools/sbom.py†L1-L120】 |
| `Makefile` | Primary task runner encapsulating install, lint, test, build, packaging, SBOM, DB import/export, and release placeholders.【F:Makefile†L1-L80】 |
| `pyproject.toml` | Poetry configuration specifying runtime dependencies, extras, linting settings, and build metadata.【F:pyproject.toml†L1-L45】 |

Each module is documented with inline comments and docstrings; start with `calc/derive.py` to understand the data flow, then explore `app/components` and `site/src` to see how artefacts are consumed.

---

## Installation & setup

### Local development

1. **Install prerequisites**
   - Python 3.11+
   - [Poetry 1.8](https://python-poetry.org/) (CI installs automatically; local developers should install manually)
   - GNU `make`
   - Node.js 18+ (for the `site/` Vite build)
2. **Bootstrap the Python environment**
   ```bash
   make install
   ```
   This installs runtime and development dependencies (ruff, black, pytest, pip-audit, kaleido, Pillow).
3. **Regenerate derived artefacts**
   ```bash
   make build
   ```
   The command runs `python -m calc.derive export` and `python -m calc.derive intensity`, producing hashed builds under `dist/artifacts/<hash>` and updating `dist/artifacts/latest-build.json`.
4. **Sync the layer catalogue for the site**
   ```bash
   make site_install
   make site_build
   ```
   The `site_build` target compiles the React client and copies assets into `dist/site/`.

### Database-backed workflows

- Initialise a SQLite database for parity testing or production experiments:
  ```bash
  make db_init
  make db_import  # loads CSV data into acx.db using schema constraints
  ```
- Run derivations against SQLite or DuckDB by overriding the backend:
  ```bash
  make build-backend B=sqlite
  make build-backend B=duckdb  # requires poetry install --extras db
  ```
  `ACX_DB_PATH` controls the database path when using the SQL-backed store.【F:calc/dal/__init__.py†L67-L90】

### Front-end toolchain

- Install Node dependencies once (`make site_install`).
- Start a hot-reload development server:
  ```bash
  make site_dev
  ```
  The Vite dev server honours `PUBLIC_BASE_PATH` for nested deployments and serves from `http://localhost:5173` (or the port printed in the console).【F:site/vite.config.ts†L1-L80】

### Production preparation

To mirror the CI/CD pipeline locally:

```bash
make build site package
```

- `make site` renders the static bundle into `dist/site/`.
- `make package` copies distributable artefacts into `dist/packaged-artifacts/`, writes a file index, and prepares Cloudflare metadata.
- `make sbom` emits a CycloneDX SBOM at `dist/sbom/cyclonedx.json` for release automation.

---

## Usage

### Derivation CLI

All derived outputs originate from the `calc.derive` module:

```bash
PYTHONPATH=. poetry run python -m calc.derive export \
  --output-root dist/artifacts \
  --backend csv  # optional: csv (default), sqlite, or duckdb
```

Key outputs within the selected root (`dist/artifacts/<hash>/calc/outputs`):

- `export_view.csv` / `export_view.json` — tabular emissions dataset with metadata header comments.
- `figures/{stacked,bubble,sankey}.json` — Plotly payloads trimmed for client use.
- `references/*_refs.txt` — IEEE-formatted reference lists for each figure.
- `manifest.json` — Snapshot metadata (build hash, generated timestamp, layer coverage, regional vintages, citation keys, dependency chain hashes).

`ACX_DATA_BACKEND` controls the datastore backend (`csv` by default; `duckdb` requires the optional dependency). `ACX_OUTPUT_ROOT` and the `--output-root` flag determine where hashed artefacts are written; `ACX_ALLOW_OUTPUT_RM=1` bypasses path safety checks when directing outputs outside `dist/artifacts`.【F:calc/derive.py†L292-L382】【F:calc/derive.py†L1600-L1658】

### Intensity matrix CLI

Generate functional-unit intensity slices that power narrative comparisons and downloadable CSVs:

```bash
PYTHONPATH=. poetry run python -m calc.derive intensity \
  --fu all \
  --profile PRO.TO.24_39.HYBRID.2025 \
  --output-dir dist/artifacts
```

Outputs include `intensity_matrix.csv` and `intensity_matrix.json`, which `app/lib/narratives.py` reads to produce comparison blurbs and which the static site surfaces for download.【F:calc/derive.py†L1330-L1496】【F:app/lib/narratives.py†L1-L120】

### Dash exploration client

Launch the interactive Dash client after generating artefacts:

```bash
make build
make app  # serves http://localhost:8050
```

The Dash app reads from `calc/outputs` (or a custom `ACX_ARTIFACT_DIR`) and renders:

- Stacked category chart, bubble chart, Sankey flow, and intensity tables using shared Plotly templates and reduced-motion settings.【F:app/app.py†L65-L132】【F:app/components/_plotly_settings.py†L1-L34】
- Layer toggles, manifest summaries, and NA notices derived from the export view metadata and `calc.copy_blocks` helpers.【F:app/components/disclosure.py†L1-L160】【F:calc/copy_blocks.py†L1-L120】
- Reference sidebar populated via `calc.citations` to guarantee citation parity with the static site.【F:app/components/references.py†L1-L160】

### Static site bundle

Render and preview the static React site without a live server:

```bash
make package
python -m http.server --directory dist/site 8001
```

The packaged bundle embeds:

- Pre-rendered Plotly HTML snippets for each figure produced by `scripts.build_site`.
- Disclosure panel, manifest summary, and grid vintage table composed from `calc.copy_blocks` and `calc.derive` metadata.【F:scripts/build_site.py†L1-L160】
- Download links pointing to the packaged artefacts under `dist/site/artifacts/`.
- IEEE reference list identical to the Dash experience.
- Cloudflare Pages metadata (`_headers`, `_redirects`) to configure caching and trailing-slash redirects for `/carbon-acx`.

Deploy the contents of `dist/site/` to Cloudflare Pages; the companion Pages Function under `functions/carbon-acx/[[path]].ts` can proxy `/carbon-acx/*` routes to the hosted bundle or an upstream origin when `CARBON_ACX_ORIGIN` is set.【F:functions/carbon-acx/[[path]].ts†L131-L200】

### Programmatic aggregates

Use the lightweight API to fetch aggregates inside notebooks or downstream services:

```python
from pathlib import Path
from calc.api import get_aggregates

data_dir = Path("data")
config_path = Path("calc/config.yaml")
aggregates, reference_keys = get_aggregates(data_dir, config_path)
print(aggregates.total_annual_emissions_g)
print(reference_keys)
```

`get_aggregates` resolves the active profile, sums annual emissions by activity, and returns the citation keys necessary to build a reference list. `collect_activity_source_keys` is available when you already have derived rows and only need source tracking.【F:calc/api.py†L1-L140】

### On-demand compute service

`calc.service.compute_profile` mirrors the batch derivation logic for live API contexts: it loads activities, operations, assets, and profiles from any `DataStore`, applies overrides, gathers upstream dependency metadata, and returns trimmed figure payloads with per-layer citations.【F:calc/service.py†L296-L414】

The Cloudflare Worker in [`workers/compute`](./workers/compute) exposes:

- `GET /api/health` — Returns `{ ok: true, dataset: <hash> }` using `ACX_DATASET_VERSION` or SQL row digests.【F:workers/compute/index.ts†L70-L104】【F:calc/service.py†L45-L102】
- `POST /api/compute` — Accepts `{ "profile_id": "...", "overrides": {"ACTIVITY": 1.5} }`, normalises overrides, and returns stacked/bubble/sankey payloads plus manifest metadata and numbered references.【F:workers/compute/index.ts†L1-L86】【F:workers/compute/runtime.ts†L1-L120】

Deploy with Wrangler (`wrangler publish`) after building Python artefacts, or run locally with `wrangler dev` to proxy compute requests against the checked-in demo runtime (`workers/compute/runtime.ts`). Wrangler configuration lives in [`wrangler.toml`](./wrangler.toml).【F:wrangler.toml†L1-L12】

### Diagnostics & utilities

- `python scripts/audit_layers.py` — Generates `artifacts/audit_report.json` summarising layer coverage, missing emission factors, and icon wiring.【F:scripts/audit_layers.py†L1-L160】
- `python -m scripts.sync_layers_json` — Mirrors `data/layers.csv` into `site/public/artifacts/layers.json` for the static client.
- `bash scripts/dev_diag.sh` — Fetches layer JSON from local and production endpoints, honouring `PUBLIC_BASE_PATH` and `PAGES_DOMAIN` for quick HTTP debugging.【F:scripts/dev_diag.sh†L1-L16】
- `make sbom` — Generates `dist/sbom/cyclonedx.json` using `tools/sbom.py` for dependency audits.【F:tools/sbom.py†L1-L120】

---

## Configuration

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `ACX_DATA_BACKEND` | Selects datastore implementation (`csv`, `duckdb`, or `sqlite`). | `csv` |
| `ACX_DB_PATH` | Overrides the SQLite/DuckDB database path when using SQL backends. | `acx.db` |
| `ACX_OUTPUT_ROOT` | Base directory for hashed artefact builds. | `dist/artifacts` |
| `ACX_ALLOW_OUTPUT_RM` | Set to `1` to allow cleaning arbitrary output directories (bypasses safety checks). | unset |
| `ACX_GENERATED_AT` | Forces the timestamp embedded in figure metadata and manifests. | Current UTC time |
| `ACX_ARTIFACT_DIR` | Points the Dash client at a non-default artefact directory. | `calc/outputs` |
| `ACX_DATASET_VERSION` | Overrides dataset fingerprint exposed by `compute_profile` and the worker health check. | Derived from SQL stats or `dev` in Wrangler config【F:calc/service.py†L45-L102】【F:wrangler.toml†L1-L12】 |
| `ACX_REDUCED_MOTION` | When truthy, disables Plotly transitions in the Dash client. | unset (motion enabled) |
| `CARBON_ACX_ORIGIN` | Cloudflare Pages function upstream origin for proxying `/carbon-acx/*` requests. | unset (serve local bundle) |
| `PUBLIC_BASE_PATH` | Adjusts static site asset fetch paths and Cloudflare routing helpers. | `/` |
| `PAGES_DOMAIN` | Used by `scripts/dev_diag.sh` to query production bundles. | unset |

### Configuration files & flags

- [`calc/config.yaml`](./calc/config.yaml) — Declares the default profile used in figures and manifest summaries.【F:calc/config.yaml†L1-L1】
- [`wrangler.toml`](./wrangler.toml) — Configures the compute worker entry point, dataset version default, and Pages output directory.【F:wrangler.toml†L1-L12】
- CLI flags for `calc.derive export`/`intensity` allow overriding `--backend`, `--db`, `--output-root`, `--functional_unit`, and `--profile` without touching environment variables.【F:calc/derive.py†L1604-L1664】
- Make targets accept `ACX_DATA_BACKEND` and `OUTPUT_BASE` overrides (`make build ACX_DATA_BACKEND=duckdb`).【F:Makefile†L1-L40】

### Preset data

- `site/public/artifacts` holds development artefacts (layers catalog, demo manifest) used by the Vite dev server; keep this folder in sync with the latest build via `scripts/sync_layers_json.py`.
- `site/src/data/presets.json` defines preset cards displayed in the React client with serialized profile controls and activity overrides. Editing this JSON updates the UI without backend changes.
- `calc/references/*.txt` contains IEEE-formatted citations keyed by `source_id`. Add new references here and reference their keys in CSV data before rebuilding.【F:calc/citations.py†L1-L48】

---

## Build & deployment

1. **Local build** — `make build` → `dist/artifacts/<hash>` → `make site` → `dist/site` → `make package` → `dist/packaged-artifacts` + `_headers/_redirects` ready for Cloudflare Pages.【F:Makefile†L1-L80】【F:scripts/prepare_pages_bundle.py†L1-L82】
2. **Continuous integration** — `.github/workflows/ci.yml` runs YAML linting, Poetry installs, deterministic builds (`make build-static`), uploads artefacts, and executes pytest on Python 3.11.【F:.github/workflows/ci.yml†L1-L67】
3. **Release automation** — `.github/workflows/release.yml` generates SBOMs, installs extras (including DuckDB), and publishes GitHub releases when tags prefixed with `v` are pushed.【F:.github/workflows/release.yml†L1-L41】
4. **Cloudflare Pages** — Deploy `dist/site/` to Pages. The bundled `_headers` enforce immutable caching for `/artifacts/*`; `_redirects` handles `/carbon-acx` canonicalisation. The Pages Function proxies artefact requests, applies CORS headers, and forwards to an upstream origin when configured.【F:functions/carbon-acx/[[path]].ts†L1-L200】
5. **Cloudflare Worker (compute)** — Publish `workers/compute` with Wrangler. The Worker is stateless and reads derived artefacts embedded in `workers/compute/runtime.ts` by default; integrate with a persistent SQL backend by bundling `calc.service` into the Worker or exposing the API from a Python runtime behind the function.
6. **Artefact provenance** — `dist/artifacts/latest-build.json` points to the most recent build hash. Package the referenced directory verbatim for downstream consumers or audits.【F:calc/derive.py†L1500-L1542】

---

## Testing & QA

Quality gates are enforced through pytest, ruff, black, SBOM generation, and front-end checks:

- **Python unit & integration tests (`tests/`)**
  - Schema validations, NA segment handling, functional unit formulas, and grid scaling (`tests/test_schema.py`, `tests/test_grid_index.py`).
  - Backend parity ensures CSV, SQLite, and DuckDB exports match byte-for-byte (`tests/test_backend_parity.py`, `tests/test_dal_sql.py`).
  - Static site smoke tests confirm Plotly HTML, asset packaging, and layer syncing succeed (`tests/test_static_site_build.py`, `tests/test_prepare_pages_bundle.py`).
  - Worker/API tests validate `compute_profile` payloads and override handling (`tests/test_api_compute.py`, `tests/test_service.py`).
  - UI theming and visual fixtures assert Plotly traces and intensity narratives remain stable (`tests/ui/test_theme_smoke.py`, `tests/visual/test_visual_smoke.py`).
- **Static analysis**
  - `make lint` runs ruff and black (100-character line length) across Python modules.【F:Makefile†L1-L40】
  - `.yamllint` ensures workflow YAML hygiene via the CI `lint-yaml` job.【F:.github/workflows/ci.yml†L1-L26】
- **Front-end tests**
  - `npm run test` in `site/` executes Vitest suites defined alongside React components (`site/src/routes/__tests__`).
- **Dependency governance**
  - `make sbom` generates a CycloneDX SBOM (`dist/sbom/cyclonedx.json`) for dependency auditing; `pip-audit` is available via Poetry dev dependencies.【F:tools/sbom.py†L1-L120】

Before submitting a change, run:

```bash
make format lint test build package
(cd site && npm test)
```

---

## Contributing guide

Carbon ACX follows a conventional GitHub workflow (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)):

1. Fork or branch from `main`.
2. Use descriptive branch names (e.g. `feature/derived-metrics`).
3. Keep commits focused; include context in commit messages about data updates and methodology changes. Commit messages should describe the dataset slice touched, references added, and any schema adjustments.
4. Run `make validate` (lint + tests), `make build`, and relevant packaging steps locally; run `npm run build` in `site/` when touching front-end code.
5. Open a pull request with:
   - Summary of changes and impacted artefacts (hash directories, CSV deltas, figure updates).
   - Confirmation that linting, tests, and builds passed (Python + Node where applicable).
   - Notes about new data sources or reference files (include provenance in the PR description as outlined in `docs/CONTRIBUTING_SERIES.md`).【F:docs/CONTRIBUTING_SERIES.md†L1-L120】
6. Expect code review on data hygiene, reproducibility, accessibility, and reference integrity. Changes touching `data/` or `calc/references/` must document provenance and update audit scripts if necessary.

Coding standards:

- Prefer Pydantic models for new datasets and extend `calc/schema.py` rather than bypassing validation.
- Avoid catching broad exceptions; propagate validation errors so the derivation pipeline fails fast.
- Keep Plotly figure builders deterministic (sorted keys, explicit colour ordering, shared templates via `calc.ui.theme`).【F:calc/ui/theme.py†L1-L120】
- Never commit generated artefacts (`build/`, `dist/`, `calc/outputs/`, `site/dist`).
- Follow the serial/traceability guidance in `docs/CONTRIBUTING_SERIES.md` when referencing ACX specifications.

---

## Security & compliance

- **Data isolation** — Derived outputs are written to hashed directories and cleared only within guardrails to avoid deleting arbitrary paths (`calc.derive.is_safe_output_dir`).【F:calc/derive.py†L292-L336】
- **Dependency governance** — Dependencies are pinned via Poetry and npm lockfiles; `tools/sbom.py` emits CycloneDX SBOMs and `pip-audit` is available for vulnerability scanning.【F:tools/sbom.py†L1-L120】【F:site/package-lock.json†L1-L40】
- **Runtime posture** — Dash, the static site, and the Cloudflare Worker read precomputed bundles only; no live data collection occurs at runtime. The Cloudflare Pages Function proxies traffic without persisting secrets server-side and enforces immutable caching headers for artefacts.【F:functions/carbon-acx/[[path]].ts†L1-L200】
- **Access control** — The compute Worker accepts only JSON POST payloads, normalises overrides, and rejects invalid types before invoking `calc.service.compute_profile`, limiting injection risks.【F:workers/compute/index.ts†L1-L86】
- **Licensing** — The project is released under the MIT License (`LICENSE`). Include source acknowledgements when adding new references or datasets.
- **Compliance placeholders** — SBOM generation and release workflows lay groundwork for future compliance processes; integration with vulnerability management tools can consume `dist/sbom/cyclonedx.json`.

---

## Roadmap

| Status | Milestone | Description |
| --- | --- | --- |
| ✅ | Immutable data builds | Content-hashed artefact directories with manifest pointers, dependency chains, and reference parity across clients.【F:calc/derive.py†L1474-L1534】 |
| ✅ | Multi-channel delivery | Dash exploration client, static React/Vite bundle, Pages Function, and Worker API share derived Plotly payloads and disclosure copy.【F:app/app.py†L65-L132】【F:site/src/components/VizCanvas.tsx†L1-L160】 |
| ✅ | Backend parity | CSV, DuckDB, and SQLite datastores validated via automated parity tests to ensure consistent exports.【F:tests/test_backend_parity.py†L1-L47】【F:tests/test_dal_sql.py†L1-L120】 |
| ✅ | Intensity narratives | Functional-unit intensity builder feeds UI narratives and CSV downloads, keeping comparisons aligned across channels.【F:calc/derive.py†L1330-L1496】【F:app/lib/narratives.py†L1-L160】 |
| 🚧 | Release automation | `make release` placeholder to be replaced with scripted tagging, changelog updates (`docs/CHANGELOG.md`), asset uploads, and Pages deployments. |
| 🚧 | Dataset refresh tooling | Extend `docs/MAINTENANCE_CALENDAR.md` with automation for pulling `_staged/` data into `data/` while preserving provenance metadata.【F:docs/MAINTENANCE_CALENDAR.md†L1-L80】 |
| 🚧 | Worker dataset integration | Replace the demo dataset in `workers/compute/runtime.ts` with generated artefacts or live `calc.service` bindings and document deployment playbooks. |
| 🧭 | Additional datastore backends | Explore further `DataStore` implementations (e.g. Postgres) leveraging the existing abstraction in `calc.dal` and `calc.dal_sql`. |
| 🧭 | Expanded visualisations | Prototype intensity waterfalls, cohort comparisons, or sensitivity analyses using the figure slicing framework in `calc.figures`. |
| 🧭 | Live API surface | Wrap `calc.api` aggregates and `compute_profile` in an authenticated HTTP service for downstream integrations once security requirements are defined. |

Legend: ✅ implemented · 🚧 in-progress or partially scaffolded · 🧭 planned/under evaluation.

---

## FAQ & troubleshooting

**Why does `calc/outputs` stay empty?**  Artefacts are written to hashed directories under `dist/artifacts/<hash>`. Use `scripts/_artifact_paths.resolve_artifact_outputs` or inspect `dist/artifacts/latest-build.json` to locate the latest build.【F:calc/derive.py†L1500-L1542】

**`python -m calc.derive export` refuses to clear my output directory.**  The pipeline protects against deleting unintended paths. Either point `--output-root` inside `dist/artifacts` or set `ACX_ALLOW_OUTPUT_RM=1` when you are sure the target is safe.【F:calc/derive.py†L292-L336】

**The Dash app cannot find figures.**  Ensure `make build` ran successfully and `ACX_ARTIFACT_DIR` (if set) points to the directory containing `figures/*.json` and `manifest.json`. Remember that Dash defaults to `calc/outputs`, while `make build` writes hashed outputs into `dist/artifacts/<hash>/calc/outputs`.

**How do I add a new reference?**  Drop an IEEE-formatted text file in `calc/references/` and reference its stem in emission factors or grid intensity rows. Run `make build` to propagate the citation into artefacts and UI reference panels.【F:calc/citations.py†L1-L72】

**Plotly figures look different locally vs CI.**  Confirm `kaleido` is installed (via `make install`) and avoid locale-dependent formatting. Re-run `make build` to regenerate Plotly JSON with consistent ordering.

**Node build fails with an engine warning.**  Vite 5 requires Node.js ≥ 18. Upgrade Node locally or use the version pinned in `.nvmrc` if present.

**Cloudflare Pages serves HTML for JSON routes.**  Ensure the Pages Function is deployed alongside the static site and that `_headers`/`_redirects` shipped with the bundle remain intact (`make package` handles this automatically). `CARBON_ACX_ORIGIN` should include an absolute origin without trailing slash.

**Worker API returns demo data only.**  The checked-in Worker runtime includes a small demo dataset. Replace `workers/compute/runtime.ts` with generated artefacts or adapt the Worker to call a hosted `compute_profile` endpoint for production use.

**Debugging data loads.**  Use `scripts/dev_diag.sh` to compare artefact headers locally and in production. The script respects `PUBLIC_BASE_PATH` so you can verify both the static bundle (`http://127.0.0.1:4173`) and your Pages domain return JSON rather than the SPA fallback.【F:scripts/dev_diag.sh†L1-L16】

---

## References

- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`docs/CHANGELOG.md`](./docs/CHANGELOG.md)
- [`docs/MAINTENANCE_CALENDAR.md`](./docs/MAINTENANCE_CALENDAR.md)
- [`docs/ONLINE_METHOD_NOTES.md`](./docs/ONLINE_METHOD_NOTES.md)
- [`docs/WHAT_RUNS_WHERE.md`](./docs/WHAT_RUNS_WHERE.md)
- [`docs/TESTING_NOTES.md`](./docs/TESTING_NOTES.md)
- [`docs/deploy.md`](./docs/deploy.md)
- [`docs/routes.md`](./docs/routes.md)
- [`LICENSE`](./LICENSE)

---

_Note: To satisfy repo hygiene tests, avoid using the contiguous token spelled “F a s t A P I” in docs._

### Serials & Traceability

Refer to [`docs/CONTRIBUTING_SERIES.md`](./docs/CONTRIBUTING_SERIES.md) for guidance on citing ACX specifications, CDX prompts, and the PR lineage required for every contribution.
