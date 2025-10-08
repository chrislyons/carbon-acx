# ACX001 Carbon Footprint Dataset v1.1 Core Plan

**Purpose**

Define the initial schema and processing pipeline for a CSV-based carbon footprint dataset, suitable for Toronto pilot activities and scalable to other provinces and demographic cohorts. This serves as the foundation for subsequent documents (ACX002 optimizations, ACX003 schema alignment).

***

## 1. Data Model

The dataset uses **five canonical tables**, all stored as CSVs under `/data/`.

Schema follows a **null-first policy**: unknown values are represented as `NULL` (blank in CSV), never as `0`.

### 1.1 `sources.csv`

Bibliographic metadata for emission factors and activity data.

|  Column         |  Type    |  Notes                                       |
| --- | --- | --- |
|  source\_id      |  str PK  |  Unique identifier, e.g. `SRC.DIMPACT.2021`  |
|  ieee\_citation  |  str     |  Full IEEE-style citation string             |
|  url            |  str?    |  Plaintext URL to source                     |
|  year           |  int?    |  Publication year                            |
|  license        |  str?    |  License conditions, if relevant             |

***

### 1.2 `activities.csv`

Canonical list of human activities to model.

|  Column           |  Type    |  Notes                                      |
| --- | --- | --- |
|  activity\_id      |  str PK  |  Canonical slug, e.g. `TRAN.TTC.SUBWAY.KM`  |
|  category         |  str     |  Broad class: transport, food, digital      |
|  name             |  str     |  Human-readable label                       |
|  default\_unit     |  str?    |  Canonical unit (must exist in units.csv)   |
|  description      |  str?    |  Free text                                  |
|  unit\_definition  |  str?    |  Optional SI equivalence                    |
|  notes            |  str?    |  Free text                                  |

***

### 1.3 `emission_factors.csv`

Emission factors for each activity.

|  Column                         |  Type    |  Notes                                            |
| --- | --- | --- |
|  ef\_id                          |  str PK  |  Identifier, e.g. `EF.OTT.HD.TV.KWH`              |
|  activity\_id                    |  str FK  |  Must exist in activities.csv                     |
|  unit                           |  str?    |  Must exist in units.csv                          |
|  value\_g\_per\_unit               |  float?  |  Fixed EF (mutually exclusive with grid-indexed)  |
|  is\_grid\_indexed                |  bool?   |  Grid-indexed flag                                |
|  electricity\_kwh\_per\_unit       |  float?  |  Required if grid-indexed                         |
|  electricity\_kwh\_per\_unit\_low   |  float?  |  Optional bound                                   |
|  electricity\_kwh\_per\_unit\_high  |  float?  |  Optional bound                                   |
|  region                         |  str?    |  ISO-3166-2 region code (e.g., `CA-ON`)           |
|  scope\_boundary                 |  str?    |  Vocabulary: `WTT+TTW`, `cradle-to-grave`, etc.   |
|  gwp\_horizon                    |  str?    |  e.g., `GWP100 (AR6)`                             |
|  vintage\_year                   |  int?    |  Must be ≤ current year                           |
|  source\_id                      |  str FK  |  From sources.csv                                 |
|  method\_notes                   |  str?    |  Free text                                        |
|  uncert\_low\_g\_per\_unit          |  float?  |  Optional bound                                   |
|  uncert\_high\_g\_per\_unit         |  float?  |  Optional bound                                   |

Validation:

- **Mutual exclusion**: either `value_g_per_unit` OR (`is_grid_indexed=True` + `electricity_kwh_per_unit>0`), never both.
- If uncertainty bounds present → require value, and low ≤ value ≤ high.
- `vintage_year` must not exceed current year.

***

### 1.4 `profiles.csv`

Demographic or industrial cohorts.

|  Column                |  Type    |  Notes                                 |
| --- | --- | --- |
|  profile\_id            |  str PK  |  E.g., `PRO.TO.24_39.HYBRID.2025`      |
|  name                  |  str     |  Human-readable label                  |
|  region\_code\_default   |  str?    |  Default provincial grid (ISO-3166-2)  |
|  grid\_strategy         |  str?    |  Strategy for grid mix resolution      |
|  grid\_mix\_json         |  str?    |  Optional explicit mix definition      |
|  cohort\_id             |  str?    |  Optional sub-cohort tag               |
|  office\_days\_per\_week  |  float?  |  For commuting weighting               |
|  assumption\_notes      |  str?    |  Free text                             |

***

### 1.5 `activity_schedule.csv`

Expected frequency/intensity of activities for each profile.

|  Column            |  Type    |  Notes                                    |
| --- | --- | --- |
|  profile\_id        |  str FK  |  Must exist in profiles.csv               |
|  activity\_id       |  str FK  |  Must exist in activities.csv             |
|  freq\_per\_day      |  float?  |  Daily frequency                          |
|  freq\_per\_week     |  float?  |  Weekly frequency (exclusive with daily)  |
|  office\_days\_only  |  bool?   |  Restrict to office days                  |
|  region\_override   |  str?    |  Override grid region                     |
|  schedule\_notes    |  str?    |  Free text                                |

Validation: forbid both `freq_per_day` and `freq_per_week` in same row.

***

### 1.6 `grid_intensity.csv`

Grid emission intensities by region.

|  Column          |  Type    |  Notes                |
| --- | --- | --- |
|  region\_code     |  str PK  |  ISO-3166-2 or `CA`   |
|  vintage\_year    |  int     |  Year of measurement  |
|  g\_per\_kwh       |  float?  |  Central estimate     |
|  g\_per\_kwh\_low   |  float?  |  Lower bound          |
|  g\_per\_kwh\_high  |  float?  |  Upper bound          |
|  source\_id       |  str FK  |  From sources.csv     |

***

### 1.7 `units.csv`

Canonical registry of allowed units.

|  Column                |  Type    |  Notes                                   |
| --- | --- | --- |
|  unit\_code             |  str PK  |  e.g., `km`, `hour`, `cup`               |
|  unit\_type             |  str     |  Category: distance, time, food\_portion  |
|  si\_conversion\_factor  |  float?  |  SI mapping if applicable                |
|  notes                 |  str?    |  Free text                               |

***

## 2. Validation Principles

- **Null-first discipline**: unknowns stored as `NULL` (blank), not zero.
- **Scope boundary**: enforced via literal vocabulary.
- **Region codes**: must be ISO-3166-2 CA provinces or `CA`.
- **Mutual exclusion rules**: EF fixed vs grid-indexed; schedule daily vs weekly.
- **Units**: validated against `units.csv`.

***

## 3. Calculation & Outputs

- Derivation pipeline reads CSVs → validates with Pydantic → computes daily/weekly/annualized emission views.
- Outputs written to `/calc/outputs/` as:

- `export_view.csv/json` (wide, profile × activity).
- `figures/*.csv/json` (slices for Plotly visualizations).
- `references/*.txt` (ordered IEEE references per figure).
- Metadata added to exports: `generated_at`, `method`.

***

## 4. Visualization Layer

- **Dash app (local dev)**: stacked, bubble, sankey charts + references pane.
- **Plotly JSON (prod)**: pre-generated, served via Cloudflare Pages.

***

## 5. Extensibility

- Cohorts: baseline 25–50 Toronto professionals; extensible to 24–39, 40–56, sub-cohorts.
- Regions: seeded with Ontario; extensible to all provinces.
- Industrial layers: light/heavy modules pluggable via activities and emission_factors.
- Online services: included as dedicated category.

***