# **ACX005 National Scaling Framework (Canada, v1.1)**

**Purpose**

Define how the Toronto/Ontario pilot generalizes to **all Canadian provinces and territories** without changing the core schema. This document specifies region coding, data-source precedence, factor harmonization, rollout phases, QA/validation, and contributor workflow. It leverages the **CSV-first** design (ACX001–ACX003) and the **DAL** abstraction (ACX016) to remain data-source agnostic and backend-switchable.

***

## **1. Scope and invariants**

- **Reference year (pilot):** 2025 anchor; every factor row carries vintage_year.
- **Regions:** ISO-3166-2 subdivision codes plus national fallback:
CA-AB, CA-BC, CA-MB, CA-NB, CA-NL, CA-NS, CA-NT, CA-NU, CA-ON, CA-PE, CA-QC, CA-SK, CA-YT, CA.
- **Null-first:** Unknowns remain blank; never impute “0”.
- **One schema, many regions:** No province-specific tables; differences are represented by data values (e.g., grid intensity, fuel mix, profiles).
- **Determinism:** Given identical CSV inputs, builds are bit-for-bit reproducible across backends (CSV, future DB).

***

## **2. Region model and fallback logic**

### **2.1 Region encoding (schema)**

- profiles.region_code_default (primary resolution key).
- activity_schedule.region_override (row-level override).
- grid_intensity.region_code (supply of intensity records).

### **2.2 Resolution precedence**

```javascript
region_effective = 
    activity_schedule.region_override 
    > profile.grid_strategy (e.g., mix_weighted) 
    > profile.region_code_default 
    > CA (national average)
```

- If is_grid_indexed=True but no intensity exists for region_effective, the row is **inert** (cannot compute).
- Fixed EFs (value_g_per_unit) remain valid without grid data, as designed.

### **2.3 Municipality handling (GTA vs province)**

- For national scope, municipal distinctions are **advisory**; the canonical compute key is the **province/territory** code.
- If a municipality discloses a specific electricity factor, encode it as a **profile-level mix** via grid_strategy with a JSON mix (future extension), leaving the underlying intensity rows provincial.

***

## **3. Factor families and national sources**

### **3.1 Electricity grid intensity (primary)**

- **Canonical annual baseline** per province/territory from the **National Inventory Report (NIR)** and related data tables [1], [7].
- **Operator time series** (where available) for higher-resolution pilots:
    - Ontario (IESO) provides rich power and emissions datasets suitable for annual and sub-annual derivations [2], [8], [15].
    - Alberta publishes electricity grid intensity trends; recent annual figures are public [9], [16].
    - Québec publishes low life-cycle factors and sustainability documentation; very low operational intensity is reflected in NIR and CER profiles [3], [10], [17].
- **Implementation:** store **annual** g_per_kwh (and optional low/high). Where verified hourly/monthly series exist, pre-average to **daily** during derivation (ACX004) but persist only annual rows in grid_intensity.csv for v1.1.

### **3.2 Combustion fuels (transport/heating)**

- Use nationally recognized conversion factors (e.g., **litre of gasoline ≈ 2.3 kg CO₂** tailpipe) for modeled transport and small combustion estimates [20], [13].
- For well-to-wheel scopes or protocol-specific work, consult **ECCC emission factors and reference values** (federal offsets) as a starting point, with careful scope alignment [6].

### **3.3 Activity priors (mode share, dwellings, etc.)**

- When regional priors inform schedules (e.g., commuting mode shares), use **Statistics Canada 2021 Census** products for consistency across provinces [5], [12], [19].
- Priors **do not** replace user/profile schedules; they seed default profiles per province.

***

## **4. Data alignment rules**

### **4.1 Harmonizing scopes**

- Electricity factors must be tagged with scope_boundary to avoid mixing **operational** (generation-only) intensities with **life-cycle** values (e.g., Hydro-Québec LCA documents) [3], [10], [17].
- For each province, prefer **operational intensity** for grid-indexed activities by default; life-cycle intensities may be used in a dedicated “LCA” compute view to keep comparisons fair.

