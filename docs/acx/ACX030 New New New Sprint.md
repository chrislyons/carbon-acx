**PR01 — SQL schema & DAL foundation**

Title: feat(db): add SQL schema, SqlStore DAL, and CSV↔DB bridges

Intent: Introduce a relational backend (SQLite/DuckDB) that mirrors v1.1 CSV headers and rules; keep CSVs as audit snapshots; run CSV and DB builds in CI and diff outputs.

Env: ACX_DATA_BACKEND=sqlite (DB-first), ACX_DATA_BACKEND=csv (legacy)

Scope & Files

- db/schema.sql (DDL)
- calc/dal_sql.py (SqlStore)
- calc/dal/__init__.py (factory switch)
- scripts/import_csv_to_db.py, scripts/export_db_to_csv.py
- .github/workflows/ci.yml (dual-run parity)
- Makefile (new targets)

Tasks

1. Create db/schema.sql with tables: sources, units, activities, emission_factors, profiles, activity_schedule, grid_intensity.

    - FKs: all *_id references enforced.
    - CHECK:

        - EF XOR: one of (value_g_per_unit) OR (is_grid_indexed=1 AND electricity_kwh_per_unit>0) must be set; not both.
        - Schedule exclusivity: NOT(both freq_per_day AND freq_per_week).
        - Year/vintage ≤ current year.
        - Region code matches ^CA(-[A-Z]{2})?$.
    - 
