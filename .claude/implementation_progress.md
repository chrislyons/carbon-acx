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

## 2026-08-27 — landscape viewport optimization (16:9 density)

Branch `feat/landscape-viewport-density`. Plan and acceptance ratios: landscape-viewport-optimization plan; full panel/scroll system summary in `docs/acx/ACX112 Landscape Viewport Optimization.md`.

- Added a shared landscape system to `apps/carbon-acx-web/src/app/globals.css`: density tokens (`--hero-size`, `--app-shell-max`, `--gap-panel`, vh-aware `--gap-section`), `app-stage` opt-in flex host (`main:has(> .app-stage)` + shell-wrapper cap), panel primitives (`.panel`, `.panel__scroll`, `[data-panel-scroll]` = tabindex/role/aria-label contract), documented breakpoint contract (≤700px mobile / 701–1023px portrait band untouched / ≥1024px landscape / ≥1200px three-column Atlas / ≥1680px ultrawide).
- Home (CSS-only): hero → `--hero-size`, ImpactTrace SVG height capped (`min-height: 0` + vh clamp) so the chart letterboxes instead of driving scroll; jobs row icons merged into kicker row via grid; short-landscape footer slims to one reference line. Ratio 2.23 → 1.04 @1280×720.
- Calculator: region wrappers `.calculator__columns` (shelf panel | worksheet panel), compact vertical category rail, 2-up activity shelf, `[data-panel-scroll]` regions ("Published activity shelf", "Activity basket worksheet"), `result-composition` sticky re-anchored to panel scroll, sankey render gate 640→480px (ImpactComposition) so the flow diagram renders in the narrower panel column. Ratio 3.15 → 1.00.
- Explore: `atlas__layout` grid regions (rail | matrix | detail; ≥1200px three-column), vertical mode-switcher + stacked filters in rail panel, record matrix + collapsible table inside one center scroll region, detail pane panelized, lab link absorbed into header row. Ratio 4.32 → 1.00 @1280×720.
- Methodology: `methodology-layout` editorial grid (intro / primer+policies left, provenance rail right, registry + OWID bottom pair), rail + wide references bounded with vh-capped inner scroll (`data-panel-scroll` regions), 3-col primer questions, wider `page-shell--reading` at ≥1024px. Ratio 5.87 → 1.68 @1280×720.
- Learn: metadata dl → 2-col grid inside bounded wrapper, description/source scrollers, display titles on hero scale. Ratio 1.96 → 1.24 @1280×720.
- Manifests: 2-col link-card grid at ≥1024px. Ratio 2.07 → 1.00 @1280×720.
- Harness `scripts/measure-viewport-fit.mjs` (Playwright vs static export, 7 routes × 7 viewports, stability-gated) + baseline `scripts/viewport-fit-baseline.json`; screenshot capture `scripts/capture-viewport-screens.mjs`.
- New e2e `tests/e2e/landscape-density.spec.ts`: per-route ratio targets at 1280/1440/1600/1920, no horizontal overflow, `[data-panel-scroll]` keyboard/naming contract, 44px touch targets at 1280×720. `playwright.config.ts` defaults untouched.

### Verification

- Harness: all acceptance targets met (`/` 1.04, calculator/explore/manifests 1.00, learn 1.24, methodology 1.68, 3d 1.00 @1280×720; 1440/1600/1920 rows green); zero horizontal overflow at every measured viewport; band viewports (720×1280, 844×390, 768×1024) within ±2% of baseline (learn/methodology ≤1.1% drift).
- `pnpm --filter carbon-acx-web lint`, `typecheck`, `test` — 37 Vitest passed.
- Full Playwright suite — 108/108 passed, incl. Axe (6 routes × light/dark × 2 viewports, serious/critical 0), 44px touch targets, 320×800/390×844 menu disclosure, reduced-motion 3D fallback, artifact verification.
- Screenshot review (56 captures, 8 routes × 7 viewports): landscape compositions match plan; portrait band and mobile unchanged.

## 2026-08-27 (2) — normalized tab status bars + full-viewport reading tabs

Follow-up on the landscape sprint, same branch. Every non-home tab now opens with a normalized 54px `TabHeader` status bar (new `src/components/layout/TabHeader.tsx`), sticky directly under the topbar (`--header-h: 4.5rem`; topbar min-height normalized to match). Heroes are gone; the bar carries the tab title (page h1) plus live meta:

- Calculator: basket count + annual total (kg CO₂e/yr) — updates as the basket is built.
- Explore: active mode + filtered/total records + 3D lab link.
- Learn / Methodology / Evidence library / 3D lab / manifest detail: counts, dataset schema, generation date, result status.

Reading tabs (learn, methodology, manifests, manifest detail, 3D) are now `app-stage` routes: `max-w-5xl`/`max-w-6xl`/80rem constraints removed, shells span `--app-shell-max`, content grids are viewport-bounded with inner scrollers (`learning-layout`, `methodology-layout`, manifest list). Result: every tab renders at ratio ≈1.0–1.7 at all landscape viewports (learn 1.24→1.00 @1280×720; methodology 1.68→1.47; manifests 1.00) — vertical dead space eliminated on 14″-class displays.

