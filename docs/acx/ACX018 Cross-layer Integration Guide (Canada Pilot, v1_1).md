# **ACX018 Cross-layer Integration Guide (Canada Pilot, v1.1)**

**Purpose**

Describe how the four analytic layers—**Professional**, **Light-Industrial**, **Heavy-Industrial**, and **Online Services**—integrate into the **carbon-acx** architecture. This guide ensures consistency across data, calculations, and visualizations, so end users can toggle layers and cohorts seamlessly without scope drift or schema misalignment. It complements ACX003 (Schema Architecture), ACX007 (Visualization), ACX009 (Communication), and ACX010 (Testing).

***

## **1. Layer Definitions**

- **Professional Layer** (ACX011):
Activities of individuals in two cohorts: **24–39** and **40–56** years. Categories include commuting, food/diet, leisure, consumer habits, online activity.
- **Light-Industrial Layer** (ACX012):
Site-level practices common in urban/near-urban operations (construction, logistics, warehousing).
- **Heavy-Industrial Layer** (ACX013):
Capital-intensive processes (steel, cement, petrochemicals). Stub in pilot; reserved for future scaling.
- **Online Services Layer** (ACX014):
Emissions associated with digital services: social media, LLM queries, OTT video, e-commerce.

***

## **2. Integration Philosophy**

1. **Separation of concerns**
    - Each layer has its own activities.csv rows, emission_factors.csv rows, and schedules.
    - Profiles belong to a specific layer; no cross-layer leakage in CSVs.
2. **Common schema**
    - All layers use identical headers and validation rules (ACX003).
    - Enforcement: schema validators in calc/schema.py.
3. **Unified export**
    - calc/derive.py produces a single export_view.json containing merged outputs, keyed by layer_id.
    - Each visualization slice (stacked.json, bubble.json, sankey.json) includes a layer field.
4. **Toggle, don’t merge**
    - UI presents **toggle switches** (layer selection).
    - Activities never merge across layers; instead, multiple layers can be shown side by side.

***

## **3. Data Representation**

### **3.1 Profiles**

- profiles.csv includes cohort_id and layer_id.
- Example rows:
    - PROF-24-39, layer=professional
    - IND-LIGHT-CONSTR, layer=light_industrial

### **3.2 Activities**

- activities.csv has category and layer_id.
- Example categories:
    - Professional: transport, food, leisure.
    - Light-industrial: construction machinery, on-site power.
    - Heavy-industrial: blast furnace, clinker kiln.
    - Online: data transfer, inference.

### **3.3 Schedules**

- activity_schedule.csv ties profile_id → activity_id.
- Each schedule row must declare layer_id explicitly.

### **3.4 Export structure**

```javascript
{
  "export_view": {
    "profiles": [...],
    "activities": [...],
    "schedules": [...],
    "figures": {
      "stacked": {..., "layer": "professional"},
      "bubble": {..., "layer": "light_industrial"},
      "sankey": {..., "layer": "online"}
    }
  }
}
```

***

## **4. Visualization Integration**

- **Stacked bar**:
    - Shows activity composition by layer.
    - Layer toggle → re-filters activities.
    - Multi-layer comparison: side-by-side stacked bars.
- **Bubble plot**:
    - Layer toggle → shows only that layer’s bubbles.
    - Mixed mode: different color palette per layer.
- **Sankey**:
    - Source node = activity, mid node = category, sink node = **layer total**.
    - Each layer has its own flow group; comparisons appear as parallel flows.
- **References panel**:
    - Must union all [n] references from the active layer(s).
    - Each entry in references/*.txt tagged by layer.

***

## **5. Testing Requirements**

- **Schema tests**
    - test_schema.py must confirm all rows declare layer_id.
- **Integration tests**
    - test_integration.py must build export_view.json with all four layers; each figure slice must include layer.
- **UI tests**
    - Visual toggles must show/hide layers correctly.
    - Multi-layer comparison must not collapse categories incorrectly.

***

## **6. Governance**

- **Layer addition protocol**
    - New layer proposals require schema doc + sources before CSVs are populated.
    - Each new layer gets its own ACX0XX document describing scope, categories, and sources.
- **Review process**
    - Data Owner reviews layer-specific data/*.csv edits.
    - Engineering Owner reviews calc/derive.py and UI toggles.

***

## **7. Risks & Mitigations**

- **Risk: category drift** → categories overlap between layers.
    - Mitigation: enforce layer_id tag in every row; categories scoped locally.
- **Risk: reference duplication** → same source cited across layers.
    - Mitigation: dedupe in sources.csv using unique source_id; layer linkage happens via method_notes.
- **Risk: misinterpretation** → user thinks totals are “national.”
    - Mitigation: always label chart with active layer.

***

## **8. Deliverables**

- Updated schema (profiles.csv, activities.csv, activity_schedule.csv) with layer_id column.
- calc/derive.py updated to output layer field in every figure slice.
- UI toggles for layer selection in app/app.py.
- docs/ACX018_LAYER_INTEGRATION.md (this document).

***

## **9. References**

[1] Greenhouse Gas Protocol, “Corporate Standard and Guidance,” 2015–2024. Available: https://ghgprotocol.org/

[2] Intergovernmental Panel on Climate Change (IPCC), “AR6 Guidelines and Metrics,” 2021–2023. Available: https://www.ipcc.ch/report/ar6/

[3] Statistics Canada, “Census of Population—Labour and Commuting,” 2021. Available: https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/011/98-500-x2021011-eng.cfm

[4] Environment and Climate Change Canada, “National Inventory Report,” 2025. Available: https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html