# Carbon ACX Phase 2 Preparation - Core Experience

**Date:** 2025-10-25
**Phase:** Pre-Phase 2 Setup
**Branch:** `rebuild/canvas-story-engine`
**Dependencies:** Phase 0 ✅, Phase 1 ✅

---

## Executive Summary

Phase 1 successfully delivered the foundational component library, state management architecture, and canvas-first layout system. Phase 2 (Weeks 4-6) focuses on building the complete user experience with domain-specific features, data tangibility, and shareable exports.

**Phase 2 Goals:**
1. Complete user journey from onboarding through data sharing
2. Make abstract carbon data tangible and relatable
3. Enable scenario planning and goal tracking
4. Create beautiful, shareable export functionality

**Timeline:** 3 weeks (Weeks 4-6)
**Status:** Ready to begin Week 4

---

## Phase 1 Completion Review

### Delivered Components (19 files, 3,544 lines)

**Tier 1 - System Primitives (3):**
- ✅ Button (9 variants, loading states, icon support)
- ✅ Input (validation states, helper text, icons)
- ✅ Dialog (5 sizes, smooth animations)

**Tier 2 - Canvas Layout (3):**
- ✅ CanvasZone (viewport-aware, 3 zone types, collapsible)
- ✅ StoryScene (6 scene types, progress tracking, intersect observers)
- ✅ TransitionWrapper (7 transition types, stagger support)

**Tier 3 - Visualizations (4):**
- ✅ HeroChart (ECharts wrapper, auto-resize, theme detection)
- ✅ ComparisonOverlay (dual charts, synchronized interactions)
- ✅ TimelineViz (historical trends, milestones, zoom/brush)
- ✅ GaugeProgress (circular gauge, 3 color schemes, target indicators)

**Tier 4 - Domain/Scenes (3):**
- ✅ OnboardingScene (3-step wizard, keyboard nav)
- ✅ BaselineScene (activity entry, GaugeProgress feedback)
- ✅ ExploreScene (timeline + comparison views, layer filtering)

**State Management:**
- ✅ Zustand app store (activities, layers, emissions calculations)
- ✅ XState journey machine (6 states, typed events)

**Examples & Documentation:**
- ✅ CanvasExample.tsx (component integration demo)
- ✅ JourneyExample.tsx (complete user journey + debug panel)
- ✅ examples/README.md (comprehensive patterns and best practices)

### Architecture Validation

**Success Criteria Met:**
- ✅ All components render without errors
- ✅ State transitions work correctly
- ✅ Design tokens enforced consistently
- ✅ TypeScript strict mode compliance
- ✅ Examples demonstrate full architecture
- ✅ Documentation comprehensive and clear

**Technical Achievements:**
- ✅ 60fps canvas animations with ECharts
- ✅ Viewport-aware responsive zones
- ✅ Type-safe state management
- ✅ Accessible components (ARIA, keyboard nav)
- ✅ Clean commit history with detailed messages

---

## Phase 2 Week 4 Objectives: Onboarding & Baseline

### Goals

1. **Complete OnboardingFlow** - Interactive 4-step wizard with animations
2. **Build EmissionCalculator v2** - Real-time feedback, contextual comparisons
3. **Implement Baseline Establishment** - Calculator or manual entry, celebration

### Deliverables

#### 1. OnboardingFlow Enhancement

**Current State:** Basic 3-step OnboardingScene exists
**Phase 2 Enhancement:**
- Add step: "Choose Your Path" (calculator vs manual entry)
- Animated transitions between steps
- Progress persistence (resume if interrupted)
- Skip logic with context preservation
- Completion celebration with confetti/animation

**Components to Build:**
- `src/scenes/OnboardingFlow.tsx` - Enhanced multi-step flow
- `src/components/domain/PathSelector.tsx` - Calculator vs manual choice
- `src/components/system/ProgressBar.tsx` - Visual progress indicator
- `src/components/system/Confetti.tsx` - Celebration animation

**State Updates:**
- XState: Add `onboarding.choosing_path` sub-state
- Zustand: Add `onboardingProgress` tracking

#### 2. EmissionCalculator v2

**Requirements (from ACX080):**
- Real-time feedback as user adjusts sliders/inputs
- Contextual comparisons (flights, meals, trees planted)
- Memorable result screen with celebration
- Category-based entry (energy, transport, goods, waste)
- Save to profile for baseline establishment

**Components to Build:**
- `src/components/domain/EmissionCalculator.tsx` - Main calculator interface
- `src/components/domain/CategoryInput.tsx` - Category-specific input forms
- `src/components/domain/ComparativeInsight.tsx` - Relatable comparison cards
- `src/components/viz/EmissionBreakdown.tsx` - Real-time pie chart visualization
- `src/components/domain/ResultCelebration.tsx` - Completion screen

