# ACX003 Schema Architecture v1.1

**Purpose**

Document the current carbon accounting schema after migration and validator strengthening. This supersedes ACX001 and incorporates the optimizations assessed in ACX002. It captures table definitions, validation rules, calculation semantics, extensibility, and a design-change log.

***

## 1. Data Model

All CSVs reside in `/data/`. Schema is **null-first**: blanks must be stored as `NULL` (never zero) unless a true zero is measured.

### `activities.csv`

|  Column           |  Type     |  Notes                                        |
| --- | --- | --- |
|  activity\_id      |  str, PK  |  Canonical slug, e.g., `FOOD.COFFEE.CUP.HOT`  |
|  category         |  str?     |  Broad class (`food`, `media_online`, etc.)   |
|  name             |  str?     |  Human-readable label                         |
|  default\_unit     |  str?     |  Must be in `units.csv`                       |
|  description      |  str?     |  Free text                                    |
|  unit\_definition  |  str?     |  Optional SI definition                       |
|  notes            |  str?     |  Free text                                    |

Validation: if `default_unit` is set, must appear in `units.csv`.

***

### `emission_factors.csv`

|  Column                         |  Type         |  Notes                                                                     |
| --- | --- | --- |
|  ef\_id                          |  str, PK      |  Stable identifier                                                         |
|  activity\_id                    |  str, FK      |  Must exist in `activities.csv`                                            |
|  unit                           |  str?         |  Must be in `units.csv` if present                                         |
|  value\_g\_per\_unit               |  float?       |  Fixed EF option                                                           |
|  is\_grid\_indexed                |  bool?        |  Grid-indexed option                                                       |
|  electricity\_kwh\_per\_unit       |  float?       |  Required if grid-indexed                                                  |
|  electricity\_kwh\_per\_unit\_low   |  float?       |  Optional bound                                                            |
|  electricity\_kwh\_per\_unit\_high  |  float?       |  Optional bound                                                            |
|  region                         |  RegionCode?  |  ISO-3166-2 (CA, CA-ON, …)                                                 |
|  scope\_boundary                 |  str?         |  Literal: `WTT+TTW`, `cradle-to-grave`, `Electricity LCA`, `gate-to-gate`  |
|  gwp\_horizon                    |  str?         |  e.g. `GWP100 (AR6)`                                                       |
|  vintage\_year                   |  int?         |  Must be ≤ current year                                                    |
|  source\_id                      |  str, FK      |  Must exist in `sources.csv`                                               |
|  method\_notes                   |  str?         |  Free text                                                                 |
|  uncert\_low\_g\_per\_unit          |  float?       |  Optional bound                                                            |
|  uncert\_high\_g\_per\_unit         |  float?       |  Optional bound                                                            |

Validation rules:

- **XOR rule**: either `value_g_per_unit` (fixed) OR (`is_grid_indexed=True` + `electricity_kwh_per_unit>0`), never both.
- If grid-indexed: `is_grid_indexed` must be true; kWh fields >0.
- If uncertainty bounds: require value present, and low ≤ value ≤ high.
- `unit` must be in `units.csv` if present.
- `vintage_year` cannot be in the future.

***

### `profiles.csv`

|  Column                |  Type         |  Notes                                   |
| --- | --- | --- |
|  profile\_id            |  str, PK      |  E.g. `PRO.TO.24_39.HYBRID.2025`         |
|  name                  |  str          |  Label with cohort + year                |
|  region\_code\_default   |  RegionCode?  |  Provincial ISO code                     |
|  grid\_strategy         |  str?         |  `region_default`, `mix_weighted`, etc.  |
|  grid\_mix\_json         |  str?         |  Optional JSON of mix                    |
|  cohort\_id             |  str?         |  Sub-cohort key (e.g., `PRO24_31`)       |
|  office\_days\_per\_week  |  float?       |  For commuting weighting                 |
|  assumption\_notes      |  str?         |  Free text                               |

***

### `activity_schedule.csv`

