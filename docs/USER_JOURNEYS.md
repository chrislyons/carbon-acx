# Carbon ACX User Journeys

This document outlines the key user scenarios and interactions within the Carbon ACX web application. Last updated: 2025-10-12

---

## Journey 1: New User Discovery

**Goal:** Understand what Carbon ACX offers and see sample data

**Steps:**
1. User lands on Home page
2. Sees immediate visualizations (Global Comparison, Emissions Trend)
3. Reads key metrics: Your Footprint, Global Average, Paris Target
4. Clicks "Load Demo Data" to explore features
5. Observes toast notification confirming demo data loaded
6. Metrics update to show demo footprint

**Success Criteria:**
- ✅ User understands the purpose within 10 seconds
- ✅ Demo data loads without errors
- ✅ Visualizations are immediately visible (no scrolling)

---

## Journey 2: Track Activities (Quick Start)

**Goal:** Add carbon activities to personal profile

**Steps:**
1. From Home, clicks "Track Activities" quick action
2. Navigates to Professional Services sector
3. Sees sector header with activity count
4. Views Activity Impact chart (horizontal bar)
5. Scrolls to Activity Matrix
6. Clicks "Add Top 3" to quickly add highest impact activities
7. Sees toast: "Quick add complete! Added top 3 highest impact activities"
8. Observes animated checkmarks on selected activities

**Success Criteria:**
- ✅ Navigation is instant (<500ms)
- ✅ Visual feedback confirms additions
- ✅ User can quickly build profile without reading every activity

---

## Journey 3: Detailed Activity Selection

**Goal:** Carefully choose specific activities with custom quantities

**Steps:**
1. User is on Sector page viewing Activity Matrix
2. Sorts by "Alphabetical" or "By impact"
3. Reads activity descriptions and carbon impact (g CO₂)
4. Clicks on an unselected activity
5. Dialog opens: "Add Activity to Profile"
6. Enters annual quantity (e.g., 52 for weekly commute)
7. Sees estimated annual emissions update live
8. Clicks "Add to Profile"
9. Toast appears: "Activity added! [name] ([X] kg CO₂/year) added to your profile"
10. Activity card shows checkmark and blue border

**Success Criteria:**
- ✅ Dialog UX is clear and fast
- ✅ Emissions calculation is instant
- ✅ Visual state change is obvious

---

## Journey 4: Remove Activities

**Goal:** Clean up profile by removing unwanted activities

**Steps:**
1. User views Activity Matrix with selected activities
2. Clicks on a selected activity (with checkmark)
3. Activity immediately removed (no confirmation)
4. Toast: "Activity removed - [name] removed from your profile"
5. OR clicks "Clear All" button in summary banner
6. Toast: "Cleared selections - Removed [N] activities from profile"

**Success Criteria:**
- ✅ Removal is instant (no unnecessary confirmations)
- ✅ Clear All provides bulk action
- ✅ Toast confirms the action

---

## Journey 5: View References for Dataset

**Goal:** Access scientific citations for carbon data

**Steps:**
1. User is on Sector page
2. Scrolls to Dataset CTA: "Ready to explore visualizations?"
3. Clicks "View latest dataset"
4. Navigates to /sectors/{id}/datasets/{datasetId}
5. References panel auto-appears on right (desktop) or is accessible via bottom button (mobile)
6. User sees list of numbered references with citations
7. Clicks URL links to view source documents
8. Clicks collapse button (chevron) to hide References panel
9. Main content expands to full width

**Success Criteria:**
- ✅ References load within 1 second
- ✅ Panel doesn't obstruct main content
- ✅ Citations are properly formatted
- ✅ Collapse/expand is smooth

---

## Journey 6: Switch Datasets

**Goal:** Compare references across different datasets

**Steps:**
1. User opens References panel (initially empty)
2. Sees dropdown: "Select a dataset..."
3. Clicks dropdown, sees list of available datasets
4. Selects a dataset from dropdown
5. Page navigates to /sectors/{sectorId}/datasets/{datasetId}
6. References for selected dataset load
7. User reviews citations
8. Uses dropdown again to switch to another dataset

**Success Criteria:**
- ✅ Dropdown is discoverable
- ✅ Dataset titles are descriptive
- ✅ Navigation preserves sector context

---

## Journey 7: Dark Mode Toggle

**Goal:** Switch to dark theme for comfortable viewing

**Steps:**
1. User sees top-right controls (theme + settings)
2. Clicks moon icon to enable dark mode
3. Interface smoothly transitions to dark theme
4. All colors, charts, and text remain readable
5. Theme preference saved to localStorage
6. On next visit, dark mode persists

**Success Criteria:**
- ✅ Toggle is discoverable (top-right corner)
- ✅ Transition is smooth (<300ms)
- ✅ All components support dark mode
- ✅ Preference persists across sessions

---

## Journey 8: Explore Sector Visualizations

**Goal:** Understand carbon impact by sector

**Steps:**
1. User navigates to a sector (e.g., Professional Services)
2. Sees compact header with activity counts
3. Immediately sees two full-width charts:
   - Activity Impact (horizontal bars, sorted by emissions)
   - Sector Trend (12-month area chart with trend line)
