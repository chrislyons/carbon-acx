# PR-ACX040 — Hashed Manifests & Provenance (one job)

**Branch**: `feat/acx040-view-manifest`
**Goal**: Manifest-first loading with dual-write, CI gates, and docs.

**Codex Cloud prompt (single job)**

```javascript
Title: arch(calc+site+ci): ACX040 hashed manifests w/ back-compat

Intent
- Emit per-figure manifests + collection index; dual-write static + hashed.
- Site/Dash loaders prefer manifest index; fallback to legacy static names.
- CI validates schema + invariance ≤0.01% + refs order; set ACX040_HASHED=1.

Do
Calc
- Add calc/manifest_model.py (Pydantic v2) and calc/figures_manifest.py.
- In calc/derive.py: after building stacked/bubble/sankey payloads:
  - Minify via _stable_json_dumps(), sha256 → <sha8>.
  - Write: dist/artifacts/figures/<name>.json (legacy)
          dist/artifacts/figures/<name>.<sha8>.json (hashed)
          dist/artifacts/references/<name>_refs.<sha8>.txt
          dist/artifacts/manifests/<name>.<sha8>.manifest.json
- Build dist/artifacts/manifest.json (collection index; mark preferred:true on hashed when ACX040_HASHED=1).
- Utilities: _stable_json_dumps(), _payload_hash().

Runtime
- site/src/lib/api.ts and/or app/app.py:
  - Try artifacts/manifest.json → resolve figure filenames; else use legacy static paths.
  - References pane reads per-figure manifest.references.order to rebuild [n].

CI
- .github/workflows/ci.yml:
  - export ACX040_HASHED=1 for build job.
  - run make build && make verify_manifests (new target).
- tests/test_manifests.py:
  - JSON Schema validation for each manifests/*.json.
  - figure_sha256 matches file.
  - numeric_invariance.passed == true (tol ≤0.01%).
  - references.order aligns 1:1 with refs file lines.

Docs
- README: “Manifest-first discovery” section; static fallback note.
- site/public/schemas/figure-manifest.schema.json copied from model.

Acceptance
- Dual-write present for all 3 figures; collection index exists.
- Site loads via manifest index; legacy fallback still works.
- CI green.

```

***

# CDX061- — Layer Browser & UX Density (standalone, micro-sprint)

### CDX061-01 — Layers data + audit + CI

**Branch**: `feat/cdx061-01-layers-audit`

**Codex Cloud prompt**

```javascript
Title: data+calc+ci: introduce layers.csv, wire FKs, add audit

Intent
- Make layers first-class; enforce presence; emit audit report.

Do
Data
- Add data/layers.csv (layer_id, layer_name, layer_type[industry|civilian|crosscut], description).
- Add layer_id column to data/activities.csv (and operations.csv if present); fill existing rows.
Calc
- calc/schema.py: add Layer model; Activity/Operation include layer_id FK.
- calc/dal.py: load_layers(); validate all Activities/Operations reference a known layer.
Scripts
- scripts/audit_layers.py → artifacts/audit_report.json:
  { layers_present, activities_by_layer, ops_by_layer, ef_coverage, missing_icons, missing_refs, hidden_in_ui }
CI
- tests/test_layers.py: fail if any activity/operation has null/unknown layer_id.
- Makefile target audit → runs script + asserts non-empty layers.

Acceptance
- audit_report.json exists & lists non-empty layers; CI fails on missing layer_id.

```

### CDX061-02 — Layer Browser UI + density pass

**Branch**: `feat/cdx061-02-layer-browser-ui`

**Codex Cloud prompt**

```javascript
Title: app(ui): Layer Browser + dense 33/66 layout + routing

Intent
- Data-driven discovery of layers; compact left column; URL deep links.

Do
Frontend
- site/src/components/LayerBrowser.tsx:
  - Reads artifacts/layers.json (exported from calc or build) + artifacts/audit_report.json.
  - Renders layer list → activities with status chips:
    ✅ rendered  ⛔ missing data  ⚠️ seeded but hidden
  - Click filters charts to ?layer=<id>; keep in sync with URLSearchParams.
- site/src/styles/dense.ts: standard Plotly margins/legend spacing.
Layout
- Desktop: 33/66 grid; reduce left column vertical spacing by ~12%.
- References panel default-open under viz (desktop); mobile collapsed drawer.
Routing
- Respect ?layer=<id> on initial load; persist selection.

Acceptance
- Browser shows all seeded layers; toggling updates charts and URL.
- No new horizontal scroll on mobile; density improved on desktop.

```

