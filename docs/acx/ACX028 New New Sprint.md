Got it. Here’s a focused sprint of copy-pasteable PR prompts to make the Dash build feel “juicy,” plus a PR to land the product at **https://boot.industries/carbon-acx**.

***

## **PR01 — Global Plotly theme + tokens**

**Title:** feat(ui): add Carbon ACX Plotly theme + design tokens

**Intent:** Ship a single, opinionated Plotly template and shared design tokens (spacing, radii, shadows, typography) so all charts and cards look coherent.

**Changes:**

- New: calc/ui/theme.py exporting get_plotly_template() and TOKENS (font stack, sizes, radii, spacing, shadow, palette).
- Apply template in all figure factories: import and set fig.update_layout(template=get_plotly_template()).
- New: site/assets/styles.css with CSS variables mirroring TOKENS for layout/card polish.
- New: site/assets/fonts.css (load Inter + JetBrains Mono via <link> or @import).
- New: tests/ui/test_theme_smoke.py asserts template keys exist and a demo figure renders.

**Acceptance:**

- All figures share typography, gridline, margin, and color rules.
- pytest -q passes; running a demo script saves a themed PNG without error.

***

## **PR02 — Layout polish (cards, spacing, sticky refs)**

**Title:** feat(site): card layout, sticky References panel, responsive grid

**Intent:** Make the static client look modern and readable without changing data contracts.

**Changes:**

- Update site/index.html structure: header (logo + title), content grid (controls + chart), sticky right sidebar (References).
- CSS in site/assets/styles.css: .card, .grid, .sticky, spacing utilities (.mt-…, .px-…), rounded corners, subtle shadows, focus outlines.
- Add loading skeletons for chart area and references (.skeleton CSS).

**Acceptance:**

- Sidebar sticks while scrolling.
- Cards have consistent radius/shadow; baseline spacing is even at 320–1440 px.
- No layout shift when toggling controls.

***

***

## **PR03 — Micro-interactions + state preservation**

**Title:** feat(viz): smooth Plotly transitions + persistent uirevision

**Intent:** Subtle motion on control changes; keep zoom/legend across data updates; honor reduced-motion.

**Changes:**

- In all figure factories, set layout.transition={"duration":250,"easing":"cubic-in-out"} and layout.uirevision="carbon-acx".
- Add a REDUCED_MOTION flag (env or UI) → duration 0.
**Acceptance:**
- Toggling scope/year/layer animates ≤250 ms (0 if reduced-motion).
- Zoom/legend persist through data updates.

***

## **PR04 — Hover templates + [n] citation wiring (+ downloads)**

**Title:** feat(viz): precise hovertemplate with units and [n] + reference downloads

**Intent:** Rich, legible hovers tied to the References panel; one-click downloads for citations.

**Changes:**

- Add meta.source_index to traces/points; hovertemplate shows label, value (formatted), units, and [ %{meta.source_index} ].
- In site/js/app.js, on plotly_hover, highlight the matching reference row; clear on plotly_unhover.
- Add buttons to download references.txt and the figure’s *.json.
**Acceptance:**
- Hover shows unit-correct values + [n]; the right-pane row highlights.
- Downloads produce valid text/JSON; no dangling [n] indices.

***

## **PR05 — Controls + Disclosure block (method/scope/year/grid)**

**Title:** feat(ui): unified controls bar and disclosure badges

**Intent:** Place all controls (scope/year/layer) in one compact bar; always display a standardized disclosure above charts.

**Changes:**

- Controls bar (left) + small badges (right): **Scope**, **Year**, **Layer**, **Method**, **Grid source**.
- Mobile: controls collapse; disclosure collapsible; desktop: disclosure expanded.
**Acceptance:**
- Disclosure updates instantly with control changes.
- Keyboardable, labeled, and responsive at 320–1440 px.

***

## **PR06 — Dark mode (system + manual toggle)**

**Title:** feat(ui): dark theme + dark Plotly template

**Intent:** Auto dark via prefers-color-scheme, with a header toggle override.

**Changes:**

