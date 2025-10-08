## CDX036 — Energy & Utilities (core trunk)

**Title:** data(seed): Energy & Utilities — entities, ops, FUs, citable EFs
**Intent:** Make electricity, natural gas, and refined fuels the primary industrial layers civilian habits depend on.

**Do**

1. `entities.csv`

```javascript
ENTITY.HYDROONE.CA,Hydro One,corporate,,
ENTITY.ENBRIDGE.CA,Enbridge,corporate,,
ENTITY.SHELL.CA,Shell Canada,corporate,,

```

2. `sites.csv` (examples)

```javascript
SITE.HYDROONE.ON.GRID,ENTITY.HYDROONE.CA,Ontario Grid Node,CA-ON,,,
SITE.ENBRIDGE.ON.PIPE,ENTITY.ENBRIDGE.CA,Ontario Gas Network,CA-ON,,,
SITE.SHELL.AB.REFINERY,ENTITY.SHELL.CA,Edmonton Refinery,CA-AB,,,

```

3. `assets.csv`

```javascript
ASSET.HYDROONE.GRID.CAON,SITE.HYDROONE.ON.GRID,line,CA-ON grid,2024,,electricity,
ASSET.ENBRIDGE.PIPE.CAON,SITE.ENBRIDGE.ON.PIPE,pipeline,Ontario pipeline,2024,,natural_gas,
ASSET.SHELL.REF.AB,SITE.SHELL.AB.REFINERY,refinery,Edmonton refinery,2024,,liquid_fuels,

```

4. `operations.csv`

```javascript
OP.HYDROONE.KWH2024,ASSET.HYDROONE.GRID.CAON,ENERGY.KWH.DELIVERED,FU.KWH,metered,2024-01-01,2024-12-31,,,
OP.ENBRIDGE.NATGAS2024,ASSET.ENBRIDGE.PIPE.CAON,ENERGY.NATGAS.M3,FU.M3_GAS,metered,2024-01-01,2024-12-31,,,
OP.SHELL.GASOLINE2024,ASSET.SHELL.REF.AB,ENERGY.GASOLINE.LITRE,FU.L_GASOLINE,modeled,2024-01-01,2024-12-31,,,

```

5. `functional_units.csv` (add if missing)

```javascript
FU.KWH,kilowatt-hour,energy,kWh,"Electrical energy delivered"
FU.M3_GAS,cubic meter gas,energy,m3,"Natural gas delivered"
FU.L_GASOLINE,litre gasoline,energy,L,"Refined motor gasoline delivered"

```

6. `activities.csv` (industrial delivery)

```javascript
ENERGY.KWH.DELIVERED,"Electricity delivered (kWh)","Retail electricity delivered to end users"
ENERGY.NATGAS.M3,"Natural gas delivered (m3)","Pipeline gas delivered"
ENERGY.GASOLINE.LITRE,"Gasoline refined & delivered (L)","Motor gasoline supply"

```

7. `activity_fu_map.csv`

```javascript
ENERGY.KWH.DELIVERED,FU.KWH,"fu = kwh",""
ENERGY.NATGAS.M3,FU.M3_GAS,"fu = m3",""
ENERGY.GASOLINE.LITRE,FU.L_GASOLINE,"fu = litres",""

```

8. `sources.csv` (citable) — IESO ON grid intensity (2023–2024), IPCC/Canada for gas & gasoline.
9. `emission_factors.csv` (numbers per your sources; include low/high if available)

```javascript
EF.GRID.CAON.2024,ENERGY.KWH.DELIVERED,CA-ON,Electricity LCA,GWP100 (AR6),kWh,35,25,60,2024,SRC.IESO2024,"Ontario grid intensity"
EF.NATGAS.CA.2024,ENERGY.NATGAS.M3,CA,Operational,WTT+TTW,m3,1900,1750,2100,2024,SRC.IPCC_CA,"Combustion + upstream"
EF.GASOLINE.CA.2024,ENERGY.GASOLINE.LITRE,CA,WTT+TTW,GWP100 (AR6),L,2300,2100,2600,2024,SRC.NRCAN2024,"WTT+TTW per litre"

```

**Acceptance**

- `intensity_matrix.csv` contains non-empty rows for **FU.KWH / FU.M3_GAS / FU.L_GASOLINE**.
- References list shows IESO/IPCC/NRCAN entries.

***

## CDX037 — Materials & Heavy Industry (cement, steel, plastics)

**Title:** data(seed): Materials — cement clinker, crude steel, virgin PET
**Intent:** Expose industrial baselines that underpin buildings and goods.

**Do**

- Entities: `ENTITY.LAFARGE.CA`, `ENTITY.ARCELORMITTAL.CA`, `ENTITY.NOVA.CHEM.CA`
- Activities+FUs:

