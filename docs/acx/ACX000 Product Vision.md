The goal is to offer a **carbon footprint analysis** of daily professional activities:

1. **See each activity clearly** (with the context already established).
2. **Understand the per-unit footprint** (g CO₂e per occurrence or per unit time/distance).
3. **See the daily, weekly, and annual extrapolation** at a glance.
4. **Compare across categories** without having to flip back and forth.

## **1.** 

## **Base Table Layout**

Create a **master table** with these columns:

| **Category** | **Activity** | **Unit of Measurement** | **Frequency (per day/week)** | **Emission Factor (g CO₂e per unit)** | **Daily Emissions (g CO₂e)** | **Weekly Emissions (g CO₂e)** | **Annual Emissions (kg CO₂e)** | **Source** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

- **Unit of Measurement**: Should match established LCA (life cycle assessment) norms — e.g., “per cup of coffee,” “per km by TTC bus,” “per hour streaming,” etc.
- **Emission Factor**: From reputable, recent datasets (e.g., Government of Canada GHG inventory, IPCC, peer-reviewed LCA studies).
- **Frequency**: Taken from our behavioral baseline (above).
- **Source**: IEEE-formatted citation to the emission factor data.

This table becomes the **data backbone** for the analysis.

***

## **2.** 

## **Visualization Layer**

You want **layered visualizations** that make the carbon cost instantly obvious and comparable.

**a) Sankey Diagram**

- **Purpose**: Show proportional contribution by category (food, transport, online/media, leisure, micro-spend).
- **Benefit**: Readers can immediately see that, for example, *commuting dwarfs coffee cups in footprint terms*.
- **Implementation**: Flow from “Daily Life” to each major category, then to sub-activities.

**b) Stacked Bar Chart (per day vs per year)**

- **Purpose**: Show relative scale of each category over different time frames.
- **Example**: A bar for daily footprint with color-coded segments for food, transit, media, etc., next to the annual projection.

**c) Bubble Chart**

- **Purpose**: Show “impact vs frequency” trade-offs.
- **Axes**:
    - X = Frequency of activity.
    - Y = Emissions per activity.
    - Size = Annual contribution.
- **Insight**: Lets the reader spot high-frequency/low-impact vs low-frequency/high-impact activities.

**d) Heatmap Table**

- **Purpose**: Embed emissions directly in the master table with a color gradient.
- **Benefit**: For readers who prefer tabular data but still want instant visual cues.

***

## **3.** 

## **Narrative Layer**

Keep the **data table + visuals** supported by a short **category-by-category analysis**, with:

- **Top contributors** (per day and per year).
- **Hidden hotspots** (e.g., low daily impact but huge annual total — like small subscriptions with embedded device/cloud emissions).
- **Opportunities for reduction** (practical, non-judgmental).

This approach preserves the rigor of the baseline daily activity dataset you’ve built, and it will translate smoothly into a technical report, a public-facing infographic, or an interactive dashboard.

***

# **Carbon footprint dataset: schema and visualization approach**

Below is a **normalized data model** plus a **reader-friendly master table** that you can export for reporting. It is designed to keep sources transparent and IEEE-style citations intact, including inside interactive Plotly charts.

## **A. Normalized schema (authoritative store)**

### **1)** 

### **sources**

Stores IEEE-style reference metadata so every factor/assumption can point to a single canonical record.

| **field** | **type** | **notes** |
| --- | --- | --- |
| source\_id | TEXT (PK) | Stable key, e.g., SRC.IPCC.AR6.2021 |
| ieee\_citation | TEXT | Full IEEE string for “References” list (plain text; includes URL) |
| url | TEXT | Plaintext URL |
| year | INTEGER | Publication year |
| license | TEXT | Data license if applicable |

### **2)** 

### **activities**

Defines the human activity independent of any emission factor.

| **field** | **type** | **notes** |
| --- | --- | --- |
| activity\_id | TEXT (PK) | e.g., FOOD.COFFEE.CUP.HOT |
| category | TEXT | food, transport, media, leisure, consumer, etc. |
| name | TEXT | Short label (e.g., “Coffee—12 oz hot”) |
| description | TEXT | Scope and boundaries in plain language |
| default\_unit | TEXT | e.g., cup, km, hour, transaction |
| unit\_definition | TEXT | Exact definition (e.g., “355 mL brewed coffee, dairy splash 15 mL”) |
| notes | TEXT | Any caveats (seasonality, hybrid days, etc.) |

