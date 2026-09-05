---
related:
  - ACX111
  - ACX112
  - ACX113
  - ACX114
  - ACX115
---

# ACX116 Frontend Architecture, Narrative Flow, and Viewport Topology

**Status:** Approved  
**Date:** 2026-09-04  
**Author:** Assistant  
**Repository:** `carbon-acx`  
**Scope:** `apps/carbon-acx-web/` (Next.js 15, React 19, Tailwind CSS v4, D3, Three.js)  
**Tags:** #frontend #architecture #ux #narrative #viewport #information-density #accessibility

---

## 1. Executive Summary

The Carbon ACX frontend (`apps/carbon-acx-web/`) is an **evidence-first, data-dense civic literacy interface**. Unlike standard consumer carbon calculators that function as consumer guilt engines or marketing funnels, Carbon ACX is architected as an **auditable scientific workstation**:
1. **Provenance-Attached Arithmetic:** No calculation is disconnected from its underlying factor, functional unit, geographic boundary, vintage, or source citations.
2. **Explicit Uncertainty & Incompleteness:** Unverified or unquantified activities remain explicitly `Not available`—they are never quietly converted to a numeric zero. Incompatible functional units are strictly kept in separate series.
3. **Information Density & Utility First:** Design language inspired by Bloomberg Terminals, Grafana, and IBM Carbon Design System. Eliminates oversized decorative hero images, fluff copy, and marketing banners in favor of tight information rhythm and high route-to-action proximity.
4. **Adaptive Viewport Architecture:** Implements a disciplined two-tier layout system (Workspace Views vs. Reading Views) with 3-tier intrinsic breakpoint adaptations (`48rem`, `60rem`, `72rem`) and horizontal overflow guarantees across desktop, tablet, and mobile viewports.

---

## 2. Frontend Architectural Foundations

### 2.1. Technology Stack & Execution Boundary
- **Framework:** Next.js 15.0.3 using React 19.0.0 and App Router.
- **Output Target:** Static Export (`output: 'export'`), producing deterministic static HTML, JavaScript, and CSS in `apps/carbon-acx-web/dist`.
- **CSS Architecture:** Tailwind CSS v4 (`@tailwindcss/postcss` 4.1) using CSS-first tokens (`@theme`) combined with modular unlayered CSS rules in `globals.css`. Crucially, `@tailwind preflight` is omitted so the application's semantic design system directly governs all element defaults without unexpected sitewide resets.
- **Visualizations:**
  - Scaled SVG & D3 (`d3-scale`, `d3-sankey`): Responsive mathematical charts (`ImpactTrace`, `ImpactComposition`, `ImpactFlow`, `AtlasCoverageMap`).
  - WebGL / Three.js (`@react-three/fiber`, `@react-three/drei`): Optional 3D spatial exploration (`/explore/3d`), strictly deferred with a zero-loss 2D accessible fallback.
- **Data Hydration:** Zero live REST/GraphQL backend calls. The client imports static, byte-verified JSON authorities (`calculator-data.json`, `catalog-data.json`, `sources.json`, `release-data.json`) generated atomically at build time.

### 2.2. State Management & Data Pipeline
- **URL & Storage Persistence:** The active calculator worksheet state is encoded into URL parameters (`?data=<base64-url-payload>`) for shareable, reproducible scenarios, backed by `localStorage` (`carbon-acx-calculator-inputs`) with strict validation filtering for published, finite values.
- **Keyboard Navigation Engine (`useGraphKeyboard`):** Graph-agnostic directional commands (`ArrowLeft`/`ArrowRight` step quantities, `ArrowUp`/`ArrowDown` cycle modes), engineered to pass through native inputs and textareas safely.
- **Accessibility & Focus Restoration:** Every dynamic modal/drawer transition (e.g., closing the factor evidence drawer or switching from Atlas detail back to browse) tracks an origin ref (`evidenceRestoreId`, `restoreId`) to return focus seamlessly.

---

## 3. Narrative Flow Across Routes

Carbon ACX guides the user through an intentional, compounding narrative: **from single-mode intuition, to composable personal annual footprint, to civic system coverage, to methodological foundations, to raw cryptographic evidence.**

```mermaid
journey
    title Carbon ACX User Knowledge & Verification Journey
    section 1. Intuition (Home: /)
      Compare commute modes: 5: Active
      Drag distance & observe factor scaling: 5: Active
      Inspect attached factor & citations: 5: Active
    section 2. Action (Calculator: /calculator)
      Browse categories & add activities: 5: Active
      Edit annual quantities in worksheet: 5: Active
      Observe ranked impacts & uncertainty bars: 4: Active
      Compare against territorial benchmarks: 5: Active
    section 3. Systems Literacy (Explore: /explore)
      Switch between Household, Shared, & Industrial: 4: Active
      Encounter explicit 'Not available' records: 5: Active
      Inspect systemic boundaries without invalid sums: 5: Active
    section 4. Pedagogy & Rules (Learn & Methodology: /learn, /methodology)
      Review 3 worked case studies across scales: 4: Active
      Read 6 legibility rules (Quantity to Missing Data): 5: Active
    section 5. Trust & Verification (Evidence: /evidence, /evidence/[id])
      Verify bibliography & retrieval ledger: 5: Active
      Inspect figure manifests & run Web Crypto SHA-256 check: 5: Active
```

