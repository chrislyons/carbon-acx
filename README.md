# carbon-acx

A lightweight reference stack for experimenting with carbon accounting data.
The project demonstrates how raw emissions activity data can be normalised into
shared models, derived into analytical artefacts, and rendered into a static
site or interactive Dash application.

## Table of contents

- [Overview](#overview)
- [Repository layout](#repository-layout)
- [Data lifecycle](#data-lifecycle)
- [Quick start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Install dependencies](#install-dependencies)
  - [Common development tasks](#common-development-tasks)
  - [Preview the Dash client](#preview-the-dash-client)
  - [Build the static site](#build-the-static-site)
  - [Package distributable bundles](#package-distributable-bundles)
- [Configuration](#configuration)
- [Automation and CI](#automation-and-ci)
- [Artifact policy](#artifact-policy)
- [Further reading](#further-reading)
- [Contributing](#contributing)
- [License](#license)

## Overview

carbon-acx normalises activity data into shared emissions models so it can be
derived into analytical products and delivered through multiple user
experiences. The repository is organised to keep source data, derivation logic,
and delivery artefacts clearly separated.

## Repository layout

```
.
├── app/            # Dash development client used during exploration
├── calc/           # Derivation pipeline and Pydantic domain models
├── data/           # Raw CSV inputs, references, and emission-factor sources
├── docs/           # Maintainer reference material and runbooks
├── scripts/        # Packaging and publishing helpers
├── site/           # Static site source assets
├── tests/          # Pytest suite covering models, figures, and endpoints
└── tools/          # Local quality-of-life utilities
```

Related guides provide deeper context:

- [CONTRIBUTING.md](CONTRIBUTING.md) documents how to propose data or model
  changes.
- [docs/MAINTENANCE_CALENDAR.md](docs/MAINTENANCE_CALENDAR.md) outlines the
  operational cadence for refreshing inputs and dependencies.

## Data lifecycle

1. **Sources** — tabular inputs begin in `data/csv` and may be supplemented with
   upstream extracts listed in the references directory.
2. **Models** — the `calc` package defines Pydantic models that enforce schema
   expectations and unit conventions as inputs are loaded.
3. **Derive** — `python -m calc.derive` consolidates the normalised data into a
   reproducible output tree under `build/<backend>/calc/outputs`.
4. **Artefacts** — packaging scripts copy curated tables, figures, and manifest
   metadata into `dist/artifacts` for distribution.
5. **UI** — the Dash development server and the static site renderer both
   consume the packaged artefacts to power user-facing experiences.

## Quick start

### Prerequisites

- Python 3.11
- [Poetry](https://python-poetry.org/) (automatically installed in CI)
- `make`

### Install dependencies

```bash
make install
```

### Common development tasks

Run quality and formatting checks locally before submitting changes:

```bash
make format      # auto-format the codebase
make lint        # ruff + black validation
make test        # run the Pytest suite
make validate    # convenience wrapper for lint + test
make sbom        # produce a CycloneDX SBOM under dist/sbom/
```

Recreate the CI build pipeline when preparing a pull request:

```bash
make build site package
```

### Preview the Dash client

The interactive development experience relies on Dash. Generate artefacts and
launch the preview server:

```bash
make build
make app        # serves Dash on http://localhost:8050
```

Both the preview and the static client consume the same derived bundle under
`build/<backend>/calc/outputs`, including the Plotly payloads at
`build/<backend>/calc/outputs/figures/{stacked,bubble,sankey}.json`, the
manifest at `build/<backend>/calc/outputs/manifest.json`, tabular exports in
`build/<backend>/calc/outputs/export_view.{csv,json}`, and IEEE references in
`build/<backend>/calc/outputs/references/*_refs.txt`.

### Build the static site

The production site is a static client published from Cloudflare Pages. Locally
render it and inspect the generated HTML bundle:

```bash
make site
python -m http.server --directory build/site 8001
```

Navigate to `http://localhost:8001` to verify `build/site/index.html` before
packaging. The same artefact is uploaded without modification for production
hosting.

### Package distributable bundles

Each stage can be executed independently or chained together:

```bash
make build       # derive data products into build/<backend>
make site        # render the static site using the derived outputs
make package     # assemble dist/artifacts and dist/site bundles
```

Use the backend helper to target a specific storage implementation:

```bash
make build-backend B=duckdb
```

`make ci_build_pages` executes the same steps that run in continuous
integration, while `make release` is reserved for the production release
process.

## Configuration

The derivation pipeline supports interchangeable storage backends to validate
parity across implementations:

- `ACX_DATA_BACKEND=csv` (default) reads from the repository CSV inputs.
- `ACX_DATA_BACKEND=duckdb` exercises the DuckDB-backed loader; it requires the
  optional `duckdb` dependency (`poetry install --extras db`).

All build outputs are written to the `build/` and `dist/` directories so the
source tree remains clean. Avoid committing generated content.

## Automation and CI

Continuous integration installs dependencies, runs linting and tests, derives
artefacts, builds the static site, and assembles distributable bundles. The
workflow mirrors the commands documented above:

```bash
make install
make lint
make test
make build site package
make ci_build_pages
```

`make release` currently acts as a placeholder for the future release process.

## Artifact policy

Generated datasets, manifests, SBOMs, and site bundles **must not** be
committed to the repository. Always use the `build`, `site`, `package`, and
`sbom` targets to recreate them locally.

Continuous integration publishes two downloadable bundles:

- `dist-artifacts` — curated tables, manifests, and references.
- `dist-site` — the compiled static site bundle ready for deployment.

Upload the contents of `dist/site` to Cloudflare Pages (or any static file
hosting platform) to mirror the production deployment.

## Further reading

- [docs/MAINTENANCE_CALENDAR.md](docs/MAINTENANCE_CALENDAR.md) for the
  maintenance cadence.
- [docs/ONLINE_METHOD_NOTES.md](docs/ONLINE_METHOD_NOTES.md) for methodology
  notes.

## Contributing

Review [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request checklist,
quality expectations, and data ingestion guidance.

## License

Licensed under the terms of the [MIT License](LICENSE).