### **4.2 Vintages**

- Default build uses the **latest available vintage_year ≤ reference_year** for each province.
- A cross-province build must not mix different **reference years** silently; derivation logs will include a **vintage matrix** per region.

### **4.3 Uncertainty**

- If a province supplies bounds, store them and propagate as **low/mean/high** through daily→annual aggregation.
- For provinces with single-point values, leave bounds blank; do not invent symmetrical intervals.

***

## **5. Rollout phases (recommended)**

**Phase 0 (complete):** Ontario pilot.

**Phase 1 (fast-follow):** Québec, Alberta, British Columbia

- Strong publicly available intensity data and operator reporting [2], [3], [8]–[11], [15]–[17].
- Create baseline profiles: PRO.QC.24_39, PRO.AB.24_39, PRO.BC.24_39 (and 40–56), mirroring Toronto schedules but using provincial intensities.

**Phase 2:** Manitoba, Saskatchewan, Nova Scotia, New Brunswick, Newfoundland and Labrador

- Use NIR/CER provincial intensities; backfill profiles and schedules from StatCan priors where needed [1], [4], [11], [12], [19].

**Phase 3 (territories + PEI):** Yukon, Northwest Territories, Nunavut, Prince Edward Island

- Rely on NIR/CER; handle isolated grids and diesel reliance explicitly via method_notes and uncertainty fields [1], [4], [7], [11].

Each phase is a self-contained PR that:

1. Adds grid_intensity.csv rows for the new provinces (with source_id).
2. Seeds profiles.csv with two cohorts (24–39, 40–56).
3. Leaves activity_schedule.csv rows mostly shared (commuting defaults may vary via priors).
4. Adds/updates sources.csv with IEEE references.

***

## **6. Repository changes to support scaling**

1. **data/grid_intensity.csv**
    - Add rows for all provinces/territories with region_code, vintage_year, g_per_kwh, optional bounds, source_id.
    - Keep CA (national average) as a last resort.
2. **data/sources.csv**
    - Add canonical entries for: NIR (annual), CER provincial profiles, operator datasets (IESO, AESO, HQ).
3. **data/profiles.csv**
    - Clone Ontario cohorts per province:
PRO.<PROV>.24_39.HYBRID.2025, PRO.<PROV>.40_56.HYBRID.2025 with region_code_default=<CA-XX>.
4. **data/activity_schedule.csv**
    - Start with Ontario schedules; adjust commuting/space-heating activity frequencies only when credible priors exist (StatCan).