**Data Integration:**
- Load emission factors from existing CSV data
- Calculate emissions in real-time using Zustand store
- Persist calculator results to user profile

**Relatable Comparisons Library:**
```typescript
// src/lib/relatableComparisons.ts
export const comparisons = {
  flights: { kgCO2perUnit: 250, unit: 'round-trip NYC-LA' },
  meals: { kgCO2perUnit: 2.5, unit: 'cheeseburgers' },
  trees: { kgCO2perUnit: 21, unit: 'trees planted (1 year growth)' },
  miles: { kgCO2perUnit: 0.404, unit: 'miles driven' },
  netflix: { kgCO2perUnit: 0.055, unit: 'hours of Netflix streaming' },
};
```

#### 3. Baseline Establishment Flow

**User Journey:**
1. Complete onboarding
2. Choose path: Calculator OR Manual Entry
3. Enter data (via calculator or activity list)
4. Review baseline summary
5. Celebrate establishment
6. Transition to Explore state

**Components to Build:**
- `src/components/domain/BaselineSummary.tsx` - Review before confirming
- `src/components/domain/BaselineCelebration.tsx` - Completion screen with insights
- Update `src/scenes/BaselineScene.tsx` - Integration with new components

**XState Updates:**
```typescript
baseline: {
  initial: 'choosing_method',
  states: {
    choosing_method: {
      on: {
        CHOOSE_CALCULATOR: 'using_calculator',
        CHOOSE_MANUAL: 'manual_entry',
      }
    },
    using_calculator: {
      on: {
        CALCULATOR_COMPLETE: 'reviewing',
      }
    },
    manual_entry: {
      on: {
        ACTIVITIES_ADDED: 'reviewing',
      }
    },
    reviewing: {
      on: {
        CONFIRM_BASELINE: 'celebrating',
      }
    },
    celebrating: {
      type: 'final',
    }
  },
  onDone: 'explore',
}
```

### Week 4 Success Criteria

**Functional:**
- ✅ User can complete full onboarding flow
- ✅ Calculator provides real-time feedback
- ✅ Relatable comparisons displayed correctly
- ✅ Baseline can be established via calculator OR manual entry
- ✅ Celebration animations trigger on completion
- ✅ Journey transitions to Explore state

**Technical:**
- ✅ All new components use design tokens
- ✅ TypeScript strict mode compliance
- ✅ No hardcoded colors, spacing, or timing
- ✅ Accessible (ARIA labels, keyboard nav)
- ✅ Unit tests for calculator logic
- ✅ Integration tests for critical flows

**UX:**
- ✅ Smooth transitions between steps
- ✅ Clear progress indication
- ✅ Relatable data (flights, meals, trees)
- ✅ Celebratory moments feel rewarding
- ✅ User never loses entered data

---

## Phase 2 Week 5 Objectives: Exploration & Insights

### Goals

1. **Build ExploreCanvas** - Hero chart with sector data, zoom/pan interactions
2. **Implement InsightDashboard** - Automated insight detection, trend analysis
3. **Add Tangibility Features** - Every number gets relatable comparison

### Deliverables

#### 1. ExploreCanvas Enhancement

**Current State:** Basic ExploreScene with timeline and comparison views
**Phase 2 Enhancement:**
- Activity drill-down (click chart → see source activities)
- Sector filtering with visual feedback
- Time range selection (week, month, quarter, year)
- Export chart as PNG/PDF

**Components to Build:**
- `src/components/domain/SectorFilter.tsx` - Multi-select layer filtering
- `src/components/domain/ActivityDrilldown.tsx` - Detail view for chart clicks
- `src/components/domain/TimeRangeSelector.tsx` - Date range picker
- `src/components/domain/ChartExporter.tsx` - Export functionality

#### 2. InsightDashboard

**Requirements:**
- Automated insight detection (trends, anomalies, milestones)
- Trend analysis with annotations
- Comparison overlays (baseline vs current, this month vs last)
- Actionable recommendations

**Components to Build:**
- `src/components/domain/InsightDashboard.tsx` - Main dashboard layout
- `src/components/domain/InsightCard.tsx` - Individual insight presentation
- `src/components/domain/TrendAnalysis.tsx` - Annotated trend visualization
- `src/lib/insightEngine.ts` - Automated insight detection logic

**Insight Types:**
```typescript
type InsightType =
  | 'trend_up'         // Emissions increasing
  | 'trend_down'       // Emissions decreasing
  | 'anomaly'          // Unusual spike/drop
  | 'milestone'        // Goal achieved or missed
  | 'seasonal'         // Recurring pattern detected
  | 'comparison';      // vs baseline or peer group
```

#### 3. Tangibility Features

**Every Number Principle:**
Every emission value should have 2-3 relatable comparisons displayed inline.