### **3)** 

### **emission_factors**

Holds the LCA value(s) for each activity, with uncertainty and scope.

| **field** | **type** | **notes** |
| --- | --- | --- |
| ef\_id | TEXT (PK) | e.g., EF.FOOD.COFFEE.CUP.HOT.CAN.2022 |
| activity\_id | TEXT (FK→activities) |  |
| region | TEXT | e.g., CA-ON (Ontario grid), CA (Canada) |
| scope\_boundary | TEXT | e.g., LCA-cradle-to-grave, WTT, TTW |
| gwp\_horizon | TEXT | e.g., GWP100 (AR6) |
| unit | TEXT | Must match activities.default\_unit |
| value\_g\_per\_unit | REAL | Central estimate, grams CO₂e per unit |
| uncert\_low\_g\_per\_unit | REAL | Lower bound (5th or 2.5th percentile) |
| uncert\_high\_g\_per\_unit | REAL | Upper bound (95th or 97.5th percentile) |
| vintage\_year | INTEGER | Measurement/model year of factor |
| method\_notes | TEXT | Model/data lineage |
| source\_id | TEXT (FK→sources) | IEEE traceability |

### **4)** 

### **profiles**

Scenario definitions for different user archetypes (e.g., WFH vs. office day).

| **field** | **type** | **notes** |
| --- | --- | --- |
| profile\_id | TEXT (PK) | e.g., BASE.TO.PROF.HYBRID.2025 |
| name | TEXT | “Toronto Pro—Hybrid (2025)” |
| assumption\_notes | TEXT | Explicit assumptions (days in office/week, season, diet mix, etc.) |

### **5)** 

### **activity_schedule**

How often each activity occurs per profile.

| **field** | **type** | **notes** |
| --- | --- | --- |
| profile\_id | TEXT (FK→profiles) |  |
| activity\_id | TEXT (FK→activities) |  |
| freq\_per\_day | REAL | Average daily frequency (can be fractional) |
| freq\_per\_week | REAL | Optional override if weekly cadence |
| seasonality\_tag | TEXT | e.g., winter, summer, all |
| schedule\_notes | TEXT | Any conditional logic (e.g., “office days only”) |

### **6)** 

### **derived_calcs**

###  **(materialized view or query output)**

Precomputed emissions with uncertainty; use for charts/exports.

| **field** | **type** | **notes** |
| --- | --- | --- |
| profile\_id | TEXT |  |
| activity\_id | TEXT |  |
| ef\_id | TEXT |  |
| daily\_g | REAL | freq\_per\_day \* value\_g\_per\_unit |
| daily\_low\_g | REAL | With lower EF bound |
| daily\_high\_g | REAL | With upper EF bound |
| weekly\_g | REAL | Prefer direct weekly if provided, else daily\_g\*7 |
| annual\_kg | REAL | daily\_g \* 365 / 1000 (make 365 explicit in notes) |
| annual\_low\_kg | REAL | Using low bound |
| annual\_high\_kg | REAL | Using high bound |

### **7)** 

### **audit_log**

###  **(optional)**

Tracks edits, factor updates, and version changes for provenance.

***

## **B. Reader-facing “master table” (export view)**

This is the wide table you can paste into a report or feed to a dashboard:

| **Category** | **Activity** | **Unit** | **Frequency (per day)** | **Emission Factor (g CO₂e / unit) [n]** | **Daily (g)** | **Weekly (g)** | **Annual (kg)** | **Scope / Region** | **Source ID** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| food | Coffee—12 oz hot | cup | 1.2 | 210 [1] | 252 | 1764 | 92.0 | LCA, CA | SRC.XXX |
| transport | TTC subway | km | 10.0 | 45 [2] | 450 | 3150 | 164.3 | WTT+TTW, CA-ON | SRC.YYY |
| media | Video streaming (HD) | hour | 1.0 | 100 [3] | 100 | 700 | 36.5 | Electricity LCA, CA-ON grid | SRC.ZZZ |

- The bracketed [n] is the **IEEE in-text number** that maps to the full entry in your **References** section; Source ID links back to the normalized sources table for reproducibility.
- Include uncertainty as **error-bar columns** if you want to visualize ranges: EF_low, EF_high, Annual_low_kg, Annual_high_kg.

***

## **C. Units, scopes, and standards**