2. 
3. Implement calc/dal_sql.py SqlStore with methods matching existing CsvStore (load_* and save_* as needed).
4. Add calc/dal/__init__.py factory switch: env var ACX_DATA_BACKEND in {csv, sqlite, duckdb}.
5. Write import/export bridges:

    - import_csv_to_db.py: validate via existing Pydantic models, then INSERT.
    - export_db_to_csv.py: SELECT * per table to /data/*.csv (headers preserved).
6. 
7. Extend Makefile:

db_init:

	rm -f acx.db && sqlite3 acx.db < db/schema.sql

db_import:

	PYTHONPATH=. poetry run python scripts/import_csv_to_db.py --db acx.db --data ./data

db_export:

	PYTHONPATH=. poetry run python scripts/export_db_to_csv.py --db acx.db --out ./data

build_csv: ACX_DATA_BACKEND=csv PYTHONPATH=. poetry run python -m calc.derive

build_db:  ACX_DATA_BACKEND=sqlite PYTHONPATH=. poetry run python -m calc.derive --db acx.db

5. 

6. Update CI (.github/workflows/ci.yml): run make db_init db_import build_db and make build_csv; diff calc/outputs/ trees (CSV vs DB) and fail if different.

Tests

- tests/test_schema_sql.py: run PRAGMA foreign_keys=ON; attempt invalid inserts (fail), valid inserts (pass).
- tests/test_dal_sql.py: parity checks: SqlStore.load_* equals CsvStore.load_* for seed data.
- tests/test_parity.py: JSON deep-diff on calc/outputs/*.json after build_csv vs build_db.

Acceptance

- make db_init db_import build_db produces identical artifacts to make build_csv.
- CI passes with parity step.
- Switching ACX_DATA_BACKEND flips backends without code changes elsewhere.

Out of scope: API/UI work, visual design, story mode.

**PR02 — Worker API for live recompute**

Title: feat(api): Cloudflare Worker /api/compute for live profile recompute

Intent: Provide a server endpoint that accepts { profile_id, overrides } and returns figure slices computed against the DB.

Scope & Files

- workers/compute/index.ts (Cloudflare Worker)
- wrangler.toml (project + D1 binding if you use D1)
- calc/service.py (small orchestration: DAL+derive entry)
- site/.well-known/health.txt (simple health probe)

Tasks

1. Worker route POST /api/compute:

    - Request JSON:
2. 

{ "profile_id": "PRO.TO.24_39.HYBRID.2025",

  "overrides": { "TRAN.CAR.KM": 12.5, "MEDIA.STREAM.HD.HOUR": 2 } }

1. 
    - 

    - Validate payload; call calc/service.py with DAL=SqlStore and overrides.
    - Return { figures: {...}, references: [...], manifest: {...} }.
    - 
2. Add caching: cache key = stable hash of (profile_id, overrides, dataset_version).
3. Wire DB binding (D1) or local acx.db connection string via env.

Tests

- tests/test_api_compute.py: golden snapshot of response shape; latency < 300ms on seeded DB (local).
- Contract test: every [n] index present in figures/* resolves to an entry in references.

Acceptance

- curl to /api/compute returns valid slices; changing an override changes outputs; references intact.

**PR03 — Front-end shell (React/Tailwind), remove Dash**

Title: feat(ui): replace Dash shell with React/Tailwind base

Intent: Modern, responsive container for controls, canvas, and references — no branding fluff.

Scope & Files

- site/ (React + Vite + Tailwind)
- site/src/App.tsx, site/src/components/*
- site/src/lib/api.ts (fetch /api/compute)
- Makefile (site_build, site_dev)

Tasks

1. Scaffold Vite React app; configure Tailwind.
2. Layout (3 columns on desktop, stacked on mobile):

    - Left: Profile Controls (placeholder).
    - Center: Viz Canvas (placeholder).
    - Right: References Drawer (collapsible; keyboard accessible).
3. 
4. Replace Pages build step to copy site/dist/ → dist/site/.

Tests

- Lighthouse min scores: Perf ≥ 80, A11y ≥ 90, SEO ≥ 90.
- Keyboard nav across all focusable elements.

Acceptance

- make site produces dist/site/ and loads with empty state.
- No Dash remnants; app boots fast.

**PR04 — Profile builder (sliders/toggles) wired to API**

Title: feat(ui): interactive profile builder controls → live recompute

Intent: Let users adjust core lifestyle assumptions and see instant recompute.

Scope & Files

- site/src/components/ProfileControls.tsx
- site/src/state/profile.ts (localStorage-backed)
- site/src/lib/api.ts (call /api/compute)

Controls (MVP)

- Commute days/week (0–7 slider).
- Mode split (car/transit/bike) via stacked % input (100% total).
- Diet (omnivore/vegetarian/vegan) radio.
- Streaming hours/day (0–6 slider).

Tasks

1. Map controls → overrides (activity IDs used in DB).
2. Debounce 250ms; POST to /api/compute; update viz canvas.
3. Persist last-used controls in localStorage; restore on load.

Tests

- State persistence across reloads.
- API calls coalesced under rapid sliding (<= 4 calls per second).

Acceptance

- Adjusting any control visibly updates charts within < 500ms on local.

**PR05 — Visualization redesign (stacked/bubble/sankey)**

Title: feat(viz): modernize plots + minimal tooltips + references indices

Intent: Deliver polished visuals with lean, legible tooltips and [n] mapping.

Scope & Files

- site/src/components/Stacked.tsx
- site/src/components/Bubble.tsx
- site/src/components/Sankey.tsx
- site/src/components/ReferencesDrawer.tsx

Tasks

1. Stacked bars: rounded corners, animated transitions on data change.
2. Bubble: size = annual kg; subtle pulse on hover; axis labels with units.
3. Sankey: gradient links; hover highlights node + outgoing links.
4. Tooltips show: value + unit + [n]; no verbose JSON.
5. References drawer lists IEEE style text; [n] in tooltips align with order.

Tests

- Snapshot tests for each component.
- A11y: focus ring + ESC to close references drawer.
- Unit tests: [n] indices resolve.

Acceptance

- Charts update smoothly; indices match references; zero console errors.

**PR06 — Story mode (scroll narrative)**

Title: feat(ux): add “Story” view with scroll-triggered sections

Intent: Create a narrative path (Transport → Food → Online → Summary).

Scope & Files

- site/src/routes/Story.tsx
- site/src/components/StorySection.tsx

Tasks

1. Implement scroll-triggered animations (no heavy parallax).
2. Each section pulls focused slices from /api/compute.
3. Inline micro-copy (single line per section), references via drawer.

Tests

- Smooth scroll on mobile; 60fps target.
- No blocking of main thread > 50ms.

Acceptance

- Story view loads and transitions crisply; back button returns to dashboard.

**PR07 — Preset profiles (gallery)**

Title: feat(ui): preset profiles & quick-load

Intent: Fast onramp for non-technical users.

Scope & Files

- site/src/data/presets.json
- site/src/components/PresetGallery.tsx

Tasks

1. Define 4 presets (remote, suburban commuter, gamer/streamer, minimalist) as override bundles.
2. One-click apply → controls update → recompute.

Tests

- Preset apply restores exact state when re-selected.
- Deep link support: ?preset=gamer.

Acceptance

- Gallery visible; each preset applies cleanly.

**PR08 — Export options (CSV/PNG/TXT)**

Title: feat(export): download data snapshot & references

Intent: Make sharing and transparency effortless.

Scope & Files

- site/src/components/ExportMenu.tsx
- workers/compute/index.ts (add /api/export if needed)

Tasks

1. Export CSV of current export_view slice.
2. Export PNG of current canvas (client-side render to image).
3. Export References.txt (IEEE list in current view order).

Tests

- Files named with short hash of current inputs.
- PNG <= 1.5MB at 2x scale.

Acceptance

- All exports download; CSV columns match wide view; references file is clean text.

**PR09 — Onboarding wizard**

Title: feat(ux): 3-step onboarding → initial profile

Intent: Let first-time users set a baseline quickly.

Scope & Files

- site/src/routes/Onboarding.tsx
- site/src/components/Wizard.tsx

Tasks

1. Steps: commute style, diet, streaming.
2. Save result as local preset; route to dashboard.

Tests

- Skip path available; back/next keyboard accessible.

Acceptance

- Wizard completes in < 30s and yields sensible starting profile.

**PR10 — Layer toggles (industrial & online)**

Title: feat(viz): optional layers toggles (light/heavy industry, online services)

Intent: Reveal extra layers without overwhelming baseline users.

Scope & Files

- site/src/components/LayerToggles.tsx
- DAL/derive: ensure figure slices include layer tags

Tasks

1. Add UI toggles.
2. When enabled, include layer series in figures and references union.

Tests

- Toggling layers changes totals predictably and updates references.
- No category collisions across layers.

Acceptance

- Off by default; toggling on/off roundtrips cleanly.

**PR11 — Accessibility & polish**

Title: chore(a11y): WCAG 2.1 essentials + mobile polish

Intent: Ensure the modern UI is actually usable for everyone.

Scope & Files

- site/ components audit
- site/src/styles/* (contrast, focus)

Tasks

1. Color contrast ≥ 4.5:1; focus states visible; ARIA labels for controls.
2. Keyboard-only path for all interactions (references drawer, exports, wizard).
3. Mobile: touch targets ≥ 44px; layout reflow verified.

Tests

- Axe-core automated checks in CI.
- Manual screen reader pass of primary flows.

Acceptance

- A11y CI passes; no regressions on mobile.

**Notes for Codex Cloud**

- Respect existing repo structure; do not rename core directories without instruction.
- Keep CSV as audit snapshots (exporter) even after DB is added.
- All new files must include minimal docstrings/comments describing their purpose.
- When adding new env vars, document them at the top of README.md and .env.example.
- Prefer small PRs; each PR above is intended as a separate branch + merge.

If you want, I can now generate ready-to-run PR01 and PR02 patch sets (DDL skeleton + SqlStore interface stubs + CI diff step) in a single message.

***

Got it. Here are Codex Cloud–ready PRs to (1) minimize whitespace and (2) fix the dead visualization (404 / no figures). Copy-paste as tasks.

**PR12 — Densify layout, minimize whitespace**

Title: ui(layout): compact three-column grid, reduce gutters, add dense controls

Intent: Remove excess “blackspace” while preserving clarity.

Scope & Files

- site/src/App.tsx (page shell)
- site/src/components/Layout.tsx
- site/src/components/ProfileControls.tsx
- site/src/components/ReferencesDrawer.tsx
- site/src/styles/tailwind.css

Tasks

1. Grid & gutters

    - Replace container max width with full-bleed:

        - Root wrapper: w-screen min-h-screen.
        - Grid: grid grid-cols-[320px_minmax(0,1fr)_320px] gap-x-6 gap-y-4 md:grid-cols-[360px_minmax(0,1fr)_300px] md:gap-x-8.
    - 
    - Remove any extra top/bottom padding > py-6 (target py-4).
2. 
3. Canvas auto-fit

    - Make center “Visualization Canvas” fill remaining height:

        - min-h-[calc(100vh-120px)] on desktop; add overflow-hidden to canvas container and overflow-auto to inner scroll region.
    - 
4. 
5. Controls density

    - Convert left column sections to a 2-column subgrid where feasible:

        - Parent: grid grid-cols-2 gap-3.
        - Sliders/radio groups span 2 cols with col-span-2.
    - 
    - Reduce paddings: cards px-3 py-3, headings text-sm, body text-xs, leading-5.
    - Tighten section spacing to mt-4 (not mt-6/8).
6. 
7. Sticky section titles

    - Each section header: sticky top-0 z-10 backdrop-blur-sm bg-black/30 px-2 py-1.
    - Left column scrolls independently: overflow-auto + max-h-[calc(100vh-96px)].
8. 
9. References defaults

    - Collapse drawer by default on screens <1280px. Add caret icon only (no large header) to reclaim width.
10. 
11. Responsive

    - ≤1024px: switch to two-column grid grid-cols-[minmax(0,1fr)_320px] with controls stacked under canvas (order-2) and references as accordion.
12. 
13. Design tokens (tailwind)

    - Add utilities: .pad-compact { @apply px-3 py-3 }, .text-compact { @apply text-xs leading-5 }.
14. 

Acceptance

- No large empty bands on any viewport ≥1024px.
- Left column scrollable; canvas fills visible height without tall voids.
- Total horizontal gutters reduced by ≥40% vs. before.
- Lighthouse layout shift < 0.02; no overflow clipping.

**PR13 — Fix live compute (404), wire charts to API**

Title: feat(api+viz): restore /api/compute route, connect viz to live results

Intent: Resolve 404 from compute endpoint and render figures.

Scope & Files

- workers/compute/index.ts (or Pages Function functions/api/compute.ts)
- wrangler.toml (route + D1 binding if used)
- site/src/lib/api.ts (fetch wrapper)
- site/src/components/VizCanvas.tsx (render logic + error states)

Tasks

1. Route existence

    - Ensure one of:

        - Workers: src/workers/compute/index.ts exported as default fetch.
        - Pages Functions: functions/api/compute.ts exporting onRequestPost.
    - 
    - Map route to /api/compute* in wrangler.toml / Pages project settings.
2. 
3. Base URL correctness

    - Frontend fetch must be relative: fetch('/api/compute', ...) (no hardcoded domain/path). Respect subpath deployments (/carbon-counter).
4. 
5. CORS & content-type

    - Return Content-Type: application/json and Access-Control-Allow-Origin: * for preview/dev.
6. 
7. DB binding

    - If using D1: add d1_databases = [{ binding = "DB", database_name = "acx", database_id = "…" }] and read with env.DB.
    - Fallback to local SQLite in dev if D1 not present (guard by process.env.NODE_ENV or env.MODE).
8. 
9. Service orchestration

    - Worker calls a small module (calc/service.ts|py) that:

        - Validates payload { profile_id, overrides }.
        - Queries DAL for factors/schedules.
        - Runs derive to produce stacked.json, bubble.json, sankey.json, and references.
        - Returns { figures, references, datasetId }.
    - 
10. 
11. Frontend wiring

    - VizCanvas.tsx:

        - On controls change → call api.compute(); on success, render charts; on error, show compact inline alert with retry.
        - Remove placeholder “Unable to refresh results 404”.
    - 
12. 
13. Healthcheck

    - Add GET /api/health returning { ok: true, dataset: <hash> }. Frontend pings on boot to decide whether to use live or fallback (see PR14).
14. 

Acceptance

- /api/compute returns 200 with valid payload locally and in preview.
- Changing any control re-renders the three visualizations.
- No console 404/500 errors; dataset id displayed.

**PR14 — Fallback to static artifacts (resiliency)**

Title: feat(viz): fallback to prebuilt calc/outputs when API unavailable

Intent: Prevent blank canvas if live compute fails.

Scope & Files

- site/src/lib/api.ts
- site/public/outputs/*.json (copy from build)
- Build script to copy calc/outputs/**/*.json → site/public/outputs/