**Implementation:**
```typescript
// src/components/domain/TangibleNumber.tsx
export const TangibleNumber: React.FC<{
  kgCO2: number;
  maxComparisons?: number;
}> = ({ kgCO2, maxComparisons = 2 }) => {
  const comparisons = getRelatableComparisons(kgCO2, maxComparisons);

  return (
    <div>
      <p className="text-[var(--font-size-2xl)] font-bold">
        {kgCO2.toFixed(1)} kg CO₂e
      </p>
      <div className="text-[var(--font-size-sm)] text-[var(--text-secondary)]">
        {comparisons.map((comp, i) => (
          <p key={i}>≈ {comp.value.toFixed(1)} {comp.unit}</p>
        ))}
      </div>
    </div>
  );
};
```

### Week 5 Success Criteria

**Functional:**
- ✅ User can drill down into chart data
- ✅ Insights automatically generated and displayed
- ✅ All numbers have relatable comparisons
- ✅ Chart export works (PNG, PDF)
- ✅ Trends annotated with context

**Technical:**
- ✅ Insight detection algorithm documented
- ✅ Export functionality tested across browsers
- ✅ Performance optimized (lazy load insights)
- ✅ Accessible charts with alt text

---

## Phase 2 Week 6 Objectives: Scenarios & Goals

### Goals

1. **Build ScenarioBuilder** - "What-if" modeling interface
2. **Implement Goal System** - Set targets, track progress, celebrate milestones
3. **Create ShareableCard** - Export-ready snapshots for presentations

### Deliverables

#### 1. ScenarioBuilder

**Requirements:**
- Create scenarios by adjusting activities
- Side-by-side comparison (baseline vs scenario)
- Impact calculations (savings, percentage change)
- Save multiple scenarios
- Share scenarios with team

**Components to Build:**
- `src/components/domain/ScenarioBuilder.tsx` - Main interface
- `src/components/domain/ScenarioEditor.tsx` - Activity adjustment UI
- `src/components/domain/ScenarioComparison.tsx` - Side-by-side view using ComparisonOverlay
- `src/components/domain/ScenarioLibrary.tsx` - Saved scenarios list

**Zustand State Extension:**
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  baselineId: string;
  adjustments: ActivityAdjustment[];
  createdAt: string;
  totalEmissions: number;
  savingsVsBaseline: number;
}

// Store methods
createScenario: (name: string, description: string) => void;
updateScenario: (id: string, adjustments: ActivityAdjustment[]) => void;
deleteScenario: (id: string) => void;
compareScenarios: (id1: string, id2: string) => ComparisonData;
```

#### 2. Goal System

**Requirements:**
- Set carbon budget/target
- Progress tracking with GaugeProgress
- Milestone celebrations (25%, 50%, 75%, 100%)
- Deadline tracking
- Recommendations when off-track

**Components to Build:**
- `src/components/domain/GoalSetter.tsx` - Set target and deadline
- `src/components/domain/GoalTracker.tsx` - Progress visualization with GaugeProgress
- `src/components/domain/MilestoneCelebration.tsx` - Milestone animations
- `src/components/domain/GoalRecommendations.tsx` - Actionable suggestions

**XState Extension:**
```typescript
act: {
  initial: 'idle',
  states: {
    idle: {
      on: {
        CREATE_SCENARIO: 'building_scenario',
        SET_GOAL: 'setting_goal',
      }
    },
    building_scenario: { /* ... */ },
    setting_goal: { /* ... */ },
    tracking_progress: { /* ... */ },
  }
}
```

#### 3. ShareableCard

**Requirements:**
- Export snapshots as PNG, PDF, or Twitter card
- Branded templates (logo, colors)
- Include key metrics and comparisons
- Copy link functionality
- Social media optimized dimensions

**Components to Build:**
- `src/components/domain/ShareableCard.tsx` - Card template
- `src/components/domain/ShareDialog.tsx` - Export options dialog
- `src/lib/exportUtils.ts` - Export logic (html2canvas, jsPDF)

**Export Formats:**
- PNG (1200×630 - social media optimized)
- PDF (A4 printable)
- URL (shareable link to live data)

### Week 6 Success Criteria

**Functional:**
- ✅ User can create and compare scenarios
- ✅ Goals can be set with deadlines
- ✅ Progress tracked visually
- ✅ Milestones trigger celebrations
- ✅ Shareable cards exported successfully

**Technical:**
- ✅ Export works in all modern browsers
- ✅ PDF generation performant (<2s)
- ✅ Social media cards properly formatted
- ✅ Scenarios persisted correctly

---

## Updated Technology Stack

### Phase 1 Foundation (Already Installed)
- Apache ECharts 6.0
- XState 5.23 + @xstate/react 6.0
- Zustand 4.5.4
- TanStack Query 5.90.5
- Storybook 9.x

### Phase 2 Additions (To Install)

**Export & Sharing:**
- `html2canvas` - Screenshot generation for shareable cards
- `jspdf` - PDF export functionality
- `file-saver` - Client-side file downloads

**UI Enhancements:**
- `react-confetti` - Celebration animations
- `react-day picker` - Date range selection for time filters
- `react-hot-toast` - Toast notifications for actions

**Utilities:**
- `date-fns` - Date manipulation for time range filters
- `nanoid` - Unique ID generation for scenarios

### Installation Command

```bash
pnpm --filter carbon-acx-web add \
  html2canvas jspdf file-saver \
  react-confetti react-day-picker react-hot-toast \
  date-fns nanoid
