# Carbon ACX

> **Current dataset version:** v1.2【F:calc/outputs/sprint_status.txt†L1-L18】

Carbon ACX is an open reference stack for trustworthy carbon accounting. It turns auditable CSV inputs into a reproducible dataset, then ships the same disclosures through interactive Dash tooling, a static React experience, and Cloudflare delivery surfaces so teams can communicate climate performance with confidence.【F:calc/derive.py†L52-L92】【F:app/app.py†L12-L158】【F:site/src/App.tsx†L1-L160】【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

---

## Product vision

Carbon ACX is designed as a product-quality example of carbon accounting operations:

- **Measurement you can inspect.** The Python derivation engine keeps validation logic, figure generation, references, and manifests in the same code path so every published number carries lineage and checksums.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】
- **Storytelling without divergence.** Dash and the static site load identical artefacts, giving stakeholder demos and public embeds the same numbers, charts, and citations without bespoke rebuilds.【F:app/app.py†L12-L158】【F:site/src/App.tsx†L1-L160】
- **Delivery that fits modern stacks.** Cloudflare Pages serves packaged artefacts, while the Worker API powers on-demand calculations with strict input hygiene for programmatic integrations.【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

Together these pieces model how organisations can move from raw operational activity to production-ready climate disclosures without sacrificing reproducibility or clarity.

---

## What you get in this repository

| Capability | Highlights |
| --- | --- |
| **Source-of-truth data** | Canonical CSVs for activities, emission factors, schedules, grid intensity, and more live under `data/`, ready for rebuilds and audits.【F:data/activities.csv†L1-L10】 |
| **Derivation toolkit** | `python -m calc.derive` validates inputs, composes emissions, exports intensity matrices, and emits immutable manifests with hashed figures in `dist/artifacts/<hash>`.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】 |
| **Dash operations client** | `app/` houses the Dash experience used for analyst walkthroughs, including agency breakdowns, scenario toggles, and provenance-aware reference handling.【F:app/app.py†L12-L158】 |
| **Static React site** | `site/` contains a Vite + Tailwind build that mirrors the Dash workflow for marketing or investor portals while reading the same manifest catalogue.【F:site/src/App.tsx†L1-L160】 |
| **Edge delivery surfaces** | `functions/` provides the Cloudflare Pages function that hardens artefact serving, and `workers/` exposes a JSON API for compute scenarios and health checks.【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】 |
| **Packaging automation** | Make targets and helper scripts assemble reproducible releases, sync layer catalogues, and prepare static bundles with deployment metadata.【F:Makefile†L1-L120】【F:scripts/prepare_pages_bundle.py†L1-L100】 |

---

## Architecture at a glance

1. **Curate data.** Update CSV inputs in `data/` and describe schema evolution in Git for transparent change tracking.【F:data/activities.csv†L1-L10】
2. **Derive & validate.** Run `python -m calc.derive` (or `make build`) to compute emissions, layer views, manifests, and intensity matrices guarded by repeatable validation rules.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】
3. **Bundle outputs.** `make package` copies artefacts into `dist/site/artifacts`, writes Cloudflare headers/redirects, and records byte-level inventories for downstream integrity checks.【F:Makefile†L1-L120】【F:scripts/prepare_pages_bundle.py†L42-L100】
4. **Serve everywhere.** Dash reads from local artefacts, the static site consumes packaged JSON, and Cloudflare Functions/Workers deliver the same payload to browsers and APIs.【F:app/app.py†L41-L158】【F:site/src/App.tsx†L1-L160】【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

---

## Repository tour

| Path | Purpose |
| --- | --- |
| `calc/` | Pydantic schemas, datastore abstractions, derivation routines, figure builders, and manifest utilities for the carbon dataset.【F:calc/derive.py†L52-L92】 |
| `app/` | Dash components and layouts for analyst demos, including reference drawers, agency strips, and intensity explorers tied to derived payloads.【F:app/app.py†L12-L158】 |
| `site/` | Static React client (Vite 5 + Tailwind) with stage-managed storytelling, scope pins, and artefact-aware navigation for publishing.【F:site/src/App.tsx†L1-L160】 |
| `functions/` | Cloudflare Pages Function that proxies artefact access with immutable caching, sanitised paths, and optional upstream origins.【F:functions/carbon-acx/[[path]].ts†L1-L160】 |
| `workers/` | Cloudflare Worker compute API providing `/api/compute` and `/api/health` endpoints for lightweight integrations.【F:workers/compute/index.ts†L1-L123】 |
| `scripts/` | Maintenance utilities for syncing layer catalogues, packaging artefacts, auditing coverage, and preparing deployment metadata.【F:scripts/prepare_pages_bundle.py†L1-L100】 |
| `docs/` | Deep dives into change management, maintenance calendars, deployment guidance, and “what runs where” environment expectations.【F:docs/WHAT_RUNS_WHERE.md†L1-L11】 |

---

