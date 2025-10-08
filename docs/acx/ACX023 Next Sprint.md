Below are **five hardened, copy-paste Codex Cloud PR prompts** matching the next steps we discussed. Each is explicit (title → intent → file-level changes → tests → acceptance → runbook) and assumes **Strategy A: stop committing generated artifacts** and produce them in CI.

***

## **PR 21 — Release Surface Hygiene (uncommit artifacts; CI builds)**

**Title:** build(release): remove committed artifacts; make builds reproducible; CI publishes dist/

**Intent:** Eliminate drift by removing committed build artifacts (dist/**, calc/outputs/**) from git; ensure make build package site reproducibly generates outputs; update CI to publish artifacts and (optionally) deploy Pages.

**Changes**

- **Repo hygiene**
    - Delete tracked generated files: dist/**, calc/outputs/** (retain .gitkeep only where paths must exist).
    - .gitignore: add dist/, build/, calc/outputs/, .pytest_cache/, .ruff_cache/.
    - .gitattributes: mark dist/** as export-ignore.
- **Makefile**
    - Ensure deterministic targets:
        - build → writes to build/calc/outputs/** (not repo paths).
        - site → writes static assets to build/site/**.
        - package → assembles dist/artifacts/** (JSON/CSV/TXT) and dist/site/**.
    - Respect ACX_DATA_BACKEND and a single OUTPUT_DIR env.
- **CI (.github/workflows/ci.yml)**
    - Steps: install → lint → test → make build site package.
    - Upload two artifacts: dist-artifacts and dist-site.
    - (Optional) Pages deploy step points at dist/site/.
- **Docs**
    - README.md: add “Build & Artifacts” section (no artifacts committed; use make package locally or download CI artifacts).
**Tests**
- Update tests to read fixture data and **never** assert on committed outputs.
- Add a smoke test that dist/ tree exists after package and contains site/index.* and artifacts/manifest.json.
**Acceptance**
- Repo contains **no** generated artifacts.
- make build site package produces deterministic dist/ locally.
- CI uploads dist-artifacts and dist-site; Pages deploy (if enabled) uses CI output.
**Runbook**

```javascript
git checkout -b build/release-hygiene
git rm -r dist calc/outputs
echo -e "dist/\nbuild/\ncalc/outputs/\n" >> .gitignore
make install && make build site package
pytest -q
git commit -am "build(release): untrack artifacts; reproducible builds; CI publishes dist/"
git push -u origin build/release-hygiene
```

***

## **PR 22 — Online EFs (Phase-1 provinces: ON/QC/AB/BC)**

**Title:** data(online+phase1): grid-indexed online EFs; ON/QC/AB/BC coverage

**Intent:** Seed a small, defensible set of **grid-indexed** Online EFs (streaming, videoconf, downloads, social scroll, generic LLM). Express as electricity_kwh_per_unit (+bounds when sourced). Leave region_code=NULL so provincial **grid_intensity** applies at runtime. Ensure Online profiles exist for **ON/QC/AB/BC**; unknowns remain **NULL** (never zero).

**Changes**

- data/sources.csv: add IEEE-style entries for every EF/grid reference used (complete with year/title/plain-URL).
- data/activities.csv (ensure present, layer_id=online):
MEDIA.STREAM.HD.HOUR.TV, CONF.HD.PARTICIPANT_HOUR, CLOUD.DOWNLOAD.GB, SOCIAL.SCROLL.HOUR.MOBILE, AI.LLM.INFER.1K_TOKENS.GENERIC.
- data/emission_factors.csv: for each activity add rows with:
    - is_grid_indexed=TRUE, electricity_kwh_per_unit (and optional _low/_high), scope_boundary, vintage_year, source_id, region_code=NULL.
    - Do **not** set value_g_per_unit on these rows (EF XOR).
- data/grid_intensity.csv: ensure **annual** rows for CA-ON, CA-QC, CA-AB, CA-BC with g_per_kwh (+bounds if sourced) and source_id.
- data/profiles.csv: add ONLINE.QC.CONSUMER.2025, ONLINE.AB.CONSUMER.2025, ONLINE.BC.CONSUMER.2025 (layer_id=online, region_code_default=CA-XX); schedules may remain NULL.
**Tests**
- tests/test_online_grid_index_scaling.py: create in-memory schedule fixture with **1 unit/day** per new activity for four profiles (ON/QC/AB/BC). Assert annual CO₂e ∝ provincial g_per_kwh within tolerance.
- tests/test_citations_online.py: assert every new EF source_id resolves; figure refs contain only dynamic online sources (depends on dynamic-citation plumbing).
- Extend schema tests for EF XOR, units, vintage_year ≤ current, layer_id=online.
**Acceptance**
- make validate && make build && pytest -q passes.
- For a given online activity, totals differ by province, explained by g_per_kwh.
- Figure JSONs include [n] mapping to the new sources; no hard-coded refs.
**Runbook**

```javascript
git checkout -b data/online-efs-phase1
make install
# edit sources.csv, activities.csv (if needed), emission_factors.csv, grid_intensity.csv, profiles.csv
make validate && make build && pytest -q
git commit -am "data(online+phase1): grid-indexed online EFs + ON/QC/AB/BC coverage"
git push -u origin data/online-efs-phase1
```

***

## **PR 23 — Dependency Governance (pins, lock check, SBOM, vuln scan)**

**Title:** sec/deps: pin ranges; lock-check; SBOM on release; vuln scan in CI

**Intent:** Stabilize supply chain: pin direct dependencies to compatible ranges, enforce lockfile integrity, emit SBOM on release, and add a CI vulnerability scan.

**Changes**

- pyproject.toml:
    - Convert unbounded pins to compatible ranges (e.g., pandas = ">=2.2,<2.3").
    - Add optional extra for DB backends:

```javascript
[tool.poetry.extras]
db = ["duckdb>=1,<2"]
```

- 
- **SBOM**
    - Add tools/sbom.py (or use CycloneDX Poetry): generate dist/sbom.cdx.json during make package.
- **Makefile**
    - Add sbom target; call from package.
- **CI**
    - Step: poetry lock --check (fails if lock outdated).
    - Step: generate and upload sbom.cdx.json.
    - Step: vuln scan (e.g., pip-audit --strict or safety check against the lock).
**Tests**
- None beyond CI; add a trivial assert that dist/sbom.cdx.json exists after make package (smoke).
**Acceptance**
- CI fails if lock is stale, SBOM missing, or vuln scan finds high-severity issues.
- Local make package writes dist/sbom.cdx.json.
**Runbook**

```javascript
git checkout -b sec/dependency-governance
poetry update  # curate minimal changes, then adjust ranges to match lock
make package
git commit -am "sec/deps: pin ranges; lock-check; SBOM; vuln scan in CI"
git push -u origin sec/dependency-governance
```

***

## **PR 24 — Contributor Docs & Maintenance Guardrails**

**Title:** docs: expand README + add CONTRIBUTING and MAINTENANCE_CALENDAR

**Intent:** Make onboarding and review predictable; document data flow, build, artifacts, governance, and maintenance cadence. Tie PRs to seeding protocol.

**Changes**

- README.md:
    - Sections: Overview, Data flow (CSV → models → derive → artifacts → UI), Local dev (make targets), Backends, Artifacts policy (no commits; CI only), How to run app/static site.
- CONTRIBUTING.md:
    - PR checklist: schema rules (EF XOR, units, vintage), **sources-first / null-first**, tests required, how to add activities/EFs/grids/profiles, how to update references, acceptance criteria, and how to run parity tests.
- docs/MAINTENANCE_CALENDAR.md:
    - Quarterly: dependency review, grid intensity refresh; Annual: profiles refresh, sources audit.
- .github/pull_request_template.md (if missing or outdated):
    - Requires listing source_ids added/used and confirming seeding protocol adherence.
**Tests**
- None (docs), but add CI step to fail if README.md mentions outdated make targets.
**Acceptance**
- New contributors can build, test, and package from README alone; PRs surface sources and seeding checklist automatically.
**Runbook**

```javascript
git checkout -b docs/contrib-and-maintenance
make build || true  # collect accurate command outputs for docs
git commit -am "docs: README, CONTRIBUTING, maintenance calendar, PR template"
git push -u origin docs/contrib-and-maintenance
```

***

## **PR 25 — UI & Static-Site Smoke Tests**

**Title:** test(ui): add Dash and static-site smoke tests

**Intent:** Catch UI regressions early with lightweight, backend-agnostic checks for both the Dash app and the static site built from artifacts.

**Changes**

- Add tests/test_app_layout.py:
    - Use Dash’s test client (or Flask test client if embedded) to import app/app.py, instantiate the app, and assert the presence of key component IDs (stacked, bubble, sankey, references).
- Add tests/test_static_site_build.py:
    - Run the site builder against **fixture artifacts** in tests/fixtures/artifacts_minimal/ (include tiny JSONs/refs).
    - Assert build/site/index.* exists and contains expected headings/anchors.
- tests/fixtures/artifacts_minimal/**: minimal deterministic slices + refs (not generated; version-controlled).
- CI: run these tests alongside existing suite.
**Acceptance**
- pytest -q passes locally and in CI.
- Breaking UI changes (missing IDs, builder failures) are caught by tests without needing the full pipeline.
**Runbook**

```javascript
git checkout -b test/ui-smoke
make install && pytest -q
git commit -am "test(ui): Dash + static-site smoke tests with fixture artifacts"
git push -u origin test/ui-smoke
```

Below is a **copy-paste-ready sprint** of Codex Cloud prompts. I’ve continued numbering from your earlier set.

***

## **PR26 — fix(readme): align UI language with Dash + static client (no FastAPI)**

**Intent**

- Remove any “FastAPI” wording; describe **Dash for local dev** and **static client on Cloudflare Pages** with prebuilt Plotly JSON + IEEE refs.     

**Changes**

- README.md: update “Run locally / Build / Deploy” sections.
- docs/: add short “What runs where” note linking to build artifacts.
- site/: ensure index copy matches ACX009 style rules (disclosure block, refs). 

**Acceptance**

- No “FastAPI” string in repo.
- README shows: Dash (dev) → static artifacts (prod), with exact file paths under calc/outputs/. 

**Tests**

- Add tests/test_copy.py::test_no_fastapi_mentions scanning README.md and site/.

***

## **PR27 — feat(calc): harden output-dir deletion with guardrails**

**Intent**

- Make _prepare_output_dir refuse deletion unless the path is **under <repo>/dist/artifacts** *or* an explicit env escape hatch is set (ACX_ALLOW_OUTPUT_RM=1). Current behavior is risky if ACX_OUTPUT_ROOT is misconfigured. (Risk called out in your status report.)

**Changes**

- calc/derive.py: add guard is_safe_output_dir(Path, repo_root).
- Require **content hash subdir**: dist/artifacts/<build_hash>/... (hash emitted in manifest). 
- Makefile: pass ACX_OUTPUT_ROOT=dist/artifacts.

**Acceptance**

- Attempting to point ACX_OUTPUT_ROOT=/ or external absolute paths → raises ValueError.
- Default build lands under dist/artifacts/<hash>/... with manifest.json including the hash.

**Tests**

- tests/test_outputs.py: simulate unsafe paths; assert exceptions and safe default behavior.

***

## **PR28 — chore(data): quarantine placeholders and block them in CI**

**Intent**

- Eliminate accidental shipping of placeholder rows (“Awaiting…”, “EF placeholder”, SRC.OLD). Enforce **null-first** and **source-first** rules in CI.   

**Changes**

- Create data/_staged/ and move any rows with placeholder text there.
- Add tools/check_placeholders.py that fails on banned tokens in /data/*.csv.
Banned tokens: Awaiting, placeholder, SRC.OLD, TBD.

**Acceptance**

- CI fails if banned tokens appear in /data/*.csv.
- Build shows NA for missing factors (no fake zeros). 

**Tests**

- tests/test_data_hygiene.py: asserts no banned tokens.

***

## **PR29 — refactor(scripts): decide fate of** 

## **migrate_to_v1_1.py**

##  **+ tests**

**Intent**

- Either delete the legacy migrator or document & test it. (It currently lingers without coverage.)

**Changes**

- Option A (preferred): remove script + references; add note in docs/CHANGELOG.md.
- Option B: keep it; add docs/scripts/migrate_to_v1_1.md and tests with a tiny input fixture → exact v1.1 CSVs. 

**Acceptance**

- No untested legacy paths left.
- If kept, a green test proves the transform is deterministic.

**Tests**

- tests/test_migrate_v11.py for Option B.

***

## **PR30 — test(figures): enforce figure/ref contracts (stacked, bubble, sankey)**

**Intent**

- Add the figure QA suite specified in ACX007: loadability, sums match, and **[n] ↔ IEEE list** mapping. 

**Changes**

- calc/figures.py: ensure slices always include value_low/high when known.
- tests/test_figures.py:
    - All calc/outputs/figures/*.json parse.
    - Hover indices present in JSON are a subset of references/*_refs.txt.
    - Totals equal parts within tolerance.

**Acceptance**

- Failing refs or mismatched totals break CI.

***

## **PR31 — ci: dual-backend parity (CSV vs DuckDB) + diff**

**Intent**

- Run the pipeline twice (ACX_DATA_BACKEND=csv and duckdb) and **diff the exports**. Lock future DB swaps without regressions. 

**Changes**

- .github/workflows/ci.yml: matrix job backend ∈ {csv, duckdb} then a diff step.
- tools/diff_exports.py: compare export_view.json (order-insensitive), fail on differences.

**Acceptance**

- CI fails if outputs differ across backends for identical inputs.

**Notes**

- Keep CSV authoritative; DuckDB is for speed. 

***

## **PR32 — feat(derive): embed** 

## **vintage matrix**

##  **+ region list in** 

## **manifest.json**

**Intent**

- Manifest should publish **regions used** and **vintage_year per region** (alignment rule in ACX005). 

**Changes**

- calc/derive.py: collect (region → vintage_year) for any grid-indexed usage; write to calc/outputs/manifest.json.
- app/ (or site/): show a small “Vintages” panel.

**Acceptance**

- Manifest includes { "regions": ["CA-ON", ...], "vintage_matrix": { "CA-ON": 2025, ... } }.

**Tests**

- tests/test_manifest.py: assert keys exist and are integers ≤ reference_year. 

***

## **PR33 — data(scale-phase-1): scaffold QC/AB/BC + cohort clones (no fake numbers)**

**Intent**

- Add **province rows** and **profile clones** for **QC, AB, BC** with **null-first** values until factors are seeded; wire tests that they exist. Phase-1 per ACX005. 

**Changes**

- data/grid_intensity.csv: add rows for CA-QC, CA-AB, CA-BC with vintage_year set (known year) and source_id stubs (real IEEE entries in sources.csv, numeric g/kWh can remain NULL if not yet validated).
- data/profiles.csv: clone ON cohorts → PRO.QC.24_39/40_56.2025, PRO.AB.*, PRO.BC.* with region_code_default=CA-XX.
- data/sources.csv: add canonical NIR/CER/operator sources (full IEEE strings).
- tests/test_regions_present.py: assert presence of all CA provinces + CA row. 

**Acceptance**

- Build remains green; QC/AB/BC appear in manifest regions (values may be NA). 

***

## **PR34 — ci(release): publish SBOM with releases**

**Intent**

- Generate CycloneDX SBOM in CI and **attach to GitHub Releases** (and/or Pages artifact) for supply-chain transparency. 

**Changes**

- Makefile: ensure make sbom target is used in CI.
- .github/workflows/release.yml: on tag, build, then upload dist/sbom/* as release assets.

**Acceptance**

- New tagged release includes cyclonedx.json (or .xml) artifact.

***

## **PR35 — lint(data): forbid** 

## **SRC.OLD**

##  **and enforce** 

## **source-first**

**Intent**

- Ensure every non-null numeric field maps to a **real** source_id. Blocks legacy SRC.OLD. 

**Changes**

- Extend tools/check_placeholders.py to:
    - Detect SRC.OLD in /data/*.csv.
    - For each EF row with numeric cells, assert source_id present and non-blank.

**Acceptance**

- CI fails if any numeric EF lacks a valid source_id or uses SRC.OLD.

***

## **PR36 — perf(calc/api): avoid re-reading CSVs per call (simple cache)**

**Intent**

- calc/api.get_aggregates currently reloads tables each call. Add a **process-level read-through cache** keyed by filename + mtime to reduce overhead; keep determinism. (Status report “may need caching as datasets grow”.)

**Changes**

- calc/dal.py or calc/api.py: add _csv_cache: Dict[Path, DataFrame] with invalidation on mtime change; unit-tested.
- Document behavior in a module docstring.

**Acceptance**

- Repeated calls do not hit disk if files unchanged; tests pass unchanged.

***

## **PR37 — feat(schema+ui): implement** 

## **layer toggles**

##  **per ACX018 (professional, light-industrial, heavy-industrial, online)**

**Intent**

- Add a **layer field** across exports & UI so users can toggle layers without scope drift. Backfill existing data as layer=professional. 

**Changes**

- (Schema side) Without changing CSV headers, emit a **computed layer** in exported views based on profile_id/category prefixes (e.g., PRO.* → professional, IND.TO.LIGHT.* → light_industrial, IND.TO.HEAVY.* → heavy_industrial, ONLINE.* → online).
*Rationale: avoids CSV header churn now; we can add a real layer_id column later.* 
- calc/derive.py: attach layer to export_view.json rows and figure slices.
- app/ or site/: add a **Layer** toggle; references panel unions sources across visible layers. 

**Acceptance**

- Toggling layers shows/hides their activities; references panel updates to the active union.
- Default view = **professional** only; industrial layers off by default (per ACX013/012 staging guidance).   

**Tests**

- tests/test_layer_toggle.py: build slices with multiple layers present; assert filter integrity and reference union.

***

## **PR38 — docs(copy): add disclosure block + NA explainer as reusable snippet**

**Intent**

- Ship canonical copy blocks (disclosure, NA, comparison footnote) and reuse them in UI. 

**Changes**

- site/components/Disclosure.md and site/components/NA.md; load manifest.json values dynamically.
- Ensure wording and order match ACX009.

**Acceptance**

- All charts display the disclosure block; NA segments render with the standard explainer.

***

## **PR39 — qa(gov): add CODEOWNERS + PR template per charter**

**Intent**

- Enforce review discipline aligned to ACX017. 

**Changes**

- .github/CODEOWNERS:
    - /data/*.csv → Data Owner
    - /calc/schema.py, /calc/derive.py, /calc/dal.py → Eng Owner
    - /docs/*.md → Docs Owner
    - /app/* and /site/* → UX Owner
    - Makefile, .github/workflows/* → CI/CD Owner
- .github/pull_request_template.md: require source links, scope/vintage notes, and “affects regions” checklist.

**Acceptance**

- PRs touching protected paths require the right reviewers; template appears by default.

***

### **Notes on sequencing**

- Tackle **PR26–PR32** first to harden docs/build/contracts; then **PR33** (Phase-1 scaffolding), **PR34–PR36** (release + perf), and **PR37–PR39** (layers, copy, governance).
- Data seeding for QC/AB/BC follows **ACX015** (one EF/activity per PR; no synthetic averages). 