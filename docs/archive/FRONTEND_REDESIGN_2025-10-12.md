# Frontend Redesign - Carbon ACX Web
## Revolutionary Interface for Carbon Data Exploration

**Date:** 2025-10-12
**Scope:** Complete UI/UX transformation of `apps/carbon-acx-web/`
**Vision:** Step inside the world of carbon data - make incomprehensible amounts of data beautiful, tangible, and relatable

---

## Current State Audit

### Architecture ✅
**Status:** Solid foundation

```
Routes:
  / → HomeView (minimal landing)
  /sectors/:id → SectorView (sector detail)
  /sectors/:id/datasets/:id → DatasetView (visualization)

Layout: Three-column
  - NavSidebar (sectors list)
  - Main content (scope + profile + canvas)
  - ReferencePanel (citations, inspector)

Data Flow:
  API → Sectors → Activities → Datasets → Figures → Visualizations
```

### Technology Stack ✅
- **React 18** with Router 6 - ✅ Modern, performant
- **Recharts** - ✅ Good foundation, needs expansion
- **Framer Motion** - ✅ Animation support
- **Tailwind + Custom CSS Tokens** - ✅ Design system ready
- **Dark mode** - ✅ Fully implemented
- **SWR** (available but unused) - ⚠️ Not leveraged yet

### Data Model ✅
```typescript
Sectors → Activities (profiles)
Datasets → Figures (visualizations)
  - BubbleFigure (only type implemented)
  - References (citations)
```

**Available data:**
- Sectors (industries/categories)
- Activities (lifestyle profiles per sector)
- Datasets (timestamped carbon data)
- Figures (visualizations - currently only bubble charts)
- References (citations, provenance)

---

## Critical Pain Points 🔴

### 1. **Sterile Data Presentation**
**Problem:** Data is presented clinically, like a research tool, not a user experience.

- HomeView shows "Latest dataset" with technical metadata
- No emotional connection or storytelling
- Feels like a database browser, not an exploration tool

**Impact:** Users don't engage. Data doesn't resonate. No "aha moments."

---

### 2. **Passive Profile System**
**Problem:** ProfilePicker just lists activities as static text badges.

```tsx
// Current: Just shows activity names
<span>{activity.name}</span>
```

**Missing:**
- No personalization ("Which activities match YOUR lifestyle?")
- No carbon impact preview
- No interactivity or selection
- No comparison ("How does your lifestyle compare?")

**Impact:** Users can't see themselves in the data. No personal relevance.

---

### 3. **Single Visualization Type**
**Problem:** Only bubble charts exist. Data is trapped in one format.

**What's missing:**
- Time series / trend lines
- Comparative bar charts (my lifestyle vs average)
- Heatmaps (carbon intensity by industry + time)
- Sankey diagrams (carbon flow through supply chains)
- Area charts (cumulative impact over time)
- Radial/spider charts (multi-dimensional profiles)

**Impact:** Complex stories can't be told. Users see fragments, not patterns.

---

### 4. **No Lifestyle Personalization**
**Problem:** Zero ability to build "your profile" or see "your impact."

**What users want:**
- "I'm a coffee drinker who commutes 20km daily"
- "Show me MY carbon footprint"
- "How does my lifestyle compare to others?"
- "What if I changed X behavior?"

**Impact:** Data feels abstract, not actionable. No behavior change motivation.

---

### 5. **Minimal Storytelling**
**Problem:** No narrative flow. Users land on a blank canvas with no guidance.

**Missing:**
- Hero section showing scale/context
- Guided tours ("Start here")
- Progressive disclosure (simple → detailed)
- Contextual insights ("Did you know?")
- Industry spotlights
- Comparative frameworks

**Impact:** Users lost. Data overwhelming. High bounce rate.

---

### 6. **No Trend Projection**
**Problem:** All data is historical snapshots. No forward-looking insights.

