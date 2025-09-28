# carbon-acx

A lightweight reference stack for experimenting with carbon accounting data. The
project demonstrates how raw emissions activity data can be normalised into
shared models, derived into analytical artifacts, and rendered into a static
site or interactive app.

## Overview

The repository is organised to keep source data, derivation logic, and delivery
artifacts clearly separated:

- **`data/`** holds source CSVs and external references.
- **`calc/`** provides the domain models and the `calc.derive` entry point that
  transforms the raw inputs.
- **`app/`** provides a Dash application for interactive exploration during
  development.
- **`docs/`** aggregates reference material for maintainers and contributors.

Related guides:

- [CONTRIBUTING.md](CONTRIBUTING.md) documents how to propose data or model
  changes.
- [docs/MAINTENANCE_CALENDAR.md](docs/MAINTENANCE_CALENDAR.md) outlines the
  operational cadence for refreshing inputs and dependencies.

## Data flow

1. **Sources** — tabular inputs begin in `data/csv` and may be supplemented with
   upstream extracts listed in the references directory.
2. **Models** — the `calc` package defines Pydantic models that enforce schema
   expectations and unit conventions as inputs are loaded.
3. **Derive** — `python -m calc.derive` consolidates the normalised data into a
   reproducible output tree under `build/<backend>/calc/outputs`.
4. **Artifacts** — packaging scripts copy curated tables, figures, and
   manifest metadata into `dist/artifacts` for distribution.
5. **UI** — the Dash development server and the static site renderer both
   consume the packaged artifacts to power user-facing experiences.

## Local development

### Requirements

- Python 3.11
- [Poetry](https://python-poetry.org/) (automatically installed in CI)
- `make`

### Install dependencies

```bash
make install
```

### Quality gates

```bash
make lint
make test
make validate  # runs lint + test together for quick verification
```

### Run the Dash preview

The interactive development experience relies on Dash. Generate artifacts and
launch the preview server:

```bash
make build
make app  # serves Dash on http://localhost:8050
```

Both the preview and the static client consume the same derived bundle under
`build/<backend>/calc/outputs`, including the Plotly payloads at
`build/<backend>/calc/outputs/figures/{stacked,bubble,sankey}.json`, the manifest
at `build/<backend>/calc/outputs/manifest.json`, tabular exports in
`build/<backend>/calc/outputs/export_view.{csv,json}`, and IEEE references in
`build/<backend>/calc/outputs/references/*_refs.txt`.

### Build the static client

The production site is a static client published from Cloudflare Pages. Locally
render it and inspect the generated HTML bundle:

```bash
make site
python -m http.server --directory build/site 8001
```

Navigate to `http://localhost:8001` to verify `build/site/index.html` before
packaging. The same artifact is uploaded without modification for production
hosting.

### Package distributable bundles

Each stage can be executed independently or chained together:

```bash
make build     # derive data products into build/<backend>
make site      # render the static site using the derived outputs
make package   # assemble dist/artifacts and dist/site bundles
```

The convenience target below mirrors the CI pipeline and is safe to run before
submitting a pull request:

```bash
make build site package
```

Build outputs are always written to the `build/` and `dist/` directories so the
source tree remains clean.

## Backends

The derivation pipeline supports interchangeable storage backends to validate
parity across implementations:

- `ACX_DATA_BACKEND=csv` (default) reads from the repository CSV inputs.
- `ACX_DATA_BACKEND=duckdb` exercises the DuckDB-backed loader; it requires the
  optional `duckdb` dependency (`poetry install --extras db`).

Use the `build-backend` helper to generate artifacts for a specific backend:

```bash
make build-backend B=duckdb
```

## Artifact policy

Generated datasets, manifests, SBOMs, and site bundles **must not** be committed
to the repository. Always use the `build`, `site`, and `package` targets to
recreate them locally.

Continuous integration executes the same steps and publishes downloadable
artifacts:

- `dist-artifacts` — curated tables, manifests, and references.
- `dist-site` — the compiled static site bundle ready for deployment.

### Build outputs

Running `make build` writes the derived artifacts to
`build/<backend>/calc/outputs`, including the Plotly payloads under
`build/<backend>/calc/outputs/figures/{stacked,bubble,sankey}.json`, the dataset
manifest at `build/<backend>/calc/outputs/manifest.json`, tabular exports in
`build/<backend>/calc/outputs/export_view.{csv,json}`, and the reference exports
in `build/<backend>/calc/outputs/references/*_refs.txt`. These same files are
published as the production bundle served from Cloudflare Pages.

## Deploying static artifacts

Continuous integration executes the build, site render, and packaging steps and
publishes downloadable artifacts:

- `dist-artifacts` — curated tables, manifests, and references.
- `dist-site` — the compiled static site bundle ready for deployment.

Upload the contents of `dist/site` to Cloudflare Pages (or any static file
hosting platform) to mirror the production deployment.
