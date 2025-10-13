# Frontend Polish & UX Improvements Plan

**Date:** 2025-10-12
**Status:** Planning Phase
**PR:** #221 (feat/frontend-redesign-phases-1-2-3)

## User Feedback Summary

Comprehensive UX audit revealed several critical improvements needed:

### HIGH PRIORITY
1. **Visual feedback when activities added** - Users need immediate confirmation
2. **"Track Activities" button functionality** - Currently does nothing, needs implementation
3. **Easier trend building** - Make it faster to add/sort activities

### Layout & Density
4. **Stack visualizations vertically** - Better for time-series (wider = better for temporal data)
5. **Minimize vertical spacing** - Headers, padding, margins killing screen real estate
6. **Maximize data density** - Small fonts, tight layouts already started

### Navigation & Panels
7. **References panel collapsible** - Hidden by default with expand tab
8. **Scope section expansion** - Should expand into hidden References space (2 columns default)
9. **Scrollable sector list** - Currently cut off in left pane

### Technical Issues
10. **Fullscreen still broken** - Shows small popup instead of true fullscreen
11. **Dataset selection unclear** - No obvious way to select dataset for References pane

### Features
12. **Dark mode** - Reference wordbird implementation (~/chrislyons/dev/wordbird)
13. **User journey improvements** - Investigate dozen scenarios, build out features

---

## Implementation Plan

### Phase 1: Critical UX Fixes (HIGH PRIORITY)
**Goal:** Users can actually use the app productively

#### 1.1 Track Activities Button
- **Current:** Button does nothing
- **Target:** Opens activity selector/adds activity to profile
- **Files:** Likely QuickAction component, needs routing/modal
- **Complexity:** Medium (needs activity selection UI)

#### 1.2 Visual Feedback for Activity Addition
- **Current:** No confirmation when activity added
- **Target:** Toast notification, profile update animation
- **Files:** ProfileContext, ActivityMatrix
- **Complexity:** Low (add toast library)

#### 1.3 Faster Trend Building
- **Current:** Multi-step process to add activities
- **Target:** Quick-add buttons, bulk actions
- **Files:** ActivityMatrix, SectorView
- **Complexity:** Medium

---

### Phase 2: Layout Optimization
**Goal:** Maximize screen real estate, better visual hierarchy

#### 2.1 Stack Visualizations Vertically
- **Current:** 2-column grid (side-by-side)
- **Target:** Full-width stacked (better for time-series)
- **Files:** HomeView.tsx, SectorView.tsx, DashboardView.tsx
- **Complexity:** Low (CSS change)
- **Rationale:** Time on X-axis benefits from width > height

#### 2.2 Reduce Vertical Spacing
- **Targets:**
  - Header section height (minimize)
  - Padding in layout.css (reduce `--space-lg`, `--space-md`)
  - Card padding (tighter)
  - Gap between sections
- **Files:** layout.css, component styles, tailwind classes
- **Complexity:** Low (systematic CSS review)

#### 2.3 Minimize Header Heights
- **Files:** Layout.tsx, ScopeSelector.tsx, ProfilePicker.tsx
- **Review:** Presentation logic, can we inline/condense?
- **Complexity:** Medium (may need restructuring)

---

### Phase 3: Navigation & Panels
**Goal:** Better space utilization, clearer information hierarchy

#### 3.1 Collapsible References Panel
- **Current:** Always visible (360px wide)
- **Target:** Hidden by default, expand tab on right edge
- **Files:** Layout.tsx, ReferencePanel.tsx, layout.css
- **Complexity:** Medium
- **Implementation:**
  - Add toggle button/tab on right edge
  - Animate slide in/out
  - Persist state in localStorage

#### 3.2 Expandable Scope Section
- **Current:** Fixed width middle column
- **Target:** Expands into References space when hidden (2col default)
- **Files:** layout.css grid-template-columns
- **Complexity:** Medium
- **CSS:** `grid-template-columns: 320px minmax(0, 1fr) [refs-width]`

