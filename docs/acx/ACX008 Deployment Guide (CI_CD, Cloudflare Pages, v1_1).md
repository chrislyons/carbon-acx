# **ACX008 Deployment Guide (CI/CD, Cloudflare Pages, v1.1)**

**Purpose**

Define a reproducible build-and-deploy process for **carbon-acx**: build artifacts from CSV inputs, verify them (tests/linters), and publish a **static site** (client-side Plotly + prebuilt JSON/CSV + plain-text IEEE references) on **Cloudflare Pages**. This guide specifies branch strategy, CI workflow, artifact layout, cache policy, environment variables, and rollback procedures.

***

## **1. Deployment model**

- **Authoritative data**: CSVs in /data/ on main.
- **Build outputs**: calc/outputs/ → JSON/CSV figure slices and references/*.txt.
- **UI**: static client (no server runtime). Local dev uses Dash; production uses a lightweight static page that loads prebuilt JSON/refs.
- **Hosting**: Cloudflare Pages (static hosting over a GitHub repo). [1]
- **CI**: GitHub Actions runs tests/linters, builds outputs, and publishes pages on main. [2]

***

## **2. Branching and release strategy**

- **Branches**
    - Feature branches from main (e.g., feat/dal-backend, data/on-ef-streaming).
    - Protected main: requires CI green, CODEOWNERS review for /data/*.csv, /calc/schema.py, /calc/derive.py.
- **Environments**
    - **Preview**: every PR builds a **Preview** deployment on Cloudflare Pages (immutable).
    - **Production**: merge to main triggers **Production** build.
- **Version tagging**
    - Lightweight tags (e.g., v1.1.0) after significant schema/content milestones.
    - The build embeds generated_at, method=v1.1, and reference_year.

***

## **3. Build inputs and outputs**

### **Inputs (CSV)**

- data/activities.csv, emission_factors.csv, profiles.csv, activity_schedule.csv, grid_intensity.csv, sources.csv, units.csv.

### **Outputs (to be uploaded to Pages)**

- calc/outputs/export_view.json and .csv
- calc/outputs/figures/{stacked,bubble,sankey}.json (and .csv parity)
- calc/outputs/references/{stacked_refs.txt,bubble_refs.txt,sankey_refs.txt}
- calc/outputs/manifest.json (regions, vintages, sources included)
- site/ (static UI bundle that fetches the above JSON/TXT)

> Constraint: **No live EF computation in the browser**. The browser only renders prebuilt artifacts.

***

## **4. Cloudflare Pages setup**

1. **Create Project** → **Connect to Git** → select chrislyons/carbon-acx.
2. **Build settings**
    - **Framework preset**: None (static).
    - **Build command**: make ci_build_pages (see §6).
    - **Build output directory**: dist/ (contains site/ + copied calc/outputs/).
3. **Environment variables**
    - PYTHON_VERSION=3.11 (if using Pages Builds).
    - POETRY_VIRTUALENVS_IN_PROJECT=true (if needed).
4. **Preview/Production**
    - Pages automatically creates Preview deployments on PRs; Production deploys from main.
    - Use the Pages dashboard to mark a Preview as Production if hot-fixing without merge is ever required. [1]

***

## **5. Client UI (static) contract**

- A minimal static frontend (Vanilla/React) in /site/ loads:
    - /artifacts/manifest.json
    - /artifacts/figures/*.json
    - /artifacts/references/*.txt
- Client-side Plotly renders the three visuals.
- References pane displays the IEEE list; all hover tooltips show bracketed [n].
- No external calls; no auth; entirely static.

***

## **6. Makefile targets (production-grade)**

Add/ensure these targets:

```javascript
# Install and validate
install:
	poetry install --with dev

validate: lint test

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .

test:
	PYTHONPATH=. poetry run pytest -q

# Build computation artifacts
build:
	PYTHONPATH=. ACX_DATA_BACKEND=csv poetry run python -m calc.derive

# Build static site bundle (client code -> dist/site)
site:
	# If using a simple React/Tailwind app, run its build; otherwise copy static
	mkdir -p dist/site
	cp -r site/* dist/site/

# Package artifacts for Pages (copy outputs into dist/artifacts)
package:
	mkdir -p dist/artifacts
	cp -r calc/outputs/* dist/artifacts/

# Single command for Pages
ci_build_pages: install validate build site package
```

This yields:

```javascript
dist/
  site/            # static UI
  artifacts/       # JSON/CSV/TXT exports from calc.derive
```

***

## **7. GitHub Actions workflow**

Create .github/workflows/ci.yml:

```javascript
name: ci

on:
  pull_request:
  push:
    branches: [ "main" ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Poetry
        run: pipx install poetry

      - name: Cache Poetry
        uses: actions/cache@v4
        with:
          path: ~/.cache/pypoetry
          key: poetry-${{ runner.os }}-${{ hashFiles('**/poetry.lock') }}
          restore-keys: |
            poetry-${{ runner.os }}-

      - name: Install
        run: make install

      - name: Validate (ruff/black/pytest)
        run: make validate

      - name: Build artifacts
        run: make build

      - name: Build static site
        run: make site

      - name: Package dist
        run: make package

      - name: Upload artifact (dist)
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
```

> This CI job always runs and produces dist/. For PRs, it feeds **Preview** on Cloudflare Pages; for main, it feeds **Production**.

***

## **8. Pages deployment hooks**

### **Option A — Let Cloudflare Pages pull the repo and build**

- Configure “Build command” to make ci_build_pages, “Output directory” to dist/.
- Pros: simpler; Pages logs show build.
- Cons: duplicate setup (Poetry) inside Pages build environment.

### **Option B — Upload prebuilt artifacts from GitHub Actions (recommended at scale)**

- Use **Cloudflare Pages Deployment API** to upload dist/ from the CI job. [1]
- Pros: single build pipeline; deterministic Python toolchain; faster deploys.
- Cons: you must store CLOUDFLARE_API_TOKEN/ACCOUNT_ID/PROJECT_NAME as GitHub secrets.

Minimal deploy step (pseudo-script):

```javascript
# Requires CF token with Pages Write permission
npx wrangler pages deploy dist --project-name="$CF_PAGES_PROJECT" --branch="$BRANCH"
```

Wrangler CLI docs describe Pages deploy flows. [1]

***

## **9. Caching, immutability, integrity**

- **Artifacts pathing**: serve under /artifacts/ with cache headers:
    - Cache-Control: public, max-age=31536000, immutable for content addressed by a build hash (e.g., manifest.<hash>.json).
    - Cache-Control: no-cache for the small index.html (so clients see new builds).
- **Content hashing**: during package, rename JSON/TXT with a short content hash (stacked.<sha8>.json).
- **Integrity**: embed a SHA256 of each artifact in manifest.json so the client can verify content before rendering (optional).

***

## **10. Environment variables and secrets**

- **At build time (CI/Pages)**:
    - PYTHON_VERSION=3.11
    - ACX_DATA_BACKEND=csv (default; future duckdb|sqlite)
- **For API-based deploys (Option B)**:
    - CF_PAGES_PROJECT, CF_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Pages:Edit). [1]
- **No runtime secrets in production**: the site is static; never expose tokens in client code.

***

## **11. Observability & rollback**

- **Deploy logs**: Cloudflare Pages keeps logs per Preview/Production build. [1]
- **Sourcemaps**: not necessary unless you add a React build chain; for now, keep simple.
- **Rollback**: choose a previous successful deployment in the Pages dashboard and “Promote to Production,” or revert the Git commit and redeploy.

***

## **12. Quality gates and policies**

- **CI must pass** for both PRs and main.
- **CODEOWNERS** for:
    - /data/*.csv
    - /calc/schema.py, /calc/derive.py
    - /calc/dal.py
- **Tests** must include:
    - Figure slice presence & well-formedness.
    - [n] to IEEE refs mapping (no dangling indices).
    - Grid precedence and schedule exclusivity invariants.

***

## **13. Local developer workflow**

```javascript
# 1) Create feature branch
git checkout -b data/qc-grid-2024