4. Clicks fullscreen icon on chart
5. Chart expands to modal overlay
6. Reviews chart details, summary stats (Total, Average, Highest)
7. Clicks close or ESC to exit fullscreen
8. Scrolls to Activity Matrix to add activities

**Success Criteria:**
- ✅ Charts visible without scrolling
- ✅ Fullscreen mode is true fullscreen (not small popup)
- ✅ Charts are horizontally optimized (wide time-series)
- ✅ Summary stats provide context

---

## Journey 9: Compare Global Footprints

**Goal:** See how personal footprint compares globally

**Steps:**
1. User adds activities to profile (or loads demo data)
2. Returns to Home page
3. Views "Global Comparison" chart
4. Sees countries sorted by per capita emissions
5. Observes delta indicators (vs baseline)
6. Compares own footprint metric to global average
7. Clicks fullscreen to examine details
8. Reviews summary: Total, Average, Highest country

**Success Criteria:**
- ✅ Chart uses horizontal bars (optimal for country names)
- ✅ User's country is highlighted (if known)
- ✅ Visual hierarchy is clear

---

## Journey 10: Dashboard Review

**Goal:** Get holistic view of carbon profile

**Steps:**
1. User clicks "View Dashboard" from Home or nav sidebar
2. Sees total annual emissions prominently displayed
3. Reviews breakdown by sector
4. Examines trend over time (if historical data exists)
5. Identifies highest-impact activities
6. Clicks on activities to review or remove
7. Uses insights to make reduction decisions

**Success Criteria:**
- ✅ Dashboard loads <1 second
- ✅ Most important metric (total) is prominent
- ✅ Breakdown is actionable
- ✅ Navigation back to sectors is clear

---

## Journey 11: Mobile Experience

**Goal:** Use app on smartphone

**Steps:**
1. User opens app on mobile browser
2. Sees responsive single-column layout
3. Nav sidebar accessible via menu icon
4. Taps sector from list
5. Scrolls vertically through charts
6. Taps activity to add
7. Dialog fits mobile viewport
8. Taps "Show references" button (bottom-right)
9. References slide in as sheet overlay
10. Closes sheet with X or swipe

**Success Criteria:**
- ✅ No horizontal scrolling required
- ✅ Touch targets are >44px
- ✅ Charts scale appropriately
- ✅ Sheet overlay doesn't block critical content

---

## Journey 12: Settings & About

**Goal:** Configure app and learn more about Carbon ACX

**Steps:**
1. User clicks Settings icon (top-right)
2. Modal opens with app information
3. Reads about Carbon ACX mission
4. Views current version (ACX 0.4.1)
5. Clicks "View on GitHub" to see source code
6. Clicks "Documentation" to read guides
7. Closes modal with X or "Close" button

**Success Criteria:**
- ✅ Settings accessible from any page
- ✅ Links open in new tabs
- ✅ Modal is keyboard accessible (ESC to close)

---

## Identified UX Gaps

Based on these journeys, the following improvements should be considered:

### Short-term (P1):
1. ✅ **COMPLETED** - Add visual feedback when activities selected
2. ✅ **COMPLETED** - Fix "Track Activities" button (was broken)
3. ✅ **COMPLETED** - Add dataset selector to References panel
4. ✅ **COMPLETED** - Quick-add buttons for faster profile building
5. ✅ **COMPLETED** - Dark mode with persistent preference

### Medium-term (P2):
6. **Dashboard Implementation** - Currently placeholder, needs full implementation
7. **Historical Tracking** - Allow users to log emissions over time
8. **Export Profile** - Download CSV or PDF of profile
9. **Share Profile** - Generate shareable link with read-only view
10. **Comparison Mode** - Compare your profile to industry benchmarks

### Long-term (P3):
11. **AI Recommendations** - Suggest reduction strategies based on profile
12. **Goal Setting** - Set emission reduction targets and track progress
13. **Sector Discovery** - Smart suggestions for relevant sectors
14. **API Integration** - Connect to external carbon tracking services
15. **Offline Mode** - Progressive Web App with offline capability

---

## Metrics to Track

To measure success of these journeys:

1. **Time to First Activity Added** - Target: <2 minutes
2. **Activities Per Session** - Target: 5+ activities
3. **References Panel Usage** - Target: 30% of dataset views
4. **Dark Mode Adoption** - Track % of users
5. **Quick-Add vs Manual** - Compare adoption rates
6. **Bounce Rate from Home** - Target: <40%
7. **Mobile Completion Rate** - Compare to desktop
8. **Settings Modal Opens** - Baseline engagement
9. **Dataset Switching** - How often users compare datasets
10. **Profile Persistence** - % of returning users with saved data

---

## Notes

- All journeys assume modern browser (Chrome 90+, Safari 14+, Firefox 88+)
- Mobile journeys assume responsive design (320px-768px viewport)
- Toast notifications disappear after 4 seconds
- localStorage is used for theme and profile persistence
- No authentication required (client-side only)
- Demo data is hardcoded JSON (not API)

---

_This document should be updated as new features are added or user feedback identifies new patterns._
