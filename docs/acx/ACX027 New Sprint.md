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

If you want me to collapse any of these into single-issue PRs or expand any into check-listed commits, say which ones.