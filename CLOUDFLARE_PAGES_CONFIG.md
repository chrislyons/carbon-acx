# Cloudflare Pages Configuration

**Framework preset:** None (Custom)
**Packaging command:** `make package`
**Pages output directory:** `dist/site`
**Bundle smoke gate:** `make validate-site`

---

## Overview

The deployable Cloudflare Pages artifact is the **prebuilt bundle** at
`dist/site`. It is assembled by `make package` and is the *only* Pages output;
do not point Pages at the raw Next.js build directory
(`apps/carbon-acx-web/dist`), which lacks the artifact payload and Pages
metadata.

`make package` runs the repository packaging pipeline:

1. `data-audit` / `build-web` — derives web data and runs the Next.js static
   export into the intermediate `apps/carbon-acx-web/dist`.
2. `build` — derives immutable calculation artifacts into `dist/artifacts`.
3. `scripts.package_artifacts` — packages those artifacts (JSON/CSV/TXT) into
   `dist/packaged-artifacts` with a `manifest.json`.
4. `sbom` — writes the CycloneDX SBOM.
5. `scripts.prepare_pages_bundle` — copies the static app plus packaged
   artifacts into `dist/site` and emits the Pages metadata.

`ACX_GENERATED_AT=1970-01-01T00:00:00+00:00` is the deterministic build
sentinel used by CI/release so identical inputs produce identical authority
bytes. The actual release time is the Git tag and workflow run metadata; the
sentinel is not a source freshness date.

## Build Output Directory

```
dist/site
```

Resulting structure (abridged):

```
dist/site/
├── index.html            # static app entrypoint
├── _headers              # Pages security + cache headers
├── _redirects            # Pages redirect rules
├── _next/                # hashed static assets
├── data/                 # prebuilt web data (calculator, sources, release)
├── <route>.html / .txt   # prerendered routes
└── artifacts/
    ├── index.json        # artifact file index (path + byte size)
    ├── manifest.json     # collection manifest (figures, references, hashes)
    ├── figures/          # Plotly figure JSON
    ├── references/       # IEEE reference text
    ├── manifests/        # per-figure manifests (sha256 between figure + refs)
    ├── calc/outputs/     # derived calc tables + dataset manifest
    └── intensity_matrix.csv
```

The `_headers` file revalidates `/artifacts/*` so stable aliases and control
files cannot remain stale across releases. Content hashes still provide
integrity; raw evidence binaries stay outside Git.

---

## Required Build Settings

### Build Command
```bash
make package
```

### Build Output Directory
```
dist/site
```

### Root Directory
```
/
```
(Leave as repository root — the Makefile and Python toolchain live at the repo
root, and `wrangler.toml` sets `pages_build_output_dir = "dist/site"`.)

### Environment Variables

| Variable | Value | Scope |
|----------|-------|-------|
| `NODE_VERSION` | `20.19.4` | Production & Preview |
| `NODE_ENV` | `production` | Production only |

`NODE_VERSION` should be auto-detected from `.node-version`.

The Pages toolchain also requires the Python environment used by the Makefile
(`poetry install`). If Pages cannot provision it, package locally with
`make package` and deploy the resulting `dist/site` via `wrangler` (below).

---

## Deployment Workflow

### Automatic Deployments

This repository does not deploy Pages from GitHub Actions. Configure the
Cloudflare Pages Git integration separately to run `make package` and publish
`dist/site` for preview branches and `main`. The repository's CI/release jobs
build and validate the same bundle but do not possess deployment credentials.

### Manual Deployment

```bash
# Build the canonical bundle (never `pnpm build:web` alone)
make package

# Smoke-check the bundle before shipping
make validate-site

# Deploy the prebuilt bundle
pnpm --filter carbon-acx-web exec wrangler pages deploy dist/site --cwd ../.. --project-name=carbon-acx
```

The web workspace exposes the same contract:

```bash
pnpm --filter carbon-acx-web deploy   # runs `make -C ../.. package` then deploys dist/site from the repo-root Wrangler context
pnpm --filter carbon-acx-web preview  # wrangler pages dev dist/site --cwd ../..
```

---

## Validation

`make validate-site` runs `scripts/validate_pages_bundle.py` against the
existing `dist/site` bundle (it never rebuilds it) and fails closed unless:

- the site root contains a non-empty `index.html`;
- `_headers` exists with the required security directives and the
  `/*` and `/artifacts/*` blocks;
- `_redirects` exists and every rule is well formed;
- `artifacts/index.json` parses, lists at least one file, and every indexed
  path is safe, present, and byte-size matched;
- `artifacts/manifest.json` (the collection manifest) parses and lists figures;
- at least one figure artifact and one reference artifact are present;
- every manifest/figure/reference path is safe (relative, no traversal,
  no escaping the artifact root) and its sha256 matches the recorded hash.

Any unsafe artifact path (absolute, `..`, backslash, or symlink escape) is
rejected.

---

## Worker Configuration

The Worker uses the dedicated `workers/compute/wrangler.toml` configuration
(`carbon-acx-compute`). The root `wrangler.toml` is Pages-only; do not combine
Pages and Worker keys in one config. Deploy the Worker explicitly with
`pnpm --filter carbon-acx-web exec wrangler deploy --config ../../workers/compute/wrangler.toml` only after its
fail-closed contract is intentionally changed.

---

## Troubleshooting

### Error: "an internal error occurred"
- Confirm the build command is `make package` (not `pnpm build:web`, which only
  produces the raw static export).
- Confirm the output directory is `dist/site` (not `dist` or
  `apps/carbon-acx-web/dist`).

### Bundle validation fails
Run `make validate-site` locally. Typical causes:
- `make package` did not complete, so `dist/site/artifacts/` is missing;
- `artifacts/index.json` byte sizes disagree with the copied files;
- a collection-manifest hash no longer matches its figure/reference file.

### Missing Python toolchain on Pages
Package locally with `make package` and deploy `dist/site` with `wrangler`
instead of relying on the Pages build environment.

---

**Canonical packaging command:** `make package`
**Canonical Pages output:** `dist/site`
**Smoke gate:** `make validate-site`