**What's missing:**
- Trend analysis ("This sector's emissions are decreasing")
- Forecasting ("At this rate, by 2030...")
- Scenario modeling ("If you switch to X...")
- Goal tracking ("Path to net zero")

**Impact:** Data feels static, not dynamic. No sense of progress or possibility.

---

## The Revolutionary Redesign

### Design Philosophy

> **"Data isn't just numbers. It's stories. It's choices. It's futures."**

**Core principles:**
1. **Immersive, not instructive** - Feel the data, don't read it
2. **Personal, not abstract** - "You" not "users"
3. **Beautiful, not clinical** - Art meets science
4. **Actionable, not informative** - Inspire change, don't just inform
5. **Progressive, not flat** - Journey from simple to complex

---

## New Information Architecture

### 1. Hero Landing Experience
**Route:** `/` (HomeView transformation)

**Vision:** Immersive full-screen hero that immediately contextualizes carbon data.

**Components:**
```
HeroSection
├── Animated globe visualization (carbon intensity heatmap)
├── Real-time metrics ticker
├── "Your lifestyle impact" quick calculator
├── Industry spotlights carousel
└── "Start exploring" CTA with guided paths
```

**Key metrics displayed:**
- Global carbon output (live-ish data)
- Sectors ranked by impact
- Recent trends (↑ increasing, ↓ decreasing)
- "Time to act" countdown (climate goals)

**Interactions:**
- Hover over globe regions → See industry breakdown
- Click metric → Jump to detailed view
- "Calculate my footprint" → Onboarding flow

---

### 2. Personal Carbon Profile Builder
**Route:** `/profile` (new)

**Vision:** Interactive wizard that builds your personal carbon profile.

**Flow:**
```
Step 1: Lifestyle basics
  - Where do you live?
  - How do you commute?
  - Dietary preferences?

Step 2: Industry exposure
  - What sector do you work in?
  - What products do you use daily?

Step 3: Your footprint
  - Calculated total impact
  - Breakdown by category
  - Comparison to averages

Step 4: Set goals
  - Reduction targets
  - Behavior change suggestions
```

**Output:** Personal profile saved to localStorage, used to personalize all other views.

---

### 3. Immersive Sector Explorer
**Route:** `/sectors/:id` (enhanced SectorView)

**Current:** Minimal sector header + activity list

**Redesign:**

**Hero Section:**
- Full-width sector banner with animated background
- Key stats: Total emissions, % of global, trend
- Industry narrative: "What this sector means"

**Activity Comparison Matrix:**
Replace static badge list with:
```
┌─────────────────────────────────────────┐
│ Coffee (12oz) ●━━━━━━━━━●○○○ 150g CO₂  │
│ Subway ride   ●━●○○○○○○○○○ 45g CO₂    │
│ Video call    ●●●━━━━━━━○○ 220g CO₂   │
└─────────────────────────────────────────┘
```
- Horizontal bar charts showing relative impact
- Selectable (add to your profile)
- Sortable (by impact, alphabetical, frequency)

**Visualization Canvas:**
- Multiple chart types side-by-side
- Time series showing sector trends
- Comparison to other sectors
- Geographic breakdown
- Supply chain visualization

---

### 4. Dataset Storytelling Layer
**Route:** `/sectors/:id/datasets/:id` (enhanced DatasetView)

**Current:** Single bubble chart + metadata card

**Redesign - "Data Story" Layout:**

```
┌────────────────────────────────────────────────────┐
│ [Narrative Header]                                 │
│ "The Carbon Cost of Digital Life"                 │
│ In 2024, streaming video contributed...           │
└────────────────────────────────────────────────────┘
        ↓
┌──────────────────┐  ┌──────────────────┐
│ [Key Insight #1] │  │ [Key Insight #2] │
│ Bubble Chart     │  │ Time Series      │
│ ↳ Interactive    │  │ ↳ Trends visible │
└──────────────────┘  └──────────────────┘
        ↓
┌────────────────────────────────────────────────────┐
│ [Deep Dive Section]                                │
│ • Comparative analysis                             │
│ • Breakdown by dimension                           │
│ • Your impact (if profile exists)                  │
└────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────┐
│ [What You Can Do]                                  │
│ • Actionable suggestions                           │
│ • Alternatives comparison                          │
│ • Track your progress                              │
└────────────────────────────────────────────────────┘
```