# 2) Edit CSVs, run validation/build
make validate
make build
make app   # optional local Dash

# 3) Commit and push
git commit -am "data(qc): add CA-QC grid intensity 2024 + sources"
git push -u origin data/qc-grid-2024

# 4) Open PR → Preview deploy on Pages → Review & merge
```

***

## **14. Security posture**

- **No user input**; static assets only.
- **CSP** (optional): default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
- **Headers**: use a _headers file in dist/ to set Cache-Control and Content-Type for JSON/TXT.

Example _headers (placed under dist/):

```javascript
/index.html
  Cache-Control: no-cache

/artifacts/*
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/json; charset=utf-8
```

***

## **15. Future improvements**

- Dual-backend parity job: ACX_DATA_BACKEND=duckdb vs csv and diff export_view.json.
- Lighthouse check for the static client.
- Provenance panel in UI that echoes manifest.json (regions, vintages, sources used).
- Nightly rebuilds when upstream grid intensities are time-varying (skip for v1.1).

***

## **References**

[1] Cloudflare, “Pages—Deploying Websites,” 2025. Available: https://developers.cloudflare.com/pages/

[2] GitHub, “GitHub Actions—Automate your workflow,” 2025. Available: https://docs.github.com/actions

[3] Python Packaging Authority, “Poetry—Python packaging and dependency management,” 2025. Available: https://python-poetry.org/

[4] Plotly Technologies Inc., “Plotly JavaScript Graphing Library,” 2025. Available: https://plotly.com/javascript/

***

*End of ACX008.*