# Implementation Progress

## 2026-08-17 — D3-adjacent visualization skills port

- Ported the Whitebox Hermes data-science visualization skills to Cloudkicker at `~/.hermes/skills/data-science/`.
- Added `d3-visualization` with four references covering rendering foundations, React/Svelte integration, interaction and motion, and layouts/spatial visualization.
- Added `visualization-techniques` with five references covering distributions, relationships/time, composition/flow, matrix/hierarchy, and multivariate caveats.
- Confirmed the 11 local files match their Whitebox source SHA-256 hashes.
- Confirmed Whitebox `~/.omp/agent/skills/` contains no D3-adjacent data-science skill files; no `.omp` port was applicable.

### Next steps

- Use `d3-visualization` after chart selection, or load `visualization-techniques` first when the analytic encoding is undecided.

## 2026-08-21 — ACX109 production-grade hardening sprint

Branch `feat/acx109-prod-grade-sprint` (from main@3cb9753). Full findings, decisions, and measurements in `docs/acx/ACX109 Production Grade Hardening Sprint.md`.

- Manifest gate repointed at `tools/validator/schemas/` and made fail-closed; dead `site/` workspace member and CODEOWNERS entry removed.
- `DEFAULT_GENERATED_AT` defined for reproducible local builds; `_resolve_generated_at` contract tested.
- AI-scenario generator validation tightened: closed modality/unit vocabularies, token-basis compatibility, positive-or-disclosed media params, non-negative energy/carbon, workload-profile requirement; `derived-grid` removed as an impossible capability.
- `calc.derive.export_view` now prints excluded/null-emission counts to stderr.
- Worker compute route: additive security headers (`nosniff`, referrer-policy), OPTIONS no-store; contract bytes unchanged; 10 node:test cases.
- Pages Function proxy: suffix sanitization, upstream header allowlist, https-only origin; 4 new tests.
- `prepare_pages_bundle` emits baseline security headers + CSP for all routes.
- CI: web lint step, e2e job, weekly schedule; release workflow gated on validate/build with Poetry 1.8.3.
- Calculator: exact-match AI scenario resolver, ScenarioPane UI (published joins total, estimate evidence-only, unavailable explained), DataState chip vocabulary, pre-paint theme bootstrap (fixes flaky backslash-toggle race), lazy d3-sankey chunk, font preload.
- Dead config removed: `NEXT_PUBLIC_ENABLE_*`, app `vercel.json`, tracked `.vercel/` output, root `vercel-build`.

### Next steps

- Owner decision required: Pages deploy wiring divergence (`make package → dist/site` vs `pages_build_output_dir`) — see ACX109 deployment notes.

## 2026-08-25 — canonical data-stream contract and public catalog

Branch `audit/data-stream-layer`. Full inventory, lineage, standards, migration, ownership, and remaining risks: `docs/acx/ACX111 Canonical Data Stream Contract and Inventory.md`.

- Extended `data/dataflow_manifest.csv` from provenance-only rows to 23 versioned source contracts with stream ID, schema version, ordered fields, transport, cadence, retention, timezone policy, null policy, lineage, and publication surfaces.
- Made `make data-audit` fail closed for field-order drift, duplicate or malformed stream metadata, noncanonical null literals, empty record keys, and incomplete grid-indexed records.
- Removed retired `segment` aliases and made Pydantic source models reject undeclared fields. Valid canonical `sector_id` and layer UI metadata now hydrate explicitly.
- Separated the web-catalog schema from calculator schema and added required `streamId` / RFC 3339 UTC `generatedAt` metadata across calculator, catalog, AI-scenario, source, OWID-context, and release authorities.
- Added byte-verified `acx.stream-catalog/1-0-0` at `src/generated/stream-catalog.json` and `/data/stream-catalog.json`; `/data/release.json` binds its SHA-256 and Methodology links to it.
- Rebuilt tracked derived artifacts so their collection index no longer references missing hashed manifests; a subsequent static Next build completed without manifest-read errors.

### Verification

- `ACX_AUDIT_DATE=2026-08-25 make data-audit` — passed: 23 datasets, 1,285 claims; 108 retrieval-ledger rows.
- Targeted Python checks — 30/30 `tests/test_web_calculator_data.py` passed; normalization subset passed 19 tests with 2 optional DuckDB skips.
- `pnpm --filter carbon-acx-web typecheck` — passed.
- `pnpm --filter carbon-acx-web lint && pnpm --filter carbon-acx-web test` — passed; 37 Vitest tests.
- `ACX_AUDIT_DATE=2026-08-25 ACX_GENERATED_AT=2026-08-25T00:00:00+00:00 make build` — passed; regenerated and validated eight figure manifests.
- Same timestamped `make build-web` — passed: publication audit, static Next build, 14 static pages.
- `ACX_AUDIT_DATE=2026-08-25 make validate` — passed: 157 pytest tests, 4 optional skips, one Kaleido deprecation warning.
- `env -u CI pnpm --filter carbon-acx-web test:e2e -- redesigned-primary-flow.spec.ts` against the controlled local dev surface — 23/23 passed.
- Browser smoke: Methodology rendered the visible `Open the data-stream catalog` link; `/data/stream-catalog.json` returned the declared schema, stream ID, UTC generation timestamp, and 23 ordered contracts.

### Remaining dependencies

- OWID freshness remains an intentional maintainer-run snapshot operation; release builds are offline.
- The external retrieval ledger verifies metadata when raw evidence is unavailable locally.
- Derived artifacts retain stable and hashed paths pending a separately reviewed Dash/artifact-consumer migration.