(optional later: **CDX061-03** — README refresh + icon mapping polish)

***

# CDX071- — Local Chat (WebGPU, offline) (standalone, micro-sprint)

### CDX071-01 — Catalog generator

**Branch**: `feat/cdx071-01-catalog`

**Codex Cloud prompt**

```javascript
Title: calc: build artifacts/catalog.json for local chat (read-only)

Intent
- Export a minimal, browser-safe catalog from canonical CSVs.

Do
- New calc/make_catalog.py using DuckDB/pandas:
  activities: activity_id, name as label, category, layer_id, default_unit
  emission_factors: activity_id, unit, value_g_per_unit as ef_value_central,
                    uncert_low_g_per_unit as ef_lo, uncert_high_g_per_unit as ef_hi,
                    scope_boundary, region, vintage_year, source_id
  profiles: profile_id, name as label, region_code_default as region
  activity_schedule: profile_id, activity_id, basis(daily|weekly|annual), value, office_days_only
  grid_intensity: region_code as region, g_per_kwh as g_co2e_per_kwh, vintage_year as year
  manifest: { reference_year, region_policy, gwp_horizon }
- Null-first: do not coerce blanks to 0.
- Makefile target catalog; run before figures export.

Acceptance
- artifacts/catalog.json present; arrays non-empty; JSON schema lint passes.

```

### CDX071-02 — Local LLM adapter + model hosting

**Branch**: `feat/cdx071-02-local-llm`

**Codex Cloud prompt**

```javascript
Title: site(chat): WebGPU local LLM adapter + model assets (no network)

Intent
- Browser-only interpreter; no API calls; lazy-load model.

Do
- Add dependency: @mlc-ai/web-llm (ESM).
- site/src/lib/chat/Interpreter.ts (Msg/Intent interfaces).
- site/src/lib/chat/LocalLLMAdapter.ts:
  - Loads /models/<MODEL_ID> from import.meta.env.VITE_MODEL_ID or ?model=
  - System prompt: forbid inventing EFs/schedules; only select from catalog.*.
  - Tools: list_activities(keyword), list_profiles(keyword).
  - Returns deterministic Intent JSON (edits[], explanation).
- site/src/lib/catalog.ts: fetch artifactUrl('catalog.json').
- Env defaults (site/.env.production):
  VITE_CHAT_BACKEND=local
  VITE_MODEL_ID=qwen2.5-1.5b-instruct-q4f16_1
- site/public/_headers:
  /models/*
    Cache-Control: public, max-age=604800, immutable
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
- site/public/models/README.md: how to download/place model shards.

Acceptance
- First open of /chat lazy-loads model shards; no /api/ calls; console shows VRAM estimate.

```

### CDX071-03 — Chat UI + intent glue + guardrails + tests

**Branch**: `feat/cdx071-03-chat-ui-guardrails`

**Codex Cloud prompt**

```javascript
Title: site(chat): Chat UI, intent→scope glue, guardrails, tests

Intent
- Turn free-text into valid scenario edits; recompute charts; keep provenance clean.

Do
UI/State
- site/src/state/chat.tsx: history, send(), busy flags.
- site/src/components/ChatInterface.tsx: transcript, input, suggestion chips, warm-up states.
Apply intent
- applyIntent(intent): resolve to (profile_id, activity_id) via catalog; dry-run join;
  enforce like-for-like (region/vintage/scope).
- Trigger existing compute() without altering its signature.
Scenario manifest
- Build client-side JSON with selected rows, ordered source_ids, and a stable hash; show “What changed” in ScopeBar.
Guardrails
- site/src/lib/intentGuard.ts: block scope/year drift; propose minimal fix; refuse unknown activity with top-3 nearest matches.
Tests (Vitest)
- intentGuard.test.ts: scope/year drift cases + unknown activity path.
- catalog.test.ts: required keys non-empty; null-first preserved.
- ChatInterface.test.tsx: renders, disables send while warming, suggestion chips present.

Acceptance
- Typing “Compare 2 vs 4 office days; bike twice a week” yields a scenario card and refreshed charts.
- References pane updates deterministically from final EF set.
- All tests pass; no network usage beyond static model shards.

```