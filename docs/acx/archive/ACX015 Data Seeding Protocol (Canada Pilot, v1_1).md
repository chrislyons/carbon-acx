# **ACX015 Data Seeding Protocol (Canada Pilot, v1.1)**

**Purpose**

Define the rules and workflow for populating /data/*.csv with real-world activity, emission factor, grid, and schedule data. This protocol ensures that the dataset grows in a **controlled, auditable, and reproducible** way without breaking schema validation (ACX003), testing (ACX010), or citation integrity (ACX006).

***

## **1. Principles**

1. **Null-first discipline**
    - If a value is unknown, leave it blank (NULL), not 0.
    - CI will fail if you insert dummy placeholders outside the schema.
2. **Source-first population**
    - Every non-null numeric entry must be tied to a source_id in sources.csv.
    - If no source exists yet, create one in sources.csv with full IEEE citation.
3. **Minimal increments**
    - Add rows **one activity/source at a time** per PR.
    - Each PR must keep the dataset valid and CI-green.
4. **Reproducibility**
    - Commits must explain the change: which activity, which source, which cohort/region.
    - Build artifacts (export_view.json) serve as the audit trail.
5. **No synthetic averages**
    - If a value is unavailable, do not invent “reasonable” guesses.
    - Use bounds or regional proxies only if explicitly cited in external literature.

***

## **2. Scope of Seeding**

Data seeding covers all seven canonical CSVs:

- activities.csv — the activity catalogue.
- emission_factors.csv — fixed or grid-indexed EFs with bounds.
- profiles.csv — cohort definitions (24–39, 40–56, etc.).
- activity_schedule.csv — frequencies linking profiles to activities.
- grid_intensity.csv — regional operational/life-cycle intensities.
- sources.csv — canonical registry of all citations (IEEE).
- units.csv — master unit registry (already stable; grows slowly).

***

## **3. Workflow (per contribution)**

### **Step 1 — Identify activity or factor**

- Choose one gap: e.g., **coffee consumption EF**, **Ontario grid 2025**, **Netflix streaming EF**.
- Verify that activities.csv contains the relevant activity; if not, add a new one.

### **Step 2 — Add/update source**

- If the source does not yet exist in sources.csv, add it:
    - source_id = SRC.<ORG>.<YEAR>
    - Full IEEE citation string.
    - Plaintext URL.
    - Year ≤ current year.
    - License field (if applicable).

### **Step 3 — Add EF or schedule row**

- Populate emission_factors.csv or activity_schedule.csv:
    - EF row must pass **mutual exclusion** check (fixed OR grid-indexed, not both).
    - Schedule row must not specify both freq_per_day and freq_per_week.
    - Every non-null numeric must cite source_id.

### **Step 4 — Validate locally**

```javascript
make validate
make build
pytest -q
make app  # optional: visualize
```

- CI tests will enforce: header correctness, EF logic, grid precedence, source mapping.

### **Step 5 — Commit and push**

- PR title should include: data(activity): add <activity> EF <year> or similar.
- Body must state:
    - Which file changed.
    - Which source(s) cited.
    - Whether the change affects one province, multiple provinces, or Canada average.

### **Step 6 — Review & merge**

- CODEOWNER (ACX017) confirms source validity and IEEE style.
- CI must pass.
- Once merged, Cloudflare Pages builds a Preview and Production deploy (ACX008).

***

## **4. Seeding Priorities (Pilot Phase)**

1. **Professional cohorts (Toronto, Ontario)**
    - Transport: commute distances & modal split (StatCan Census 2021 [1]).
    - Food/diet: average coffee, meals out, groceries (StatCan household survey [2]).
    - Online services: streaming (Netflix, YouTube), LLM queries (ACX014 sources).
2. **Grid intensity (Ontario)**
    - IESO 2025 operational average [3].
    - Add CA national average from NIR [4].
3. **Light-industrial practices** (Toronto sample, ACX012).
4. **Heavy industry (stub)** (ACX013) for future; seed only if low-hanging published factors exist.

***

## **5. Data Status Flags**

To manage partially filled datasets:

- **NULL** → no data yet.
- **Region proxy** → explicitly mark in method_notes if using another region as a temporary proxy.
- **Vintage gap** → if no 2025 data, use latest available year and note in vintage_year.

No hidden assumptions; everything must be documented at the row level.

***

## **6. QA & Enforcement**

- **tests/test_schema.py** → schema headers, EF rules, schedule exclusivity.
- **tests/test_citations.py** → every source_id resolves to sources.csv.
- **tests/test_figures.py** → references propagate to charts.
- **Golden artifacts** (ACX010) → catch unintended diffs.
- **Manual review** → CODEOWNER checks IEEE citations, scope boundaries, and null-first compliance.

***

## **7. Risks and Mitigations**

- **Data gaps → NA segments**: acceptable; clearly labeled.
- **Overeager averages**: mitigated by “no synthetic” rule.
- **Contributor drift**: mitigated by CI red builds and review workflow.
- **Citation rot (dead links)**: mitigated by storing IEEE citation text directly in sources.csv.

***

## **8. Deliverables**

- Populated /data/*.csv with Ontario pilot seeds.
- docs/ACX015_DATA_SEEDING_PROTOCOL.md (this document).
- Updated tests/ as new categories of activities are added.

***

## **References**

[1] Statistics Canada, “Commuting Reference Guide, Census of Population, 2021,” 2022. Available: https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm

[2] Statistics Canada, “Household Expenditures Survey,” 2023. Available: https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110024501

[3] Independent Electricity System Operator (IESO), “Power Data—Data Directory,” 2025. Available: https://www.ieso.ca/power-data/data-directory

[4] Environment and Climate Change Canada, “National Inventory Report: Greenhouse Gas Sources and Sinks in Canada,” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html

***