- **Base unit**: grams CO₂e per unit; convert to **kg** for annual reporting.
- **Horizon**: **GWP100 (AR6)**; record explicitly in emission_factors.gwp_horizon.
- **Scope boundary**: For transport, keep **WTT (well-to-tank)** and **TTW (tank-to-wheel)** distinct when possible; for goods/services, prefer **cradle-to-grave LCA**.
- **Region**: Ontario grid intensity differs from national; store region per factor.
- **Uncertainty**: Keep lower/upper bounds; they power Plotly error bars and make ranges clear.

***

## **D. Plotly vs. static visuals (and how to cite)**

**Use Plotly.** Interactivity helps readers drill into assumptions and uncertainty. Keep citations rigorous:

1. **Hover templates**
    - Inject IEEE numbers into hover text: e.g., "... EF: 45 g CO₂e/km [2]".
    - Also show scope_boundary, gwp_horizon, region, and vintage_year.
2. **Pinned “References” pane**
    - Render a static **References** list below or beside the chart using the exact IEEE strings from sources.ieee_citation.
    - Provide a **Download CSV** button for the exact dataset behind each figure.
3. **Figure-level caption**
    - Short caption under each chart: *“Toronto Hybrid Profile (2025). Emission factors GWP100 (AR6); Ontario grid where applicable. Numbers in brackets reference the list below.”*
4. **Uncertainty**
    - Use **error bars** (e.g., annual_kg with annual_low_kg/annual_high_kg).
    - For category stacks, consider a **range ribbon** alternative (secondary figure) to avoid clutter.

**Recommended figures (Plotly):**

- **Sankey**: Daily life → Category → Activity (link labels include [n]).
- **Stacked bars**: Daily vs. annual totals by category with error bars.
- **Bubble chart**: X: frequency, Y: EF per unit, size: annual kg; hover shows [n].
- **Heatmap table**: Activities × Time horizon (daily/weekly/annual) with intensities; hover shows citations.

***

## **E. CSV templates (minimal, ready to populate)**

**sources.csv**

```javascript
source_id,ieee_citation,url,year,license
SRC.IPCC.AR6.2021,"[1] IPCC, “Climate Change 2021: The Physical Science Basis,” 2021. Available: https://www.ipcc.ch/report/ar6/wg1/","https://www.ipcc.ch/report/ar6/wg1/",2021,"CC BY-NC-SA"
```

**activities.csv**

```javascript
activity_id,category,name,description,default_unit,unit_definition,notes
FOOD.COFFEE.CUP.HOT,food,"Coffee—12 oz hot","Brewed coffee incl. 15 mL dairy","cup","355 mL serving","Assume filtered brew"
TRAN.TTC.SUBWAY.KM,transport,"TTC subway travel","Passenger-km on subway","km","1 km per passenger","Ontario grid"
MEDIA.STREAM.HD.HOUR,media,"Video streaming (HD)","1 hour streaming; home Wi-Fi; TV or laptop","hour","60 minutes playback","Ontario grid; 1080p"
```

**emission_factors.csv**

```javascript
ef_id,activity_id,region,scope_boundary,gwp_horizon,unit,value_g_per_unit,uncert_low_g_per_unit,uncert_high_g_per_unit,vintage_year,method_notes,source_id
EF.FOOD.COFFEE.CUP.HOT.CA.2022,FOOD.COFFEE.CUP.HOT,CA,"LCA-cradle-to-grave","GWP100 (AR6)","cup",210,150,320,2022,"Meta-analysis; includes farm-to-cup","SRC.IPCC.AR6.2021"
EF.TRAN.TTC.SUBWAY.KM.ON.2024,TRAN.TTC.SUBWAY.KM,CA-ON,"WTT+TTW","GWP100 (AR6)","km",45,30,70,2024,"Electric traction; ON grid intensity","SRC.IPCC.AR6.2021"
EF.MEDIA.STREAM.HD.HOUR.ON.2024,MEDIA.STREAM.HD.HOUR,CA-ON,"Electricity LCA","GWP100 (AR6)","hour",100,40,220,2024,"Device+network+DC model; ON grid","SRC.IPCC.AR6.2021"
```

**profiles.csv**

```javascript
profile_id,name,assumption_notes
BASE.TO.PROF.HYBRID.2025,"Toronto Pro—Hybrid (2025)","3 office days/week; winter baseline; mixed omnivore diet"
```

