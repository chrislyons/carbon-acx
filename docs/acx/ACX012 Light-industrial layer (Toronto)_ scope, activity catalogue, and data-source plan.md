# ACX012 Light-industrial layer (Toronto): scope, activity catalogue, and data-source plan

## 1) Layer boundary (kept separate from “professional 25–50”)

Define a new profile family (e.g., `IND.TO.LIGHT.2025`) covering **construction sites**, **logistics/warehousing**, **last-mile delivery**, **facility/building services**, and **waste hauling**. This layer models **operational practices** (fuel, grid electricity, trips, on-site equipment). If/when you want **materials/embodied** impacts (e.g., concrete, steel), treat them as a distinct “materials” category to avoid mixing daily operations with one-time capital inputs.

## 2) Industrial activity catalogue (v0.1 — add as `activities` rows)

Use the same core schema (categories, units, nullable bounds). Suggested units are chosen to align with standard factors and metering.

|  Sector                 |  Activity (short label)                                    |  Unit (functional unit)                            |  Typical schedule anchor     |  Emissions driver (what the EF will measure)                                                                      |
| --- | --- | --- | --- | --- |
|  Construction           |  Non-road diesel equipment (excavator/loader/telehandler)  |  litre of diesel **or** engine-hour (by hp class)  |  per 8-h shift, days active  |  Direct fuel combustion; optional engine-hour × hp × load factor mapping [1], [2]                               |
|  Construction           |  Tower crane (grid-tied)                                   |  kWh                                               |  per shift/day               |  Ontario grid electricity intensity [3]                                                                          |
|  Construction           |  Portable site generator (diesel)                          |  litre of diesel **or** kWh delivered if metered   |  per shift/day               |  Direct fuel combustion [1], [2]                                                                                |
|  Construction           |  Portable heating (NG/propane)                             |  m³ natural gas or litre propane                   |  winter days                 |  Direct fuel combustion; space-heat efficiency assumed [1], [4]                                                 |
|  Construction           |  Ready-mix delivery & pump                                 |  trip-km (truck) **and** pump-hour (diesel)        |  per pour day                |  Mobile diesel (on-road) + non-road for pump [1], [2]                                                           |
|  Construction           |  Water truck / dust suppression                            |  litre diesel                                      |  dry days                    |  Direct fuel combustion [1], [2]                                                                                |
|  Logistics/Warehousing  |  Class 6–8 yard tractors & line-haul (diesel)              |  vehicle-km or litre diesel                        |  per shift/day               |  Mobile diesel (on-road) [1]                                                                                     |
|  Logistics/Warehousing  |  Forklifts (battery electric)                              |  kWh (charger input)                               |  per shift/day               |  Ontario grid electricity intensity [3]                                                                          |
|  Logistics/Warehousing  |  Forklifts (LPG)                                           |  litre propane                                     |  per shift/day               |  Direct fuel combustion [1], [4]                                                                                |
|  Logistics/Warehousing  |  Warehouse HVAC (space heat)                               |  m³ natural gas                                    |  per day (heating season)    |  Direct fuel combustion [4]                                                                                      |
|  Last-mile              |  Delivery van (gasoline/diesel)                            |  km                                                |  per route/day               |  Mobile fuel combustion, well-to-wheel preferred [1]                                                             |
|  Last-mile              |  e-cargo bike / small e-van                                |  kWh                                               |  per route/day               |  Ontario grid electricity intensity [3]                                                                          |
|  Facility/Services      |  Service truck (HVAC/electrical/plumbing)                  |  km                                                |  per work order/day          |  Mobile fuel combustion [1]                                                                                      |
|  Facility/Services      |  Rooftop crane lift (mobile crane)                         |  hour (diesel)                                     |  as scheduled                |  Non-road diesel [1], [2]                                                                                       |
|  Waste hauling          |  Front-loader / roll-off trips                             |  km                                                |  per pick-up day             |  Mobile diesel (on-road) [1]                                                                                     |
|  Cross-sector           |  Idling (non-compliance)                                   |  minute or litre (preferred)                       |  incidental                  |  Enforce via fuel; time-based only for diagnostics. Toronto’s idling control context is policy, not factors [5]  |

**Implementation notes**

- Use **fuel-based** factors wherever possible (litre diesel/propane, m³ NG). Distance-based factors (g/km) are acceptable for fleet where telemetry exists.
- Keep **engine-hour** as a secondary path only when fuel is unknown; you’ll need load factors and hp class to estimate fuel/hour (nullable if unknown).
- Electricity uses **kWh at the meter/charger**; grid intensity = **Ontario-specific**.

## 3) Integration into the core schema (minimal changes)

- **Profiles.** Add `IND.TO.CONSTR.SMALL.2025`, `IND.TO.LOGI.HUB.2025`, `IND.TO.LASTMILE.2025`, `IND.TO.SERVICES.2025`, `IND.TO.WASTE.2025`.
- **Categories.** Add `industrial_construction`, `industrial_logistics`, `industrial_lastmile`, `industrial_services`, `industrial_waste`.
- **Schedules.** Keep `**freq_per_day**` as the single driver (nullable). For shift-based sites, treat “per shift” as “per day” on days the site is active; if needed later, add a `days_active_per_week` field to the `profiles` table or encode it in `assumption_notes`.
- **Nullability.** When fuel is unknown, keep `freq` but set EF missing (NULL) until sourced; the calc view will exclude or show `—`.

