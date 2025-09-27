# carbon-acx

Minimal scaffold for carbon accounting demo.

## Commands

```bash
make install
make validate
make build
make app
```

## Build & Artifacts

No generated data is tracked in git. To produce fresh artifacts locally, run:

```bash
make build site package
```

This sequence derives emissions data into `build/<backend>/calc/outputs`, assembles
static assets under `build/site`, and copies distributable bundles into `dist/`.

Environment variables can be used to customise the build:

- `ACX_DATA_BACKEND` selects the datastore backend (defaults to `csv`).
- `OUTPUT_DIR` overrides the root directory used for intermediate outputs.

CI runs the same steps and publishes two downloadable artifacts: `dist-artifacts`
with the packaged datasets and `dist-site` with the static site bundle.