5. **tests/**
    - Add test_regions_present.py: asserts all 13 provinces/territories plus CA exist in grid_intensity.csv.
    - Add test_vintage_matrix.py: verifies vintage_year ≤ reference_year for every region used by any profile in the build.
    - Extend grid precedence tests to exercise region_override vs default fallbacks.

***

## **7. DAL and backend considerations (ACX016 alignment)**

- **CSV remains authoritative**; DAL enables additional backends (DuckDB/SQLite) for speed as provinces accumulate.
- Add a parity job in CI (future): run ACX_DATA_BACKEND=duckdb alongside csv and diff outputs.
- For operator hourly datasets (e.g., IESO), ingest and **pre-aggregate to daily** outside the core CSVs, writing daily intensities into a temp table/file consumed by derive.py. Annual CSVs remain the canonical store for v1.1.

***

## **8. QA & governance**

- **Build manifest:** derive.py prints a manifest summarizing: regions used, intensity vintages, number of activities per profile, and source coverage.
- **Source coverage rule:** no figure may display a number without at least one source_id resolvable to an IEEE entry in sources.csv.
- **Review gates:** per-province PR must include:
    - evidence links in PR description (pointing to NIR/CER/operator pages),
    - local make validate && make build artifacts attached,
    - updated tests passing.

***

## **9. Risks and mitigations**

- **Factor comparability (LCA vs operational):** Keep life-cycle values in a **separate scope**; do not mix with operational intensities. Mitigate with explicit scope_boundary.
- **Data vintage skew:** Use the latest uniform year possible; log a vintage matrix and flag mismatches.
- **Sparse territories data:** Accept higher uncertainty; state it explicitly and propagate wide bounds.
- **Contributor drift:** Enforce schema via Pydantic + tests; branch protection and CODEOWNERS for /data/*.csv and /calc/schema.py.

***

## **10. Deliverables (per phase)**

- Updated grid_intensity.csv, profiles.csv, sources.csv, activity_schedule.csv.
- Passing tests and artifacts under calc/outputs/.
- PR narrative listing external sources and any deviations from Ontario schedules.

***

## **11. Minimal working example (Québec)**

- Add CA-QC to grid_intensity.csv with vintage_year=2024, central g_per_kwh from NIR/CER, source_id=SRC.NIR.2025 or SRC.CER.QC.2024 [1], [10], [11].
- Create PRO.QC.24_39.HYBRID.2025 and PRO.QC.40_56.HYBRID.2025.
- Reuse Ontario schedules for non-grid activities; streaming rows immediately benefit from lower g_per_kwh.
- Build and confirm export deltas align with expected direction (QC < ON for grid-indexed activities).

***

## **References**

[1] Environment and Climate Change Canada, “Canada’s Official Greenhouse Gas Inventory—National Inventory Report (NIR),” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html

[2] Independent Electricity System Operator (IESO), “Power Data—Data Directory,” 2025. Available: https://www.ieso.ca/power-data/data-directory

[3] Hydro-Québec, “GHG Emissions and Hydro-Québec Electricity,” 2025. Available: https://www.hydroquebec.com/sustainable-development/specialized-documentation/ghg-emissions.html

[4] Canada Energy Regulator, “Provincial and Territorial Energy Profiles,” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/

[5] Statistics Canada, “Commuting Reference Guide, Census of Population, 2021,” 2022. Available: https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm

[6] Environment and Climate Change Canada, “Emission Factors and Reference Values—Federal GHG Offset System,” 2024. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html

[7] Environment and Climate Change Canada Data Catalogue, “Electricity Intensity—Provinces and Territories (CRT/Annex tables),” 2025. Available: https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/C-Tables-Electricity-Canada-Provinces-Territories/

[8] IESO, “2024 Annual Planning Outlook and Emissions Update,” 2024. Available: https://www.ieso.ca/Powering-Tomorrow/2024/Six-Graphs-and-a-Map-2024-Annual-Planning-Outlook-and-Emissions-Update

[9] Government of Alberta, “Alberta’s Greenhouse Gas Emissions Reduction Performance—Electricity Grid Intensity,” 2025. Available: https://www.alberta.ca/albertas-greenhouse-gas-emissions-reduction-performance

[10] Canada Energy Regulator, “Quebec—Provincial Energy Profile (emissions intensity of electricity),” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/provincial-territorial-energy-profiles-quebec.html

[11] Canada Energy Regulator, “Canada—Provincial and Territorial Energy Profiles (overview),” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/provincial-territorial-energy-profiles-canada.html

[12] Statistics Canada, “2021 Census Topic: Commuting,” 2022–2023. Available: https://www12.statcan.gc.ca/census-recensement/2021/rt-td/commuting-navettage-eng.cfm

[13] Natural Resources Canada, “Auto$mart Factsheet—Emissions from Your Vehicle,” 2014. Available: https://natural-resources.canada.ca/sites/nrcan/files/oee/pdf/transportation/fuel-efficient-technologies/autosmart_factsheet_9_e.pdf

[14] Environment and Climate Change Canada, “Greenhouse Gas Emissions—Indicator,” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/environmental-indicators/greenhouse-gas-emissions.html

[15] IESO, “Power Data—Landing,” 2025. Available: https://www.ieso.ca/power-data

[16] Canada Energy Regulator, “Alberta—Provincial Energy Profile (emissions intensity of electricity),” 2024. Available: https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/provincial-territorial-energy-profiles/provincial-territorial-energy-profiles-alberta.html

[17] Hydro-Québec, “Our Energy—GHG Emission Estimates, LCA,” 2025. Available: https://www.hydroquebec.com/about/our-energy.html