**Scrollytelling:** As user scrolls, visualizations animate and transform.

---

### 5. Personal Impact Dashboard
**Route:** `/dashboard` (new)

**Vision:** Your personalized carbon command center.

**Sections:**

**Your Footprint:**
```
┌────────────────────────────┐
│ Annual Carbon Footprint    │
│                            │
│       8.4 tonnes CO₂       │
│    ────────────────        │
│    vs. 7.2t avg            │
│    [Chart: breakdown]      │
└────────────────────────────┘
```

**Recent Activities:**
- Timeline of carbon-generating activities
- Daily, weekly, monthly views
- Trends over time

**Goals & Progress:**
```
Goal: Reduce by 20% this year
Progress: ████████░░ 45% achieved
Next milestone: -500kg CO₂
```

**Recommendations:**
- Smart suggestions based on your profile
- "Switch to train → Save 2kg CO₂/day"
- Gamification: Badges, streaks, challenges

---

### 6. Advanced Visualization Suite

**Chart Types to Implement:**

#### A. Time Series Chart
```tsx
<TimeSeriesChart
  data={historicalEmissions}
  xAxis="date"
  yAxis="emissions"
  showTrend
  showForecast
  annotations={[{ date: '2030', label: 'Net Zero Target' }]}
/>
```

#### B. Comparative Bar Chart
```tsx
<ComparativeChart
  categories={activities}
  metrics={['your_impact', 'average', 'best_case']}
  orientation="horizontal"
  showDelta
/>
```

#### C. Carbon Flow (Sankey)
```tsx
<FlowDiagram
  source="energy_production"
  through={['transport', 'manufacturing', 'consumption']}
  destination="emissions"
  interactive
/>
```

#### D. Heatmap
```tsx
<CarbonHeatmap
  dimensions={['industry', 'time']}
  intensity={emissionsData}
  colorScale="viridis"
  interactive
/>
```

#### E. Radial Profile
```tsx
<RadarChart
  dimensions={['transport', 'food', 'energy', 'goods', 'services']}
  profiles={[
    { label: 'You', data: yourProfile },
    { label: 'Average', data: averageProfile },
    { label: 'Target', data: targetProfile }
  ]}
/>
```

#### F. Impact Projection
```tsx
<ProjectionChart
  historical={pastData}
  scenarios={[
    { label: 'Current path', projection: businessAsUsual },
    { label: 'With changes', projection: withImprovements },
    { label: 'Target', projection: netZeroPath }
  ]}
/>
```

---

## Visual Design Language

### Color Semantics
```css
/* Extend existing tokens */
--carbon-low: #27ae60;      /* < 100g CO₂ */
--carbon-moderate: #f39c12;  /* 100-500g CO₂ */
--carbon-high: #e67e22;      /* 500g-1kg CO₂ */
--carbon-severe: #e74c3c;    /* > 1kg CO₂ */

--gradient-earth: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-carbon: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
--gradient-nature: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
```

### Typography Scale
```css
--text-hero: 4rem;          /* Landing hero */
--text-display: 3rem;       /* Section headers */
--text-headline: 2rem;      /* Card titles */
--text-title: 1.5rem;       /* Subsections */
--text-body: 1rem;          /* Primary text */
--text-caption: 0.875rem;   /* Metadata */
--text-micro: 0.75rem;      /* Labels */
```

### Motion System
```css
/* Scrollytelling animations */
--scroll-fade-in: opacity 0.6s var(--motion-ease);
--scroll-slide-up: transform 0.8s var(--motion-ease);
--scroll-scale: scale 0.4s var(--motion-ease);

/* Data transitions */
--data-morph: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
--number-count: --number 2s ease-out;
```