- CSS variables for light/dark; store data-theme override in localStorage.
- get_plotly_template(dark: bool) swaps neutrals, gridlines, and colorway.
**Acceptance:**
- System dark respected by default; manual toggle persists.
- Axis/labels meet WCAG AA in both themes.

***

## **PR07 — Performance: figure JSON trimming + caching**

**Title:** perf(viz): shrink figure JSON and set Cache-Control

**Intent:** Faster loads on slow networks, zero backend.

**Changes:**

- Strip defaulted props and compute-only fields before writing figures/*.json.
- Add site/_headers:

```javascript
/figures/*
  Cache-Control: public, max-age=3600, s-maxage=86400
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Acceptance:**

- Average figure JSON reduced ≥25%.
- Deployed responses include the headers above.

***

## **PR08 — A11y pass (focus, keys, reduced motion)**

**Title:** feat(a11y): keyboardable controls + visible focus + motion prefs

**Intent:** Baseline accessibility without redesign.

**Changes:**

- Ensure native elements or proper role + key handlers.
- Strong focus outlines; respect prefers-reduced-motion globally.
**Acceptance:**
- Logical tab order; Enter/Space activate toggles.
- Lighthouse/Axe show no critical a11y violations for UI.

***

## **PR09 — Permalinks + PNG export (client-side)**

**Title:** feat(share): stateful permalinks + branded PNG download

**Intent:** Share exact views; export a clean image without a server.

**Changes:**

- Serialize UI state (scope/year/layer) into ? or #.
- “Copy link” writes canonical URL.
- Client Plotly toImage() → PNG with title/caption and tiny Carbon-ACX mark.
**Acceptance:**
- Visiting a permalink reproduces the view.
- PNG export renders correctly in light/dark.

***

## **PR10 — Visual smoke tests (CI) + invariants**

**Title:** test(ui): visual smoke via Kaleido + refs/unit invariants

**Intent:** Catch regressions in look/feel and reference wiring.

**Changes:**

- tests/visual/: render 3–5 canonical figures with Kaleido; assert file exists + hash within tolerance.
- Add quick checks:
    - All visible traces expose units.
    - [n] indices used in hovers exist in references.txt.
**Acceptance:**
- CI job visual-smoke fails on missing images, large deltas, or broken refs/units.

***

## **PR11 — Route: https://boot.industries/carbon-acx (static)**

**Title:** deploy(route): mount static client at /carbon-acx on boot.industries

**Intent:** Serve the static client with prebuilt artifacts under /carbon-acx.

**Changes (pick one):**

- **Pages Function (main site on Pages):** functions/carbon-acx/[[path]].ts proxies to CARBON_ACX_PAGES_HOST preserving path/query; cache 1 day.
- **Worker route (if not Pages):** workers/carbon-acx-proxy.ts → route boot.industries/carbon-acx*.
- Ensure build outputs dist/site and dist/artifacts with relative links.
**Acceptance:**
- https://boot.industries/carbon-acx and deep routes load.
- No mixed-content/CORS; assets resolve; cache headers present.

***

## **PR12 — First-time experience: hero + “What’s inside”**

**Title:** feat(site): concise landing hero + three explainer cards

**Intent:** Give newcomers a crisp, persuasive intro aligned with the minimalist brief.

**Changes:**

- Hero: title, one-sentence value prop, “Explore the data” CTA.
- Cards: **Methodology**, **Data**, **Disclosures & References** → anchor links.
- Keep bundle slim; no new runtime deps.
**Acceptance:**
- LCP ≤2.0 s on throttled 4G; CLS ≈0.
- Copy concise, links functional, dark/light correct.

***

### **Notes baked into these PRs**

- **CSV-first DAL** remains the data source (no DB yet); Dash for dev, static for prod.
- **Layer controls** (scope/year/layer) are assumed present; PR05 standardizes their placement and the disclosure.
- **No backend in production**: everything works via static JSON + client Plotly.

If you want any of these scaffolded into file-level diffs (ready to paste), tell me which PR numbers and I’ll drop the stubs.

### **Notes on order of operations**

1. Land **PR01–PR05** first (look/feel foundations).
2. Layer **PR06–PR08** (dark mode, perf, a11y).
3. Add **PR09–PR10** (sharing + CI guardrails).
4. Deploy **PR11** to mount at /carbon-acx.
5. Finish with **PR12** for a crisp first impression.

If you want, I can collapse any of these into single-issue “single-shot” Codex Cloud prompts (or expand with code stubs per file) — just say which PRs you want fully scaffolded first.

***

Got it. Here’s a hardened, copy-paste sprint of **PR14–PR20 Codex Cloud prompts**. Each prompt assumes **repo root** as the working directory, Poetry + pytest, and your existing DAL (ACX016).

***

### **PR14 — Data: introduce** 

### **policy_context.csv**

###  **(+ schema & data checks)**

```javascript
Title: data(policy): add policy_context.csv with validation and provenance

Goal:
Introduce a first-class policy data table for region/year-aware overlays without changing any mass calculations.

Non-Goals:
- No UI changes.
- No pricing logic; just data + validators.

Changes:
1) New file: data/policy_context.csv  (CSV, UTF-8, header required)
   Columns (strict order):
     region,year,instrument,price_cad_per_t,coverage,notes,source_url
   - region: "CA-ON"|"CA-QC"|"CA-AB"|"CA-BC"|... (ISO-like)
   - year: int(2000..2100)
   - instrument: "OBPS"|"EPS"|"TIER"|"BC-OBPS"|"WCI"|"NONE"
   - price_cad_per_t: float ≥ 0
   - coverage: "industrial"|"consumer"|"electricity"|"fuel"|"all"|"n/a"
   - notes: free text ≤ 280 chars
   - source_url: http(s) URL (non-empty), used for provenance
   Seed minimally with 1–2 rows per ON/QC/AB/BC for 2025 (price 95.0 for standards-based rows; use "WCI" for QC).

2) New file: calc/validators/policy_context_schema.py
   - pydantic model(s) validating the CSV structure and fields.
   - Function: validate_policy_context(df: pd.DataFrame) -> pd.DataFrame (returns df if valid; raises ValueError otherwise).

3) New test: tests/test_policy_context_schema.py
   - Loads CSV via pandas; runs validator.
   - Asserts: required columns present; non-empty; source_url is http(s); year in range; price ≥ 0.

4) New Make target: `make validate-policy`
   - Executes: `poetry run pytest -q tests/test_policy_context_schema.py -q`

5) Documentation: docs/policy_context.md
   - Document the columns, semantics, and provenance requirement.
   - Explicit note: this table feeds overlays; tonnes (tCO₂e) remain invariant.

Integration:
- Wire nothing else yet. Keep this PR data-only + schema checks.

Acceptance:
- CI green.
- `make validate-policy` passes.
- CSV present with ≥8 rows (ON/QC/AB/BC × 2025 at minimum) and non-empty source_url values.
```

***

### **PR15 — DAL integration for policy data (no behavior change)**

```javascript
Title: dal(policy): add PolicyContext loader behind ACX DAL

Goal:
Expose policy_context.csv through the existing DAL so calculators/UI can query policy metadata without touching raw CSVs.

Non-Goals:
- No overlay math; no UI.
- No mass changes.

Changes:
1) New: calc/dal_policy.py
   - Add Protocol: PolicyStore with method:
       get_policy(region: str, year: int) -> list[PolicyRow]
     where PolicyRow = TypedDict/dataclass mapping CSV columns.
   - CSV implementation using the existing DAL patterns (ACX016).
   - Cache: lazy, per-process; invalidates on file mtime change.

2) Modify: calc/dal.py
   - Export a factory accessor: policy_store() -> PolicyStore.
   - Backend: "csv" only for now; read from data/policy_context.csv.

3) New tests: tests/test_dal_policy.py
   - Fixture seeds a tiny temp CSV; asserts rows round-trip as PolicyRow.
   - Negative tests: missing file -> sensible error; bad schema -> raises.

Acceptance:
- `poetry run pytest -q tests/test_dal_policy.py` passes.
- No changes to existing calculator outputs (confirm with `make test`).
```

***

### **PR16 — Overlay engine (policy + SCC), invariant tests only**

```javascript
Title: calc(overlays): implement policy & SCC overlays with invariants

Goal:
Add overlay calculation strategies without wiring to UI yet. Overlays produce cost vectors from mass vectors. Mass is invariant.

Non-Goals:
- No UI integration.
- No province autodetect from profiles (simple (region,year) inputs only for now).

Changes:
1) New package: calc/overlays/
   - policy_overlay.py:
       def policy_cost(mass_t: pd.Series, region: str, year: int, scope: pd.Series|None) -> pd.Series
         - Looks up policy rows via dal_policy.policy_store().
         - If activity is out-of-scope for instrument, cost = 0 (label via returned attrs).
         - Current rule: simple price multiplication for rows where coverage == "industrial"|"all".
           (OBPS/TIER baseline logic to be added later; keep function boundary stable.)
         - Returns cost series aligned to mass_t index; attach .attrs["overlay"]="policy" and .attrs["region_year"]=f"{region}:{year}".
   - scc_overlay.py:
       def scc_cost(mass_t: pd.Series, scc_cad_per_t: float) -> pd.Series
         - cost = mass_t * scc.
         - Attach attrs overlay="scc".

2) New tests:
   - tests/test_overlay_invariance.py
       - Generate random mass; ensure sum(mass) unchanged by toggling overlays (mass is passed through; overlays produce separate series).
   - tests/test_overlay_monotonicity.py
       - For fixed mass, increasing price ladder yields non-decreasing costs.
   - tests/test_overlay_scope_flags.py
       - Activities flagged “out of scope” yield zero policy cost.

3) Dev docs: docs/overlays.md
   - State the invariants: mass invariance, monotonicity, single-instrument-at-a-time (per scenario).

Acceptance:
- All new tests pass.
- No change to existing outputs.
```

***

### **PR17 — Sectorization: tag all activities; expose filters**

```javascript
Title: data(sector): add sector taxonomy and backfill across activities

Goal:
Make “who emits” explicit: tag every activity with a sector enum and surface sector filters in existing views. No pricing yet.

Non-Goals:
- No lens switching; no incidence modeling.

Changes:
1) Schema:
   - Add Activity.sector Enum in calc/schema.py:
     {"industrial","commercial_institutional","public","residential","transport","agriculture","electricity"}
   - Enforce in any pydantic models that touch Activity.

2) Data:
   - New: data/sector_backfill.csv
     columns: activity_id, sector
   - Add a loader that merges sector onto activities at load time; fail if any activity missing a sector.

3) UI:
   - Add a sector multi-select filter to the main charts/tables (Dash): ui/components/filters/sector_filter.py
   - Wire the filter through existing callbacks so users can include/exclude sectors.

4) Tests:
   - tests/test_sector_backfill.py: assert 100% coverage (no missing mapping).
   - tests/test_sector_filter.py: simple Dash integration test ensuring filtering changes visible rows but not per-activity mass values.

Acceptance:
- All activities have a non-null sector; build fails if not.
- Sector filter present and functional; mass values unchanged per activity.
```

***

### **PR18 — Accounting lenses: production vs consumption (rule-based)**

```javascript
Title: calc(lenses): add production/consumption lenses with rule table

Goal:
Allow switching between production-based and consumption-based attribution using a transparent rule table. Keep it simple and deterministic (no IO tables yet).

Non-Goals:
- No monetary incidence here; just attribution.

Changes:
1) Data:
   - New: data/attribution_rules.csv
     columns:
       activity_type, lens, share_to_residential, share_to_industrial, share_to_public, notes
     Constraints: each row sum of shares == 1.0; lens ∈ {"production","consumption"}.
     Seed with minimal rules (e.g., gasoline retail, electricity use, freight fuel).

2) Calc:
   - New: calc/lenses/production.py and calc/lenses/consumption.py
     API:
       def apply_lens(mass_by_activity: pd.DataFrame, rules: pd.DataFrame, lens: str) -> pd.DataFrame
     Returns mass_by_sector with columns [residential, industrial, public]; preserves total mass.

3) UI:
   - New component: ui/components/toggles/lens_toggle.py (two options: Production-based, Consumption-based)
   - Wire into existing pages; default = Production-based.

4) Tests:
   - tests/test_lens_invariance.py: mass totals equal across lenses.
   - tests/test_lens_shares_sum.py: each rule row sums to 1.0; failure if not.
   - tests/test_lens_switch_roundtrip.py: switching lenses changes attribution columns but not grand total.

Acceptance:
- Lens toggle present; switching works; totals invariant.
- Rule table validated; CI fails on invalid shares.
```

***

### **PR19 — Incidence modeling + overlay UI (stacked cost view)**

```javascript
Title: calc+ui(incidence): model payer incidence and visualize overlay costs

Goal:
Show who would pay under a given overlay (consumer/producer/public) while keeping mass separate. Provide a stacked cost view and a fixed disclosure banner.

Non-Goals:
- Perfect policy incidence economics. Start with configurable simple shares.

Changes:
1) Data:
   - New: data/incidence_rules.csv
     columns:
       instrument, sector, consumer_share, producer_share, public_share, notes
     Constraint: shares sum to 1.0. Provide defaults for OBPS/EPS/TIER/BC-OBPS/WCI and "SCC" (e.g., SCC defaults to consumer=0, producer=0, public=1 unless configured).

2) Calc:
   - New: calc/overlays/incidence.py
     def split_incidence(cost_series: pd.Series, instrument: str, sector_series: pd.Series) -> pd.DataFrame
       -> columns ["consumer","producer","public"]; sum equals cost_series.

3) UI:
   - New disclosure strip: ui/components/disclosure.py
     Copy: “Prices are overlays; tonnes are invariant. Incidence is a model. See ‘About’ for methodology.”
   - New stacked bar view for costs: ui/components/charts/cost_stack.py
     - Segments: consumer/producer/public; tooltip shows overlay type and region/year or SCC value.
   - New overlay controls: ui/components/toggles/overlay_toggle.py
     Options: Off | Policy (region, year selectors) | SCC (value)
     - Region/year selectors appear only when Policy is active; SCC numeric input only when SCC is active.

4) Tests:
   - tests/test_incidence_sums.py: incidence columns sum to overlay cost for random data.
   - ui tests (dash): toggling overlay on/off changes cost charts but leaves tCO₂e plots unchanged.

Acceptance:
- Stacked cost view renders; disclosure banner always visible on pages with any cost view.
- Overlay off: zero cost everywhere. Overlay on: costs appear; switching SCC/Policy updates correctly.
```

***

### **PR20 — Governance & CI: policy freshness gate + docs**

```javascript
Title: ci(governance): add policy freshness gate and methodology docs

Goal:
Ensure policy data stays fresh and documented; fail CI when stale or incomplete.

Non-Goals:
- No new visuals.

Changes:
1) New script: scripts/check_policy_freshness.py
   - Reads data/policy_context.csv.
   - Requires at least one row for current year (from system clock) for each of ON/QC/AB/BC.
   - Ensures each row has non-empty source_url and notes ≤ 280 chars.

2) GitHub Actions: .github/workflows/policy_freshness.yml
   - Runs on PR and nightly.
   - Step: `poetry run python scripts/check_policy_freshness.py`
   - Fails if missing current-year rows or bad URLs.

3) Docs:
   - docs/methodology.md
     - State dual-lens principle: physics-first mass + optional overlays.
     - Explain lenses (production/consumption) and incidence modeling.
     - Enumerate invariants and test coverage (mass invariance, monotonicity, scope, incidence sum).
     - Plain-language disclosures for UI (reuse in disclosure strip).

4) Make:
   - `make check-policy` -> runs freshness script and schema validator.

Acceptance:
- CI fails if policy data lacks current-year rows for ON/QC/AB/BC.
- Docs rendered; link from README “Methodology”.
- `make check-policy` passes locally with seeded data.
```

***

#### **Notes for the whole sprint**

- Overlays must never modify tCO₂e; overlays return separate cost series/data frames.
- Default UI state should be **overlay OFF** and **Production lens** selected.
- All new CSVs should be small, explicit, and live under data/.
- All tests and scripts must run via Poetry; include minimal imports and deterministic behavior.
- Keep PRs independent and mergeable in sequence; no cross-PR hidden coupling.

If you want, I can expand any prompt with file skeletons (“FULL CONTENT”) for the first pass of each module or the initial CSV seeds.