Tasks

1. On boot, call /api/health. If it fails or times out (>800 ms), set mode='static'.
2. In static mode, load default figure JSON from /outputs/stacked.json, /outputs/bubble.json, /outputs/sankey.json, /outputs/references.json.
3. If user changes controls while in static mode, show small toast: “Live compute offline — showing baseline dataset.”

Acceptance

- Canvas never empty: either live or static renders appear.
- Network toggling (simulate offline) degrades gracefully.

**PR15 — Skeleton loaders + zero-whitespace states**

Title: ui(loading): add skeletons and compact empty states

Intent: Ensure interim states don’t create big blank areas.

Scope & Files

- site/src/components/VizSkeleton.tsx
- site/src/components/AlertInline.tsx
- site/src/components/EmptyState.tsx

Tasks

1. Show skeleton (animated shimmer) while waiting on /api/compute.
2. Inline alert (AlertInline) replaces big empty banners; max-height 56px.
3. Compact empty state card with action (“Retry”) when repeated failures.

Acceptance

- No large vertical gaps during load or error; CLS remains low.

**Notes / Likely root cause of 404**

- Frontend probably requests /api/compute under a subpath (e.g., /carbon-counter/api/compute) while the Worker is mounted at /api/compute. The fix is relative fetch + correct route mapping in wrangler.toml or Pages Functions. Also verify the project uses either Workers or Pages Functions, not both overlapping.