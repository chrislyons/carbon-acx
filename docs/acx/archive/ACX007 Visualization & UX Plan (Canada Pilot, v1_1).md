# **ACX007 Visualization & UX Plan (Canada Pilot, v1.1)**

**Purpose**

Define the **visualization strategy and user experience** for the carbon-acx platform. This governs how outputs from the calculation pipeline are transformed into interactive or static visuals for end users, and how references and uncertainties are communicated. The pilot focuses on Plotly (Dash for local dev, JSON/Plotly client-side in deployment).

***

## **1. UX Principles**

1. **Transparency**
    - Every number visible in a chart must be **traceable to a source** via IEEE reference.
    - Hover tooltips show bracketed [n]; sidebar shows full reference list.
2. **Simplicity**
    - End users see aggregated results (daily/weekly/annual), not raw CSV rows.
    - Drill-downs (per-activity, per-profile) are available but optional.
3. **Comparability**
    - Normalize results across cohorts and provinces.
    - Provide toggles for **scope boundaries** (WTT+TTW, cradle-to-grave, etc.) to avoid misleading comparisons.
4. **Null-first handling**
    - Activities with missing data are shown as **“Not Available”**, not 0.
    - Visualization must never impute values silently.

***

## **2. Visual Modules**

### **2.1 Stacked Bar (Profile Composition)**

- **Purpose:** Show relative contribution of activities (transport, food, digital) to a profile’s total annual footprint.
- **Implementation:** app/components/stacked.py.
- **Inputs:** figures/stacked.csv/json.
- **Features:**
    - Hover = [value gCO₂e, [n] source refs].
    - Toggle scope boundary.
    - Toggle cohort (24–39 vs 40–56).

### **2.2 Bubble Plot (Activity Magnitude vs Frequency)**

- **Purpose:** Show how often activities occur vs. their per-unit impact.
- **Implementation:** app/components/bubble.py.
- **Inputs:** figures/bubble.csv/json.
- **Axes:** x = frequency (per year), y = gCO₂e per unit, bubble size = annual contribution.
- **Features:**
    - Hover = [activity name, frequency, EF, refs].
    - Filter by category (transport, food, online).

### **2.3 Sankey Diagram (Flows)**

- **Purpose:** Show flows from activities → categories → total footprint.
- **Implementation:** app/components/sankey.py.
- **Inputs:** figures/sankey.csv/json.
- **Features:**
    - Flow width proportional to emissions.
    - Hover nodes show [category, total gCO₂e, refs].

### **2.4 References Panel**

- **Purpose:** List full IEEE references for all [n] tags visible in current view.
- **Implementation:** app/components/references.py.
- **Inputs:** references/*.txt.
- **Features:**
    - Scrollable panel, plain-text numbered references.
    - Syncs with hover indices.

***

## **3. Output Data Contracts**

### **3.1 Figures directory**

- Each visualization consumes a figure-specific slice:
    - stacked.csv/json
    - bubble.csv/json
    - sankey.csv/json

### **3.2 Reference files**

- For each figure: references/<figure>_refs.txt
- Strictly IEEE formatted, numbered [1]..[n].
- Hover indices match list order.

### **3.3 Export manifest**

- Generated per build: calc/outputs/manifest.json.
- Includes: build date, reference year, number of activities per profile, regions covered, list of sources included.

***

## **4. UI/Deployment Distinction**

- **Local dev (Dash):**
    - app/app.py launches Dash app.
    - Components read JSON slices and refs.
    - Used for developer testing, schema validation, figure iteration.
- **Production (Cloudflare Pages):**
    - Build generates **static JSON slices + reference files**.
    - Plotly client runs in browser; React/Tailwind wrapper loads JSON.
    - No server code; purely static hosting.
    - References always available as plain-text side panel.

***

## **5. Uncertainty Visualization**

- **Rule:** When low/high bounds exist, show as shaded bands or bubble outlines.
- **Stacked bar:** error bars at category totals.
- **Bubble:** vertical error lines from low→high gCO₂e.
- **Sankey:** thickness variation not supported; instead, toggle view to show high/low totals.
- **Export:** both value, value_low, value_high must be preserved in figure slices.

***

## **6. Interactivity Features**

- **Profile toggles:** switch between 24–39 and 40–56 cohorts.
- **Layer toggles:** professionals vs light/heavy industry vs online services.
- **Scope toggles:** WTT+TTW vs cradle-to-grave.
- **Region toggles:** start with Ontario, expand to other provinces.

All toggles are client-side only, reading pre-computed JSON slices.

***

## **7. Accessibility & Style**

- **Color palettes:** colorblind-safe, high contrast.
- **Font sizes:** base ≥ 14px; axis labels ≥ 12px.
- **Hover tooltips:** plain-text, no abbreviations.
- **References panel:** copy-pasteable plain text, IEEE citations.
- **No animations** beyond minimal hover transitions; prioritize clarity.

***

## **8. Quality Assurance**

- **tests/test_figures.py** (to be added):
    - Every figure slice must load without error.
    - Every [n] in a slice must resolve to a line in references/*.txt.
    - Every total shown in a chart must equal the sum of its parts within rounding tolerance.
- **Manual checks:**
    - Run make app locally and confirm toggles and refs behave.
    - Review color palettes and accessibility.

***

## **9. Risks and mitigations**

- **Over-cluttered views:** mitigate with category filters and progressive disclosure.
- **User misinterpretation of uncertainty:** mitigate by clearly labeling “range = published bounds” in legends.
- **Reference drift:** enforce [n] → IEEE mapping in CI.
- **Scaling issues in Sankey:** keep ≤ 50 flows visible; otherwise, collapse categories.

***

## **10. Deliverables**

- app/components/*.py: stacked, bubble, sankey, references.
- calc/figures.py: pure data slicers for each view.
- calc/citations.py: enforces IEEE ordering.
- calc/outputs/figures/*.json,csv: machine-readable figure slices.
- calc/outputs/references/*.txt: reference lists.
- docs/ACX007_VIS_PLAN.md: this document.

***

## **References**

[1] Plotly Technologies Inc., “Plotly Open Source Graphing Library for Python,” 2025. Available: https://plotly.com/python/

[2] International Organization for Standardization, “ISO 9241-171: Ergonomics of human-system interaction—Guidance on accessibility,” 2008. Available: https://www.iso.org/standard/39080.html

[3] W3C, “Web Content Accessibility Guidelines (WCAG) 2.1,” 2018. Available: https://www.w3.org/TR/WCAG21/

[4] Colour Blind Awareness, “Color Blindness in Design,” 2022. Available: https://www.colourblindawareness.org/colour-blindness/

[5] Intergovernmental Panel on Climate Change (IPCC), “Climate Change 2021: The Physical Science Basis—Working Group I Contribution to the Sixth Assessment Report,” 2021. Available: https://www.ipcc.ch/report/ar6/wg1/

***