**activity_schedule.csv**

```javascript
profile_id,activity_id,freq_per_day,freq_per_week,seasonality_tag,schedule_notes
BASE.TO.PROF.HYBRID.2025,FOOD.COFFEE.CUP.HOT,1.2,,all,""
BASE.TO.PROF.HYBRID.2025,TRAN.TTC.SUBWAY.KM,10,,office,"Office days only (apply 3/7 weighting in calc)"
BASE.TO.PROF.HYBRID.2025,MEDIA.STREAM.HD.HOUR,1.0,,all,"Evenings"
```

***

# **Modernization checklist (proposed v1.1 deltas)**

## **1) Identity, versioning, and governance**

- **Stable IDs**: Use UUIDv7 (time-ordered) for *_id in all tables; keep human-readable slugs in separate fields (e.g., activity_slug).
- **Semantic versioning**: Add schema_semver (e.g., 1.1.0) in a tiny meta table plus created_at, modified_at, modified_by.
- **W3C PROV**: Add a provenance JSON column (or a prov table) to store acquisition method, transformation steps, and upstream dataset versions.

## **2) Emission factor expressiveness**

- **Gas breakdown**: Add optional columns to emission_factors for co2_g, ch4_g_co2e, n2o_g_co2e (or a child table ef_components) so you can re-aggregate under different GWP horizons later.
- **Uncertainty type**: Add uncert_type (e.g., percentile, stddev, triangular) so error bars are semantically correct.
- **Temporal resolution**: Add valid_from, valid_to, and temporal_granularity (e.g., annual, monthly) to support time-varying Ontario grid intensity and seasonal effects.
- **Marginal vs. average**: Add intensity_basis with enum {average, marginal}; many policy questions need marginal intensities.

## **3) Regionalization and scope clarity**

- **Region ontology**: Store region_code as ISO 3166-2 (e.g., CA-ON) and add region_method (how you mapped factors to region; e.g., grid-mix weighting).
- **Scope taxonomy**: Normalize scope boundaries with a reference table:
    - scope_boundary_id (PK), name (TTW, WTT+TTW, cradle-to-grave), definition, standards_ref.
- **GWP horizon control**: Keep gwp_source (e.g., IPCC AR6) separate from gwp_horizon (GWP100, GWP20) to enable re-runs under different horizons.

## **4) Activity model refinements**

- **Functional unit registry**: Create units table with unit_id, symbol, definition, ucum_code for machine-safe units (e.g., km, h, cup).
- **Composability**: Allow composite activities (e.g., “Video streaming (HD)” = device + home network + access network + data center), via an activity_components table mapping a parent activity to sub-activities with weights or device-mix shares.
- **Device/network mix**: Add mix_id references (see §5) to parameterize things like laptop vs. TV share, Wi-Fi vs. cellular, fiber vs. cable.

## **5) Profiles and schedules**

- **Day-type schedules**: Replace single activity_schedule with:
    - daytypes (WFH, OfficeWinter, OfficeSummer, Weekend…)
    - profile_daytype_mix (e.g., {WFH: 0.57, OfficeWinter: 0.29, OfficeSummer: 0.14})
    - schedule at the (profile, daytype, activity) level.
This avoids brittle “3/7 office days” notes and supports seasonal commuting differences.
- **Mix assumptions**: Add a mixes table (e.g., STREAM_DEVICE_MIX_2025) with (component, share) rows so you can swap assumptions without rewriting activities.

## **6) Calculation layer**

- **Deterministic + stochastic**: Add a calc_runs table to store scenario parameters (e.g., horizon, marginal/average, device mix), and a calc_results table keyed by calc_run_id. This cleanly separates raw factors from computed outputs and supports Monte Carlo bands.
- **Leap-year policy**: Store days_per_year in calc_runs (e.g., 365, 365.25) to make annualization explicit.
- **Unit safety**: Persist normalized SI units in the calc layer (e.g., base grams) and only format to kg/t in exports.

## **7) Data quality and lineage**

- **DQ flags**: Add data_quality_score (0–5) and dq_notes at the emission factor level; keep peer_reviewed boolean and study_type (LCA meta-analysis, engineering estimate, etc.).
- **Citations table**: You have sources; add citation_order (the bracket number) per calc run to lock IEEE numbering for each published artifact.
- **Deprecations**: Add is_deprecated and replaced_by_ef_id for superseded factors.