## 4) Source families to anchor emission factors and practices

Prioritize **Canadian federal inventories**, **Ontario grid data**, and **Toronto policy context**. These let you stay rigorous while keeping data entry small.

- **Fuel combustion (stationary & mobile).** Use Canada’s National GHG Inventory and quantification guidance for **diesel, gasoline, propane, natural gas**; these give **kg CO₂e per litre (or m³)** with CH₄/N₂O adders and GWP100 alignment [1].
- **Non-road equipment.** Use national methods (non-road diesel) or recognized engine-hour → fuel conversions; keep results fuel-based when possible [2].
- **Electricity (Ontario).** Use **IESO** or federal inventory tables for **Ontario grid intensity**; keep the **vintage year** explicit for reproducibility [3].
- **Building/warehouse heat.** Natural gas emission factors from federal guidance; efficiency assumptions can be annotated in `assumption_notes` [4].
- **City context (operations & compliance).** Toronto’s **Goods Movement Strategy** for logistics patterns and **Idling Control By-law** for context (policy reference only; don’t convert minutes → emissions unless you have fuel) [5], [6].
- **(Optional) Embodied materials.** When/if you decide to include **concrete/asphalt/steel**: use **Canadian EPDs** and CSA-aligned declarations; model as **per unit material** (m³, t) with their own category, not as “daily ops” [7], [8].

## 5) “Industrial” wide table (export view) — ready to populate

Same columns as your professional layer; populate incrementally.

|  Sector                    |  Activity                   |   Unit  |  Freq/day  |  EF (g CO₂e/unit) [n]  |  Daily (g)  |  Weekly (g)  |  Annual (kg)  |  Scope            |  Region  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  industrial\_construction  |  Non-road diesel equipment  |  litre  |       120  |                 — [1]  |          —  |           —  |            —  |  TTW (diesel)     |  CA      |
|  industrial\_construction  |  Tower crane (grid-tied)    |    kWh  |       250  |                 — [3]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON   |
|  industrial\_logistics     |  Forklift (battery)         |    kWh  |       180  |                 — [3]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON   |
|  industrial\_lastmile      |  Delivery van               |     km  |       140  |                 — [1]  |          —  |           —  |            —  |  WTW              |  CA      |
|  industrial\_services      |  Service truck              |     km  |        60  |                 — [1]  |          —  |           —  |            —  |  WTW              |  CA      |
|  industrial\_waste         |  Roll-off haul              |     km  |        80  |                 — [1]  |          —  |           —  |            —  |  WTW              |  CA      |

Populate **one sector at a time** (2–4 activities each). Keep uncertainty columns nullable until you source bounds.

## 6) Small operational rules (to stay manageable)

- **Fuel beats proxies.** If you can obtain **litres** (diesel/propane) or **kWh**, use those; distance and time proxies are fallbacks.
- **Avoid “idling minutes → emissions”** unless you can translate to **fuel**; otherwise keep idling as a **policy/training KPI**, not a GHG line item.
- **Keep embodied separate** until you deliberately include materials.
- **Defaults:** `region=CA-ON`, `gwp_horizon=GWP100 (AR6)`, `scope_boundary` by category (as in your professional layer).

***

## References

[1] Environment and Climate Change Canada, “National Greenhouse Gas Inventory and Quantification Guidance—Fuel Combustion (mobile and stationary),” 2024. Available: [https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions.html](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions.html)

[2] IPCC, “2006 IPCC Guidelines for National Greenhouse Gas Inventories—Volume 2: Energy (non-road/mobile combustion),” 2006. Available: [https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html)

[3] Independent Electricity System Operator (IESO), “Emissions and Grid Intensity (Ontario)—Data and Reports,” 2024. Available: [https://www.ieso.ca/en/Power-Data/Data-Directory](https://www.ieso.ca/en/Power-Data/Data-Directory)

[4] Environment and Climate Change Canada, “Quantification of Greenhouse Gas Emissions—Fuel and Energy Conversion Factors,” 2024. Available: [https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/factors.html](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/factors.html)

[5] City of Toronto, “Idling Control By-law—Chapter 517,” 2024. Available: [https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/](https://www.toronto.ca/services-payments/water-environment/environmentally-friendly-city-programs/anti-idling/)

[6] City of Toronto, “Freight and Goods Movement Strategy,” 2024. Available: [https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/](https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-projects/toronto-goods-movement-strategy/)

[7] Cement Association of Canada, “Environmental Product Declarations (EPDs) and Cements in Canada,” 2023. Available: [https://cement.ca/sustainability/environmental-product-declarations/](https://cement.ca/sustainability/environmental-product-declarations/)

[8] CSA Group, “EPD Program and Product Category Rules (PCR) for Construction Products,” 2024. Available: [https://www.csagroup.org/testing-certification/product-areas/environmental-product-declarations/](https://www.csagroup.org/testing-certification/product-areas/environmental-product-declarations/)

*(This adds an industrial layer without expanding the schema beyond your v1.1-core. All new fields remain within existing nullable columns. When you’re ready to quantify, we’ll source the specific factors for each row and fill `emission_factors` with Canadian/ON-specific values.)*