## Getting started

### Prerequisites

- Python 3.11+ with Poetry for dependency management.【F:pyproject.toml†L1-L12】
- Node.js ≥ 18 for the Vite-powered static site build (see `site/package.json`).【F:site/package.json†L1-L34】
- Make, Git, and a Cloudflare account (optional) if you plan to deploy Functions or Workers.
- Hugging Face access (token optional) to download the WebLLM chat model bundle.【F:site/public/models/README.md†L32-L48】

### Install dependencies

```bash
poetry install --with dev --no-root
make site_install
pnpm --prefix site download-model --optional
```

These commands install Python tooling, JavaScript dependencies, and doc linters referenced by the Make targets.【F:Makefile†L1-L120】

### Build the dataset

```bash
make build
```

`make build` invokes `python -m calc.derive` with guardrails that write immutable artefacts to `dist/artifacts/<hash>` and refresh intensity matrices for downstream clients.【F:Makefile†L1-L54】【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】

### Explore the experiences

- **Dash app:** `make app` launches the local Dash server reading derived artefacts from `calc/outputs` by default for analyst exploration.【F:Makefile†L1-L120】【F:app/app.py†L41-L158】
- **Static site:** `npm run dev -- --host 0.0.0.0` inside `site/` starts the Vite dev server mirroring the same catalogue for UX validation.【F:site/package.json†L1-L20】【F:site/src/App.tsx†L1-L160】
- **Worker API:** Use `wrangler dev` to exercise `/api/compute` and `/api/health`, verifying payload validation before deploying to Cloudflare.【F:workers/compute/index.ts†L1-L123】【F:wrangler.toml†L1-L12】

---

## Data & modelling workflows

- Update activity, factor, schedule, and grid CSVs in `data/` as the primary source of truth; keep provenance in sync with references and commit history.【F:data/activities.csv†L1-L10】
- Extend the schema or validation behaviour through the `calc` package so new data inherits manifest integrity and figure generation without bespoke glue code.【F:calc/derive.py†L52-L92】
- When you need intensity tables or exports for downstream models, run `python -m calc.derive intensity --fu all` or use the Make targets that wrap it for consistency.【F:Makefile†L1-L54】【F:calc/derive.py†L1080-L1151】

---

## Tooling, quality, and automation

- `make validate` runs Ruff, Black, doc linters, pytest, and asset validation in one pass.【F:Makefile†L17-L40】
- `make package` assembles the static site, copies hashed artefacts, and writes immutable caching headers for Cloudflare Pages deploys.【F:Makefile†L65-L104】【F:scripts/prepare_pages_bundle.py†L42-L100】
- Additional helpers include `make sbom`, `make catalog`, and reference-oriented scripts in `tools/` for maintaining compliance and citation integrity.【F:Makefile†L1-L120】

See `docs/TESTING_NOTES.md` and `docs/WHAT_RUNS_WHERE.md` for deeper guidance on QA expectations across environments.【F:docs/WHAT_RUNS_WHERE.md†L1-L11】

---

## Deployment notes

1. Run `make package` to produce `dist/site` with artefacts, `_headers`, `_redirects`, and a byte inventory ready for Cloudflare Pages uploads.【F:Makefile†L65-L104】【F:scripts/prepare_pages_bundle.py†L42-L100】
2. Deploy the Pages Function from `functions/` alongside the static bundle to enforce immutable caching, sanitised paths, and optional upstream origins.【F:functions/carbon-acx/[[path]].ts†L1-L160】
3. Publish the compute Worker with Wrangler so `/api/compute` exposes on-demand figures backed by the same dataset fingerprint as your builds.【F:workers/compute/index.ts†L1-L123】【F:wrangler.toml†L1-L12】

---

## Contributing & community

- Follow the pull request expectations in `CONTRIBUTING.md`, including schema hygiene, provenance notes, and parity checks.【F:CONTRIBUTING.md†L1-L52】
- Review the `docs/` folder for maintenance calendars, deployment walkthroughs, and lineage requirements when expanding the dataset.【F:docs/WHAT_RUNS_WHERE.md†L1-L11】
- Keep release notes in `CHANGELOG_ACX041.md` or a project-specific changelog so downstream consumers can track dataset adjustments.【F:CHANGELOG_ACX041.md†L1-L40】

---

## FAQ & tips

- Artefacts live under `dist/artifacts/<hash>`; update `ACX_ARTIFACT_DIR` if you need the Dash app to point at a custom bundle.【F:calc/derive.py†L52-L92】【F:app/app.py†L41-L158】
- `ACX_DATA_BACKEND` lets you swap between CSV and SQLite builds using the same derivation entry points (`make build-backend`).【F:Makefile†L1-L120】
- Avoid using the contiguous token spelled “F a s t A P I” in docs to satisfy repository hygiene checks.

---

## License

Carbon ACX is released under the MIT License. See [`LICENSE`](LICENSE) for details.