## **8) Interop and storage formats**

- **Columnar + JSON Schema**: Maintain canonical Parquet files for analytics; publish CSV for accessibility; publish a JSON Schema (or Pydantic models) for API/validation.
- **API readiness**: If you’ll serve Plotly dashboards, expose a small HTTP endpoint that returns: dataset, calc parameters, and a generated References.txt (IEEE layout) bound to the exact calc_run_id.

## **9) Visualization contracts (Plotly)**

- **Figure manifest**: For each Plotly figure, store a figure_manifest row with:
    - calc_run_id, figure_type (sankey, stacked_bar, bubble, heatmap),
    - trace_query (saved SQL or JSON spec for the exact slice),
    - hover_template with placeholders for [citation_order],
    - caption_text (short) plus figure_notes (long-form assumptions).
- **Downloadables**: Persist per-figure CSV snapshots and a References.txt generated from sources.ieee_citation in the *exact in-text order* used by that figure.

## **10) Governance and reproducibility**

- **Change proposals**: Track schema changes via ADRs (architecture decision records) stored in-repo.
- **Test fixtures**: Provide a miniature Toronto baseline dataset with unit tests covering:
    - unit conversions,
    - uncertainty propagation,
    - daytype weighting,
    - citation-order locking.

# **Revised table overview (condensed)**

- meta(schema_semver, created_at, modified_at, modified_by)
- sources(source_uuid, ieee_citation, url, year, license, provenance_json)
- units(unit_id, symbol, definition, ucum_code)
- scope_boundaries(scope_boundary_id, name, definition, standards_ref)
- activities(activity_uuid, activity_slug, category, name, description, default_unit_id, unit_definition, notes)
- activity_components(parent_activity_uuid, component_activity_uuid, share, notes)
- emission_factors(ef_uuid, activity_uuid, region_code, scope_boundary_id, gwp_source, gwp_horizon, unit_id, value_g_per_unit, co2_g, ch4_g_co2e, n2o_g_co2e, uncert_type, uncert_low, uncert_high, intensity_basis, valid_from, valid_to, temporal_granularity, vintage_year, data_quality_score, dq_notes, peer_reviewed, study_type, source_uuid, provenance_json, is_deprecated, replaced_by_ef_uuid)
- profiles(profile_uuid, name, assumption_notes, mix_id)
- daytypes(daytype_id, name, season)
- profile_daytype_mix(profile_uuid, daytype_id, share)
- activity_schedule(profile_uuid, daytype_id, activity_uuid, freq_per_day, freq_per_week, seasonality_tag, schedule_notes)
- mixes(mix_id, name, notes) and mix_components(mix_id, component_key, share)
- calc_runs(calc_run_id, schema_semver, gwp_horizon, intensity_basis, region_policy, days_per_year, mix_id, created_at, created_by, notes)
- calc_results(calc_run_id, profile_uuid, daytype_id, activity_uuid, ef_uuid, daily_g, daily_low_g, daily_high_g, weekly_g, annual_kg, annual_low_kg, annual_high_kg)
- citation_map(calc_run_id, source_uuid, citation_order)
- figure_manifest(figure_id, calc_run_id, figure_type, trace_query, hover_template, caption_text, figure_notes, csv_path, references_path)

# **Migration notes from your draft**

- Replace current string IDs with UUIDv7; keep your slugs in new *_slug fields.
- Split emission_factors uncertainty into value + explicit uncert_type.
- Introduce daytypes and profile_daytype_mix; move office/WFH logic out of free-text notes.
- Add units table and reference it; remove unit ambiguity from free-text.
- Add calc_runs/calc_results to decouple raw data from published numbers and lock IEEE numbering per output.

# **Bottom line**

With these deltas, you’ll have a future-proof, reproducible data spine that supports:

- Ontario-specific, time-varying electricity;
- device/network mixes for media;
- uncertainty propagation and scenario analysis;
- Plotly dashboards with locked IEEE citations per figure.

***

## **F. Calculation notes (to encode in your ETL)**

- **Office-day weighting**: If an activity is “office days only,” multiply daily emissions by (office_days_per_week / 7) for annualization unless you explicitly compute day-type schedules.
- **Leap years**: Store whether you used 365 or 365.25; keep it in derived_calcs notes for reproducibility.
- **Grid updates**: Version factors by vintage_year; ON grid intensity changes over time—your charts should be parameterized by year.

