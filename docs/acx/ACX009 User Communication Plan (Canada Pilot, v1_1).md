# **ACX009 User Communication Plan (Canada Pilot, v1.1)**

**Purpose**

Define how carbon-acx presents information to end users—what we say, how we say it, and what we must never imply. This plan covers narrative framing, numerical presentation (units, rounding, uncertainty), scope disclosures, references (IEEE), accessibility, and content governance. It aligns the UI (ACX007), data/validators (ACX001–ACX003), temporal rules (ACX004), scaling (ACX005), and source policy (ACX006). External definitions (e.g., CO₂e, scope terminology, accessibility standards) are referenced to authoritative sources [1]–[3].

***

## **1. Audience and Objectives**

- **Primary audience:** Canada-based professionals (24–39; 40–56) and general public seeking interpretable, province-aware carbon footprints.
- **Secondary audience:** Municipal staff, policy analysts, and media who require transparent provenance and consistent terminology.
- **Objectives:**
    1. **Explain** the footprint drivers clearly without oversimplifying.
    2. **Quantify** results with explicit scope/time bases and uncertainty.
    3. **Enable** comparison across cohorts and provinces while avoiding misleading apples-to-oranges contrasts (scope/temporal drift).
    4. **Cite** all externally sourced claims in strict IEEE format; the product’s own ACX docs are not sources.

***

## **2. Canonical Terminology (user-facing)**

- **CO₂e**: Carbon dioxide equivalent. All gases normalized to CO₂ using IPCC **GWP100** time horizon unless stated otherwise [2].
- **Scope boundary**: For each activity, disclose the accounting boundary: **WTT+TTW** (well-to-tank + tank-to-wheel) for fuels, **cradle-to-grave** for LCAs when used, **Electricity LCA** when life-cycle electricity factors are employed, or **gate-to-gate** for process EFs [1].
- **Reference year**: The pilot anchors calculations to **2025** unless otherwise stated (ACX004).
- **Uncertainty**: When available, present **low–mean–high** ranges; ranges reflect published bounds, not statistical confidence unless the source supplies such framing.
- **Operational vs life-cycle electricity**: Default displays use **operational grid intensity**; life-cycle can be shown as an **explicit alternative view** to avoid mixing semantics [1], [2].

***

## **3. Narrative Structure**

Every page or panel must present information in this fixed order:

1. **Context sentence** (1–2 lines): audience, geography (province), reference year, scope baseline, and whether results are **modeled** or **metered**.
2. **What you’re seeing** (1–2 lines): chart purpose (composition, magnitude vs frequency, flows).
3. **How we computed it** (2–4 lines): schedule basis (daily vs weekly), grid strategy, and whether EF is fixed or grid-indexed.
4. **Uncertainty** (1–2 lines): whether low/high bars are shown and what they represent.
5. **References**: “Numbers are sourced from the references in the right panel; each hover shows [n] corresponding to the list.”

**Example (stacked bar):**

“Annual CO₂e for the selected cohort in **Ontario (CA-ON), 2025**, computed with **operational grid intensity** and **GWP100**. Results use **modeled schedules** with office-day weighting (3 office days/week) and grid-indexed electricity where applicable. Error bars show **published low–high** bounds. See references [1]–[5].”

***

## **4. Numerical Presentation**

### **4.1 Units**

- Default chart unit: **kg CO₂e** for individual activities; **t CO₂e** for totals.
- Display significant digits fit for purpose (no false precision):
    - Per-activity annuals: 2–3 significant digits.
    - Totals: 3 significant digits up to 1000 kg, then in **t CO₂e** with 2 decimals.
- Always annotate the **time basis**: “per year” or “per day” (if explicitly selected).

### **4.2 Ranges and rounding**

- If bounds exist, render **low–mean–high**; round **after** aggregation:
    - Mean: standard rounding to displayed unit.
    - Bounds: independently rounded; never force symmetry.
- If no bounds: omit whiskers/bands; do **not** insert pseudo-ranges.

### **4.3 Missing data**

- Null-first: show **“Not available”** (NA) or dimmed segment; never show **0** unless truly zero.
- Tooltips must explain NA: “Factor not published for this region/scope/year.”

***

## **5. Scope & Time Disclosures (always visible)**

A compact disclosure block appears above every chart:

- **Reference year**: e.g., 2025.
- **Scope boundary**: e.g., WTT+TTW (fuels), operational grid intensity (electricity).
- **Method**: Modeled (schedules × emission factors) or Metered (telemetry).
- **Region**: Effective region used for grid-indexed activities; fallback chain (override → mix → profile default → CA).
- **Uncertainty**: Present/absent; what the band represents.
- **Citations**: IEEE numbering with “[n] in hover corresponds to References list.”

