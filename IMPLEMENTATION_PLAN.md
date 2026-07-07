# Carbon ACX v2 — Implementation Plan

## Vision
A highly accessible, detailed carbon calculator that helps people understand global emissions trends and the politics behind climate change. Science-led, citation-first (IEEE), manifest-first architecture.

## Current State Assessment
- ✅ Manifest-first data pipeline (Python + Next.js)
- ✅ IEEE citations in `data/sources.csv` (64 sources)
- ✅ 107 activities across 11 layers (military, industrial, digital, biosphere, etc.)
- ✅ 98 emission factors with vintage years, uncertainty bounds
- ✅ Grid intensity for Canadian provinces + global
- ✅ 3D DataUniverse visualization (Three.js/R3F)
- ✅ Basic calculator with 28 activities in 5 categories
- ✅ Cloudflare Pages deployment pipeline
- ❌ **Accessibility**: Dark-only theme, no WCAG audit
- ❌ **Citations in UI**: Sources exist but not displayed in calculator results
- ❌ **Politics/Policy context**: No carbon pricing, policy scenarios, equity analysis
- ❌ **Trends/Time series**: No temporal analysis
- ❌ **Calculator depth**: Fixed 28 activities, no custom entry

---

## Phase 1: Accessibility & Citations Foundation (Week 1)

### 1.1 Light/Dark Mode Toggle
- Add `ThemeProvider` with `localStorage` persistence
- CSS custom properties for both themes
- WCAG 2.1 AA contrast ratios (≥4.5:1 normal, ≥3:1 large)
- System preference detection (`prefers-color-scheme`)

### 1.2 Semantic HTML & ARIA
- Proper heading hierarchy (h1→h2→h3)
- `<label>` for all inputs, `aria-describedby` for hints
- `role="region"` with `aria-label` for calculator sections
- Focus indicators: `outline: 3px solid var(--focus-ring)`

### 1.3 IEEE Citation Display in Calculator
- Show source citations inline with each activity result
- "Sources" drawer in Results view with full IEEE references
- Tooltip on emission factor showing vintage, region, source

### 1.4 Keyboard Navigation
- Full calculator operable via keyboard
- Skip links, focus trapping in modals/drawers

---

## Phase 2: Calculator Depth & Policy Context (Week 2)

### 2.1 Custom Activity Entry
- "Add custom activity" modal with:
  - Activity name, category, unit
  - Emission factor (g/unit) + source citation input
  - Validation against units registry

### 2.2 Carbon Pricing Comparator
- Global carbon prices (EU ETS, CA federal, BC, WA, RGGI, etc.)
- "What would this cost at $X/tonne?" overlay on results
- Historical carbon price trends chart

### 2.3 Policy Scenario Modeling
- "Policy scenarios" dropdown:
  - Current policy trajectory
  - Net-zero 2050 (IEA NZE)
  - Carbon price ramp ($50→$250/t by 2035)
  - Grid decarbonization pathways
- Recalculates grid-indexed factors per scenario

### 2.4 Equity & Global Context
- Per-capita comparison: Canada, USA, EU, China, India, Global avg, LDCs
- "Fair share" calculator: remaining carbon budget ÷ population
- Consumption vs. production accounting toggle

---

## Phase 3: Trends & Exploration (Week 3)

### 3.1 Temporal Analysis
- Grid intensity trends charts (per region, 2015–present)
- Activity emission factor vintage timeline
- "How has this changed?" inline in calculator

### 3.2 Enhanced Explore Page
- Sankey: Activity → Layer → Sector → Total
- Time-series: National/provincial trends
- Embedded DataUniverse with manifest linking

### 3.3 Sectoral Deep-Dives
- "Industrial deep-dive": Steel, cement, chemicals with process breakdowns
- "Digital deep-dive": Streaming, AI, cloud, networks
- "Military deep-dive": Operations, supply chain, conflicts

---

## Phase 4: Polish & Deploy (Week 4)

### 4.1 Performance & Testing
- Lighthouse CI: Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥90
- Playwright e2e: Calculator flow, citation display, theme toggle
- Vitest: Calculator logic, citation formatting, scenario math

### 4.2 Documentation
- Update README with new features
- Methodology page: cite every assumption
- CONTRIBUTING: IEEE citation checklist

### 4.3 Deploy
- `make package` → verify build
- Push to `feature/3d-universe` → Cloudflare Pages auto-deploy
- Smoke test production URL

---

## File Targets

### New Files
```
apps/carbon-acx-web/src/components/providers/ThemeProvider.tsx
apps/carbon-acx-web/src/components/calculator/CitationDrawer.tsx
apps/carbon-acx-web/src/components/calculator/CustomActivityModal.tsx
apps/carbon-acx-web/src/components/calculator/CarbonPricingChart.tsx
apps/carbon-acx-web/src/components/calculator/PolicyScenarioSelector.tsx
apps/carbon-acx-web/src/components/calculator/EquityComparison.tsx
apps/carbon-acx-web/src/components/charts/TrendChart.tsx
apps/carbon-acx-web/src/components/charts/SankeyDiagram.tsx
apps/carbon-acx-web/src/lib/carbonPricing.ts
apps/carbon-acx-web/src/lib/policyScenarios.ts
apps/carbon-acx-web/src/lib/equity.ts
apps/carbon-acx-web/src/lib/ieeeCitations.ts
apps/carbon-acx-web/src/app/explore/trends/page.tsx
apps/carbon-acx-web/src/app/explore/sectors/page.tsx
```

### Modified Files
```
apps/carbon-acx-web/src/app/globals.css          # Light/dark themes, focus styles
apps/carbon-acx-web/src/app/layout.tsx           # ThemeProvider wrapper
apps/carbon-acx-web/src/app/calculator/page.tsx  # Enhanced calculator
apps/carbon-acx-web/src/lib/calculator.ts        # Custom activities, scenarios
apps/carbon-acx-web/src/generated/calculator-data.json  # Regenerated with more data
scripts/generate_web_calculator_data.py          # Add carbon pricing, equity data
data/carbon_pricing.csv                          # NEW: Global carbon prices
data/equity_benchmarks.csv                       # NEW: Per-capita by country/group
```

---

## IEEE Citation Format (Enforced)
```
[N] Author(s), "Title," Publication, Location, Year. Available: URL
```
Example from sources.csv:
```
[15] Environment and Climate Change Canada, "National Inventory Report 1990–2023: Greenhouse Gas Sources and Sinks in Canada," Ottawa, ON, Canada, 2025. Available: https://publications.gc.ca/collections/collection_2025/eccc/En81-4-2025-1-eng.pdf
```

---

## Acceptance Criteria
- [ ] Calculator accessible via keyboard only
- [ ] Light/dark mode toggles, persists, respects system pref
- [ ] Every emission factor in results shows vintage + IEEE citation
- [ ] Custom activities can be added, saved, shared via URL
- [ ] Carbon pricing overlay shows cost at current EU/CA/US prices
- [ ] Policy scenarios recalculate grid-indexed factors
- [ ] Equity comparison shows per-capita for 6+ country groups
- [ ] Trend charts render for grid intensity + top 10 activities
- [ ] Lighthouse Accessibility ≥95 on all pages
- [ ] Build passes, deploys to Cloudflare Pages