***

## **G. Visual design conventions (for consistency)**

- **Units in labels**: Always include units in axis titles/legends, e.g., “Annual emissions (kg CO₂e)”.
- **Citation numbers**: Square-bracket numerals inside hover labels and figure captions, mapping to a single **References** block displayed with the chart.
- **Download affordances**: Provide buttons to download (a) the **exact CSV** used in the trace, and (b) the **References.txt** generated from sources.ieee_citation.
- **Color/encodings**: Use a consistent category palette across figures; use **error bars** or a secondary figure for uncertainty to avoid overly busy stacks.

***

You’re right—if we implement every refinement up-front, we’ll bury ourselves. The fix is **progressive disclosure**: a compact core you can use immediately, plus optional “extension packs” you switch on only when needed. Below is a **manageable v1.1-core** with explicit nullability, defaults, and clean upgrade paths.

# **Core first, extensions later**

## **A) v1.1-core (ship this now)**

Only five tables, all columns either **required (R)** or **optional (O)** with sane defaults.

### **1)** 

### **sources**

###  **(authoritative citations)**

- **R** source_id (slug, e.g., SRC.IPCC.AR6)
- **R** ieee_citation (full IEEE string; plain text)
- **O** url, **O** year, **O** license

**Notes.** Keep it dead-simple. You can backfill year/license later.

***

### **2)** 

### **activities**

###  **(human activities, not factors)**

- **R** activity_id (slug, TRAN.TTC.SUBWAY.KM)
- **R** category (food|transport|media|leisure|consumer|other)
- **R** name
- **R** default_unit (free text for now, e.g., km, hour, cup)
- **O** description, **O** unit_definition, **O** notes

**Deferrals.** No units registry, no components table. If/when you need device/network decomposition, you’ll add it as an extension.

***

### **3)** 

### **emission_factors**

###  **(one number per unit, with optional bounds)**

- **R** ef_id (slug)
- **R** activity_id → activities
- **O** region (default: CA-ON)
- **O** scope_boundary (default by category: cradle-to-grave for goods, WTT+TTW for transport, Electricity LCA for media)
- **O** gwp_horizon (default: GWP100 (AR6))
- **R** unit (must match the activity’s default_unit)
- **R** value_g_per_unit (numeric)
- **O** uncert_low_g_per_unit, **O** uncert_high_g_per_unit (nullable; drives error bars)
- **O** vintage_year
- **R** source_id → sources

**Null policy.** If uncertainty is unknown, leave both bounds NULL; visualizations simply omit error bars. Never fake zeros.

***

### **4)** 

### **profiles**

###  **(scenarios)**

- **R** profile_id (slug, e.g., BASE.TO.HYBRID.2025)
- **R** name
- **O** assumption_notes
- **O** office_days_per_week (default: 3), **O** season (default: all)

**Why keep this lean?** We’ll avoid daytypes until you really need seasonal splits.

***

### **5)** 

### **activity_schedule**

###  **(how often things happen)**

- **R** profile_id → profiles
- **R** activity_id → activities
- **O** freq_per_day (nullable)
- **O** freq_per_week (nullable; you’ll use whichever is provided)
- **O** office_days_only (boolean; default FALSE)
- **O** schedule_notes

**Rule.** If office_days_only=TRUE, weight by office_days_per_week/7 during annualization. If both freq_per_day and freq_per_week are NULL, the activity is inactive in that profile.

***

### **6)** 

### **derived_calcs**

###  **(VIEW or materialized table; generated, not hand-edited)**

Columns (all **R** in the view):

- profile_id, activity_id, ef_id
- daily_g, weekly_g, annual_kg
- daily_low_g, daily_high_g, annual_low_kg, annual_high_kg (nullable if EF bounds are NULL)

**Implementation.** Use COALESCE(freq_per_day, freq_per_week/7); apply office_days_only weighting if set.

***

## **B) What we’re deferring (clean “extension packs”)**

Turn on later, not now:

- **Units registry & UCUM codes** (only when you start exchanging data via API).
- **Activity components + mixes** (when you need device/network splits).
- **Daytypes & seasonal matrices** (when you really analyze winter vs summer).
- **calc_runs / figure_manifest** (when you automate reproducible publishing).
- **Gas-by-gas fields & marginal intensities** (when policy sensitivity becomes a requirement).

