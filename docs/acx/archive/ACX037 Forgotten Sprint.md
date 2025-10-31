## **PR — Layer Architecture Hardening**

**Title:** arch(core): normalize layer definitions across all activities and ops

**Intent:** Make **layers** a canonical table, not an informal label. Every activity, operation, and preset must point to a layer ID. This guarantees the app can group, compare, and toggle layers without special-case code.

***

### **1.** 

### **New file: data/layers.csv**

Schema:

```javascript
layer_id,layer_name,layer_type,description
energy,Energy & Utilities,industry,"Electricity, gas, refined fuels"
materials,Materials & Heavy Industry,industry,"Cement, steel, plastics, chemicals"
food,Agriculture & Food,industry,"Livestock, crops, packaged food"
apparel,Fashion & Apparel,industry,"Garments, textiles"
logistics,Logistics & Freight,industry,"Trucking, shipping, parcels, aviation freight"
digital,Digital & Media,industry,"Streaming, social media, LLMs"
waste,Waste & Water,industry,"Municipal waste, water systems"
military,Military & Defense,industry,"Fuel ops, bases, munitions, conflicts"
security,Personal Security & Mobility,crosscut,"Private security, armored convoys, helicopters, private jets"
civilian,Civilian Habits,civilian,"Profiles and presets expressed as downstream habits"
overlooked,Overlooked Systems,crosscut,"Flights, Fridges, Fabrics, Freight, Facilities catch-all"
```

***

### **2.** 

### **Update activities and operations**

- Add layer_id column to activities.csv and operations.csv.
- Example:

```javascript
ENERGY.KWH.DELIVERED,energy
TRAN.FLIGHT.SHORTHAUL.PKM,overlooked
SEC.PRIVATEJET.PKM,security
CLOTHING.JEANS.DENIM,apparel
FOOD.MEAL.BEEF.SERVING,food
```

- 
- All existing and new activities get a layer_id assignment.

***

### **3.** 

### **Update schema model (calc/schema.py)**

- Add Layer model:

```javascript
class Layer(BaseModel):
    layer_id: str
    layer_name: str
    layer_type: Literal["industry","civilian","crosscut"]
    description: str
```

- 
- Ensure Activity and Operation include layer_id foreign key.

***

### **4.** 

### **DAL loaders (calc/dal.py)**

- New load_layers() returns dict of layer_id -> Layer.
- Validate that every Activity and Operation has a valid layer_id.

***

### **5.** 

### **Artifact build**

- Emit artifacts/layers.json with full layer dictionary.
- Each chart artifact includes a layer_id field per row.
- Optional: artifacts/layer_summary.json with per-layer rollups (totals, counts).

***

### **6.** 

### **UI changes**

- Layer switcher becomes **data-driven**:
    - Reads from layers.json.
    - Groups toggles by layer_type.
    - Adds expandable **crosscut layers** (like “Overlooked Systems”).
- When a user selects a civilian preset, the UI can automatically highlight its **upstream industry layers** (via dependency mapping from CDX043).

***

### **7.** 

### **Governance / CI**

- Add a CI check: no activity/operation may ship without a layer_id.
- Fail build if a dangling activity exists with layer_id=null.

***

### **8.** 

### **Acceptance**

- intensity_matrix.csv rows now carry consistent layer_id.
- UI renders layer list dynamically from layers.json.
- Presets, references, Sankey view all respect layer_id.
- Adding a new activity (e.g. “Yacht hour”) requires specifying a layer; else CI fails.

***

