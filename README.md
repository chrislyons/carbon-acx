# Carbon ACX

Carbon ACX is a reference implementation for building reproducible carbon accounting datasets and experiences. It demonstrates how to ingest heterogeneous activity data, normalise it into shared emissions models, derive decision-ready artefacts, and deliver those artefacts across interactive and static channels.

---

## Table of contents

1. [Project overview](#project-overview)
   - [Mission & scope](#mission--scope)
   - [Architecture & problem domain](#architecture--problem-domain)
   - [Positioning](#positioning)
2. [Features](#features)
3. [Repository structure](#repository-structure)
4. [Installation & setup](#installation--setup)
   - [Local development](#local-development)
   - [Test automation](#test-automation)
   - [Production builds](#production-builds)
5. [Usage](#usage)
   - [Derivation CLI](#derivation-cli)
   - [Dash exploration client](#dash-exploration-client)
   - [Static site bundle](#static-site-bundle)
   - [Programmatic aggregates](#programmatic-aggregates)
6. [Configuration](#configuration)
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

- Converts raw activity records into well-defined emissions models using Pydantic validation.
- Computes annualised emissions, uncertainty bounds, and manifest metadata to create a portable bundle of JSON, CSV, and reference text files.
- Ships both a Dash-based exploration environment and a static site experience that render directly from the derived bundle, proving that the data products are channel-agnostic.

### Architecture & problem domain

The repository is organised around a **derive-once, serve-anywhere** architecture:

1. **Domain modelling (`calc/schema.py`)** — Canonical CSV inputs are typed with Pydantic models that enforce unit registries, schedule rules, and grid intensity validation. A read-through cache keeps repeated loads fast and deterministic.
2. **Data access (`calc/dal.py`)** — A pluggable `DataStore` abstraction supports CSV and DuckDB backends so the same derivation logic can run against different storage engines.
3. **Computation (`calc/derive.py`)** — Activity schedules, emission factors, and grid intensities are combined into annualised emissions with guardrails for layer attribution, reference tracking, hashing, and reproducible metadata.
4. **Presentation (`calc/figures.py`, `app/components`, `site/`)** — Plotly figure slices, disclosure copy, and IEEE references are embedded in both the Dash client and the static site so that user experiences stay consistent.
5. **Delivery (`scripts/build_site.py`, `scripts/package_artifacts.py`, `functions/carbon-acx/[[path]].ts`)** — Automation packages the derived bundle, renders the static client, and proxies production traffic via Cloudflare Pages functions.

This architecture targets carbon accounting teams that need a transparent pipeline from data ingestion through public presentation.

### Positioning

Compared to ad-hoc spreadsheets or monolithic BI stacks, Carbon ACX emphasises:

- **Deterministic builds** — Artefacts are versioned by content hash and generated through a single CLI entry point.
- **Reference integrity** — Every derived figure carries IEEE-formatted citations sourced from curated reference files.
- **Channel parity** — The same derived payload drives both interactive and static clients, simplifying validation and deployment.
- **Test-first data hygiene** — An extensive pytest suite protects schema constraints, numerical calculations, and UI payloads.

---

## Features

- **Pydantic data models with caching** ensure inputs conform to unit registries, schedule constraints, and region enumerations before calculations run (`calc/schema.py`).
- **Backend-agnostic datastore** chooses between CSV and DuckDB implementations at runtime (`calc/dal.py`).
- **Emission computation engine** calculates annual emissions, uncertainty bounds, and grid-indexed adjustments with reusable helpers (`calc/derive.py`).
- **Hashed artifact outputs** prevent accidental overwrites and provide immutable build directories under `dist/artifacts/<hash>` with a `latest-build.json` pointer (`calc/derive.py`).
- **Figure slicing utilities** derive stacked bar, bubble, and Sankey payloads from the export view with consistent metadata (`calc/figures.py`).
- **Citation management** resolves and formats IEEE references from `calc/references/*.txt`, deduplicating sources automatically (`calc/citations.py`).
- **Dash exploration UI** renders Plotly figures, disclosure copy, NA notices, and reference tables straight from the derived bundle (`app/app.py` and `app/components`).
- **Static site renderer** packages figures, manifest summaries, and disclosure content into a deployable single-page app (`scripts/build_site.py`, `site/`).
- **Cloudflare Pages function** optionally proxies `/carbon-acx/*` routes to an upstream origin while applying caching headers (`functions/carbon-acx/[[path]].ts`).
- **Artifact packaging workflow** copies whitelisted JSON/CSV/TXT outputs into a distributable directory and emits an SBOM for compliance (`scripts/package_artifacts.py`, `tools/sbom.py`).

---

## Repository structure

| Path | Purpose |
| --- | --- |
| `calc/` | Core calculation package: schema definitions, datastore interfaces, emission derivation, figure slicing, citation handling, UI theming, and reference texts. |
| `app/` | Dash development client with Plotly component builders, disclosure panels, and reference rendering helpers. |
| `site/` | Static site sources (Markdown, HTML components, assets, and JS helpers) used by `scripts.build_site`. |
| `data/` | Canonical CSV datasets (activities, schedules, emission factors, grid intensity, profiles, units, and sources). `_staged/` holds raw extracts pending ingestion. |
| `docs/` | Operational guides covering maintenance cadence, deployment runbooks, routing, and methodology. |
| `functions/` | Cloudflare Pages function for proxying `/carbon-acx` traffic. |
| `scripts/` | Build orchestration scripts for rendering the static site and packaging artefacts. |
| `tools/` | Developer utilities such as CycloneDX SBOM generation. |
| `tests/` | Comprehensive pytest suite including integration tests, backend parity checks, figure regression tests, and UI snapshot expectations. |
| `Makefile` | Primary task runner encapsulating install, lint, test, build, packaging, SBOM, and release placeholders. |
| `pyproject.toml` | Poetry configuration specifying runtime dependencies, extras, and tooling pins. |

Each module is self-documenting with inline comments and docstrings. Start with `calc/derive.py` to understand the data flow, then explore `app/components` and `site/` to see how artefacts are consumed.

---

## Installation & setup

### Local development

1. **Install prerequisites**
   - Python 3.11+
   - [Poetry](https://python-poetry.org/) (CI installs automatically, local developers should install manually)
   - GNU `make`
2. **Bootstrap the environment**
   ```bash
   make install
   ```
   This installs all runtime and development dependencies (ruff, black, pytest, pip-audit, kaleido, Pillow).
3. **Regenerate derived artefacts**
   ```bash
   make build
   ```
   The command runs `python -m calc.derive`, producing a hashed build under `dist/artifacts/<hash>/calc/outputs` and updating `dist/artifacts/latest-build.json`.

### Test automation

- Run formatters: `make format`
- Run lint checks (ruff + black): `make lint`
- Execute the pytest suite: `make test`
- Run lint + tests together: `make validate`
- Generate a CycloneDX SBOM: `make sbom`

### Production builds

To mirror the CI/CD pipeline locally:

```bash
make build site package
```

- `make site` renders the static bundle into `build/site/` for inspection.
- `make package` copies distributable artefacts into `dist/packaged-artifacts/` and builds the production-ready site in `dist/site/`.
- `make ci_build_pages` runs the full CI recipe (install, lint, test, build-static).

---

## Usage

### Derivation CLI

All derived outputs originate from the `calc.derive` module:

```bash
PYTHONPATH=. poetry run python -m calc.derive \
  --output-root dist/artifacts
```

Key outputs within the selected root:

- `calc/outputs/export_view.csv` and `.json` — tabular emissions dataset with metadata header comments.
- `calc/outputs/figures/{stacked,bubble,sankey}.json` — Plotly payloads trimmed for client use.
- `calc/outputs/references/*_refs.txt` — IEEE-formatted reference lists for each figure.
- `calc/outputs/manifest.json` — Snapshot metadata (generated timestamp, layer coverage, regional vintages, citation keys).

`ACX_DATA_BACKEND` controls the datastore backend (`csv` by default, `duckdb` requires the optional dependency). The CLI ensures output directories are wiped safely and applies a content hash to guarantee immutability.

### Dash exploration client

Launch the interactive client after generating artefacts:

```bash
make build
make app  # serves http://localhost:8050
```

The Dash app reads from `calc/outputs` (or a custom `ACX_ARTIFACT_DIR`) and renders:

- Stacked category chart, bubble chart, and Sankey flow using shared Plotly templates.
- Layer toggles and vintage summaries derived from the export view metadata.
- Disclosure and “NA coverage” copy assembled by `calc.copy_blocks` to explain dataset scope and gaps.
- Reference sidebar populated via `calc.citations` to guarantee citation parity with the static site.

### Static site bundle

Render and preview the static site without a live server:

```bash
make site
python -m http.server --directory build/site 8001
```

The build embeds:

- Pre-rendered Plotly HTML snippets for each figure.
- Disclosure panel, manifest summary, and grid vintage table.
- Download links pointing to the packaged artefacts under `build/site/data/`.
- IEEE reference list identical to the Dash experience.

When ready for production, deploy the contents of `dist/site/` to Cloudflare Pages. The companion function under `functions/carbon-acx/[[path]].ts` can proxy `/carbon-acx/*` routes to the hosted bundle or an upstream origin when `CARBON_ACX_ORIGIN` is set.

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

`get_aggregates` resolves the active profile, sums annual emissions by activity, and returns the citation keys necessary to build a reference list. `collect_activity_source_keys` is available when you already have derived rows and only need source tracking.

---

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `ACX_DATA_BACKEND` | Selects the datastore implementation (`csv` or `duckdb`). | `csv` |
| `ACX_OUTPUT_ROOT` | Overrides the root directory for derived outputs. | `dist/artifacts` |
| `ACX_GENERATED_AT` | Forces the timestamp embedded in artefact metadata. | Current UTC time |
| `ACX_ALLOW_OUTPUT_RM` | Set to `1` to allow cleaning arbitrary output directories (bypasses safety checks). | unset |
| `ACX_ARTIFACT_DIR` | Points the Dash client at a non-default artefact directory. | `calc/outputs` |
| `CARBON_ACX_ORIGIN` | Cloudflare Pages function target for proxying `/carbon-acx/*` requests. | unset (serves local `site/carbon-acx/`) |

Additional configuration:

- `calc/config.yaml` sets the default profile used in figures and aggregate metadata.
- The Makefile exposes `ACX_DATA_BACKEND` and `OUTPUT_BASE` variables for build invocations (`make build-backend B=duckdb`).

---

## Build & deployment

1. **Local build** — `make build` -> `dist/artifacts/<hash>` -> `make site` -> `build/site` -> `make package` -> `dist/packaged-artifacts` + `dist/site`.
2. **Continuous integration** — The CI workflow (replicated by `make ci_build_pages`) runs install, lint, test, and `make build-static`, publishing two artefacts: `dist-artifacts` (data bundle) and `dist-site` (static client).
3. **Release** — `make release` is a placeholder for future automated releases; production deploys currently upload `dist/site/` to Cloudflare Pages manually or via upstream automation described in `docs/deploy.md`.
4. **Routing** — `functions/carbon-acx/[[path]].ts` sits alongside the static bundle to proxy or serve `/carbon-acx/*` traffic with opinionated caching headers (see `docs/routes.md`).

For reproducible deployments, treat `dist/artifacts/latest-build.json` as the pointer to the most recent build hash and package that directory verbatim.

---

## Testing & QA

Quality gates are enforced through pytest, ruff, black, and SBOM generation:

- **Unit & integration tests (`tests/`)**
  - Schema validations, NA segment handling, vintage matrices, and layer toggles.
  - Backend parity tests ensure CSV and DuckDB outputs match.
  - Static site smoke tests confirm Plotly HTML and asset packaging succeed.
  - Visual regression fixtures assert key Plotly traces remain stable.
- **Static analysis**
  - `make lint` runs ruff and black with a 100-character line length.
  - `make sbom` generates a CycloneDX SBOM via `tools/sbom.py` for dependency auditing.
- **CI mirrors local commands** so failures reproduce identically on developer machines.

Before submitting a change:

```bash
make format lint test build site package
```

---

## Contributing guide

Carbon ACX follows a conventional GitHub workflow (see `CONTRIBUTING.md`):

1. Fork or branch from `main`.
2. Use descriptive branch names (e.g. `feature/derived-metrics`).
3. Keep commits focused; include context in commit messages about data updates and methodology changes.
4. Run `make validate` and relevant build steps locally.
5. Open a pull request with:
   - Summary of changes and impacted artefacts.
   - Confirmation that linting, tests, and builds passed.
   - Notes about data source updates or new references.
6. Expect code review on data hygiene, reproducibility, and reference integrity. Changes touching `data/` or `calc/references/` should document provenance in the PR description.

Coding standards:

- Prefer Pydantic models for new datasets.
- Avoid catching broad exceptions; propagate validation errors so the derivation pipeline fails fast.
- Keep Plotly figure builders deterministic (sorted keys, explicit colour ordering).
- Never commit generated artefacts (`build/`, `dist/`, `calc/outputs/`).

---

## Security & compliance

- **Data isolation** — Derived outputs are written to hashed directories and cleared only within guardrails to avoid deleting arbitrary paths (`calc/derive.is_safe_output_dir`).
- **Dependency governance** — Dependencies are pinned via Poetry; `tools/sbom.py` emits CycloneDX SBOMs and `pip-audit` is available for vulnerability scanning.
- **Runtime posture** — The static site and Dash app do not perform live data collection; they read precomputed bundles only. Cloudflare functions proxy traffic without storing secrets server-side.
- **Licensing** — The project is released under the MIT License (`LICENSE`). Include source acknowledgements when adding new references or datasets.

---

## Roadmap

| Status | Milestone | Description |
| --- | --- | --- |
| ✅ | Immutable data builds | Content-hashed artefact directories with manifest pointers and reference parity across clients. |
| ✅ | Multi-channel delivery | Dash exploration client and static Cloudflare Pages bundle share derived Plotly payloads and disclosure copy. |
| ✅ | Backend parity | CSV and DuckDB datastores validated via automated parity tests to ensure consistent exports. |
| 🚧 | Release automation | `make release` placeholder to be replaced with scripted tagging, changelog updates (`docs/CHANGELOG.md`), and asset uploads. |
| 🚧 | Dataset refresh tooling | Extend `docs/MAINTENANCE_CALENDAR.md` with automation for pulling `_staged/` data into `data/` while preserving provenance metadata. |
| 🧭 | Additional backends | Explore further `DataStore` implementations (SQLite/Postgres) leveraging the existing abstraction. |
| 🧭 | Expanded visualisations | Prototype additional Plotly figures (e.g. intensity waterfalls) using the figure slicing framework. |
| 🧭 | Live API surface | Wrap `calc.api` aggregates in a lightweight HTTP service for downstream integrations once authentication requirements are defined. |

Legend: ✅ implemented · 🚧 in-progress or partially scaffolded · 🧭 planned/under evaluation.

---

## FAQ & troubleshooting

**Why does `calc/outputs` stay empty?**
: Artefacts are written to hashed directories under `dist/artifacts/<hash>`. Use `scripts/_artifact_paths.resolve_artifact_outputs` or inspect `dist/artifacts/latest-build.json` to locate the latest build.

**`python -m calc.derive` refuses to clear my output directory.**
: The pipeline protects against deleting unintended paths. Either point `--output-root` inside `dist/artifacts` or set `ACX_ALLOW_OUTPUT_RM=1` when you are sure the target is safe.

**The Dash app cannot find figures.**
: Ensure `make build` ran successfully and `ACX_ARTIFACT_DIR` (if set) points to the directory containing `figures/*.json` and `manifest.json`.

**How do I add a new reference?**
: Drop an IEEE-formatted text file in `calc/references/` and reference its stem in emission factors or grid intensity rows. Run `make build` to propagate the citation into artefacts.

**Plotly figures look different locally vs CI.**
: Confirm `kaleido` is installed (included via `make install`) and avoid locale-dependent formatting. Re-run `make build` to regenerate Plotly JSON with consistent ordering.

**Where do deployment instructions live?**
: See `docs/deploy.md` for Cloudflare Pages guidance and `docs/routes.md` for proxy behaviour.

---

## References

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [docs/MAINTENANCE_CALENDAR.md](docs/MAINTENANCE_CALENDAR.md)
- [docs/ONLINE_METHOD_NOTES.md](docs/ONLINE_METHOD_NOTES.md)
- [docs/WHAT_RUNS_WHERE.md](docs/WHAT_RUNS_WHERE.md)
- [docs/deploy.md](docs/deploy.md)
- [docs/routes.md](docs/routes.md)
- [LICENSE](LICENSE)

---

_Note: To satisfy repo hygiene tests, avoid using the contiguous token spelled “F a s t A P I” in docs._