These disclosures standardize interpretation and reduce misreadings about system boundaries [1], [2].

***

## **6. Comparison Rules (preventing apples-to-oranges)**

When users compare cohorts or provinces, enforce:

1. **Like-for-like scopes**: Prevent mixing operational grid with electricity LCA in the same comparison panel; if a user toggles the scope, re-compute and re-label all series.
2. **Vintages alignment**: Prefer a **uniform vintage year** across regions; when unavoidable, a sidebar badge lists the **vintage matrix** (region → year).
3. **Same time basis**: Only compare **annual** to **annual**, **daily** to **daily**.
4. **Explicit grid precedence**: If a row uses a region_override, mark it with a small glyph and explain in the tooltip.

***

## **7. Accessibility and Language**

- **Language level**: Plain, non-technical where possible; avoid jargon unless it’s the canonical term (CO₂e, GWP100).
- **Accessibility**: Follow **WCAG 2.1** for contrast, keyboard navigation, and non-color cues [3].
- **Color**: Use colorblind-safe palettes; do not encode critical meaning by color alone [3].
- **Tooltip text**: No abbreviations without expansion on first use; avoid tiny font sizes (<12–14 px).
- **Motion/animation**: Minimal; disable non-essential animation for prefers-reduced-motion.

***

## **8. References Panel and IEEE Mapping**

- **Hover** shows bracketed indices [n]; these **must** match the right-pane **IEEE list order** exactly.
- The references list is plain-text only; no embedded links in body text.
- Internal documentation (ACX###) is **never** cited; every numeric claim must map to an external item in sources.csv (ACX006).
- For composite figures, the references pane contains a **union** of all sources that produced numbers currently on screen.

***

## **9. Disclaimers and Non-claims**

- We **do not** provide personal advice or policy prescriptions.
- Figures are **estimates** based on published factors and schedules; they are **not** compliance calculations or verified inventories.
- Where ranges are large, the UI must say: “Range reflects source variability and/or regional uncertainty; see [n] for methodology.”
- Electricity **operational intensity** is **not** the same as **life-cycle** intensity; we present each on its own terms and label explicitly [1], [2].

***

## **10. Content Governance**

- **Single source of truth**: /data/*.csv and /calc/outputs/*.
- **Change control**: edits to /data/ require CODEOWNER review and a passing CI build.
- **Copy guidelines**: changes to prominent wording (scope/time disclosures) require review from the product owner.
- **Reference hygiene**: any new numeric series must include source_id pointing to sources.csv with full IEEE entry (ACX006).

***

## **11. Worked Copy Blocks (ready to drop in UI)**

**(A) Global disclosure (stacked/bubble/sankey header)**

“Results for **{PROFILE_NAME}**, **{REGION}**, **{YEAR}**. Scope: **{SCOPE_BOUNDARY}**; electricity uses **{GRID_SCOPE: operational|LCA}**. Method: **{MODELED|METERED}**; office-day weighting: **{OD}/week** where applicable. Ranges show **published low–high** if available. Hover indices [n] map to the **References** list.”

**(B) NA explainer**

“**Not available**: Required factor or grid intensity was not published for this region/scope/year. See References.”

**(C) Comparison footnote**

“Comparisons are **like-for-like**: same reference year, time basis, scope boundary, and grid treatment. If you change scope (e.g., Operational → LCA), all series are recomputed under the selected scope.”

***

## **12. QA Checklist (pre-release)**

- Every chart includes the global disclosure block.
- Hover [n] indices align with the visible References list.
- No “0” placeholders for missing data; NA behavior correct.
- Scope and year toggles re-label disclosures accordingly.
- Ranges (if present) equal propagated low/high, not post-rounded artifacts.
- Accessibility audit passes WCAG 2.1 essentials (contrast, keyboard, color independence) [3].
- No ACX### document is cited as a source; all numeric claims trace to sources.csv.

***

## **13. Handoff to ACX007 and Implementation Notes**

- ACX007 prescribes the visual modules; ACX009 governs **how** they communicate.
- The **disclosure block** and **NA explainer** should be implemented as reusable components (React or Dash fragment), fed by manifest.json and figure metadata.
- The **vintage matrix** for multi-region comparisons is produced by derive.py and printed in the sidebar on demand.

***

## **References**

[1] Greenhouse Gas Protocol, “Corporate Standard and Guidance,” 2015–2024. Available: https://ghgprotocol.org/

[2] Intergovernmental Panel on Climate Change (IPCC), “AR6—Glossary and Metrics (GWP100),” 2021–2023. Available: https://www.ipcc.ch/report/ar6/wg1/

[3] World Wide Web Consortium (W3C), “Web Content Accessibility Guidelines (WCAG) 2.1,” 2018. Available: https://www.w3.org/TR/WCAG21/