```javascript
CDX061 — Frontend surfacing pass: expose all data layers, README refresh, responsive dense layout

Title: app(surface): inventory seeded layers → wire into UI; refresh README; optimize responsive layout
Intent: Audit what’s seeded vs what’s visible, make every layer discoverable in the UI, update documentation, and refine the 33/66 dense layout for both desktop and mobile experiences.

Do

Automated repo audit (script)
- Add scripts/audit_layers.py that reads data/{activities,operations,emission_factors,layers}.csv and dist/artifacts/*.
- Emit artifacts/audit_report.json with:
  - layers_present, activities_by_layer, ops_by_layer, ef_coverage, missing_icons, missing_refs.
  - Flag items that are seeded but not rendered in UI config.

README (root)
- Add an “At-a-glance” section listing current layers and example activities per layer.
- Document how artifacts load, how layer switching works, and where to add new presets.
- Link to artifacts/audit_report.json for QA.

UI: Layer Discovery Panel
- New component site/src/components/LayerBrowser.tsx:
  - Reads layers.json + audit_report.json.
  - Renders a collapsible list of layers → activities with counts and tiny status chips:
    ✅ rendered  
    ⛔ missing data (no EF/throughput)  
    ⚠️ seeded but hidden (not yet wired)  
  - Clicking an activity focuses the relevant leaderboard/Sankey view.
- Desktop: fixed in left 33% column, always visible.
- Mobile: collapsible drawer or accordion; hidden by default to preserve vertical space.

UI: Ensure every seeded layer has a route/filter
- Add ?layer=<id> URL param sync.
- Ensure leaderboard/sankey/bubble can filter by layer_id without code edits (data-driven from layers.json).

Responsive dense layout polish (global)
- Desktop:
  - Keep current 33/66 grid; reduce vertical whitespace in the left column by 10–15%.
  - Place References panel directly under the viz (66% col), default open.
- Mobile:
  - Collapse layout to single column.
  - References panel closed by default; toggleable below viz.
  - Layer Browser collapses to top or side drawer.
- All views: standardize Plotly margins and legends via your dense theme (one import).

Acceptance
- scripts/audit_layers.py produces artifacts/audit_report.json with non-empty layer lists.
- README contains layer table + quickstart to find each in UI.
- A “Layer Browser” exists; any seeded layer is discoverable and clickable.
- Desktop: density unchanged or improved (no new scroll).
- Mobile: no horizontal scroll; key panels collapse elegantly into drawers/accordions.
```

***

## **PR — Scale & Time controls (Intensity / Absolute / Per-capita / Per-user / Per-revenue)**

**Title:** app(ui): add Scale switch + Time chips; wire to scaled artifacts

**Intent:** Let users change lenses without leaving the page; keep units crystal-clear.

**Do**

- Add a **Scale** segmented control and **Time** chips (day/month/year) in left column.
- When not in Intensity mode, read from artifacts/scaled_{period}.csv.
- Update tooltips/legends with correct units; add a mini legend explaining each scale.
- KPI strip shows 2–3 most relevant metrics for the active scale.

**Acceptance**

- Switching scale or period re-renders within 200ms; units correct everywhere.

**Commit**

```javascript
app(ui): scale & time controls with scaled artifact wiring (CDX062)
```

***

## **CDX063 — Cohorts & inequality (p10/p50/p90)**

**Title:** calc/ux(stats): cohort allocations + percentile inset

**Intent:** Avoid misleading averages; surface who drives demand.

**Do**

- Add data/cohorts.csv and data/cohort_allocation.csv (operation→cohort shares).
- Compute p10/p50/p90 per relevant metric → artifacts/scale_stats.json.
- UI toggle “Show distribution” renders a compact percentile inset on leaderboard.

**Acceptance**

- Where cohort data exists, per-capita view shows percentile spread; hides cleanly when absent.

**Commit**

```javascript
calc/ux(stats): cohorts & percentile insets for per-capita views (CDX063)
```

***

## **CDX064 — Fossil vs Renewables encoding (system mix vs my slice)**

**Title:** arch(data+ui): add energy_source to EFs; mirrored bars + wallet view

**Intent:** Make fossil/renewable composition legible across all layers.

**Do**

- Add energy_source to emission_factors.csv (coal|oil|gas|hydro|solar|wind|nuclear|mixed) and propagate through artifacts.
- Plotly: mirrored/stacked encoding (green vs gray/black) on bars/bubbles; legend explains mix.
- Add a compact **“Wallet” strip** above charts: Fossil % • Renewables % with click to filter.
- Toggle: **System mix** (grid/sector averages) vs **My slice** (selection-weighted).

**Acceptance**

- Every energy-linked series displays a fossil/renewable split; wallet strip filters work.

**Commit**

```javascript
arch(data+ui): fossil vs renewables split with system/my-slice toggle (CDX064)
```

***

## **CDX065 — D3 hero component: Two-stage Sankey (industry → civilian)**

**Title:** app(viz): D3 two-stage Sankey using dependency map

**Intent:** Visually encode industry feeding civilian habits with upstream badges and gradients.

**Do**

- New site/src/components/TwoStageSankey.tsx (D3 + d3-sankey).
- Inputs: dependency_map.json, layers.json, fossil/renewable mix per link.
- Features:
    - Left nodes = industry operations; right nodes = civilian activities.
    - Edge gradients by fossil/renewables proportion.
    - Click a node/edge → highlights corresponding Plotly series (shared store).