Everything above can be added without breaking the core tables (we’ve chosen slugs and nullable optionals to preserve forward compatibility).

***

## **C) Nullability policy (don’t drown in your schema)**

- **Unknown ≠ zero.** Use **NULL** for unknown; zeros only when truly zero.
- **Applicability vs. availability.** If a field does not make sense (e.g., scope_boundary for an EF that’s already cradle-to-gate by definition), leave it NULL and rely on category defaults.
- **Computation rules:**
    - If uncert_low/high are NULL → **no error bars**.
    - If region is NULL → assume **CA-ON**; document default assumptions in profiles.assumption_notes.
    - If neither daily nor weekly frequency is provided → **exclude from calc**.
- **Exports.** In reader-facing tables, display — (em-dash) for NULLs; don’t print “0” unless zero is real.

***

## **D) Plotly without complexity creep**

- You can wire interactive charts directly to **derived_calcs** and the **wide export view** without any of the deferred tables.
- **Hover labels** pull: activity name, unit, EF value, optional error range, region (or default), scope, and **[n]** citation number.
- Generate the **References** block once per figure by scanning used ef.source_id in order of first appearance. Lock the order in the figure JSON if you need deterministic reproduction later.

Recommended first three visuals (low overhead):

1. **Stacked bar** — daily vs. annual totals by category (no uncertainty if you don’t have it).
2. **Bubble plot** — frequency vs. EF per unit; size = annual kg; hover shows [n].
3. **Sankey** — only after #1–#2 are stable; start with Category → Activity (two levels).

***

## **E) Minimal wide export (for reports/dashboards)**

This view is computed from the five core tables. It’s the only thing your readers need to see.

| **Category** | **Activity** | **Unit** | **Freq/day** | **EF (g CO₂e/unit) [n]** | **Daily (g)** | **Weekly (g)** | **Annual (kg)** | **Scope** | **Region** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- If uncert_* exist, add Annual (kg, low) / Annual (kg, high) for Plotly error bars.
- Keep [n] as the in-text index; the References list appears under the chart or table.

***

## **F) Defaults you can rely on (to cut data entry)**

- region: default **CA-ON**
- gwp_horizon: default **GWP100 (AR6)**
- scope_boundary: default by category (**transport:** WTT+TTW; **goods/food:** cradle-to-grave; **media/electricity:** Electricity LCA)
- office_days_per_week: default **3**
- Annualization: **365** (store the constant once in your calc code)

***

## **G) Small starter CSVs (illustrative, with nullables)**

**emission_factors.csv**

```javascript
ef_id,activity_id,region,scope_boundary,gwp_horizon,unit,value_g_per_unit,uncert_low_g_per_unit,uncert_high_g_per_unit,vintage_year,source_id
EF.COFFEE.CUP.CA,FOOD.COFFEE.CUP.HOT,CA,,GWP100 (AR6),cup,210,,,2022,SRC.COFFEE.META
EF.TTC.SUBWAY.KM.ON,TRAN.TTC.SUBWAY.KM,CA-ON,WTT+TTW,GWP100 (AR6),km,45,30,70,2024,SRC.TTC.INTENSITY
EF.STREAM.HD.HOUR.ON,MEDIA.STREAM.HD.HOUR,CA-ON,Electricity LCA,GWP100 (AR6),hour,100,40,220,2024,SRC.STREAM.ON
```

**activity_schedule.csv**

```javascript
profile_id,activity_id,freq_per_day,freq_per_week,office_days_only,schedule_notes
BASE.TO.HYBRID.2025,FOOD.COFFEE.CUP.HOT,1.2,,FALSE,
BASE.TO.HYBRID.2025,TRAN.TTC.SUBWAY.KM,10,,TRUE,"Office commute only"
BASE.TO.HYBRID.2025,MEDIA.STREAM.HD.HOUR,1.0,,FALSE,"Evenings"
```

If a row isn’t ready, omit it or set the frequency columns **NULL**; it will drop out of calculations.

***

## **H) Practical workflow (so this stays manageable)**

1. **Seed** sources for the 10–15 factors you’ll use first.
2. **Define** activities for those same items.
3. **Enter** one EF per activity (bounds optional).
4. **Create** one profile and 10–20 activity_schedule rows.
5. **Generate** the wide export and the first stacked bar chart.
6. **Iterate**: add uncertainty bounds and more activities only as needed.