### Route-by-Route Narrative Breakdown:

1. **Start Here (`/` - Home):**
   - **Cognitive Purpose:** Dispel the "carbon calculator as an opaque black box" trope.
   - **Interaction:** An interactive commute trace (`ImpactTrace`) plotting Car, Bus, and Subway against annual distance. Moving the point visually scales the emissions line according to the formula:
     $$\text{Annual Quantity} \times \text{Factor} = \text{Annual Emissions (kg CO}_2\text{e/yr)}$$
   - **Attached Evidence Rail:** Immediately anchors the factor ($140\text{ g CO}_2\text{e/km}$ for Car), region, vintage, scope boundary, and exact IEEE source references beside the visual.
   - **Call-to-Action:** Direct pathways to read the method, open the estimate in the worksheet, or explore the catalog.

2. **Estimate (`/calculator` - Worksheet):**
   - **Cognitive Purpose:** Allow users to build a personal or household annual inventory with full uncertainty transparency.
   - **Interaction:** Two-pane or toggled Browse/Worksheet layout. Users pick activities across 5 everyday categories (Transport, Food & Drink, Digital, Home & Utilities, Goods).
   - **Composition & Uncertainty:** Activities are ranked by contribution with visual uncertainty whisker bars ($[\text{low}, \text{high}]$) and explicit disclosure when uncertainty is unquantified.
   - **Macro Benchmark Context:** Tally is placed directly in context with Canadian provincial territorial benchmarks ($15.2\text{ t CO}_2\text{e/capita}$ Canadian average, Ontario average, etc.) with explicit footnotes that consumption and equity metrics are not conflated.
   - **AI Inference Scenarios:** Integrated `ScenarioPane` resolving provider-specific LLM inference footprints with strict disclosure of undisclosed parameters.

3. **Explore (`/explore` - Activity Atlas):**
   - **Cognitive Purpose:** Scale the user's perception from individual consumer footprints to civic infrastructure and industrial metabolism.
   - **Interaction:** Atlas divides records into 3 discrete modes:
     - *Household activities:* Directly relatable personal activities.
     - *Services & infrastructure:* Shared municipal grids, transit systems, water treatment.
     - *Industry & earth systems:* Heavy manufacturing, defense, military logistics, wildfire events, cryosphere feedback loops.
   - **Anti-Pattern Prevention:** *Never sums across incompatible functional units.* Displays an interactive coverage matrix (`AtlasCoverageMap`) where incomplete records display a cross-hatched `Not available` icon instead of vanishing or defaulting to zero.

4. **Learn (`/learn` - Case Studies):**
   - **Cognitive Purpose:** Educational bridge teaching the formula across 3 distinct societal scales:
     - Household: School run by car ($1,000\text{ km}$).
     - Small organization: Office heating & cooling ($100\text{ m}^2\cdot\text{yr}$).
     - Canadian system: Ontario electrical grid intensity ($100\text{ kWh}$).

5. **Methodology (`/methodology` - How We Know):**
   - **Cognitive Purpose:** Full epistemic disclosure. Sets down the 6 canonical rules keeping estimates legible:
     1. Quantity $\times$ factor
     2. Annual period
     3. Scope boundary
     4. Region + vintage
     5. Uncertainty bounds
     6. Missing evidence policy (exclusion, never zero)

6. **Evidence & Verifier (`/evidence`, `/evidence/[id]`):**
   - **Cognitive Purpose:** The final trust layer.
   - **Content:** Registered source catalog, retrieval ledger matching timestamps and MIME types, OWID national context cards, and versioned figure manifests.
   - **Client-Side Crypto Verification:** On `/evidence/[id]`, the browser fetches the raw static figure artifact over HTTP, passes the byte stream through Web Crypto (`crypto.subtle.digest('SHA-256')`), and reports whether the live byte hash matches the cryptographic manifest.

---

## 4. Viewport Topology & Real Estate Utilization

The UI layout is governed by the superseding decisions in **ACX114**, organizing screens into two core structural classes:
1. **Interactive Workspaces (`.workspace`):** `/`, `/calculator`, `/explore`
2. **Editorial Reading Views (`.reading-page`):** `/learn`, `/methodology`, `/evidence`, `/evidence/[id]`