**Acceptance**

- Cross-highlighting works both ways; readable with 50–200 links.

**Commit**

```javascript
app(viz): D3 two-stage Sankey linked to Plotly charts (CDX065)
```

***

## **CDX066 — D3 budget bars: Energy wallets (progressive disclosure)**

**Title:** app(viz): add budget bars for fossil vs renewables with drilldown

**Intent:** Give a single, irresistible visual for the energy split.

**Do**

- New BudgetBars.tsx using D3:
    - Two wallets: Fossil vs Renewables.
    - Click expands to fossil: oil/coal/gas; renewables: hydro/solar/wind.
    - Toggle **System mix** / **My slice**; animate transitions.
- Wire to same shared store as other charts.

**Acceptance**

- Updates in <150ms; labels never collide at desktop widths.

**Commit**

```javascript
app(viz): D3 budget bars with drilldown and system/my-slice toggle (CDX066)
```

***

## **CDX067 — Iconography architecture (system icons; no emojis)**

**Title:** app(icons): introduce system icon pipeline + mapping (no emojis)

**Intent:** Make navigation legible via consistent, neutral icons.

**Do**

- Create /app/icons/system/ (Lucide-style SVGs). Normalize stroke to 2–2.25px.
- Add data/icons.csv mapping:

```javascript
icon_id,layer_id,activity_id,svg_path
layer.energy,energy,,app/icons/system/energy.svg
activity.gasoline,energy,ENERGY.GASOLINE.LITRE,app/icons/system/gasoline.svg
```

- 
- React <Icon id|entityId|layerId /> wrapper with fallbacks: activity → layer → generic.

**Acceptance**

- Every visible layer/activity shows an icon; no emoji usage.

**Commit**

```javascript
app(icons): system icon set + data-driven mapping & React wrapper (CDX067)
```

***

## **CDX068 — Brand logos (governed) + README badge key**

**Title:** arch(icons): brand logo ingestion with provenance + UI gating

**Intent:** Show corporate logos **only** on verified, entity-owned claims.

**Do**

- Add data/logos.csv (entity_id → simpleicons id or brand svg).
- Extend EF/ops with provenance_entity_id, provenance_source_id; derive logo_ok and logo_reason during build.
- CI job ci/logo-guard: fail if a rendered logo lacks provenance.
- UI shows brand only when logo_ok=true, else layer icon.
- README: small legend explaining logo verification.

**Acceptance**

- Verified series show logos with tooltip “Verified entity: …”; aggregates never show logos.

**Commit**

```javascript
arch(icons): governed brand logos with provenance and CI guard (CDX068)
```

***

## **CDX069 — README + Storybook of components (developer stickiness)**

**Title:** docs(ui): add Storybook with live examples of charts/icons & update README with screenshots

**Intent:** Make the system self-documenting and enticing for contributors.

**Do**

- Add Storybook with stories for: Leaderboard (all scales), Two-stage Sankey, Budget Bars, Layer Browser, Icon variants.
- README: add fresh screenshots/GIFs; contributor quick-start; link to Storybook.

**Acceptance**

- npm run storybook works locally; README reflects post-CDX061 UI.

**Commit**

```javascript
docs(ui): Storybook for charts & icons; README screenshots and contributor guide (CDX069)
```

***

## **CDX070 — Dense layout guardrails & perf**

**Title:** app(perf+layout): enforce dense theme + render budget; audit slow paths

**Intent:** Keep pages dense and snappy as features grow.

**Do**

- Add a “render budget” doc (max traces per chart, max nodes for Sankey, debounce 200–300 ms).
- Use Plotly.react with uirevision; memoize parsed artifacts.
- Virtualize long lists (react-window) in Layer Browser/presets.
- Lighthouse/Performance CI step; fail if Time-to-Interactive regresses >10%.

**Acceptance**

- Scrolling stays 60fps on desktop; Lighthouse perf score stable or improved.

**Commit**

```javascript
app(perf+layout): dense theme guardrails, virtualization, perf CI (CDX070)
```

***

### **Notes**

- This set assumes **CDX060 (layers architecture)** is in place so layers.json is authoritative.
- If you want fewer parallel tracks, run in order: **CDX061 → 064 → 065 → 066**, then 062/063/067/068/069/070.

Want me to generate a quick **run order checklist** you can paste into your tracker so nothing gets stuck in review limbo?