Footer normalized to the same 54px `--bar-h` (height-fixed, content vertically centered, margins removed).

Band viewports (≤1023px) also received the tab bar (intentional normalization; heroes removed there too — phone ratios shortened accordingly).

### Verification

- Harness: landscape rows all ≤ target (`/` 1.05/1.00, calculator & explore & manifests & 3d & learn 1.00, methodology 1.47/1.3/1.32/1.19).
- Full Playwright suite 108/108 (one spec updated: learn now asserts the tabbar title). Lint, typecheck, 37 Vitest green.
- Overflow regression found & fixed: full-bleed negative-margin bar overhung the viewport 2px/side — bar is now shell-aligned; methodology rail table got `overflow: auto` wrapper.

### Preview

`node scripts/serve-static.mjs 4180 dist/site` — http://localhost:4180 (all routes 200).

## 2026-08-27 (3) — Methodology/Evidence tab split + framing polish

- Split the overloaded Methodology tab: `/methodology` is now a pure reading tab (six-question primer + policy cards, no internal scroll regions); new `/evidence` tab (renamed from `/manifests`, promoted into header nav as the 6th tab — hotkeys auto-extend to 1–6) consolidates figure manifests, source registry, benchmarks table, OWID context, generated dataset metadata, and offline release info in a bounded two-column grid with footerbar jump links.
- Tab footerbar added to every non-home tab (54px, mirrors the headerbar, sticky above the site footer): Calculator (Clear/Copy CTAs as underlined text + skipped-input status), Learn (primer/Atlas links + screening-estimate disclaimer), Methodology (Primer anchor + Evidence link), Evidence (section anchors + raw artifacts + generated date), Explore (published/unavailable counts + units caveat), 3D (render status + Atlas link). Old boxed `worksheet__actions` and `learning-actions` blocks removed; footerbar buttons unboxed to underlined text at the 44px contract.
- Header/footer unbound from page-shell width (full-width bars, 1rem edge padding); brand byline → "carbon literacy index", weight 300, sizes 1.2rem/0.63rem.
- Sticky geometry hardened: tabbar/footer `flex: 0 0 auto` + min-height (flex-shrink was squashing them on content-heavy tabs); app-stage wrapper is now its own scroll container so topbar/tabbar/footerbar stay pinned while panels scroll; methodology/evidence layouts scroll internally.
- Panel alignment pass: all non-home tabs' panels flush 127–612 @1280×720 (learn cards equalized at 485px with card-level scroll, metadata stacked label-over-value, no mid-glyph clipping; methodology rail removed — content moved).
- Ratios after split: methodology and evidence both 1.00 at every landscape viewport; band viewports within tolerance. Full e2e 108/108; lint/typecheck/vitest green.

### Preview

http://localhost:4180 — `node scripts/serve-static.mjs 4180 dist/site`

## 2026-08-27 (4) — footer nav trim, open primer, evidence narrative, callout standard

- Site footerbar keeps only external links (Raw artifacts, Repository) — Methodology/Evidence live in the header now.
- Methodology primer is no longer a disclosure: all six questions render open in flow (`.disclosure--static`); specs updated (`details` count 0).
- Policy cards: deterministic 4-across at ≥1024px, stacked column ≤700px.
- Evidence tab narrative reorder: Sources → Benchmarks → Dataset metadata → Global context → Manifests (verification last, flowing into the footerbar's raw-artifacts link).
- Callout standard site-wide: 1.0rem / weight 500 mono for equation callouts (`.working-example__equation`, `.factor-record-details__equation`), learn arithmetic, and the calculator tally total (`.result-composition h2` — display font dropped, status line stepped down to 0.74rem to preserve hierarchy). Home hero value and ranked-list strongs exempted; contradicting 0.85rem landscape override removed.
- Full e2e 108/108 after each pass.

### Preview

http://localhost:4180 — `node scripts/serve-static.mjs 4180 dist/site`

## 2026-08-27 (5) — unit abbreviation in callouts

- New `src/lib/units.ts`: `abbreviateUnit()` — meaning-preserving unit map applied at render (passenger-kilometres→pkm, square metre-years→m²·yr, kilowatt-hours→kWh, kilometres→km, cubic/square metres→m³/m², hours→h, years→yr, "per year"→"/yr"; garments/servings/units unchanged).
- Applied at every unit render site: methodology primer equation, Learn worked arithmetic (both branches), FactorRecordDetails uncertainty range + worked equation, Calculator "Annual quantity (…)" labels, ScenarioPane per-year quantities, Explore detail pane. Generated dataset JSON unchanged (display-layer only).
- Spec equations updated to abbreviated forms. Full e2e 108/108.