---

## Technical Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Enhanced landing experience

- [ ] Hero section with animated metrics
- [ ] Quick impact calculator widget
- [ ] Industry spotlight carousel
- [ ] Improved navigation UX

**Files to create:**
```
src/views/HeroSection.tsx
src/components/ImpactCalculator.tsx
src/components/MetricsTicker.tsx
src/components/IndustryCard.tsx
src/lib/carbonCalculations.ts
```

---

### Phase 2: Personalization (Week 2)
**Goal:** Build user profiles

- [ ] Profile builder wizard
- [ ] Profile storage (localStorage + context)
- [ ] Personal dashboard route
- [ ] Activity selection UI
- [ ] Impact calculations

**Files to create:**
```
src/views/ProfileBuilder.tsx
src/views/PersonalDashboard.tsx
src/contexts/ProfileContext.tsx
src/lib/profileCalculations.ts
src/components/ActivitySelector.tsx
src/components/GoalTracker.tsx
```

---

### Phase 3: Visualization Expansion (Week 3)
**Goal:** Rich data storytelling

- [ ] Time series chart component
- [ ] Comparative bar chart
- [ ] Heatmap visualization
- [ ] Radial profile chart
- [ ] Flow diagram (Sankey)
- [ ] Chart selection/switching UI

**Files to create:**
```
src/components/charts/TimeSeriesChart.tsx
src/components/charts/ComparativeChart.tsx
src/components/charts/CarbonHeatmap.tsx
src/components/charts/RadarChart.tsx
src/components/charts/FlowDiagram.tsx
src/components/charts/ProjectionChart.tsx
src/lib/chartUtils.ts
```

---

### Phase 4: Advanced Features (Week 4)
**Goal:** Trend projection & recommendations

- [ ] Projection engine (forecasting)
- [ ] Scenario modeling
- [ ] Smart recommendations system
- [ ] Goal setting & tracking
- [ ] Gamification (badges, achievements)
- [ ] Export/share functionality

**Files to create:**
```
src/lib/projectionEngine.ts
src/lib/scenarioModeling.ts
src/lib/recommendationEngine.ts
src/components/ScenarioComparison.tsx
src/components/Achievement.tsx
```

---

### Phase 5: Polish & Optimization (Week 5)
**Goal:** Production-ready excellence

- [ ] Scroll-triggered animations (Intersection Observer)
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Accessibility audit (a11y)
- [ ] Mobile responsive refinement
- [ ] Loading states & skeletons
- [ ] Error boundaries
- [ ] Analytics integration

---

## Component Architecture

### New Component Hierarchy
```
App
├── HeroSection
│   ├── AnimatedGlobe
│   ├── MetricsTicker
│   ├── QuickCalculator
│   └── IndustrySpotlight
│
├── ProfileContext (provider)
│   ├── ProfileBuilder
│   │   ├── LifestyleWizard
│   │   ├── IndustrySelector
│   │   └── ImpactSummary
│   │
│   └── PersonalDashboard
│       ├── FootprintCard
│       ├── ActivityTimeline
│       ├── GoalProgress
│       └── Recommendations
│
├── SectorExplorer (enhanced)
│   ├── SectorHero
│   ├── ActivityMatrix
│   ├── ComparisonGrid
│   └── VisualizationSuite
│
├── DatasetStory (enhanced)
│   ├── NarrativeHeader
│   ├── KeyInsightsRow
│   ├── DeepDiveSection
│   └── ActionableSteps
│
└── Charts (expanded)
    ├── BubbleFigure ✅
    ├── TimeSeriesChart 🆕
    ├── ComparativeChart 🆕
    ├── CarbonHeatmap 🆕
    ├── RadarChart 🆕
    ├── FlowDiagram 🆕
    └── ProjectionChart 🆕
```

---

## Data Enhancement Needs

### Current API Endpoints ✅
```
GET /api/sectors
GET /api/sectors/:id
GET /api/datasets
GET /api/datasets/:id
```