```
+---------------------------------------------------------------------------------------+
| Site Header: [Brand: Carbon ACX]   [Nav: 1 Home | 2 Calc | 3 Explore | 4 Learn ...]  [Theme] |
+---------------------------------------------------------------------------------------+
| Tab Header:  [Route Icon + Title]   [Live Meta: 21 published | 14,200 kg/yr]   [Actions]   |
+---------------------------------------------------------------------------------------+
| WORKSPACE VIEWPORT LAYOUT (>= 60rem / 960px)                                           |
|                                                                                       |
| +----------------------------------+ +----------------------------------------------+ |
| | Panel 1: Navigation / Shelf      | | Panel 2: Worksheet / Graph / Detail           | |
| | (overflow-y: auto; contained)    | | (overflow-y: auto; contained)                 | |
| | - Category Rail                  | | - Selected activities list                    | |
| | - Activity Tiles                 | | - Sticky Total & Benchmark Context            | |
| | - Add / Remove Controls          | | - Ranked Impact Bars with Uncertainty         | |
| +----------------------------------+ +----------------------------------------------+ |
+---------------------------------------------------------------------------------------+
```

### 4.1. Responsive Breakpoint Matrix

| Viewport Width | Breakpoint Token | Layout Mechanism | Real Estate Strategy |
|---|---|---|---|
| **Mobile** (`< 48rem` / `< 768px`) | Base | Normal flow, 1-column stack, view toggle (`browse` vs `worksheet`/`detail`) | Primary nav becomes a horizontally scrollable rail with visible icons and labels. Multi-column panels toggle into focused single-view tabs to prevent vertical jamming. |
| **Tablet Portrait** (`48rem`–`59.999rem`) | `@media (min-width: 48rem)` | 2-column intrinsic grids (`0.9fr / 1.1fr`) | Unlocks side-by-side scanning. Trace estimate pairs chart with evidence rail; learning cards adopt a 2-up grid. |
| **Desktop Workspace** (`>= 60rem` / `>= 960px`) | `@media (min-width: 60rem)` | Full viewport locking (`height: calc(100vh - var(--header-h))`) | Workspaces lock the outer viewport; panels become independent inner-scrolling regions (`.panel__scroll`). Eliminates global page scrollbar for complex tasks. |
| **Wide Desktop** (`>= 72rem` / `>= 1152px`) | `@media (min-width: 72rem)` | 3-column Atlas grid (`14-17rem` rail, `1fr` matrix, `18-23rem` detail) | Full triage view: category/filter rail on left, complete activity matrix in center, detailed factor & provenance inspector on right. |
| **Ultrawide** (`>= 120rem`) | `--content-max: 120rem` | Centered shell wrapper with margin auto | Prevents line lengths from exceeding readable limits while maintaining visual balance on 4K/wide monitors. |

### 4.2. Viewport Optimization Techniques
1. **Zero Document Overflow:** All route layouts are tested with automated Playwright harnesses across 9 standard viewports (from $320\times800$ to $1920\times1080$), enforcing zero horizontal scroll (`hScroll = false`).
2. **Contained Scroll Regions:** Desktop workspace panels use `overscroll-behavior: contain` and `scrollbar-gutter: stable`, preventing scroll chaining into parent containers.
3. **Adaptive Graph Bounds:** The SVG canvas in `ImpactTrace` measures its container via `ResizeObserver` with a debounced 2px hysteresis threshold, dynamically recalculating D3 linear scales between 360px and 720px plot heights.
4. **Natural Reading Flow for Prose:** Unlike earlier iterations that experimented with bounded prose boxes, reading pages (`/methodology`, `/evidence`) strictly use natural document scroll, ensuring keyboard accessibility and standard browser search (`Ctrl+F`) work without restriction.

---

## 5. Architectural Evaluation & Observations

### Strengths
- **Exemplary Information Scent:** Users never encounter a calculation without an immediate, clickable path to its underlying source citations, scope boundary, and methodology.
- **Resilient Fallback Design:** Rich visual features degrade gracefully:
  - Drag plot $\rightarrow$ Form input field.
  - Sankey flow $\rightarrow$ Clean tabular breakdown.
  - 3D WebGL $\rightarrow$ Full 2D accessible table.
  - Dark mode $\rightarrow$ Explicit theme token precedence respecting `forced-colors: active` and high contrast.
- **Sub-Second Perceived Performance:** Zero dynamic client data queries. First-load JS is tightly budgeted (~102 kB shared vendor bundle, ~160 kB route bundle), with heavy visualization libraries (`d3-sankey`, `three`) deferred to on-demand dynamic imports.

### Minor Opportunities for Future Iterations
1. **Dynamic Workspace Height on Short Displays:** On very short landscape viewports (e.g. $1280\times600$), the locked viewport height (`calc(100vh - 4.5rem)`) leaves narrow vertical space for the inner scroll panels. Relaxing the height lock below 650px vertical height could provide a smoother experience.
2. **Preset Profiles in Calculator:** While users can share and load custom worksheets via URL, introducing 2–3 pre-populated benchmark personas (e.g. "Toronto Transit Commuter", "Rural Driver") would shorten time-to-value for casual users.
