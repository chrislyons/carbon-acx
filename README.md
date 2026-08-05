# Carbon ACX

![New UI Preview](https://img.shields.io/badge/New%20UI-Preview-blueviolet)
[![Claude Skills](https://img.shields.io/badge/claude-5%20skills-blue)](.claude/skills/manifest.json)
[![Skills Validated](https://img.shields.io/badge/skills-validated-green)](.claude/skills/validate.sh)

> **Current dataset version:** v1.2

Carbon ACX is a public carbon-literacy web app and open reference stack. It turns auditable CSV inputs into a reproducible dataset, then publishes annual activity estimates, an evidence-first Activity Atlas, and static Cloudflare Pages bundles. The web calculator/catalogue authorities use `acx.web-calculator/1-4-0`; the versioned source envelope uses `acx.web-sources/1-0-0`. Every public calculation uses a cited, published factor; incomplete records are shown as unavailable rather than converted to zero.

---

## Public product

The primary public app is `apps/carbon-acx-web/` with five routes:

- **Start here** (`/`) introduces factor → annual estimate → source and states the product boundary.
- **Estimate** (`/calculator`) accepts annual activity quantities, exposes the arithmetic and evidence for every result, and compares only against labelled Canadian territorial benchmarks.
- **Explore** (`/explore`) is an Activity Atlas with opt-in filters for category, sector, layer, region, scope, and publication status. It never merges incompatible layers into a total.
- **Learn** (`/learn`) teaches the record contract through three source-backed, offline case studies without turning OWID context into a factor.
- **How we know** (`/methodology`) documents the generated-data contract, annual convention, regional preference, missing-data policy, benchmark basis, source registry, and pinned OWID context.

The secondary **Evidence library** (`/manifests`) ships static manifests and raw artifacts. Its browser verifier downloads a raw figure, computes SHA-256 with Web Crypto, and reports Verified, Hash mismatch, or Could not fetch artifact. The manifest schema is enforced by the derivation pipeline at [`tools/validator/schemas/figure-manifest.schema.json`](tools/validator/schemas/figure-manifest.schema.json).

---

## What you get in this repository

| Capability | Highlights |
| --- | --- |
| **Source-of-truth data** | Canonical CSVs for activities, emission factors, schedules, grid intensity, and more live under `data/`, ready for rebuilds and audits. |
| **Derivation toolkit** | `python -m calc.derive` validates inputs, composes emissions, exports intensity matrices, and emits immutable manifests with hashed figures in `dist/artifacts/`. |
| **Primary web app** | `apps/carbon-acx-web/` contains the static Next.js public product: Start here, Estimate, Activity Atlas, Learn, How we know, and the Evidence library. |
| **Published-data contract** | `scripts/generate_web_calculator_data.py` emits `acx.web-calculator/1-4-0` calculator/catalogue records, the `acx.web-sources/1-0-0` source envelope, and the offline `acx.owid-context/1-0-0` plus `acx.public-release/1-0-0` authorities from canonical data; incomplete records remain unavailable rather than zero. |
| **Packaging automation** | `make package` builds the static Next.js export into `dist/site`, then packages immutable raw artifacts and Pages metadata beside it. |

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

Layer descriptions, types, and activities are sourced directly from `data/layers.csv` so the table stays aligned with the seeded catalogue.

---

## Architecture at a glance

1. **Curate data.** Update canonical CSV inputs in `data/` with source, region, scope, GWP horizon, vintage, and unit evidence.
2. **Derive & validate.** Run `make build` to compute emissions, manifests, and intensity matrices under repeatable validation rules.
3. **Refresh the pinned OWID context when intentionally updating the source.** Run `python3 scripts/fetch_owid_context.py --output-dir data/owid` (or `make owid-context-update` / `pnpm owid:context:update`), inspect the manifest, and commit the three raw snapshot files.
4. **Generate public datasets.** Run `python3 scripts/generate_web_calculator_data.py --repo-root "$PWD" --output-root "$PWD"` to atomically emit calculator/catalogue/source, offline context, release, and `/public/data/` authorities. The generator is offline and validates raw OWID digests; incomplete records remain unavailable rather than zero.
5. **Package static delivery.** Run `make package` to export the Next.js app to `dist/site` and copy raw `/artifacts/` for browser-side hash verification.

---

## Repository tour

| Path | Purpose |
| --- | --- |
| `calc/` | Pydantic schemas, datastore abstractions, derivation routines, figure builders, and manifest utilities for the carbon dataset. |
| `app/` | Dash components and layouts for analyst demos tied to derived payloads. |
| `apps/carbon-acx-web/` | Active public static Next.js product. |
| `scripts/fetch_owid_context.py` | Refreshes the intentionally pinned Canada OWID snapshot; generation never performs a network request. |
| `scripts/generate_web_calculator_data.py` | Builds and atomically publishes the calculator, catalogue, source envelope, offline OWID context, release manifest, and public data copies from canonical inputs. |
| `scripts/prepare_pages_bundle.py` | Adds raw artifacts, immutable cache headers, redirects, and a byte inventory to the static Pages bundle. |
| `docs/` | Deep dives into change management, maintenance calendars, deployment guidance, and archived environment notes. |

---

## Getting started

### Prerequisites

- Python 3.11 with Poetry 1.8.x for the canonical data and CLI tooling.
- Node.js 20.19.4 with pnpm 10.5.2 for the web app and workspace builds.
- Make, Git, and a Cloudflare account (optional) if you plan to deploy Functions or Workers.

### Install dependencies

```bash
./scripts/bootstrap.sh
```

`./scripts/bootstrap.sh` validates the pinned toolchain and installs the Python and web dependencies used by the primary build path.

### Build the dataset

```bash
make build
```

`make build` invokes `python -m calc.derive` with guardrails that write immutable artefacts to `dist/artifacts/<hash>` and refresh intensity matrices for downstream clients.

### Explore the experiences

- **Public routes:** `/`, `/calculator`, `/explore`, `/learn`, `/methodology`, and the secondary `/manifests` Evidence library.
- **Dash app:** `make app` launches the local Dash server reading derived artifacts for analyst exploration.
- **Static preview:** after `make package`, run `wrangler pages dev dist/site` to inspect the production-style static bundle and `/artifacts/`.

---

## Data & modelling workflows

- Update activity, factor, schedule, and grid CSVs in `data/` as the primary source of truth; keep provenance in sync with references and commit history.
- Extend the schema or validation behaviour through the `calc` package so new data inherits manifest integrity and figure generation without bespoke glue code.
- When you need intensity tables or exports for downstream models, run `python -m calc.derive intensity --fu all` or use the Make targets that wrap it for consistency.
- Keep UI icon assignments in sync via `data/icons.csv` so layer and activity surfaces stay backed by committed assets.

---

## Tooling, quality, and automation

- `make doctor` validates the pinned Node, pnpm, Python, and Poetry versions used by the recovery baseline.
- `make validate` runs Ruff, Black, doc linters, pytest, and asset validation in one pass.
- `make package` builds the static public app, copies it to `dist/site`, packages raw artifacts, and writes immutable caching headers for Cloudflare Pages.
- `pnpm --filter carbon-acx-web test:e2e` covers evidence arithmetic, benchmarks, unavailable data, the 2D fallback, removed Worlds navigation, artifact verification, and serious/critical Axe violations.
- Additional helpers include `make sbom`, `make catalog`, and reference-oriented scripts in `tools/` for maintaining compliance and citation integrity.

---

## Deployment notes

1. Run `make package` to produce `dist/site` with the static Next.js export, raw `/artifacts/`, `_headers`, `_redirects`, and a byte inventory.
2. Serve or deploy `dist/site` directly to Cloudflare Pages. The public product has no required runtime API routes, server actions, or factor-inference path.
3. Verify an artifact from `/manifests` after deployment; the check must compare downloaded bytes to the published SHA-256 hash before reporting success.

---

## Contributing & community

- Follow the pull request expectations in `CONTRIBUTING.md`, including schema hygiene, provenance notes, and parity checks.
- Review the `docs/` folder for maintenance calendars, deployment walkthroughs, and lineage requirements when expanding the dataset.
- Keep release notes in `CHANGELOG_ACX041.md` or a project-specific changelog so downstream consumers can track dataset adjustments.

---

## FAQ & tips

- Artefacts live under `dist/artifacts/<hash>`; update `ACX_ARTIFACT_DIR` if you need the Dash app to point at a custom bundle.
- `ACX_DATA_BACKEND` lets you swap between CSV and SQLite builds using the same derivation entry points (`make build-backend`).
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