```javascript
MATERIAL.CEMENT.CLINKER.TONNE,FU.TONNE,"Clinker production (t)"
MATERIAL.STEEL.CRUDESLAB.TONNE,FU.TONNE,"Crude steel slab (t)"
MATERIAL.PET.VIRGIN.TONNE,FU.TONNE,"Virgin PET polymer (t)"

```

- EFs (citable ranges from GNR, worldsteel, PlasticsEurope):

```javascript
EF.CLINKER.T, ... , kgCO2e/t ~ 800–900
EF.STEEL.T, ... , kgCO2e/t ~ 1800–2200 (route-specific note)
EF.PET.T, ... , kgCO2e/t ~ 2400–3000

```

**Acceptance**

- New FU **FU.TONNE** added if missing.
- Intensity shows three industrial tonnage anchors with sources.

***

## CDX038 — Agriculture & Food Processing (upstream of meals)

**Title:** data(seed): Agri/food — beef, poultry, coffee processing throughput
**Intent:** Tie civilian meals to agricultural/processing operations.

**Do**

- Entities: `ENTITY.MAPLELEAF.CA`, `ENTITY.CARGILL.CA`, `ENTITY.NESTLE.CA`
- Activities:

```javascript
AGRI.BEEF.CARCASS.KG,FU.KG,"Beef carcass weight (kg)"
AGRI.POULTRY.READY.KG,FU.KG,"Ready-to-cook poultry (kg)"
FOOD.COFFEE.ROASTED.KG,FU.KG,"Roasted coffee (kg)"

```

- EFs (Poore & Nemecek, sector LCAs) with uncertainty.
- Operations per entity with modeled throughput.

**Acceptance**

- FU **FU.KG** present; intensity rows visible; sources listed.

***

## CDX039 — Logistics & Freight (parcel, tonne-km, air leg)

**Title:** data(seed): Logistics — parcel delivered, tonne-km truck, air freight
**Intent:** Provide corporate logistics ops the consumer world depends on.

**Do**

- Entities: `ENTITY.AMAZON.CA`, `ENTITY.FEDEx.CA`, `ENTITY.CNRAIL.CA`
- FUs:

```javascript
FU.PARCEL,parcel,logistics,parcel,"One parcel delivered"
FU.TONNEKM,tonne-km,logistics,tonne*km,"Freight work"

```

- Activities:

```javascript
LOGI.PARCEL.URBAN,FU.PARCEL
LOGI.TRUCK.TONNEKM,FU.TONNEKM
LOGI.AIR.TONNEKM,FU.TONNEKM

```

- EFs (NRCAN/EPA/ICAO references): urban parcel g/parcel; truck ~60 g/tonne-km; air ~500 g/tonne-km.

**Acceptance**

- Intensity rows for parcel & tonne-km; at least one Amazon or FedEx operation seeded.

***

## CDX040 — Digital & Media Infrastructure (platform ops, LLM inference)

**Title:** data(seed): Digital infra — viewing-hour & token-k by provider
**Intent:** Anchor civilian digital time to provider infrastructure.

**Do**

- Entities: Google/YouTube, Meta/Instagram, ByteDance/TikTok, OpenAI, Anthropic.
- Ops mapped to existing activities: `SOCIAL.*.HOUR`, `MEDIA.STREAM.*.HOUR`, `AI.USAGE.*.QUERY`.
- FUs: `FU.VIEW_HOUR`, `FU.TOKEN_K` already present.
- EFs: per-hour platform values (Hintemann 2022 / IEA), per-1k-token (Luccioni 2023). Include low/high and device mix notes.

**Acceptance**

- Corporate operation rows appear in intensity for **VIEW_HOUR** and **TOKEN_K**.

***

## CDX041 — Waste & Water Services (municipal backbone)

**Title:** data(seed): Waste & water — landfill, incineration, potable water
**Intent:** Show institutional services behind household waste/use.

**Do**

- Entities: `ENTITY.TORONTO.WASTE`, `ENTITY.TORONTO.WATER`
- FUs:

```javascript
FU.KG_WASTE,kg waste,services,kg,"Waste mass processed"
FU.M3_WATER,m3 water,services,m3,"Water supplied"

```

- Activities+EFs with EPA WARM/municipal data.
- Ops per service with annual modeled throughput.

**Acceptance**

- Intensity rows for **KG_WASTE** and **M3_WATER** with sources.

***

# Overlay civilian life onto industry trunks

## CDX043 — Dependency map: civilian → industry

**Title:** calc(model): add dependency table linking civilian activities to industry ops
**Intent:** Make each civilian habit explicitly declare its upstream industrial dependencies (for UI & refs roll-up).

