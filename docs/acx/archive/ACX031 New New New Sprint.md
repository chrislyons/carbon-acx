Understood. Here are **ten copy-paste Codex Cloud prompts** (CDX001→CDX010), each self-contained and explicit. They assume the repo root is carbon-acx/ and Poetry + Make targets already exist (install, validate, build, etc.). Keep the serials **project-scoped** (CDX###). Each prompt ends with acceptance checks, CI expectations, and rollback notes.

⸻

**CDX001 — Conventions Hardening (ACX/CDX/PR lineage)**

**Title:** docs(conventions): codify ACX↔CDX↔PR lineage + PR template

**Intent:** Add a short contributor note and PR template that make ACX (spec), CDX (prompt), and PR (GitHub) traceable in every change.

**Do (from repo root):**

	1.	Create docs/CONTRIBUTING_SERIES.md with:

	•	Sections: Purpose, Serial systems, How to cite ACX/CDX in commits/PRs, Examples.

	•	State: “ACX### identifies specs; CDX### identifies prompts; PR # is GitHub’s artifact. Every PR must include both ACX and CDX where applicable.”

	2.	Create/replace .github/pull_request_template.md with the following block at top:

## Traceability

Implements (spec): ACX###

Prompt (execution): CDX###

Related issues/tickets: #

## Summary

- What changed:

- Why:

## Data/Sources

- New sources.csv rows? (y/n)

- IEEE references added/updated:

## Tests

- [ ] make validate passes

- [ ] pytest passes

	3.	Add a brief README appendix: append a “Serials & Traceability” subsection to README.md referencing the above doc.

**Tests:**

	•	No runtime tests. Run git grep -n "Traceability" .github/pull_request_template.md must find the heading.

	•	ruff/black should still pass (make validate).

**Acceptance:**

	•	New doc exists; PR template renders the traceability block in PR composer.

	•	README has the appendix paragraph with a pointer to docs/CONTRIBUTING_SERIES.md.

**Suggested commit:**

docs(conventions): add ACX↔CDX↔PR lineage and PR template (CDX001, implements ACX017)

**Rollback:** revert the three touched files.

***

Great—this is exactly the snapshot we needed. Based on the audit, here are reformulated, copy-paste Codex Cloud prompts for CDX002–CDX010 that respect what already exists (DAL as a package, AST FU evaluator, present intensity kernel, Pages Function proxy) and only add what’s missing or partial.

**CDX002B — Seed minimal demo rows for Entities/Assets/Operations (non-fake, clearly labeled)**

Title: data(seed): add minimal demo rows for entity/site/asset/operation (+ fixtures)

Intent: Exercise existing validators and enable intensity comparisons with at least one corporate operation. Keep rows clearly marked as demo.

Do:

1. Append to data/entities.csv:

ENTITY.COKE.CA,Coca-Cola Canada,corporate,,Demo seed for comparison only

2. Append to data/sites.csv:

SITE.COKE.TO.DC01,ENTITY.COKE.CA,Toronto DC 01,CA-ON,,,Urban distribution center (demo)

3. Append to data/assets.csv:

ASSET.COKE.TRUCK.C6.DIESEL.2023,SITE.COKE.TO.DC01,vehicle,Class-6 Beverage Truck (demo),2023,,diesel,Demo seed only

4. Append to data/operations.csv:

OP.COKE.DELIVERY.URBAN_2025,ASSET.COKE.TRUCK.C6.DIESEL.2023,TRAN.DELIVERY.TRUCK.CLASS6.KM,FU.LITRE_DELIVERED,modeled,2025-01-01,2025-12-31,,,"Demo: throughput variables set at runtime"

5. Add a tiny test fixture under tests/fixtures/ops_demo.json with example variables:

{"operation_id":"OP.COKE.DELIVERY.URBAN_2025","vars":{"route_km":120,"cases_delivered":200}}

6. In tests (new tests/test_ops_demo.py), load CSVs via DAL and assert FK integrity holds (no orphans).

Acceptance:

- pytest -q passes; DAL loads 1 entity, 1 site, 1 asset, 1 operation.
- No FK violations; rows present in audit.

Commit:

data(seed): minimal demo rows for entities/sites/assets/operations (CDX002)

**CDX003B — FU registry already present: add two mappings only (keep AST evaluator)**

Title: data(map): expand activity→FU mappings (person-km, litre delivered)

Intent: Extend existing data/activity_fu_map.csv with two practical rows; no code changes.

Do (append):

TRAN.DELIVERY.TRUCK.CLASS6.KM,FU.LITRE_DELIVERED,"fu = route_km / litres_delivered","If only cases_delivered provided: litres_delivered = cases_delivered*24*0.355"

TRAN.SCHOOLRUN.CAR.KM,FU.PERSON_KM,"fu = distance_km * passengers","passengers defaults to 1"

Acceptance: CSV validates; mappings visible to derive.

Commit:

data(map): add delivery truck + school run FU mappings (CDX003B)

**CDX004 — Intensity kernel present: wire outputs to a stable build step**

Title: calc(outputs): emit intensity artifacts to build dir; no behavior change

Intent: Call existing build_intensity_matrix during build and write:

- dist/artifacts/intensity_matrix.csv
- dist/artifacts/references/intensity_refs.txt
Do:

1. In calc/derive.py, expose a CLI entry python -m calc.derive intensity --fu all.
2. In Makefile build/pack steps, after calc:

    - Ensure dist/artifacts/ exists.
    - Write the two files above (do not version them under calc/outputs/).
3. 
4. Guard for null-first: if no rows, still create empty CSV with headers.

Acceptance:

- make build creates both artifacts under dist/artifacts/.
- CSV has the columns the audit listed (keep the exact order).

Commit:

calc(outputs): route intensity artifacts to dist/artifacts (CDX004)

**CDX005 — Intensity Leaderboard UI (new component; reads artifacts)**

Title: app(ui): add intensity leaderboard component + “Intensity” tab

Intent: Render sortable leaderboard of g CO₂e per FU with error bars and a references pane. No cross-linking yet.

Do:

1. Add app/components/intensity.py:

    - Load dist/artifacts/intensity_matrix.csv (or /carbon-acx/artifacts/intensity_matrix.csv at runtime).
    - FU dropdown sourced from functional_units.csv.
    - Plotly bar: x=alternative (activity or operation), y=intensity_g_per_fu; include error_y from low/high.
    - Right pane: render plaintext from dist/artifacts/references/intensity_refs.txt.
2. 
3. Wire tab in app/app.py as “Intensity”.

Acceptance:

- make app shows the Intensity tab; selecting FU filters bars; references update.

Commit:

app(ui): intensity leaderboard + references panel (CDX005)

**CDX006 — Cross-visual linked highlighting (stacked ⇄ bubble ⇄ sankey)**

Title: app(ui): shared activity selection store + bidirectional highlight

Intent: Add dcc.Store(id="acx-active-activity"); propagate selection from any chart to the others; fade non-selected traces.

Do:

1. In each of app/components/stacked.py, bubble.py, sankey.py:

    - Populate customdata with activity_id.
    - On click, write activity_id into the store.
    - Subscribe peers to store; set marker.opacity ~0.25 for non-selected.
2. 
3. Add “Clear selection” control.

Acceptance:

- Click in one chart highlights the same activity in the other two within a tick.

Commit:

app(ui): linked highlighting via shared activity_id store (CDX006)

**CDX007 — Narrative one-liners (pairwise deltas from intensity)**

Title: app(copy): narrative helper for pairwise comparisons under charts

Intent: Generate neutral one-liners: “X = N g/FU vs Y = M g/FU (ΔZ%).”

Do:

1. Add app/lib/narratives.py with pairwise_blurb(fu_id, primary_activity_id, alt_ids).
2. Use the intensity CSV (already loaded in CDX005) to compute deltas.
3. Render the blurb below charts when an activity is selected (CDX006).

Acceptance:

- Selecting an activity shows a correct, neutral comparison line; handles missing bounds gracefully.

Commit:

app(copy): pairwise narrative blurbs powered by intensity (CDX007)

**CDX008 — Demo wiring: show corporate operation rows alongside activities**

Title: app(ui): toggle to include corporate operations (OP.*) in Intensity tab

Intent: Allow users to include/exclude operation rows (from entities/assets/operations) in the leaderboard for a chosen FU.

Do:

- In app/components/intensity.py, add a checkbox “Include corporate operations”.
- When enabled, include rows whose alt_id or activity_id identifies operations (use the field your kernel emits); otherwise hide them.

Acceptance:

- Toggling shows the demo OP.COKE.DELIVERY.URBAN_2025 row (even if some fields are NA).

Commit:

app(ui): corporate operation toggle in intensity leaderboard (CDX008)

**CDX009 — CI guards for traceability + no node_modules**

Title: ci(governance): add traceability + node_modules checks

Intent: Extend .github/workflows/ci.yml with two lightweight jobs (no secrets):

1. check-traceability on PRs — grep PR body for “Implements (spec): ACX” and “Prompt (execution): CDX”.
2. check-no-node-modules — fail if any tracked path matches ^.*node_modules/.

Acceptance:

- Draft PR with template lines passes; removing either line makes job fail with clear message.
- CI remains green otherwise.

Commit:

ci(governance): enforce ACX/CDX in PRs and block node_modules (CDX009)

**CDX010 — Artifact headers (Pages Function path) + explicit JSON types**

Title: deploy(headers): add cache/content-type headers for /artifacts/*

Intent: Define JSON content-type + caching for intensity artifacts (since _headers is absent and you’re using a Pages Function).

Do (in functions/carbon-acx/[[path]].ts):

- After fetching static asset, set:

if (url.pathname.startsWith('/carbon-acx/artifacts/')) {

  hdr.set('Cache-Control','public, max-age=31536000, immutable');

  if (!hdr.has('content-type')) hdr.set('content-type','application/json; charset=utf-8');

}

- Ensure GET/HEAD/OPTIONS are allowed (already per audit).
- Do not add _headers/_redirects to dist/ unless you move to a pure Pages static path.

Acceptance:

- GET https://boot.industries/carbon-acx/artifacts/intensity_matrix.csv → 200 with content-type: text/csv (if you also ship CSV), JSON files → application/json.
- Browser devtools show long-lived cache headers for /artifacts/*.

Commit:

deploy(headers): normalize content-type + caching for artifacts via Pages Function (CDX010)

**Why this set will unblock visuals**

- You already have the FU evaluator and intensity kernel; CDX004 just plugs the outputs into the build.
- CDX005 puts a visible face on intensities (the “center viz”), independent of cross-linking.
- CDX006–CDX007 bring interrelatedness (shared selection + narratives).
- CDX010 prevents client/parser weirdness by guaranteeing correct headers.

***

⸻

**CDX002 — Entity & Asset CSV Stubs (ACX019)**

**Title:** data(schema): scaffold entities/sites/assets/operations registries

**Intent:** Add four CSVs + validators (null-first, FKs) to model org→site→asset→operation. No behavior change yet.

**Files to add:**

	•	data/entities.csv

	•	data/sites.csv

	•	data/assets.csv

	•	data/operations.csv

**Initial CSV headers (add exactly, no rows):**

# data/entities.csv

entity_id,name,type,parent_entity_id,notes

# types: corporate|municipal|ngo|sovereign

# data/sites.csv

site_id,entity_id,name,region_code,lat,lon,notes

# data/assets.csv

asset_id,site_id,asset_type,name,year,power_rating_kw,fuel_type,notes

# asset_type examples: vehicle|building|line|chiller|server_cluster

# data/operations.csv

operation_id,asset_id,activity_id,functional_unit_id,utilization_basis,period_start,period_end,throughput_value,throughput_unit,notes

# utilization_basis: metered|modeled

**Code changes:**

	1.	calc/schema.py: add Pydantic models + validators for the four tables:

	•	Enforce type enum; region_code (ISO-3166-2) checks; null-first.

	•	FK checks: sites.entity_id ∈ entities, assets.site_id ∈ sites, operations.asset_id ∈ assets, operations.activity_id ∈ activities, operations.functional_unit_id may be NULL until CDX003.

	2.	calc/dal.py: add optional loaders:

def load_entities(...): ...

def load_sites(...): ...

def load_assets(...): ...

def load_operations(...): ...

Make them no-ops if files are empty.

**Tests (add new):**

	•	tests/test_entities_schema.py:

	•	Load empty CSVs → pass.

	•	Insert one bad row in a fixture (wrong type) → validator raises.

**Acceptance:**

	•	make validate and pytest -q green.

	•	Empty CSVs present; schema checks enforce enums + FKs.

**Commit:**

data(schema): scaffold entities/sites/assets/operations + validators (CDX002, implements ACX019)

**Rollback:** remove new CSVs and code blocks; keep tests guarded with @pytest.mark.skip if needed.

⸻

**CDX003 — Functional Unit Registry (ACX020)**

**Title:** data(schema): add functional_units + activity_fu_map (seed 3 FUs)

**Intent:** Create FU registry and map select activities. Seed minimal rows.

**Files:**

	•	data/functional_units.csv

	•	data/activity_fu_map.csv

**Headers + seed rows:**

# data/functional_units.csv

functional_unit_id,name,domain,si_equiv,notes

FU.PERSON_KM,person-kilometre,mobility,person*km,"Person travel distance"

FU.LITRE_DELIVERED,litre delivered,logistics,L,"Beverage or liquid delivered"

FU.VIEW_HOUR,viewing-hour,information,hour,"One hour of content viewed"

# data/activity_fu_map.csv

activity_id,functional_unit_id,conversion_formula,assumption_notes

TRAN.SCHOOLRUN.CAR.KM,FU.PERSON_KM,"fu = distance_km * passengers","Passengers defaults to 1 if not provided"

TRAN.SCHOOLRUN.BIKE.KM,FU.PERSON_KM,"fu = distance_km * 1",""

MEDIA.STREAM.HD.HOUR,FU.VIEW_HOUR,"fu = hours * viewers","viewers defaults to 1"

**Code:**

	1.	calc/schema.py: add models + validators:

	•	functional_units.domain enum {mobility, hydration, logistics, information, nutrition, shelter, comfort, care}.

	•	activity_fu_map enforces FK to activities and functional_units.

	2.	Add a tiny expression evaluator (safe) in calc/derive.py:

	•	Accept formulas like fu = distance_km * passengers.

	•	Use a safe dict of variables; when missing, allow defaults from notes or treat as NULL (null-first).

	•	No eval; parse with a simple whitelist (operators: + - * / ( ) and variable names [a-z_]+).

**Tests:**

	•	tests/test_fu_registry.py:

	•	FU and mapping load; unknown FU or activity fails.

	•	Conversion with distance_km=5, passengers=1.5 → fu=7.5.

**Acceptance:**

	•	Seed FUs are present; mapping validates.

	•	pytest -q includes conversion test.

**Commit:**

data(schema): add functional_units + activity_fu_map + safe FU evaluator (CDX003, implements ACX020)

**Rollback:** drop files; guard derive path with feature flag.

⸻

**CDX004 — Intensity Kernel (g CO₂e per FU) (ACX021)**

**Title:** calc(outputs): emit intensity_matrix.csv from activities×FUs

**Intent:** Compute per-alternative **intensity (g/FU)** and annualized totals, with uncertainty if available.

**Add to calc/derive.py:**

	•	New function build_intensity_matrix(profile_id=None, fu_id=None):

	•	Inputs: emission_factors, activity_fu_map, functional_units, profiles, activity_schedule.

	•	For each activity that maps to the selected FU:

	•	Determine **units per FU** from conversion_formula and schedule vars (e.g., distance_km, hours, passengers, viewers). If unknown → NULL (skip row).

	•	If EF is fixed: intensity_g_per_FU = value_g_per_unit * units_per_FU.

	•	If grid-indexed: intensity = kWh_per_FU * grid_g_per_kWh(region, vintage).

	•	Propagate low/high if EF has bounds.

	•	Annualization: multiply the FU by freq_per_day*365 (or weekly/7). Respect office_days_only weighting per ACX003.

	•	Write calc/outputs/intensity_matrix.csv with columns:

alt_id,activity_id,activity_name,functional_unit_id,fu_name,intensity_g_per_fu,intensity_low_g_per_fu,intensity_high_g_per_fu,annual_fu,annual_kg,scope_boundary,region,source_ids_csv

**References:**

	•	Also produce calc/outputs/references/intensity_refs.txt as the union of sources used, ordered by first appearance. Reuse citation utilities.

**Tests:**

	•	tests/test_intensity_kernel.py:

	•	At least 3 rows emitted for FU.PERSON_KM with seeded activities (car/bike + one more you already have).

	•	Low/high propagate when EF bounds present.

**Acceptance:**

	•	Running make build now creates calc/outputs/intensity_matrix.csv and references/intensity_refs.txt.

	•	CSV parses without NA coercion (true blanks remain blank).

**Commit:**

calc(outputs): add intensity_matrix (g/FU) + refs (CDX004, implements ACX021)

**Rollback:** gate writer call behind CLI flag, remove files.

⸻

**CDX005 — Intensity Leaderboard UI (Dash)**

**Title:** app(ui): add intensity leaderboard component + route

**Intent:** Render a sortable table/bar chart of **g CO₂e per FU** with error bars and a references pane.

**Files:**

	•	app/components/intensity.py (new)

	•	app/app.py (wire-in tab/route)

	•	site/ (if using static client later, keep parity in data fetch)

**Implement app/components/intensity.py:**

	•	Load calc/outputs/intensity_matrix.csv and references/intensity_refs.txt.

	•	Provide:

	•	FU selector (dropdown) sourced from functional_units.csv.

	•	Data table (alternatives × intensity_g_per_fu) with spark bars.

	•	Plotly bar chart: x = alternative, y = intensity_g_per_fu; error_y from low/high if present.

	•	Right pane: “References” plain-text viewer of the intensity refs list.

	•	Expose a pure function render_intensity_leaderboard(fu_id) for reuse.

**Wire in app/app.py:**

	•	Add a new tab/route “Intensity” calling the component above.

	•	Ensure cross-component styling matches existing UI.

**Tests:**

	•	Smoke test pytest for component import.

	•	Manual: make app renders the new tab; switching FU updates the chart and list.

**Acceptance:**

	•	Chart visible; FU dropdown works; references synchronize.

**Commit:**

app(ui): intensity leaderboard for g/FU with refs panel (CDX005, implements ACX007/ACX021)

**Rollback:** remove component and route.

⸻

**CDX006 — Cross-Visual Linking (stacked ⇄ bubble ⇄ sankey)**

**Title:** app(ui): linked highlighting across core charts

**Intent:** Clicking an activity in any chart highlights the same activity in the others.

**Changes:**

	•	Standardize a **global activity key** (activity_id) in figure traces’ customdata.

	•	In app/components/stacked.py, bubble.py, sankey.py:

	•	On click, emit a dcc.Store(id="acx-active-activity") value = clicked activity_id.

	•	Subscribe the other charts to this Store; apply styling (opacity fade for non-active, full color for active).

	•	Add a small “Clear highlight” control.

**Tests:**

	•	Manual QA: click in stacked highlights bubble and sankey within 150 ms.

	•	No broken callbacks (dash.exceptions.PreventUpdate clean).

**Acceptance:**

	•	Linked highlight functions bidirectionally.

	•	Non-active traces visibly ghosted (opacity ~0.2–0.4).

**Commit:**

app(ui): cross-visual linked highlighting via shared activity_id store (CDX006)

**Rollback:** remove the store and callbacks; keep charts independent.

⸻

**CDX007 — Comparison Narrative Blocks**

**Title:** app(copy): dynamic comparison narratives fed by intensity matrix

**Intent:** Auto-generate one-liner comparisons under charts: “X = **N g/FU**, vs Y = **M g/FU** (ΔZ%).”

**Changes:**

	•	New utility app/lib/narratives.py:

	•	Function pairwise_blurb(fu_id, primary_activity_id, alt_activity_ids[...]) -> str

	•	Pulls rows from intensity_matrix.csv, computes deltas and % difference, formats text.

	•	Appends [n] range if low/high spans overlap or widen.

	•	Embed under stacked/bubble charts:

	•	If a highlight (CDX006) is active, render the blurb across the top 2 alternatives for the same FU.

	•	Keep language neutral per ACX009; show **agency chips** later (future task).

**Tests:**

	•	Unit: when intensities are 450 vs 0, blurb shows 100% reduction.

	•	String contains activity names and FU name.

**Acceptance:**

	•	On highlight, a 1–2 sentence blurb appears with correct numbers and FU label.

**Commit:**

app(copy): add dynamic comparison narrative blocks powered by intensity matrix (CDX007, implements ACX009/ACX021)

**Rollback:** feature flag around the blurb render.

⸻

**CDX008 — Corporate Entity Demo (Coca-Cola truck)**

**Title:** data(demo): seed example entity/site/asset/operation for delivery truck

**Intent:** Provide one concrete “big player” slice to prove the registries + intensity pipeline.

**Add rows:**

# data/entities.csv (append)

ENTITY.COKE.CA,Coca-Cola Canada,corporate,,Demo rows for comparison

# data/sites.csv

SITE.COKE.TO.DC01,ENTITY.COKE.CA,Toronto DC 01,CA-ON,,,Urban distribution center

# data/assets.csv

ASSET.COKE.TRUCK.C6.DIESEL.2023,SITE.COKE.TO.DC01,vehicle,Class-6 Beverage Truck,2023,,diesel,Demo spec only

# data/operations.csv

OP.COKE.DELIVERY.URBAN_2025,ASSET.COKE.TRUCK.C6.DIESEL.2023,TRAN.DELIVERY.TRUCK.CLASS6.KM,FU.LITRE_DELIVERED,modeled,2025-01-01,2025-12-31,,

**Also map the delivery activity to FU (if not present):**

# data/activity_fu_map.csv (append)

TRAN.DELIVERY.TRUCK.CLASS6.KM,FU.LITRE_DELIVERED,"fu = litres_delivered","Compute litres from cases if provided"

**Add derive support:**

	•	Allow operations to supply variables like route_km, cases_delivered, litres_delivered. If only cases_delivered present, compute litres via cases*24*0.355 as a **documented assumption** (method_notes).

**UI:**

	•	In Intensity tab, add a toggle “Include corporate operations” to show OP.* rows alongside consumer alternatives.

**Tests/Acceptance:**

	•	make build includes at least one row for OP.COKE.DELIVERY.URBAN_2025 in intensity matrix for FU.LITRE_DELIVERED (values can be NULL if EF missing; row still appears with NA).

	•	UI toggle shows/hides the OP row.

**Commit:**

data(demo): seed Coca-Cola entity/site/asset/operation + FU mapping (CDX008, implements ACX022)

**Rollback:** delete appended rows; keep schema.

⸻

**CDX009 — Governance Hooks in CI**

**Title:** ci(governance): require ACX/CDX in PRs + forbid node_modules

**Intent:** Enforce traceability and prevent noisy artifacts.

**Changes:**

	1.	Enforce ACX/CDX in PR:

	•	Add a job check-traceability in .github/workflows/ci.yml:

- name: Check PR template fields present

  if: ${{ github.event_name == 'pull_request' }}

  run: |

    PR_BODY="$(jq -r .pull_request.body < $GITHUB_EVENT_PATH)"

    echo "$PR_BODY" | grep -qi 'Implements (spec): ACX' || (echo "Missing ACX spec in PR body" && exit 1)

    echo "$PR_BODY" | grep -qi 'Prompt (execution): CDX' || (echo "Missing CDX prompt in PR body" && exit 1)

	2.	Add a guard against committed node_modules (often helpful):

	•	New job check-no-node-modules: git ls-files | grep -E '^.*node_modules/' && exit 1 || true

**Tests/Acceptance:**

	•	Open a draft PR with template filled → CI passes these checks.

	•	Remove ACX/CDX lines → job fails with clear message.

**Commit:**

ci(governance): add PR traceability checks + block node_modules (CDX009, implements ACX017)

**Rollback:** remove the two jobs from CI.

⸻

**CDX010 — Pages Preview Deploy (intensity included)**

**Title:** deploy(pages): include intensity artifacts + preview route

**Intent:** Ensure dist/ contains intensity artifacts and the Intensity route is reachable on Cloudflare Pages Preview.

**Changes:**

	1.	Makefile package step: copy new outputs

package:

	mkdir -p dist/artifacts

	cp -r calc/outputs/* dist/artifacts/

Confirm intensity_matrix.csv and references/intensity_refs.txt are included.

	2.	If the static site exists (site/), ensure the Intensity tab loads data from /artifacts/.

	3.	Cloudflare Pages config (dashboard) stays the same (dist/); no secrets.

**Acceptance:**

	•	On PR, a Pages **Preview** URL renders the Intensity tab with populated data (or NA where null).

	•	Cache headers for /artifacts/* still applied if _headers is used.

**Commit:**

deploy(pages): ship intensity artifacts in dist + wire Intensity route (CDX010, implements ACX008/ACX021)

**Rollback:** remove artifact copy; revert tab wiring.

⸻

**How to run the sprint**

	1.	Execute **CDX001 → CDX005** sequentially; push branch; open PR (template enforces ACX/CDX).

	2.	Verify locally after CDX005:

make install

make validate

make build

make app

	3.	Execute **CDX006 → CDX010**; push; confirm CI + Pages Preview.

If you want, I can now issue **ready-to-paste Git diffs** for any step (schema models, Dash component scaffold, CI job blocks).

Short answer: the sprint above didn’t touch your 405s. Let’s add a focused debugging tranche to kill this now.

**CDX011 — Reproduce + pinpoint (client + artifacts)**

Title: debug(ui+artifacts): log failing requests, verify dist paths, and force GET

Intent: Confirm the center viz is only doing GET to /artifacts/ files, and that those files exist in dist/ with the right Content-Type.

Do:

1. Temporary logging in the client fetch util (where the viz loads JSON):

    - Log full URL, method, status, response.headers.get('content-type').
    - Ensure every request is GET (no POST to static).
2. 
3. Harden fetch to GET only:

await fetch(url, { method: 'GET', cache: 'no-store', mode: 'same-origin' });

2. 

3. Build check:

    - make build && make package
    - Confirm: ls dist/artifacts contains the figure JSON/CSV and manifest.json.
4. 
5. Local repro:

    - npx serve dist (or python -m http.server in dist/).
    - Hit the viz; if it works locally, problem is routing/headers on Pages.
6. 
7. CLI probe (replace a real file):

curl -i https://boot.industries/carbon-acx/artifacts/figures/stacked.json

curl -I https://boot.industries/carbon-acx/artifacts/manifest.json

5. 
    - 200 with content-type: application/json = OK.
    - 405/404 = routing/header issue.
    - 

Acceptance:

- Console shows only GETs.
- curl to deployed artifacts returns 200 + JSON content-type.

Rollback: remove logging after fix.

**CDX012 — Cloudflare routing audit (Pages vs Worker/Function)**

Title: fix(deploy): ensure /carbon-acx/* serves dist/site and /carbon-acx/artifacts/* serves static files (GET, HEAD, OPTIONS allowed)

Intent: Eliminate 405s caused by a misrouted proxy or a Function that rejects methods.

Do (pick your architecture):

A) Pages-only (recommended for static):

- Pages Project → Build output directory: dist/
- URL → /carbon-acx/*
- Add _redirects under dist/ if needed:

/carbon-acx            /carbon-acx/               301

- 

- No Functions/Workers proxying this path.

B) Worker proxy (if main site not on Pages):

- workers/carbon-acx-proxy.ts:

export default {

  async fetch(req: Request, env: Env) {

    const url = new URL(req.url);

    if (!url.pathname.startsWith('/carbon-acx')) return new Response('Not found', { status: 404 });

    // Allow only safe methods to static upstream

    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {

      return new Response('Method Not Allowed', { status: 405 });

    }

    const upstream = new URL(env.CARBON_ACX_PAGES_HOST);

    upstream.pathname = url.pathname.replace(/^\/carbon-acx/, '');

    upstream.search = url.search;

    const res = await fetch(new Request(upstream.toString(), { method: req.method, headers: req.headers }));

    // Normalize content-type for JSON

    const hdr = new Headers(res.headers);

    if (upstream.pathname.startsWith('/artifacts/') && !hdr.get('content-type')) {

      hdr.set('content-type', 'application/json; charset=utf-8');

    }

    return new Response(res.body, { status: res.status, headers: hdr });

  }

}

- 

- Wrangler route: boot.industries/carbon-acx*
- Secrets: CARBON_ACX_PAGES_HOST → the Pages Preview/Prod origin.

C) Pages Functions (if using functions/[[path]].ts):

- In functions/carbon-acx/[[path]].ts, first line:

export const onRequest = async (ctx) => {

  const m = ctx.request.method;

  if (!['GET','HEAD','OPTIONS'].includes(m)) return new Response('405', { status: 405 });

  // then proxy or serve static as configured

};

- 

- 405s often come from Functions receiving a POST from a Dash callback. In prod this app must be static; remove any client code that tries POST to /carbon-acx/*.

Headers (static): put _headers in dist/:

/index.html

  Cache-Control: no-cache

/artifacts/*

  Cache-Control: public, max-age=31536000, immutable

  Content-Type: application/json; charset=utf-8

Acceptance:

- curl -i -X GET https://boot.industries/carbon-acx/artifacts/manifest.json → 200 + JSON.
- curl -i -X POST https://boot.industries/carbon-acx/artifacts/manifest.json → 405 (and the client never does POST).

Rollback: remove proxy, revert to Pages-only.

**CDX013 — CORS/OPTIONS + stale service worker purge**

Title: fix(headers+sw): allow OPTIONS on artifacts and unregister any stale SW causing 405/opaque requests

Intent: Ensure preflight (if any) succeeds and no old service worker is intercepting.

Do:

1. CORS (only if cross-origin fetch is used):

    - Prefer same-origin. If cross-origin is unavoidable, add under _headers:
2. 

/artifacts/*

  Access-Control-Allow-Origin: https://boot.industries

  Access-Control-Allow-Methods: GET, HEAD, OPTIONS

  Access-Control-Allow-Headers: Content-Type

1. 

2. OPTIONS handler (Functions/Worker path only):

if (req.method === 'OPTIONS') {

  return new Response(null, { status: 204, headers: {

    'Access-Control-Allow-Origin': 'https://boot.industries',

    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',

    'Access-Control-Allow-Headers': 'Content-Type',

    'Access-Control-Max-Age': '86400',

  }});

}

2. 

3. Service Worker purge (if you experimented earlier):

    - Add a one-time client script that calls navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())) behind a debug flag.
    - Bump cache version in your client to force fresh fetch.
4. 

Acceptance:

- No more preflight 405s.
- Network panel shows cache-miss GETs to /carbon-acx/artifacts/*.json resolving 200.

Rollback: remove debug SW purge.

**Likely root causes (pick your poison)**

- Client still trying to POST to Dash endpoints (dev pattern) in a static Pages deploy → 405.
- Proxy/Function doesn’t pass through OPTIONS/HEAD → preflight fails with 405.
- Artifacts not actually present in dist/ (wrong copy path) → proxy returns 405/404.
- Content-Type missing → client rejects parse; you read it as “405” noise.
- Cross-origin fetch without CORS headers.