|  Column            |  Type         |  Notes                                   |
| --- | --- | --- |
|  profile\_id        |  str, FK      |  Must exist in `profiles.csv`            |
|  activity\_id       |  str, FK      |  Must exist in `activities.csv`          |
|  freq\_per\_day      |  float?       |  Average frequency                       |
|  freq\_per\_week     |  float?       |  Mutually exclusive with `freq_per_day`  |
|  office\_days\_only  |  bool?        |  Restrict to office days                 |
|  region\_override   |  RegionCode?  |  Override default region                 |
|  schedule\_notes    |  str?         |  Notes                                   |

Validation: forbid both `freq_per_day` and `freq_per_week` in the same row.

***

### `sources.csv`

|  Column         |  Type     |  Notes                |
| --- | --- | --- |
|  source\_id      |  str, PK  |  Stable ID            |
|  ieee\_citation  |  str      |  Full IEEE reference  |
|  url            |  str?     |  Plaintext URL        |
|  year           |  int?     |  Publication year     |
|  license        |  str?     |  License terms        |

***

### `grid_intensity.csv`

|  Column          |  Type        |  Notes               |
| --- | --- | --- |
|  region\_code     |  RegionCode  |  ISO-3166-2 or CA    |
|  vintage\_year    |  int?        |  Year of factor      |
|  g\_per\_kwh       |  float?      |  Central value       |
|  g\_per\_kwh\_low   |  float?      |  Lower bound         |
|  g\_per\_kwh\_high  |  float?      |  Upper bound         |
|  source\_id       |  str, FK     |  From `sources.csv`  |

***

### `units.csv`

|  Column                |  Type     |  Notes                           |
| --- | --- | --- |
|  unit\_code             |  str, PK  |  Canonical short code            |
|  unit\_type             |  str      |  Category (distance, energy, …)  |
|  si\_conversion\_factor  |  float?   |  SI mapping                      |
|  notes                 |  str?     |  Free text                       |

***

## 2. Validators (in `schema.py`)

- **Region codes**: ISO-3166-2 (CA, CA-ON, …).
- **Scope boundaries**: literal set.
- **EF XOR rule**: fixed vs grid-indexed exclusivity.
- **EF uncertainty**: bounds enforced.
- **Vintage year**: must be ≤ today’s year.
- **Units**: must exist in `units.csv`.
- **Schedules**: forbid both daily and weekly frequency.
- **Null-first**: blanks remain None, never coerced to 0.

***

## 3. Calculation Semantics

- **Annualization**: frequencies → daily → weekly → annual.
- **Office-day weighting**: apply only when `office_days_only=TRUE`.
- **Grid precedence**: `region_override > grid_strategy mix > region_code_default > CA`.
- **Uncertainty propagation**: keep bounds through derivation; output low/mean/high.

Outputs written to `/calc/outputs/` as CSV and JSON, with prepended metadata:

```javascript
# generated_at=2025-08-12T21:00:00Z
# method=v1.1
```

References: per-figure IEEE refs in `calc/outputs/references/*.txt`.

***

## 4. Front-End Integration

- **Dash (local dev)**: stacked/bubble/sankey + reference panel.
- **Cloudflare Pages (prod)**: serve pre-built JSON + reference lists; client-side Plotly only.

***

## 5. Extensibility Hooks

- **Geography**: supports all CA provinces via `grid_intensity.csv`.
- **Demographics**: 24–39 and 40–56 primary cohorts; inert sub-cohort placeholders included.
- **Data source type**: modeled vs. metered can be flagged at EF level.
- **Units registry**: extensible for new activity types.

***

## 6. Change Log vs ACX002 (Claude’s suggestions)

- **Adopted**: ISO-3166-2 regions; scope boundary literals; EF XOR/bounds/vintage rules; schedule exclusivity; units registry.
- **Adapted**: “materialized views” → CSV/JSON outputs; audit fields → export metadata only.
- **Deferred**: DB indexes, SQL enums, schema version tables (not needed for CSV pipeline).

***

## 7. Status

- **Step A (migration)**: ✅ data files replaced with v1.1 headers.
- **Step B (validators)**: ✅ implemented (once schema.py is restored).
- **Step C (config + cleanup)**: ⏳ next action.

***