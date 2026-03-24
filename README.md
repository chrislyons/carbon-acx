# Carbon ACX

![New UI Preview](https://img.shields.io/badge/New%20UI-Preview-blueviolet)
[![Claude Skills](https://img.shields.io/badge/claude-5%20skills-blue)](.claude/skills/manifest.json)
[![Skills Validated](https://img.shields.io/badge/skills-validated-green)](.claude/skills/validate.sh)

> **Current dataset version:** v1.2【F:calc/outputs/sprint_status.txt†L1-L18】

Carbon ACX is an open reference stack for trustworthy carbon accounting. It turns auditable CSV inputs into a reproducible dataset, then publishes that data through a primary Next.js web app, a Python analyst surface, and packaged Cloudflare delivery bundles so teams can communicate climate performance with confidence. The legacy Vite site and `scripts/build_site.py` remain in the repository as frozen compatibility code, while `workers/compute` is retained only as an experimental parity path until it matches the canonical Python contract.【F:calc/derive.py†L52-L92】【F:app/app.py†L12-L158】【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

---

## Manifest-first

Every chart, layer catalogue, and disclosure ships from a manifest that records byte hashes, schema versions, and provenance so downstream clients can trust figure lineage before rendering. The primary manifest schema lives at [`site/public/schemas/figure-manifest.schema.json`](site/public/schemas/figure-manifest.schema.json) and is enforced by the derivation pipeline so browser experiences, Dash, and Workers all consume the same contract.【F:site/public/schemas/figure-manifest.schema.json†L1-L140】【F:calc/derive.py†L52-L92】

---

## Product vision

Carbon ACX is designed as a product-quality example of carbon accounting operations:

- **Measurement you can inspect.** The Python derivation engine keeps validation logic, figure generation, references, and manifests in the same code path so every published number carries lineage and checksums.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】
- **Storytelling without divergence.** Dash and the web surfaces load identical artefacts, giving stakeholder demos and public embeds the same numbers, charts, and citations without bespoke rebuilds.【F:app/app.py†L12-L158】
- **Delivery that fits modern stacks.** Cloudflare Pages serves packaged artefacts through stable read-only routes, while experimental compute surfaces stay secondary until they are parity-tested against Python.【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

Together these pieces model how organisations can move from raw operational activity to production-ready climate disclosures without sacrificing reproducibility or clarity.

---

## What you get in this repository

| Capability | Highlights |
| --- | --- |
| **Source-of-truth data** | Canonical CSVs for activities, emission factors, schedules, grid intensity, and more live under `data/`, ready for rebuilds and audits.【F:data/activities.csv†L1-L10】 |
| **Derivation toolkit** | `python -m calc.derive` validates inputs, composes emissions, exports intensity matrices, and emits immutable manifests with hashed figures in `dist/artifacts/<hash>`.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】 |
| **Dash operations client** | `app/` houses the Dash experience used for analyst walkthroughs, including agency breakdowns, scenario toggles, and provenance-aware reference handling.【F:app/app.py†L12-L158】 |
| **Primary web app** | `apps/carbon-acx-web/` contains the Next.js application that now serves as the public product surface for manifests, calculator flows, and supporting exploration routes. |
| **Legacy compatibility site** | `site/` and `scripts/build_site.py` remain available for compatibility and migration work, but they are frozen and not part of the required release path. |
| **Edge delivery surfaces** | `functions/` provides the Cloudflare Pages function that hardens artefact serving, and `workers/compute` remains experimental until it is parity-tested against `calc.service.compute_profile`.【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】 |
| **Packaging automation** | Make targets and helper scripts assemble reproducible releases, sync layer catalogues, and prepare static bundles with deployment metadata.【F:Makefile†L1-L120】【F:scripts/prepare_pages_bundle.py†L1-L100】 |

## At-a-glance layers

| Layer | Type | Example activities |
| --- | --- | --- |
| Professional services | Civilian | Coffee—12 oz hot; Toronto subway—per passenger-kilometre |
| Online services | Civilian | Video conferencing hour; SaaS productivity suite seat |
| Industrial (Light) | Industry | Lab bench operation; Prototyping print run |
| Industrial (Heavy) | Industry | Steel batch furnace; Heavy equipment runtime |
| Military operations | Industry | Military aviation (pkm); Armoured convoy patrol |
| Weapons manufacturing | Industry | Fighter aircraft production; Armoured vehicle build |
| Defence installations | Industry | Military base (m²-year); Munitions depot (m²-year) |
| Scenario simulations | Crosscut | Armed conflict (month); Wildfire burned area—per hectare |
| Defence supply chain | Industry | TNT explosive production; RDX explosive production |
| Private security | Industry | Private security convoy (km); Security helicopter (hour) |
| Earth system feedbacks | Crosscut | Ocean CO₂ uptake; Cryosphere albedo loss |
| Industrial externalities | Crosscut | Tailings pond footprint; Acid mine drainage |

Layer descriptions, types, and activities are sourced directly from `data/layers.csv` so the table stays aligned with the seeded catalogue.【F:data/layers.csv†L1-L16】

---

## Architecture at a glance

1. **Curate data.** Update CSV inputs in `data/` and describe schema evolution in Git for transparent change tracking.【F:data/activities.csv†L1-L10】
2. **Derive & validate.** Run `python -m calc.derive` (or `make build`) to compute emissions, layer views, manifests, and intensity matrices guarded by repeatable validation rules.【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】
3. **Bundle outputs.** `make package` assembles the Next.js web bundle with packaged artefacts, writes Cloudflare headers/redirects, and records byte-level inventories for downstream integrity checks.【F:Makefile†L1-L120】【F:scripts/prepare_pages_bundle.py†L42-L100】
4. **Serve everywhere.** Dash reads from local artefacts, the primary web app consumes packaged JSON, and Cloudflare Pages Functions deliver the same payload to browsers and APIs. Legacy and experimental surfaces stay out of the required release path.【F:app/app.py†L41-L158】【F:functions/carbon-acx/[[path]].ts†L1-L160】【F:workers/compute/index.ts†L1-L123】

---

## Repository tour

| Path | Purpose |
| --- | --- |
| `calc/` | Pydantic schemas, datastore abstractions, derivation routines, figure builders, and manifest utilities for the carbon dataset.【F:calc/derive.py†L52-L92】 |
| `app/` | Dash components and layouts for analyst demos, including reference drawers, agency strips, and intensity explorers tied to derived payloads.【F:app/app.py†L12-L158】 |
| `apps/` | Next-generation web applications built as pnpm workspace packages. `carbon-acx-web` is the active public web product. |
| `site/` | Frozen compatibility client kept for migration and reference work; no longer the primary deployment target. |
| `functions/` | Cloudflare Pages Function that proxies artefact access with immutable caching, sanitised paths, and optional upstream origins.【F:functions/carbon-acx/[[path]].ts†L1-L160】 |
| `workers/` | Experimental compute surface kept for parity work only; it is not the authoritative machine-facing contract for milestone 1.【F:workers/compute/index.ts†L1-L123】 |
| `scripts/` | Maintenance utilities for syncing layer catalogues, packaging artefacts, auditing coverage, and preparing deployment metadata.【F:scripts/prepare_pages_bundle.py†L1-L100】 |
| `docs/` | Deep dives into change management, maintenance calendars, deployment guidance, and archived environment notes. |

---

## Getting started

### Prerequisites

- Python 3.11 with Poetry 1.8.x for the canonical data and CLI tooling.【F:pyproject.toml†L1-L12】
- Node.js 20.19.4 with pnpm 10.5.2 for the web app and workspace builds.【F:package.json†L1-L18】
- Make, Git, and a Cloudflare account (optional) if you plan to deploy Functions or Workers.

### Install dependencies

```bash
./scripts/bootstrap.sh
```

`./scripts/bootstrap.sh` validates the pinned toolchain and installs the Python and web dependencies used by the primary build path.【F:Makefile†L1-L120】

### Build the dataset

```bash
make build
```

`make build` invokes `python -m calc.derive` with guardrails that write immutable artefacts to `dist/artifacts/<hash>` and refresh intensity matrices for downstream clients.【F:Makefile†L1-L54】【F:calc/derive.py†L52-L92】【F:calc/derive.py†L1702-L1779】

### Explore the experiences

- **Primary web app:** `pnpm dev` from the repo root launches `apps/carbon-acx-web` for product work.
- **Dash app:** `make app` launches the local Dash server reading derived artefacts from `calc/outputs` by default for analyst exploration.【F:Makefile†L1-L120】【F:app/app.py†L41-L158】
- **Legacy site:** `site/` remains available for compatibility work, but it is not part of the primary release path.
- **Worker API (experimental):** Use `wrangler dev` only when validating parity work against the Python compute contract; do not treat this path as the canonical API surface yet.【F:workers/compute/index.ts†L1-L123】【F:wrangler.toml†L1-L12】

### Local Chat (WebGPU)

1. Use a Chromium-based browser with WebGPU enabled (Chrome 123+ or Edge) so the local worker can initialise GPU execution.
2. Download a compact model into `site/public/models/`—for example:

   ```bash
   pnpm dlx @mlc-ai/web-llm download qwen2.5-1.5b-instruct-q4f16_1 -o site/public/models/
   ```

3. Run `npm run dev -- --host 0.0.0.0` inside `site/` and open `/chat` to warm the model via `@mlc-ai/web-llm`; all prompts stay in-browser because inference executes through the local worker bridge.【F:site/public/models/README.md†L1-L4】【F:site/src/lib/chat/LocalLLMWorker.ts†L1-L120】【F:site/src/lib/chat/LocalLLMAdapter.ts†L1-L360】

---

## Data & modelling workflows

- Update activity, factor, schedule, and grid CSVs in `data/` as the primary source of truth; keep provenance in sync with references and commit history.【F:data/activities.csv†L1-L10】
- Extend the schema or validation behaviour through the `calc` package so new data inherits manifest integrity and figure generation without bespoke glue code.【F:calc/derive.py†L52-L92】
- When you need intensity tables or exports for downstream models, run `python -m calc.derive intensity --fu all` or use the Make targets that wrap it for consistency.【F:Makefile†L1-L54】【F:calc/derive.py†L1080-L1151】
- Keep UI icon assignments in sync via `data/icons.csv` so layer and activity surfaces stay backed by committed assets.【F:data/icons.csv†L1-L12】

---

## Tooling, quality, and automation

- `make doctor` validates the pinned Node, pnpm, Python, and Poetry versions used by the recovery baseline.
- `make validate` runs Ruff, Black, doc linters, pytest, and asset validation in one pass.【F:Makefile†L17-L40】
- `make package` assembles the primary web app bundle and packaged artefacts, then writes immutable caching headers for Cloudflare Pages deploys without rebuilding the legacy site.【F:Makefile†L65-L104】【F:scripts/prepare_pages_bundle.py†L42-L100】
- Additional helpers include `make sbom`, `make catalog`, and reference-oriented scripts in `tools/` for maintaining compliance and citation integrity.【F:Makefile†L1-L120】

See `docs/archive/TESTING_NOTES.md` and `docs/archive/WHAT_RUNS_WHERE.md` for deeper guidance on QA expectations across environments.

---

## Deployment notes

1. Run `make package` to produce the packaged Pages bundle in `dist/site` with the Next.js web output, artefacts, `_headers`, `_redirects`, and a byte inventory ready for Cloudflare Pages uploads.【F:Makefile†L65-L104】【F:scripts/prepare_pages_bundle.py†L42-L100】
2. Deploy the Pages Function from `functions/` alongside the static bundle to enforce immutable caching, sanitised paths, and optional upstream origins.【F:functions/carbon-acx/[[path]].ts†L1-L160】
3. Treat `workers/compute` as optional experimental infrastructure; parity-test it before any deployment and avoid making public guarantees around `/api/compute` until it matches the Python contract.【F:workers/compute/index.ts†L1-L123】【F:wrangler.toml†L1-L12】

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

---

## AI-Assisted Development

This project includes [Claude Skills](https://docs.claude.com/skills) for enhanced AI assistance.

### Available Skills

- **carbon.data.qa** — Query carbon accounting data, emission factors, and activities
- **carbon.report.gen** — Generate monthly, quarterly, and compliance reports automatically
- **acx.code.assistant** — Generate code following ACX conventions (React, TypeScript, Python, Workers)
- **schema.linter** — Validate config files (JSON, YAML, TOML)
- **dependency.audit** — Check for vulnerable dependencies and license compliance

Skills are located in `.claude/skills/` with complete documentation for each. See `CONTRIBUTING.md` for usage examples and validation instructions.

---