**Do**

- New `data/dependencies.csv`

```javascript
child_activity_id,parent_operation_id,share,notes
TRAN.SCHOOLRUN.CAR.KM,OP.SHELL.GASOLINE2024,1.0,"Fuel supply"
TRAN.TTC.SUBWAY.KM,OP.HYDROONE.KWH2024,1.0,"Traction electricity"
MEDIA.STREAM.HD.HOUR,OP.YOUTUBE.HD.HOUR2025,1.0,"Platform infra"

```

- Loader + schema model.
- Derive: when building charts, attach `upstream_chain` to each civilian row (list of parent ops with shares).

**Acceptance**

- A JSON/CSV sidecar (e.g., `artifacts/dependency_map.json`) emitted with upstream chains.

***

## CDX044 — Presets rework: industry-first navigation

**Title:** app(ui): restructure presets to industry groups → civilian presets within
**Intent:** Flip the selection flow: pick **industry** first, then see **civilian expressions** under it.

**Do**

- Replace previous preset data with:

```javascript
preset_id,industry_group,display,profile_ref
PRESET.ENERGY.CAR_COMMUTE,Energy,"Commute by gasoline car","BASE.TO.PROF.CAR.2025"
PRESET.ENERGY.SUBWAY,Energy,"Commute by subway","BASE.TO.PROF.SUBWAY.2025"
PRESET.DIGITAL.TIKTOK,Digital,"1h TikTok daily","BASE.STUDENT.TIKTOK.2025"
PRESET.FOOD.BEEF,Food,"Beef meals weekly","BASE.PROF.BEEF.2025"

```

- UI: left column lists industry groups; click reveals civilian presets; selecting loads `profile_ref`.

**Acceptance**

- Industry grouped preset picker live; old flat list removed.

***

***

***

## 

CDX045 — UI: show upstream industry badges + drill

**Title:** app(ui): add “Upstream” badges on every civilian chart item with drill to industry ops
**Intent:** Make the industry dependency *visible* and navigable.

**Do**

- On hover/legend for a civilian series, display compact chips: e.g., `Gasoline (Shell)`, `Grid (Hydro One)`, `YouTube DC (Google)`.
- Clicking a chip switches the leaderboard/FU to the parent operation’s FU context (e.g., L/Gasoline, kWh).

**Acceptance**

- Click on “Upstream: Grid (Hydro One)” takes user to Energy/KWh view with OP.HYDROONE.KWH2024 highlighted.

***

## CDX046 — References roll-up: habit → industry

**Title:** app(copy): references panel merges civilian and upstream industrial citations
**Intent:** When a civilian habit is selected, show both its own EF sources and the sources of its declared upstream ops.

**Do**

- Merge the `[n]` sets from the selected activity and its `upstream_chain`.
- Section headings: **Direct factors** / **Upstream industrial factors**.

**Acceptance**

- References panel clearly separates direct vs upstream citations.

***

## CDX047 — Prism view: two-stage Sankey (industry → civilian)

**Title:** app(viz): add 2-stage Sankey mode with industry on the left, civilian on the right
**Intent:** Visually encode that civilian habits are *expressions* of industrial budgets.

**Do**

- Build Sankey where source nodes are **industry operations** (kWh, L gasoline, parcel, tonne-km), middle edges apply mapped shares, target nodes are **civilian activities**.
- Toggle to switch between current civilian-only Sankey and 2-stage mode.

**Acceptance**

- 2-stage Sankey renders with correct totals; selecting a civilian node highlights its industry sources.

***

## CDX048 — KPI strip: Agency vs Ecological Budget

**Title:** app(ui): add KPI strip summarizing **who has agency** and **how much ecological budget is spent**
**Intent:** Quantify agency classes (sovereign, corporate, institutional, individual) for any selection.

**Do**

- For the current selection, compute contribution by agency class using: operations (corporate/institutional/sovereign) and civilian (individual).
- Render a compact strip: `Corporate 72% • Institutional 18% • Individual 10%`, with tooltips pointing to upstream ops.

**Acceptance**

- KPI updates on selection; numbers match dependency shares.

***

### Notes to keep things crisp

- **Null-first** stays sacred: if a dependency share or EF is unknown, leave it blank and surface it in tooltips (“data gap”).
- **Citations**: every new EF row must carry a source id. Don’t invent numbers; better to ship fewer, high-quality rows.
- **UI density**: this plugs into your 33/66 dense layout; badges and KPIs are compact by design.

If you want, I can also give you a **quick run-order** (which to execute first so you see payoff quickly). But this set already compiles into “industry first, civilians as overlays” without waiting on later pieces.