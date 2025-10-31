# **ACX020 Sprint Plan**

1. Materialize the **figures pipeline** and reference plumbing, anchored on the **daily core → weekly/annual** semantics. 
2. Replace UI placeholders with real Plotly components reading **prebuilt slices + IEEE refs**; keep dev in Dash, prod static. 
3. Land the **ACX010** test suite (schema, grid precedence, citations, figures, golden artifacts). 
4. Finalize **Makefile + CI** and package a **dist/** with site + artifacts for Cloudflare Pages. 
5. Add cross-layer infra (layer_id in CSVs/exports + UI toggles) so Professional/Online/Industrial can coexist without scope drift. 
6. Seed the **Online Services** catalog (no guess EFs; sources first) to light up toggles without breaking totals. 
7. Stub **Light-industrial** and **Heavy-industrial** safely (inert by default; no fake numbers).
8. Execute **National scaling—Phase 1** (QC/AB/BC intensities + baseline profiles + tests). 
9. Enforce **Governance** (CODEOWNERS, PR template, maintenance calendar). 
10. Keep **Data Seeding Protocol** front-and-center in PR templates and scripts so every numeric row carries a source. 

***

# **Codex Cloud — PR Prompts (ordered)**

## **PR 1 — Figures pipeline + citations**

**Title:** feat(calc): add figures pipeline (stacked/bubble/sankey) + IEEE refs

**Intent:** Implement calc/citations.py and calc/figures.py, and extend calc/derive.py to output calc/outputs/figures/{stacked,bubble,sankey}.json plus calc/outputs/references/*_refs.txt, preserving low/mean/high and daily→annual semantics.

**Changes:**

- New: calc/citations.py (IEEE de-duplication, stable ordering).
- New: calc/figures.py (pure slicers for stacked/bubble/sankey).
- Update: calc/derive.py to write slices, refs, and calc/outputs/manifest.json (regions, vintages, sources).
- New: calc/outputs/.gitkeep to ensure tree presence.
**Acceptance:**
- make build produces manifest.json and three figure JSONs + refs; all include [n] indices matching refs list; bounds present where available.
- No change to previously generated totals; daily core respected. 
**Tests:** add minimal smoke tests calling slicers (full suite lands in PR 3). 

***

## **PR 2 — Dash UI from real slices**

**Title:** feat(app): replace placeholders with Plotly components consuming figures/refs

**Intent:** Implement app/components/{stacked,bubble,sankey,references}.py and wire app/app.py to load local calc/outputs/** for dev.

**Changes:**

- New: Plotly components with hover text showing [n]; references panel renders plain-text IEEE list.
- Update: app/app.py to choose paths via env (ACX_ARTIFACT_DIR=calc/outputs).
**Acceptance:**
- make app launches a working Dash view: charts render; hover [n] aligns with right-pane refs; NA handling (dimmed/omitted) is correct. 
**Notes:** prod stays static (no server compute).

***

## **PR 3 — ACX010 test suite + goldens**

**Title:** test: add schema/grid/citation/figure/integration tests + golden artifacts

**Intent:** Land the full validation harness and golden outputs.

**Changes:**

- Add: tests/test_schema.py, tests/test_grid_index.py, tests/test_citations.py, tests/test_figures.py, tests/test_integration.py.
- Add: tests/fixtures/export_view.golden.json (small, deterministic).
**Acceptance:**
- pytest -q passes locally and in CI.
- Failing cases: schedule XOR, EF XOR, vintage in future, dangling [n], figure totals mismatch. 

***

## **PR 4 — Makefile, CI, and dist packaging for Pages**

**Title:** ci: finalize Makefile, GitHub Actions, and Pages-ready dist/ artifacts

**Intent:** Ship reproducible build with immutable artifacts for Cloudflare Pages.

**Changes:**

- Makefile targets: install, lint, test, build, site, package, ci_build_pages exactly as spec.
- Workflow: .github/workflows/ci.yml running Poetry, ruff/black/pytest, make build site package, and uploading dist/.
- Create dist/site/ (static UI) + dist/artifacts/ (JSON/CSV/TXT).
**Acceptance:**
- CI green on PR/main; dist/ artifact attached.
- Hash-named artifacts optional; manifest.json present. 

***

## **PR 5 — Cross-layer infrastructure (schema + UI)**

**Title:** feat(layers): add layer_id across CSVs/exports + UI toggles

**Intent:** Tag every row with layer_id ∈ {professional, online, industrial_light, industrial_heavy}, propagate to exports, and add a layer toggle in the UI.

**Changes:**

- CSV headers: add layer_id to activities.csv, profiles.csv, activity_schedule.csv; update validators.
- calc/derive.py + calc/figures.py: include layer in slices and manifest.json.
- UI: add layer filter; side-by-side comparison mode.
**Acceptance:**
- Existing professional data compiles with layer_id=professional and identical totals.
- Toggling layers filters charts without category leakage. 
**Tests:** schema check for layer_id presence; figure slices contain a layer field.

***

## **PR 6 — Online Services catalog (sources-first)**

**Title:** data(online): seed ONLINE.TO.CONSUMER.2025 activities + sources (EFs TBD)

**Intent:** Add ≤10 online activities and authoritative source entries; keep EFs NULL until cited numbers are added.

**Changes:**

- data/activities.csv: add slugs from ACX014 (e.g., MEDIA.STREAM.HD.HOUR.TV, CONF.HD.PER_PARTICIPANT_HOUR, AI.LLM.INFER.1K_TOKENS.GENERIC, …).
- data/profiles.csv: add ONLINE.TO.CONSUMER.2025 with layer_id=online, region_code_default=CA-ON.
- data/sources.csv: add DIMPACT/IEA/IESO/Scope3/LBNL/etc. IEEE strings.
- (Optional) data/activity_schedule.csv: add conservative frequencies with notes; NULLs allowed.
**Acceptance:**
- Build stays green; UI shows an “Online” toggle; NA segments are labeled (no zeros); no totals inflation. 

***

## **PR 7 — Light-industrial (safe stub)**

**Title:** data(ind_light): add minimal activity catalog + profiles (inert by default)

**Intent:** Park a small, credible catalog for construction/logistics with units, profiles, and optional schedules left NULL.

**Changes:**

- Append suggested rows to data/activities.csv and data/profiles.csv with layer_id=industrial_light.
- Add relevant federal/IESO sources to data/sources.csv.
**Acceptance:**
- No changes to professional totals; layer toggle reveals empty/NA traces only when selected; CI passes. 

***

## **PR 8 — Heavy-industrial (stub)**

**Title:** data(ind_heavy): add four canonical heavy activities + profile (hidden by default)

**Intent:** Reserve IDs for clinker, EAF steel, refinery fired units, mining haul; keep schedules and EFs NULL.

**Changes:**

- Add activities and IND.TO.HEAVY.2025 profile with layer_id=industrial_heavy.
- No EF rows yet.
**Acceptance:**
- Charts exclude heavy layer unless toggled; no fake numbers; CI green. 

***

## **PR 9 — National scaling (Phase 1: QC/AB/BC)**

**Title:** data(grid+profiles): add CA-QC/AB/BC intensities + baseline cohorts + tests

**Intent:** Implement Phase-1 of ACX005: provincial grid rows, two baseline profiles per province, source registry updates, and tests.

**Changes:**

- data/grid_intensity.csv: add annual rows (vintage ≤ 2025) for QC/AB/BC with source_id.
- data/profiles.csv: PRO.QC.24_39.HYBRID.2025, PRO.QC.40_56.HYBRID.2025, (and AB/BC equivalents) with layer_id=professional.
- tests/test_regions_present.py, tests/test_vintage_matrix.py.
**Acceptance:**
- make build reflects expected directionality (e.g., QC grid-indexed activities drop vs ON) without code changes; tests pass. 

***

## **PR 10 — Governance, CODEOWNERS, PR template, maintenance calendar**

**Title:** chore(gov): add CODEOWNERS, PR template, and maintenance calendar

**Intent:** Enforce reviews, document cadence, and align future PRs with ACX015 seeding rules.

**Changes:**

- .github/CODEOWNERS mapping data/schema/docs/app/CI to owners.
- .github/pull_request_template.md requiring sources, scope, vintage notes, and seeding checklist.
- docs/MAINTENANCE_CALENDAR.md (quarterly and annual sweeps).
**Acceptance:**
- Branch protection + CODEOWNERS gate kick in; template renders on new PRs.

***

## **(Optional follow-ups you can queue next)**

- **PR 11 — Online EFs (part 1):** add a *small* set of per-hour/per-GB EFs with explicit Ontario grid and IEEE sources; wire uncertainty fields; update goldens. 
- **PR 12 — CI parity hook (future):** add ACX_DATA_BACKEND=duckdb parity job when you’re ready (golden diff must match). 

***

### **Runbook (developer)**

```javascript
# per PR
git checkout -b <branch>
make install
make validate
make build
pytest -q
make app   # sanity check visuals
```

This keeps outputs deterministic (daily core, office-day weighting), keeps references IEEE-clean, and scales nationally without schema churn.