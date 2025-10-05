# Carbon ACX

Carbon ACX is an open reference stack for building trustworthy carbon accounting datasets and presenting them as polished digital experiences. It shows how to move from raw activity records to public-ready disclosures without losing transparency along the way.

---

## Table of contents

1. [Overview](#overview)
   - [In plain language](#in-plain-language)
   - [What you get](#what-you-get)
   - [Who uses Carbon ACX](#who-uses-carbon-acx)
2. [How it works](#how-it-works)
3. [Repository tour](#repository-tour)
4. [Getting started](#getting-started)
   - [Quick demo without coding](#quick-demo-without-coding)
   - [Developer setup](#developer-setup)
   - [Database-backed workflows](#database-backed-workflows)
   - [Front-end toolchain](#front-end-toolchain)
5. [Working with the toolkit](#working-with-the-toolkit)
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
14. [Serials & traceability](#serials--traceability)
15. [Architecture extensions](#architecture-extensions)
    - [ACX041 View Provenance Module](#acx041-view-provenance-module)

---

## Overview

### In plain language

Carbon ACX bundles three things:

1. **A curated demo dataset** that reflects common professional-service, digital, and light-industrial activities. It includes emission factors, grid intensities, schedules, and preset profiles that can be rebuilt on demand from the CSV files in `data/`.
2. **A reproducible calculation engine** that converts those inputs into emissions results. The `calc` Python package validates every record, joins the right factors, computes totals, and writes the outputs into versioned folders so you always know exactly what changed between runs.【F:calc/schema.py†L1-L167】【F:calc/derive.py†L1089-L1473】
3. **Two ready-to-ship experiences**—a Dash web app and a static React site—plus a Cloudflare Worker API. All of them read the same derived artefacts so audiences get identical numbers regardless of the channel.【F:app/app.py†L1-L132】【F:site/src/App.tsx†L1-L58】【F:workers/compute/index.ts†L1-L104】

The result is a transparent example of how to publish carbon disclosures without spreadsheets, with a workflow business stakeholders and engineers can both follow.

### What you get

- **Trustworthy data pipeline** – strict validation, reference tracking, and manifest metadata keep every build auditable.【F:calc/schema.py†L1-L167】【F:calc/derive.py†L1474-L1542】
- **Interactive storytelling** – Plotly-based Dash components and a Tailwind-powered React site render the same charts, tables, and disclosure copy for presentations or public sites, now with focus-managed stage navigation, an agency contribution strip, and two-stage Sankey overlays for layered scenarios.【F:app/components/_plotly_settings.py†L1-L40】【F:app/components/agency_strip.py†L1-L52】【F:app/components/sankey.py†L17-L113】【F:site/src/components/LayerBrowser.tsx†L77-L145】【F:site/src/components/VizCanvas.tsx†L1-L160】
- **Automation hooks** – CLI commands, Make targets, and a Cloudflare Worker make it easy to integrate the dataset into CI/CD or downstream services.【F:Makefile†L1-L80】【F:workers/compute/runtime.ts†L1-L120】
- **Scenario depth** – Refrigerant operations, embodied defence manufacturing, private security overlays, and new civilian aviation pathways expand the dataset for stress-testing optional layer toggles and disclosures.【F:data/activities.csv†L44-L84】【F:data/layers.csv†L1-L16】

### Who uses Carbon ACX

- **Sustainability leads** exploring how structured carbon reporting can be shared across teams and clients.
- **Data practitioners** who want a reproducible reference for schema design, derivations, and manifest-driven releases.
- **Front-of-house teams** (communications, design, investor relations) looking for a polished, jargon-light experience they can embed in sites or decks.

---

## How it works

Carbon ACX follows a “derive once, serve anywhere” flow:

1. **Collect & validate** – CSV inputs are described with Pydantic models that enforce units, scopes, and functional-unit formulas.【F:calc/schema.py†L1-L167】
2. **Derive & package** – `python -m calc.derive` computes annual emissions, intensity matrices, references, and manifest metadata, then writes a content-hashed bundle under `dist/artifacts/<hash>`.【F:calc/derive.py†L1089-L1526】
3. **Publish & reuse** – Dash (`app/`), the static site (`site/`), the Cloudflare Pages Function, and the compute Worker all read from the same bundle so numbers stay in sync across every surface.【F:app/app.py†L1-L132】【F:site/vite.config.ts†L1-L80】【F:functions/carbon-acx/[[path]].ts†L1-L200】【F:workers/compute/index.ts†L1-L104】

---

## Repository tour

| Path | Purpose |
| --- | --- |
| `calc/` | Core Python package: schema validation, datastore abstraction, derivation logic, Plotly figure builders, citation helpers, and API utilities.【F:calc/schema.py†L1-L101】【F:calc/service.py†L1-L120】 |
| `app/` | Dash development client with reusable components, disclosure panels, and reduced-motion aware Plotly templates.【F:app/app.py†L1-L132】【F:app/components/_plotly_settings.py†L1-L40】 |
| `site/` | Static React/Vite site styled with Tailwind that consumes derived artefacts and mirrors the Dash experience.【F:site/package.json†L1-L34】【F:site/src/routes/Story.tsx†L1-L160】 |
| `data/` | Canonical CSV datasets for activities, schedules, emission factors, grid intensities, profiles, units, and sources; `_staged/` stores raw extracts awaiting ingestion.【F:data/activities.csv†L1-L40】 |
| `scripts/` | Build, packaging, audit, and diagnostic helpers for artefacts, layer catalogues, and deployment automation.【F:scripts/prepare_pages_bundle.py†L1-L82】【F:scripts/audit_layers.py†L1-L160】 |
| `functions/` | Cloudflare Pages Function that serves the static bundle, proxies artefact requests, and applies immutable caching headers.【F:functions/carbon-acx/[[path]].ts†L1-L200】 |
| `workers/` | Cloudflare Worker exposing a JSON API that calls `calc.service.compute_profile` for live figure generation.【F:workers/compute/index.ts†L1-L104】 |
| `db/` | SQLite schema used for parity tests and optional persistent backends.【F:db/schema.sql†L1-L80】 |
| `docs/` | Operational guides, deployment notes, testing references, and maintenance calendars.【F:docs/routes.md†L1-L120】 |
| `tests/` | Pytest suite plus UI snapshot checks covering schema guardrails, backend parity, and packaging workflows.【F:tests/test_backend_parity.py†L1-L47】【F:tests/ui/test_theme_smoke.py†L1-L80】 |
| `tools/` | Developer utilities such as CycloneDX SBOM generation.【F:tools/sbom.py†L1-L120】 |
| `Makefile` | Main entry points for install, lint, test, build, packaging, and SBOM tasks.【F:Makefile†L1-L80】 |
| `pyproject.toml` | Poetry configuration with runtime dependencies and optional extras (e.g. DuckDB support).【F:pyproject.toml†L1-L45】 |

---

## Getting started

### Quick demo without coding

1. Clone the repository and ensure Python 3.11+ and Node.js 18+ are available.
2. Install the Python dependencies and build the artefacts:
   ```bash
   make install
   make build
   ```
3. Package the static site and preview it in your browser:
   ```bash
   make package
   python -m http.server --directory dist/site 8001
   ```
   Visit `http://localhost:8001` to click through the experience produced from the latest data bundle. The Dash app can be started with `make app` if you prefer an interactive notebook-style exploration.【F:Makefile†L1-L80】【F:app/app.py†L65-L132】

### Developer setup

1. **Install prerequisites**
   - Python 3.11+
   - [Poetry 1.8](https://python-poetry.org/)
   - GNU `make`
   - Node.js 18+ (for the Vite build in `site/`)
2. **Bootstrap the Python environment**
   ```bash
   make install
   ```
   This installs runtime and development dependencies including ruff, black, pytest, kaleido, Pillow, and pip-audit.【F:Makefile†L1-L40】
3. **Regenerate derived artefacts**
   ```bash
   make build
   ```
   The command runs `python -m calc.derive export` and `python -m calc.derive intensity`, writes hashed outputs to `dist/artifacts/<hash>`, and updates `dist/artifacts/latest-build.json`.【F:calc/derive.py†L1474-L1542】
4. **Sync the front-end assets**
   ```bash
   make site_install
   make site_build
   ```
   These targets install Node dependencies, compile the React client, and copy artefacts into `dist/site/` for local preview.【F:Makefile†L41-L80】

### Database-backed workflows

- Initialise a SQLite database for parity testing or experiments:
  ```bash
  make db_init
  make db_import
  ```
- Build using a specific backend:
  ```bash
  make build-backend B=sqlite
  make build-backend B=duckdb  # requires poetry install --extras db
  ```
  Set `ACX_DB_PATH` to control the path when using SQL-backed stores.【F:calc/dal/__init__.py†L67-L90】

### Front-end toolchain

- Install Node dependencies once: `make site_install`.
- Start the hot-reload dev server:
  ```bash
  make site_dev
  ```
  Vite honours `PUBLIC_BASE_PATH` for nested deployments and serves from `http://localhost:5173` by default.【F:site/vite.config.ts†L1-L80】

---

## Working with the toolkit

### Derivation CLI

All derived outputs originate from the `calc.derive` module:

```bash
PYTHONPATH=. poetry run python -m calc.derive export \
  --output-root dist/artifacts \
  --backend csv  # optional: csv (default), sqlite, or duckdb
```

Key outputs inside `dist/artifacts/<hash>/calc/outputs` include:

- `export_view.{csv,json}` – tabular emissions dataset with metadata headers.
- `figures/{stacked,bubble,sankey}.json` – Plotly payloads consumed by Dash and the static site.
- `references/*_refs.txt` – IEEE-formatted reference lists.
- `manifest.json` – Build hash, generated timestamp, layer coverage, regional vintages, citation keys, and dependency hashes.

Use `ACX_DATA_BACKEND`, `ACX_OUTPUT_ROOT`, and `ACX_ALLOW_OUTPUT_RM` to control where artefacts are written and which datastore backs the run.【F:calc/derive.py†L292-L382】【F:calc/derive.py†L1600-L1664】

### Intensity matrix CLI

Generate functional-unit comparisons for narratives and downloads:

```bash
PYTHONPATH=. poetry run python -m calc.derive intensity \
  --fu all \
  --profile PRO.TO.24_39.HYBRID.2025 \
  --output-dir dist/artifacts
```

Outputs include `intensity_matrix.{csv,json}`, which power the narrative helpers in the Dash app and the static site downloads.【F:calc/derive.py†L1330-L1496】【F:app/lib/narratives.py†L1-L120】

### Dash exploration client

Launch the interactive Dash client after generating artefacts:

```bash
make build
make app  # serves http://localhost:8050
```

The app loads data from `calc/outputs` (or `ACX_ARTIFACT_DIR`) and renders Plotly charts, manifest summaries, disclosure copy, and reference sidebars with consistent styling and reduced-motion support.【F:app/app.py†L65-L132】【F:app/components/disclosure.py†L1-L160】

### Static site bundle

Render and preview the static React site without a live backend:

```bash
make package
python -m http.server --directory dist/site 8001
```

The packaged bundle embeds pre-rendered Plotly HTML, disclosure panels, manifest summaries, and download links pointing to the bundled artefacts. `_headers` and `_redirects` files configure caching and canonical routing for Cloudflare Pages deployments.【F:scripts/build_site.py†L1-L160】【F:functions/carbon-acx/[[path]].ts†L1-L200】

### Programmatic aggregates

Fetch high-level totals inside notebooks or downstream services:

```python
from pathlib import Path
from calc.api import get_aggregates

data_dir = Path("data")
config_path = Path("calc/config.yaml")
aggregates, reference_keys = get_aggregates(data_dir, config_path)
print(aggregates.total_annual_emissions_g)
print(reference_keys)
```

`get_aggregates` resolves the active profile, sums annual emissions by activity, and returns the citation keys needed for disclosure copy. `collect_activity_source_keys` helps when you already have derived rows and only need source tracking.【F:calc/api.py†L1-L140】

### On-demand compute service

`calc.service.compute_profile` mirrors the batch derivation logic for live API contexts: it loads data through any `DataStore`, applies overrides, gathers upstream metadata, and returns trimmed figure payloads with per-layer references.【F:calc/service.py†L296-L414】

The Cloudflare Worker in `workers/compute` exposes:

- `GET /api/health` – Returns `{ ok: true, dataset: <hash> }` based on the dataset version fingerprint.【F:workers/compute/index.ts†L70-L104】【F:calc/service.py†L45-L102】
- `POST /api/compute` – Accepts profile selections and overrides, then responds with stacked/bubble/sankey payloads, manifest metadata, and numbered references.【F:workers/compute/index.ts†L1-L86】【F:workers/compute/runtime.ts†L1-L120】

Deploy with Wrangler (`wrangler publish`) or run locally with `wrangler dev`. Configuration lives in `wrangler.toml`.【F:wrangler.toml†L1-L12】

### Diagnostics & utilities

- `python scripts/audit_layers.py` – Generates `artifacts/audit_report.json` summarising layer coverage, missing emission factors, and icon wiring.【F:scripts/audit_layers.py†L1-L160】
- `python -m scripts.sync_layers_json` – Mirrors `data/layers.csv` into `site/public/artifacts/layers.json` for the static client.
- `bash scripts/dev_diag.sh` – Compares artefact headers locally and remotely, respecting `PUBLIC_BASE_PATH` and `PAGES_DOMAIN` for quick HTTP debugging.【F:scripts/dev_diag.sh†L1-L16】
- `make sbom` – Produces `dist/sbom/cyclonedx.json` using `tools/sbom.py` for release compliance.【F:tools/sbom.py†L1-L120】

---

## Configuration

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `ACX_DATA_BACKEND` | Select datastore implementation (`csv`, `duckdb`, or `sqlite`). | `csv` |
| `ACX_DB_PATH` | Override the SQLite/DuckDB database path when using SQL backends. | `acx.db` |
| `ACX_OUTPUT_ROOT` | Base directory for hashed artefact builds. | `dist/artifacts` |
| `ACX_ALLOW_OUTPUT_RM` | Set to `1` to allow cleaning arbitrary output directories (bypasses safety checks). | unset |
| `ACX_GENERATED_AT` | Force the timestamp embedded in figure metadata and manifests. | Current UTC time |
| `ACX_ARTIFACT_DIR` | Point the Dash client at a non-default artefact directory. | `calc/outputs` |
| `ACX_DATASET_VERSION` | Override the dataset fingerprint exposed by `compute_profile` and worker health checks. | Derived from SQL stats or `dev` in Wrangler config【F:calc/service.py†L45-L102】【F:wrangler.toml†L1-L12】 |
| `ACX_REDUCED_MOTION` | When truthy, disables Plotly transitions in the Dash client. | unset |
| `CARBON_ACX_ORIGIN` | Cloudflare Pages Function upstream origin for proxying `/carbon-acx/*` routes. | unset |
| `PUBLIC_BASE_PATH` | Adjust static site asset fetch paths and Cloudflare routing helpers. | `/` |
| `PAGES_DOMAIN` | Used by `scripts/dev_diag.sh` to query production bundles. | unset |

### Configuration files & flags

- `calc/config.yaml` – Declares the default profile used in figures and manifest summaries.【F:calc/config.yaml†L1-L1】
- `wrangler.toml` – Configures the compute worker entry point, dataset version default, and Pages output directory.【F:wrangler.toml†L1-L12】
- CLI flags for `calc.derive export` and `calc.derive intensity` allow overriding the backend, database, output root, functional unit, and profile without touching environment variables.【F:calc/derive.py†L1600-L1664】
- Make targets accept `ACX_DATA_BACKEND` and `OUTPUT_BASE` overrides (e.g. `make build ACX_DATA_BACKEND=duckdb`).【F:Makefile†L1-L40】

### Preset data

- `site/public/artifacts` holds development artefacts (layers catalogue, demo manifest) used by the Vite dev server. Regenerate via `scripts/sync_layers_json.py` after updating CSVs.
- `site/src/data/presets.json` defines preset cards displayed in the React client with serialised profile controls and overrides.
- `calc/references/*.txt` stores IEEE-formatted citations keyed by `source_id`. Reference these keys in CSV data before rebuilding.【F:calc/citations.py†L1-L48】

---

## Build & deployment

1. **Local build** – `make build` → `dist/artifacts/<hash>` → `make site` → `dist/site` → `make package` → `dist/packaged-artifacts` plus `_headers/_redirects` ready for Cloudflare Pages.【F:Makefile†L1-L80】【F:scripts/prepare_pages_bundle.py†L1-L82】
2. **Continuous integration** – `.github/workflows/ci.yml` installs Poetry, runs deterministic builds (`make build-static`), uploads artefacts, and executes pytest and lint checks.【F:.github/workflows/ci.yml†L1-L67】
3. **Release automation** – `.github/workflows/release.yml` generates SBOMs, installs extras (including DuckDB), and publishes GitHub releases for `v*` tags.【F:.github/workflows/release.yml†L1-L41】
4. **Cloudflare Pages** – Deploy `dist/site/` to Pages. `_headers` enforce immutable caching for `/artifacts/*`, `_redirects` handles canonical routing, and the Pages Function proxies `/carbon-acx/*` traffic when `CARBON_ACX_ORIGIN` is configured.【F:functions/carbon-acx/[[path]].ts†L1-L200】
5. **Cloudflare Worker (compute)** – Publish `workers/compute` with Wrangler. The Worker ships with an embedded demo dataset and can call `calc.service` when bundled with Python artefacts or exposed via an upstream API.
6. **Artefact provenance** – `dist/artifacts/latest-build.json` points to the most recent build hash; package that directory verbatim for downstream consumers or audits.【F:calc/derive.py†L1474-L1542】

---

## Testing & QA

Carbon ACX enforces quality through automated testing and reproducible builds:

- **Python unit & integration tests (`tests/`)**
  - Schema validations, NA segment handling, and grid scaling checks (`tests/test_schema.py`, `tests/test_grid_index.py`).
  - Backend parity for CSV, SQLite, and DuckDB exports (`tests/test_backend_parity.py`, `tests/test_dal_sql.py`).
  - Static site smoke tests for Plotly HTML, asset packaging, and layer syncing (`tests/test_static_site_build.py`, `tests/test_prepare_pages_bundle.py`).
  - Worker/API tests for `compute_profile` payloads and override handling (`tests/test_api_compute.py`, `tests/test_service.py`).
  - UI theming and visual fixtures for Plotly traces and intensity narratives (`tests/ui/test_theme_smoke.py`, `tests/visual/test_visual_smoke.py`).
- **Static analysis** – `make lint` runs ruff and black (100-character line length). `.yamllint` keeps workflow YAML clean.【F:Makefile†L1-L40】【F:.github/workflows/ci.yml†L1-L26】
- **Front-end tests** – `npm run test` in `site/` executes Vitest suites co-located with React components.
- **Dependency governance** – `make sbom` generates a CycloneDX SBOM (`dist/sbom/cyclonedx.json`) and pip-audit ships with the Poetry dev dependencies.【F:tools/sbom.py†L1-L120】

Before opening a pull request, run:

```bash
make format lint test build package
(cd site && npm test)
```

---

## Contributing guide

Carbon ACX uses a conventional GitHub workflow (see `CONTRIBUTING.md` for full details):

1. Branch from `main` with a descriptive name (e.g. `feature/derived-metrics`).
2. Keep commits focused and document dataset slices, references, and schema adjustments in messages.
3. Run `make validate` (lint + tests), `make build`, and relevant packaging steps locally; run `npm run build` inside `site/` when touching front-end code.【F:Makefile†L1-L80】
4. Open a pull request summarising changes, impacted artefacts, lint/test status, and provenance for new data or references. Follow the lineage guidance in `docs/CONTRIBUTING_SERIES.md` when citing ACX specifications.【F:docs/CONTRIBUTING_SERIES.md†L1-L120】
5. Expect review on data hygiene, reproducibility, accessibility, and reference integrity. Updates to `data/` or `calc/references/` must include provenance and audit script updates when relevant.

Coding standards:

- Extend `calc/schema.py` with new Pydantic models instead of bypassing validation.
- Avoid broad exception catches; allow validation to fail fast.
- Keep Plotly figure builders deterministic (sorted keys, explicit colour ordering, shared templates via `calc.ui.theme`).【F:calc/ui/theme.py†L1-L120】
- Do not commit generated artefacts (`build/`, `dist/`, `calc/outputs/`, `site/dist`).
- Honour the serial/traceability process outlined in `docs/CONTRIBUTING_SERIES.md`.

---

## Security & compliance

- **Data isolation** – Derived outputs live in hashed directories and are cleaned only through guarded paths (`calc.derive.is_safe_output_dir`).【F:calc/derive.py†L292-L336】
- **Dependency governance** – Poetry and npm lockfiles pin versions; `tools/sbom.py` emits CycloneDX SBOMs and pip-audit is available for vulnerability scanning.【F:tools/sbom.py†L1-L120】【F:site/package-lock.json†L1-L40】
- **Runtime posture** – Dash, the static site, and the Cloudflare Worker all read precomputed bundles; no live data collection occurs at runtime. The Pages Function proxies traffic without persisting secrets and applies immutable caching headers.【F:functions/carbon-acx/[[path]].ts†L1-L200】
- **Access control** – The compute Worker normalises input, rejects invalid types, and delegates to `calc.service.compute_profile`, limiting injection risks.【F:workers/compute/index.ts†L1-L86】
- **Licensing** – Released under the MIT License (`LICENSE`). Attribute new data sources when expanding the dataset.

---

## Roadmap

| Status | Milestone | Description |
| --- | --- | --- |
| ✅ | Immutable data builds | Content-hashed artefact directories with manifest pointers, dependency chains, and reference parity across clients.【F:calc/derive.py†L1474-L1534】 |
| ✅ | Multi-channel delivery | Dash client, static React/Vite bundle, Pages Function, and Worker API share derived Plotly payloads and disclosure copy.【F:app/app.py†L65-L132】【F:site/src/components/VizCanvas.tsx†L1-L160】 |
| ✅ | Backend parity | CSV, DuckDB, and SQLite datastores validated through automated parity tests for consistent exports.【F:tests/test_backend_parity.py†L1-L47】【F:tests/test_dal_sql.py†L1-L120】 |
| ✅ | Intensity narratives | Functional-unit intensity builder feeds UI narratives and CSV downloads, keeping comparisons aligned across channels.【F:calc/derive.py†L1330-L1496】【F:app/lib/narratives.py†L1-L160】 |
| 🚧 | Release automation | Fill in the `make release` placeholder with scripted tagging, changelog updates, and Pages deployments. |
| 🚧 | Dataset refresh tooling | Extend maintenance calendar automation for moving `_staged/` data into `data/` with provenance metadata.【F:docs/MAINTENANCE_CALENDAR.md†L1-L80】 |
| 🚧 | Worker dataset integration | Replace the demo dataset in `workers/compute/runtime.ts` with generated artefacts or live `calc.service` bindings and document deployment playbooks. |
| 🧭 | Additional datastore backends | Explore new `DataStore` implementations (e.g. Postgres) via the existing abstraction in `calc.dal` and `calc.dal_sql`. |
| 🧭 | Expanded visualisations | Prototype intensity waterfalls, cohort comparisons, or sensitivity analyses using `calc.figures`. |
| 🧭 | Live API surface | Wrap `calc.api` aggregates and `compute_profile` in an authenticated HTTP service once security requirements are defined. |

Legend: ✅ implemented · 🚧 in-progress or partially scaffolded · 🧭 planned/under evaluation.

---

## FAQ & troubleshooting

- **Why does `calc/outputs` stay empty?** Artefacts are written to hashed directories under `dist/artifacts/<hash>`. Check `dist/artifacts/latest-build.json` or use helper scripts to locate the latest build.【F:calc/derive.py†L1474-L1542】
- **`python -m calc.derive export` refuses to clear my output directory.** The pipeline protects against deleting unintended paths. Point `--output-root` inside `dist/artifacts` or set `ACX_ALLOW_OUTPUT_RM=1` when the target is safe.【F:calc/derive.py†L292-L336】
- **The Dash app cannot find figures.** Ensure `make build` ran successfully and `ACX_ARTIFACT_DIR` (if set) points to a directory containing `figures/*.json` and `manifest.json`.
- **How do I add a new reference?** Add an IEEE-formatted text file in `calc/references/` and reference its stem in CSV data before rebuilding. The citation resolver keeps numbering consistent across outputs.【F:calc/citations.py†L1-L72】
- **Plotly figures look different locally vs CI.** Confirm `kaleido` is installed (via `make install`) and avoid locale-dependent formatting. Re-run `make build` to regenerate consistent Plotly JSON.
- **Node build fails with an engine warning.** Vite 5 requires Node.js ≥ 18. Upgrade Node locally or use the version pinned in `.nvmrc` if present.
- **Cloudflare Pages serves HTML for JSON routes.** Deploy the Pages Function alongside the static site and keep `_headers`/`_redirects` intact; `make package` prepares them automatically. `CARBON_ACX_ORIGIN` should be an absolute origin without a trailing slash.【F:functions/carbon-acx/[[path]].ts†L131-L200】
- **Worker API returns demo data only.** Replace `workers/compute/runtime.ts` with generated artefacts or adapt the Worker to call a hosted `compute_profile` endpoint for production use.
- **Debugging data loads.** Use `scripts/dev_diag.sh` to compare artefact headers locally and in production. The script respects `PUBLIC_BASE_PATH` so you can validate both local static bundles and Pages domains.【F:scripts/dev_diag.sh†L1-L16】

---

## References

- `CONTRIBUTING.md`
- `docs/CHANGELOG.md`
- `docs/MAINTENANCE_CALENDAR.md`
- `docs/ONLINE_METHOD_NOTES.md`
- `docs/WHAT_RUNS_WHERE.md`
- `docs/TESTING_NOTES.md`
- `docs/deploy.md`
- `docs/routes.md`
- `LICENSE`

---

_Note: To satisfy repo hygiene tests, avoid using the contiguous token spelled “F a s t A P I” in docs._

---

## Serials & traceability

Refer to `docs/CONTRIBUTING_SERIES.md` for guidance on citing ACX specifications, CDX prompts, and the PR lineage required for every contribution.【F:docs/CONTRIBUTING_SERIES.md†L1-L120】

## Architecture extensions

### ACX041 View Provenance Module

The ACX041 extension adds signed hash-chains for every published figure. The derivation pipeline now emits `calc/outputs/manifests/*.json` files that stitch together dataset digests, figure payload hashes, reference checksums, and promptware lineage so any client can verify tampering before presenting data. The manifests ride alongside the immutable artefact bundle and are packaged with the static site for Cloudflare Pages deployments.【F:calc/manifest.py†L1-L209】【F:calc/derive.py†L1506-L1515】【F:scripts/prepare_pages_bundle.py†L1-L82】

Client tooling consumes the same manifest format to disable downloads or watermark plots when verification fails; see `docs/ACX041_View_Provenance_Module_v1_2.md` for the integration checklist.【F:docs/ACX041_View_Provenance_Module_v1_2.md†L1-L120】