```

---

## Development Workflow

### Daily Stand-up Pattern

**Each day:**
1. Review current Phase 2 week objectives
2. Identify 2-3 components to build
3. Build, test, commit incrementally
4. Update ACX080 progress tracking
5. Check in with user at natural milestones

### Component Development Checklist

For each new component:
- [ ] Read existing similar components for patterns
- [ ] Use design tokens (no hardcoded values)
- [ ] Follow appropriate tier (1-4)
- [ ] TypeScript strict mode compliance
- [ ] ARIA labels and keyboard navigation
- [ ] Unit test for complex logic
- [ ] Add to Storybook (if Tier 1-3)
- [ ] Document props with JSDoc
- [ ] Test in JourneyExample integration

### Commit Strategy

**Per component/feature:**
```bash
git add [files]
git commit -m "feat(web): [Component Name] - [brief description]

[Detailed description]
- Feature 1
- Feature 2

Ref: ACX081 Phase 2 Week [X]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Per week completion:**
```bash
git commit -m "feat(web): Phase 2 Week [X] complete - [theme]

[Summary of week's deliverables]

Ref: ACX081 Phase 2 implementation
```

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Export performance slow | Use web workers for heavy processing, show loading states |
| Insight detection inaccurate | Start simple (trend direction only), iterate based on feedback |
| Scenario calculations complex | Leverage existing Zustand emission calc logic, add comprehensive tests |
| Date range picker UX unclear | Follow native patterns, add clear labels and examples |

### UX Risks

| Risk | Mitigation |
|------|------------|
| Calculator overwhelms users | Progressive disclosure, category-by-category entry |
| Comparisons feel arbitrary | Source from research, allow user to choose preferred comparisons |
| Goal setting demotivating | Celebrate small wins, provide encouraging language |
| Export quality poor | High-resolution rendering, test across devices |

### Scope Risks

| Risk | Mitigation |
|------|------------|
| Feature creep | Stick to ACX080 plan, defer nice-to-haves to Phase 3 |
| Week 4-6 too ambitious | Prioritize MVP features, cut polish if needed |
| Integration complexity | Incremental integration testing with JourneyExample |

---

## Success Metrics

### Functional Completeness
- ✅ All Week 4 deliverables functional
- ✅ All Week 5 deliverables functional
- ✅ All Week 6 deliverables functional
- ✅ Full user journey works end-to-end (onboarding → share)

### Code Quality
- ✅ TypeScript strict mode, no `any`
- ✅ All components use design tokens
- ✅ Unit test coverage >70%
- ✅ Integration tests for critical flows
- ✅ Accessible (WCAG 2.1 AA)

### User Experience
- ✅ Calculator provides real-time feedback
- ✅ Every number has relatable comparisons
- ✅ Celebrations feel rewarding
- ✅ Scenarios easy to create and compare
- ✅ Export quality high

### Documentation
- ✅ All new components documented
- ✅ ACX080 updated with Phase 2 progress
- ✅ CLAUDE.md updated if patterns change
- ✅ Examples updated to show new features

---

## Next Steps (Immediate)

1. **Install Phase 2 dependencies**
   ```bash
   pnpm --filter carbon-acx-web add \
     html2canvas jspdf file-saver \
     react-confetti react-day-picker react-hot-toast \
     date-fns nanoid
   ```

2. **Commit preparation work**
   - Updated acx.code.assistant skill
   - Updated CLAUDE.md with Phase 1 patterns
   - This ACX081 preparation document

3. **Begin Week 4: OnboardingFlow Enhancement**
   - First component: `ProgressBar.tsx` (Tier 1)
   - Second component: `PathSelector.tsx` (Tier 4)
   - Third component: Enhanced `OnboardingFlow.tsx`

4. **Report readiness to user**

---

## References

[1] ACX080.md - Phase 1 implementation plan and progress tracking
[2] apps/carbon-acx-web/src/examples/README.md - Component patterns and best practices
[3] apps/carbon-acx-web/src/examples/JourneyExample.tsx - Integration reference
[4] .claude/skills/project/acx-code-assistant/SKILL.md - Code generation patterns

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Author:** Claude Code (Phase 2 Preparation)
**Status:** Ready for Phase 2 Week 4