#### 3.3 Fix Sector List Scrolling
- **Current:** ScrollArea max-height calc(100vh-20rem) may be too restrictive
- **Target:** Proper scrolling, no cut-off
- **Files:** NavSidebar.tsx line 106
- **Complexity:** Low (adjust max-height calculation)

---

### Phase 4: Technical Fixes
**Goal:** Features work as expected

#### 4.1 Fix Fullscreen Mode (CRITICAL)
- **Current:** Still showing "small popup"
- **Investigation needed:**
  - My fix clones children with new height prop
  - Maybe Recharts doesn't respond to height changes?
  - Check z-index, positioning, container constraints
- **Files:** FullscreenChart.tsx
- **Complexity:** Medium (debugging required)
- **Possible solutions:**
  - Force remount charts in fullscreen
  - Use portal for true DOM-level fullscreen
  - Check if parent containers limiting size

#### 4.2 Dataset Selection for References
- **Current:** "Select a dataset to review its references" but no UI
- **Target:** Clear affordance to select dataset
- **Files:** ReferencePanel.tsx, ScopeSelector.tsx
- **Complexity:** Medium (may need new UI component)

---

### Phase 5: Features
**Goal:** Polish and delight

#### 5.1 Dark Mode
- **Source:** ~/chrislyons/dev/wordbird dark mode implementation
- **Components needed:**
  - Theme toggle (Sun/Moon Lucide icons)
  - Settings button
  - Top-right module layout
- **Files:** New ThemeProvider, Layout.tsx, CSS custom properties
- **Complexity:** High (theme system, CSS variables)
- **Steps:**
  1. Read wordbird implementation
  2. Create ThemeContext
  3. Define dark mode CSS variables
  4. Add toggle UI
  5. Persist preference

#### 5.2 User Journey Investigation
- **Scenarios to test:**
  1. New user → Add first activity → See result
  2. Browse sector → Add activity → Build profile
  3. View dashboard → Understand footprint → Take action
  4. Compare activities → Make decision
  5. Export data → Share insights
  6. Return user → See historical trend
  7. Power user → Keyboard shortcuts → Fast workflow
  8. Mobile user → Touch interactions → Responsive layout
  9. Dataset explorer → Find reference → Cite source
  10. Analyst → Multiple datasets → Compare scenarios
- **Deliverable:** Document gaps, implement missing features

---

## Technical Debt

### Bundle Size Warning
- generateCategoricalChart: 504KB (146KB gzipped)
- **Action:** Consider code-splitting Recharts
- **Priority:** Low (doesn't block UX)

### Fullscreen Investigation
- **Hypothesis 1:** Recharts ResponsiveContainer not responding to height changes
- **Hypothesis 2:** Parent container CSS constraints
- **Hypothesis 3:** Need to use React Portal for true fullscreen
- **Action:** Systematic debugging session

---

## Success Criteria

### Phase 1 Complete When:
- [  ] "Track Activities" button opens activity selector
- [  ] Toast notifications confirm activity additions
- [  ] Users can add multiple activities quickly

### Phase 2 Complete When:
- [  ] All charts stacked vertically (full width)
- [  ] Header height reduced by 30-50%
- [  ] Padding/margins reduced throughout
- [  ] No text collisions, clean layout

### Phase 3 Complete When:
- [  ] References panel hidden by default
- [  ] Expand/collapse animation smooth
- [  ] Scope section uses freed space
- [  ] Sector list scrolls without cut-off

### Phase 4 Complete When:
- [  ] Fullscreen truly fills viewport (no small popup)
- [  ] Dataset selection UI clear and functional

### Phase 5 Complete When:
- [  ] Dark mode toggle functional
- [  ] All 10 user journeys documented and tested
- [  ] Critical gaps addressed

---

## Next Steps

1. **Get user approval** on prioritization
2. **Start Phase 1** (HIGH PRIORITY UX)
3. **Systematic execution** with commits per feature
4. **Test each phase** before moving to next
5. **Document decisions** in this file

---

## Notes

- Merge PR #221 AFTER fullscreen fix confirmed working
- Consider creating separate PRs for major features (dark mode)
- Keep commit messages descriptive for future reference
- Test on multiple screen sizes (laptop, desktop, mobile)