### Recommended Additions 🆕
```
GET /api/activities            # All activities (for calculator)
GET /api/activities/:id/impact # Calculate impact
GET /api/trends/:sector        # Historical trends
GET /api/forecast/:sector      # Projected trends
GET /api/compare               # Comparative data
POST /api/profile/calculate    # Calculate personal footprint
```

**Note:** If backend doesn't exist yet, we can mock these with static JSON or computed client-side.

---

## Accessibility Considerations

### WCAG 2.1 AA Compliance
- [ ] Color contrast ratios ≥ 4.5:1
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader announcements for dynamic content
- [ ] Focus indicators on all focusable elements
- [ ] Alt text for all visualizations
- [ ] ARIA labels for complex widgets
- [ ] Reduced motion respect (`prefers-reduced-motion`)

### Visualization Accessibility
- [ ] Data tables as fallback for charts
- [ ] Descriptive text summaries
- [ ] Pattern fills (not just color) for differentiation
- [ ] Zoom/pan controls with keyboard support

---

## Performance Targets

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Optimization Strategies
- Lazy load visualizations below fold
- Code split route components
- Virtualize long lists (TanStack Virtual)
- Optimize chart rendering (canvas over SVG for complex charts)
- Memoize expensive calculations
- Debounce user input (filters, search)
- Prefetch likely next routes

---

## Testing Strategy

### Unit Tests
- Calculation functions (carbon impact, projections)
- Chart data transformations
- Profile context logic

### Integration Tests
- User flows (profile creation → dashboard → dataset)
- API integration (with mock data)
- Chart interactions

### E2E Tests (Playwright)
- Critical paths:
  1. Landing → Calculate impact → Build profile
  2. Explore sector → View dataset → Inspect references
  3. Create profile → Set goals → Track progress

### Visual Regression
- Snapshot tests for major components
- Cross-browser testing (Chrome, Firefox, Safari)
- Responsive breakpoints

---

## Success Metrics

### Engagement
- **Bounce rate:** Reduce from ~XX% to < 30%
- **Time on site:** Increase to > 3 minutes average
- **Pages per session:** > 4 pages

### Feature Adoption
- **Profile creation:** > 40% of visitors
- **Dataset views:** > 60% of sessions
- **Goal setting:** > 20% of profile users

### User Satisfaction
- **NPS (Net Promoter Score):** > 50
- **Task completion rate:** > 80%
- **Subjective feedback:** "Beautiful" / "Insightful" / "Actionable"

---

## Open Questions & Decisions Needed

1. **Backend capability:** Can we add projection/forecast endpoints? Or compute client-side?
2. **User accounts:** Do we want persistent profiles (login) or just localStorage?
3. **Real-time data:** Is there a live data feed, or all static datasets?
4. **Comparative data:** Do we have "average user" profiles or aggregate data for comparison?
5. **Industry depth:** How granular can sector breakdowns go?

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize features** based on feasibility + impact
3. **Start Phase 1** (Hero section + landing experience)
4. **Iterate rapidly** with user feedback
5. **Document progress** in this file as we build

---

## Appendix: Inspiration & References

### Design Inspiration
- **Apple's environmental reports** - Beautiful data presentation
- **Stripe's revenue dashboards** - Clean, actionable metrics
- **Spotify Wrapped** - Personalization + storytelling
- **Gapminder** - Data storytelling with animation
- **Bloomberg terminals** - Dense, information-rich UIs

### Technical References
- **Recharts docs:** https://recharts.org/
- **D3.js** (for custom visualizations if needed)
- **Framer Motion** scroll-triggered animations
- **TanStack Virtual** for list virtualization
- **Chart.js / Victory** as Recharts alternatives

---

**Document Status:** Draft v1.0
**Last Updated:** 2025-10-12
**Next Review:** After Phase 1 completion
**Maintainer:** Claude Code + Carbon ACX Core Team
