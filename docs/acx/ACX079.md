# Language Reframing Plan: From Guilt Machine to Literacy Tool

**Date:** 2025-10-24
**Scope:** Frontend language audit and reframing strategy
**Status:** ✅ Phase 1 Complete (PR #239 merged)

---

## Executive Summary

**Critical Issue:** Current frontend language uses possessive, guilt-inducing framing ("your footprint", "track your contribution", "reduce your impact") that positions Carbon ACX as an individual blame tool rather than a literacy/education platform.

**Core Problem:** Carbon footprint tracking has a history of being weaponized to shift responsibility from systemic/corporate sources to individual consumers. This framing:
- Discourages adoption (guilt aversion)
- Misrepresents the problem (70% of emissions are corporate/industrial)
- Contradicts Carbon ACX's mission as an open reference stack for **trustworthy** carbon accounting

**User Directive:**
> "We need to be very careful to not guilt or blame the users as individual consumers: this would not be conducive to adoption. We should make sure that we are framing everything as: inform yourself by comparing climate data at every layer of society. This is a literacy tool, not a guilt machine."

---

## Audit Findings

### Problematic Language Patterns

#### 1. Possessive "Your" Framing (Individual Ownership/Blame)
| Current (❌ Guilt) | Location | Impact |
|-------------------|----------|--------|
| "Your Carbon Footprint" | DashboardView, HomeView, OnboardingWizard | Implies individual responsibility |
| "Track your carbon footprint over time" | DashboardView:303 | Surveillance/monitoring connotation |
| "Calculate your carbon footprint" | DashboardView:697, OnboardingWizard:119 | Personal blame framing |
| "Your estimated annual footprint" | QuickCalculator:364 | Possessive ownership of problem |
| "Your impact" | ActivityBadgeGrid:588 | Individual responsibility |
| "Compare your emissions" | DashboardView:339, HomeView:109 | Personal blame |
| "Your highest-emission activities" | DashboardView:339 | Judgment framing |

#### 2. Prescriptive/Judgmental Language
| Current (❌ Guilt) | Location | Impact |
|-------------------|----------|--------|
| "Small changes like reducing meat consumption or using public transport can make a significant impact" | QuickCalculator:389 | Prescriptive advice implying individual fault |
| "Keep up the sustainable habits!" | QuickCalculator:392 | Moralization of behavior |
| "Consider ways to reduce further to help meet climate goals" | QuickCalculator:391 | Individual responsibility for global goals |
| "making your footprint defensible" | OnboardingWizard:505 | Defensive posture (implies guilt) |

#### 3. Tracking/Monitoring Language
| Current (⚠️ Ambiguous) | Location | Impact |
|-------------------|----------|--------|
| "Add to Your Profile" | ActivityBadgeGrid:526 | Less problematic but still possessive |
| "Save to Profile" | QuickCalculator:399 | Neutral (acceptable) |
| "Activity-level tracking" | OnboardingWizard (multiple) | "Tracking" has surveillance connotations |

---

## Reframing Principles

### 1. **Literacy Over Blame**
**Bad:** "Calculate your carbon footprint"
**Good:** "Explore carbon accounting data" OR "Compare emissions across activities"

**Why:** Emphasizes understanding and comparison rather than personal responsibility.

### 2. **Observation Over Ownership**
**Bad:** "Your emissions"
**Good:** "Observed emissions" OR "Activity emissions" OR "Estimated emissions"

**Why:** Removes possessive language that implies individual guilt.

### 3. **Comparison Over Judgment**
**Bad:** "You're above the global average - consider reducing meat consumption"
**Good:** "This estimate is X% above the global average. These activities contribute the most to the total."

**Why:** Presents data neutrally without prescribing behavior changes.

### 4. **Context Over Contribution**
**Bad:** "Track your contribution to climate change"
**Good:** "Understand emissions at every layer of society"

**Why:** Emphasizes systemic understanding rather than individual blame.

### 5. **Exploration Over Monitoring**
**Bad:** "Track your carbon footprint over time"
**Good:** "Observe emissions trends" OR "Explore historical data"

**Why:** "Track" implies surveillance; "explore/observe" implies learning.

### 6. **Transparency Over Defensibility**
**Bad:** "Making your footprint defensible"
**Good:** "Providing transparent, auditable data"

**Why:** Removes defensive posture that implies guilt/accusation.

---

## Proposed Language Changes

### High-Priority Changes (P0 - Most Guilt-Inducing)

#### Dashboard View

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `<h2>Your Carbon Footprint</h2>` | `<h2>Carbon Accounting Dashboard</h2>` | Removes ownership, emphasizes data literacy |
| "Track your carbon footprint over time" | "Observe emissions trends over time" | Removes surveillance connotation |
| "Compare your highest-emission activities" | "Compare activities by emission intensity" | Removes personal judgment |
| "Your Dashboard" | "Dashboard" OR "Emissions Dashboard" | Drops possessive |

**Alternative for hero section:**
```tsx
// CURRENT (❌):
<h2>Your Carbon Footprint</h2>
<p>Annual Emissions</p>

// PROPOSED (✅):
<h2>Emissions Overview</h2>
<p>Estimated Annual Total</p>
```

#### Onboarding Wizard

| Current | Proposed | Rationale |
|---------|----------|-----------|
| "Let's calculate your carbon footprint" | "Explore carbon accounting fundamentals" OR "Understand emissions data" | Literacy framing |
| "your daily activities" | "common activities" OR "typical activities" | Removes possessive |
| "making your footprint defensible" | "providing auditable, transparent data" | Removes defensive guilt posture |

**Alternative welcome message:**
```tsx
// CURRENT (❌):
<h2>Let's calculate your carbon footprint</h2>
<p>Choose your preferred approach. Both methods give you a complete emissions profile...</p>

// PROPOSED (✅):
<h2>Learn Carbon Accounting</h2>
<p>Compare emission factors across activities and understand carbon data at every scale - from individual activities to global averages.</p>
```

#### Quick Calculator

| Current | Proposed | Rationale |
|---------|----------|-----------|
| "Calculate my footprint" (button) | "Estimate emissions" OR "Quick estimation" | Removes ownership |
| "Your estimated annual footprint" | "Estimated annual emissions" | Removes possessive |
| "You vs average" | "Estimate vs global average" | Neutral comparison |
| "Your footprint is X above..." | "This estimate is X above..." | Removes "your" |
| "Keep up the sustainable habits!" | *(Remove entirely or:)* "This estimate is below the global average." | No moralization |
| "Small changes like reducing meat consumption..." | *(Remove prescriptive advice)* OR "Transportation and diet are major contributors to the total." | Neutral observation, no prescription |

**Alternative results view:**
```tsx
// CURRENT (❌):
<p>Your estimated annual footprint</p>
<span>{footprint} tonnes CO₂</span>

// PROPOSED (✅):
<p>Estimated Annual Emissions</p>
<span>{footprint} tonnes CO₂</span>

// CURRENT JUDGMENT (❌):
"Your footprint is 1.5t above the global average. Small changes like reducing meat consumption or using public transport can make a significant impact."

// PROPOSED NEUTRAL OBSERVATION (✅):
"This estimate is 1.5t above the global average of 4.5t/year. The largest contributors are: transportation (35%), diet (28%), energy (22%), and shopping (15%)."
```

#### Activity Badge Grid

| Current | Proposed | Rationale |
|---------|----------|-----------|
| "Your Impact" (in emissions preview) | "Estimated Impact" OR "Emissions Estimate" | Removes possessive |
| "Add to Your Profile" | "Add to Profile" OR "Add Activity" | Drops possessive |

**Alternative dialog title:**
```tsx
// CURRENT (❌):
<DialogTitle>Add to Your Profile</DialogTitle>
<p>Your Impact</p>

// PROPOSED (✅):
<DialogTitle>Add Activity</DialogTitle>
<p>Estimated Emissions</p>
```

---

### Medium-Priority Changes (P1 - Ambiguous Framing)

#### Home View

| Current | Proposed | Rationale |
|---------|----------|-----------|
| "Global Carbon Footprint Comparison" | "Global Emissions Comparison" | "Footprint" has guilt associations |
| "Compare your emissions against regional and global averages" | "Compare emissions across regions and global averages" | Neutral comparison |

#### Sector View

| Current | Proposed | Rationale |
|---------|----------|-----------|
| "Select activities to add to your profile" | "Select activities to add to profile" OR "Browse and compare activities" | Exploration framing |

---

### Low-Priority Changes (P2 - Acceptable But Could Improve)

#### General Terminology

| Current | Status | Proposed | Rationale |
|---------|--------|----------|-----------|
| "Activity-level tracking" | ⚠️ Ambiguous | "Activity-level analysis" OR "Activity-level data" | "Tracking" → "analysis" |
| "Profile" | ✅ Acceptable | (Keep as-is) | Neutral technical term |
| "Dashboard" | ✅ Acceptable | (Keep as-is) | Neutral technical term |

---

## Messaging Framework

### What Carbon ACX **IS:**
✅ A literacy tool for understanding carbon data
✅ A comparison platform across activities, sectors, and scales
✅ A transparent reference stack with auditable provenance
✅ An educational resource for climate data fluency

### What Carbon ACX **IS NOT:**
❌ A personal blame tool
❌ A behavior modification app
❌ A guilt machine for individual consumers
❌ A prescription service for lifestyle changes

### Tone Guidelines

**✅ DO:**
- Use neutral, observational language
- Emphasize comparison and context
- Focus on understanding and literacy
- Present data without moral judgment
- Use scientific terminology without prescription

**❌ DON'T:**
- Use possessive "your" for emissions/footprint/impact
- Prescribe behavior changes (e.g., "reduce meat consumption")
- Moralize about results (e.g., "keep up the good work!")
- Imply individual responsibility for climate goals
- Use surveillance language ("track your", "monitor your")

**Examples:**

| Context | ❌ Avoid | ✅ Prefer |
|---------|---------|----------|
| Results display | "Your footprint is too high" | "This estimate exceeds the global average" |
| Activity selection | "Reduce your impact by switching activities" | "Compare alternative activities with lower emission factors" |
| Historical data | "Track your progress over time" | "Observe emissions trends over time" |
| Comparisons | "You're doing better than average!" | "This estimate is below the global average" |
| Recommendations | "You should reduce meat consumption" | "Diet accounts for 28% of the total estimate" |

---

## Implementation Plan

### Phase 1: Critical Path (P0 - High Impact, User-Facing)

**Goal:** Remove most guilt-inducing language from primary user flows.

**Files to Modify:**
1. `DashboardView.tsx` - Dashboard header, chart titles, descriptions
2. `OnboardingWizard.tsx` - Welcome message, path descriptions
3. `QuickCalculator.tsx` - Results messaging, judgment removal
4. `ActivityBadgeGrid.tsx` - Dialog titles, impact preview labels
5. `HomeView.tsx` - Hero messaging

**Estimated Effort:** 2-3 hours
**Lines Changed:** ~50-80 lines across 5 files
**Risk:** Low (text-only changes, no logic modifications)

### Phase 2: Polish (P1 - Consistency)

**Goal:** Ensure consistent non-judgmental framing across all views.

**Files to Modify:**
1. `SectorView.tsx` - Activity selection messaging
2. `NavSidebar.tsx` - Navigation labels
3. `ProfilePicker.tsx` - Profile loading messaging
4. Component descriptions throughout

**Estimated Effort:** 1-2 hours
**Lines Changed:** ~30-40 lines
**Risk:** Low

### Phase 3: Terminology Audit (P2 - Future Refinement)

**Goal:** Replace ambiguous terms like "tracking" with "analysis" across codebase.

**Scope:** Variable names, comments, technical documentation
**Estimated Effort:** 2-4 hours
**Risk:** Medium (code changes, not just text)

---

## Testing Strategy

### Linguistic QA Checklist

After implementing changes, verify:
- [ ] No instances of "your footprint" in user-facing text
- [ ] No instances of "your emissions" in user-facing text
- [ ] No instances of "your impact" in user-facing text
- [ ] No prescriptive advice ("you should reduce...")
- [ ] No moralization ("keep it up!", "great job!")
- [ ] No defensive language ("defensible footprint")
- [ ] No surveillance language ("track your", "monitor your")
- [ ] All comparisons use neutral framing ("estimate vs average", not "you vs average")
- [ ] Results messaging presents data without judgment
- [ ] Onboarding emphasizes literacy/understanding, not blame

### Grep Audit Commands

```bash
# Check for problematic patterns
cd apps/carbon-acx-web/src
grep -rn "your footprint" .
grep -rn "your emissions" .
grep -rn "your impact" .
grep -rn "track your" .
grep -rn "reduce your" .
grep -rn "you should" .
grep -rn "you're doing" .
grep -rn "keep up" .
grep -rn "defensible" .
```

**Expected Result:** All grep commands should return 0 matches in user-facing text.

### User Acceptance Criteria

**Before (Current State):**
- User reads: "Your carbon footprint is 7.2t/year - you're above average. Reduce meat consumption to lower your impact."
- **Reaction:** Guilt, defensiveness, aversion to engagement

**After (Target State):**
- User reads: "Estimated annual emissions: 7.2t CO₂. This estimate is 60% above the global average of 4.5t/year. Diet contributes 32% of the total."
- **Reaction:** Curiosity, learning, engagement with data

---

## Messaging Examples

### Example 1: Dashboard Hero Section

**BEFORE (❌ Guilt Machine):**
```tsx
<h2>Your Carbon Footprint</h2>
<p className="text-xs">Annual Emissions</p>
<span>{formatTonnes(totalEmissions)}</span>
```

**AFTER (✅ Literacy Tool):**
```tsx
<h2>Emissions Overview</h2>
<p className="text-xs">Estimated Annual Total</p>
<span>{formatTonnes(totalEmissions)} CO₂</span>
```

---

### Example 2: Quick Calculator Results

**BEFORE (❌ Guilt Machine):**
```tsx
<p>Your estimated annual footprint</p>
<span>{footprint} tonnes CO₂</span>

<p>You vs average</p>
<span>{diff > 0 ? '+' : ''}{diff}t ({percentOfAverage}%)</span>

<p>
  {isAboveAverage
    ? `Your footprint is ${diff}t above the global average. Small changes like
       reducing meat consumption or using public transport can make a significant impact.`
    : `Great! You're ${Math.abs(diff)}t below the global average. Keep up the sustainable habits!`
  }
</p>
```

**AFTER (✅ Literacy Tool):**
```tsx
<p>Estimated Annual Emissions</p>
<span>{footprint} tonnes CO₂</span>

<p>vs Global Average</p>
<span>{diff > 0 ? '+' : ''}{diff}t ({percentOfAverage}%)</span>

<p>
  {isAboveAverage
    ? `This estimate is ${diff}t above the global average of ${globalAverage}t/year.
       The largest contributors are transportation (${breakdown.commute.percent}%) and
       diet (${breakdown.diet.percent}%).`
    : `This estimate is ${Math.abs(diff)}t below the global average of ${globalAverage}t/year.`
  }
</p>
```

**Key Changes:**
- "Your" → "This estimate"
- "You vs average" → "vs Global Average"
- Removed prescriptive advice ("reduce meat consumption")
- Removed moralization ("Keep up the sustainable habits!")
- Added neutral breakdown of contributors

---

### Example 3: Onboarding Welcome

**BEFORE (❌ Guilt Machine):**
```tsx
<h2>Let's calculate your carbon footprint</h2>
<p>
  Choose your preferred approach. Both methods give you a complete emissions profile
  with audit-ready reports.
</p>
```

**AFTER (✅ Literacy Tool):**
```tsx
<h2>Explore Carbon Accounting</h2>
<p>
  Compare emissions across activities, sectors, and scales. Understand carbon data
  with transparent, auditable emission factors from peer-reviewed sources.
</p>
```

**Key Changes:**
- "calculate your carbon footprint" → "Explore Carbon Accounting"
- Emphasis on comparison and understanding, not personal blame
- Highlights transparency and scientific rigor

---

### Example 4: Activity Entry Dialog

**BEFORE (❌ Guilt Machine):**
```tsx
<DialogTitle>Add to Your Profile</DialogTitle>
<DialogDescription>Tell us about your {activity.name}</DialogDescription>

<div className="emissions-preview">
  <p>Your Impact</p>
  <span>{formatKg(emissions)}</span>
</div>
```

**AFTER (✅ Literacy Tool):**
```tsx
<DialogTitle>Add Activity</DialogTitle>
<DialogDescription>Estimate emissions for {activity.name}</DialogDescription>

<div className="emissions-preview">
  <p>Estimated Impact</p>
  <span>{formatKg(emissions)} CO₂</span>
</div>
```

**Key Changes:**
- "Your Profile" → "Profile" (drop possessive)
- "your {activity}" → "{activity}" (neutral)
- "Your Impact" → "Estimated Impact"

---

## Edge Cases & Considerations

### 1. **What about "My Dashboard" vs "Dashboard"?**

**Recommendation:** Use "Dashboard" without possessive.

**Rationale:** While "My Dashboard" is less problematic than "Your Footprint" (user owns the interface, not the problem), consistency is key. "Dashboard" is sufficient.

**Exception:** Navigation breadcrumbs can use "My" for UI ownership:
- ✅ "My Profile" (interface ownership)
- ❌ "My Footprint" (problem ownership)

### 2. **How to handle saved/personal data?**

**Use "Profile" instead of possessive pronouns:**
- ✅ "Save to profile"
- ✅ "Profile activities"
- ✅ "Profile dashboard"
- ❌ "Your saved data"
- ❌ "Your activities"

### 3. **What about community/social features?**

**If comparing users (future feature):**
- ❌ "Your footprint vs John's footprint"
- ✅ "Profile A vs Profile B emissions"
- ✅ "Compare anonymous profiles"

### 4. **How to present actionable insights without prescription?**

**Present data, let users draw conclusions:**
- ❌ "You should switch to public transit to reduce emissions"
- ✅ "Comparative data: private car (250g CO₂/km) vs public transit (45g CO₂/km)"
- ✅ "Switching from car to transit would reduce this activity's emissions by 82%"

**Key:** Present factual comparisons without commanding behavior changes.

---

## Success Metrics

### Quantitative
- [ ] Zero instances of "your footprint" in user-facing text
- [ ] Zero instances of "your emissions" in user-facing text
- [ ] Zero instances of "your impact" in user-facing text
- [ ] Zero prescriptive "you should" statements
- [ ] All comparisons use neutral framing

### Qualitative
- [ ] User feedback reflects curiosity, not guilt
- [ ] Onboarding emphasizes learning, not blame
- [ ] Results messaging is neutral and informative
- [ ] No defensive reactions from users
- [ ] Increased engagement (users spend more time exploring data vs exiting in guilt)

---

## Long-Term Considerations

### 1. **Documentation & Marketing**
Extend this framing to:
- README.md
- Landing pages
- Social media messaging
- Press releases

**Example:**
- ❌ "Track your personal carbon footprint"
- ✅ "Explore transparent carbon accounting data at every scale"

### 2. **API & Developer Messaging**
Maintain neutral framing in:
- API endpoint names (`/api/emissions` not `/api/your-footprint`)
- Response schemas (`profile_emissions` not `your_emissions`)
- Error messages (neutral, informative)

### 3. **Educational Content**
If adding help/docs:
- Emphasize systemic understanding
- Explain why individual footprints are only part of the story
- Contextualize personal vs corporate emissions (70% corporate/industrial)
- Frame Carbon ACX as a transparency tool, not a behavior modifier

---

## References

[1] "The Carbon Footprint Sham" - Fossil fuel companies invented personal carbon footprints to shift blame from corporations to individuals
[2] IPCC AR6 Report - Shows majority of emissions from industrial/corporate sources
[3] User feedback - "We need to be careful not to guilt or blame users as individual consumers"

---

## Appendix: Full Grep Audit Results

**Files with "your footprint":**
- `HomeView.tsx:85` - "Your Footprint" (hero label)
- `HomeView.tsx:109` - "Compare your emissions" (chart description)
- `QuickCalculator.tsx:389` - "Your footprint is X above..." (results message)
- `DashboardView.tsx:303` - "Track your carbon footprint over time"
- `OnboardingWizard.tsx:505` - "making your footprint defensible"
- `OnboardingWizard.tsx:119` - "Let's calculate your carbon footprint"

**Files with "your impact":**
- `ActivityBadgeGrid.tsx:588` - "Your Impact" (emissions preview label)
- `QuickCalculator.tsx:389` - "make a significant impact" (prescriptive advice)

**Files with "your emissions":**
- `HomeView.tsx:109` - "Compare your emissions against..."

**Files with "track your":**
- `DashboardView.tsx:303` - "Track your carbon footprint over time"

**Files with prescriptive/judgmental language:**
- `QuickCalculator.tsx:389` - "reduce meat consumption or using public transport"
- `QuickCalculator.tsx:392` - "Keep up the sustainable habits!"
- `QuickCalculator.tsx:391` - "Consider ways to reduce further to help meet climate goals"

---

**Plan formulated by:** Claude Code (Sonnet 4.5)
**Next steps:** User approval for Phase 1 implementation
**Estimated time to complete Phase 1:** 2-3 hours

---

## Implementation Status

### Phase 1: Critical Path (P0) - ✅ COMPLETE

**PR #239:** https://github.com/chrislyons/carbon-acx/pull/239  
**Status:** ✅ Merged to main (2025-10-24)  
**Commit:** `bd45145` → `0e20057`

**Summary:** All possessive/guilt-inducing language removed from primary user flows.

**Files Modified:**
1. `DashboardView.tsx` - 8 changes (hero, charts, empty state)
2. `QuickCalculator.tsx` - 5 changes (removed all prescriptive advice and moralization)
3. `OnboardingWizard.tsx` - 3 changes (literacy framing)
4. `ActivityBadgeGrid.tsx` - 1 change (impact label)
5. `HomeView.tsx` - 2 changes (hero metrics)

**Verification:**
```bash
# All grep audits pass - zero guilt language remaining
grep -rn "your footprint"  # 0 matches ✅
grep -rn "your emissions"  # 0 matches ✅
grep -rn "your impact"     # 0 matches ✅
grep -rn "track your"      # 0 matches ✅
```

**Build Status:** ✅ TypeScript + Vite passed (2.59s)  
**Bundle Impact:** Stable (~6.3kb brotli)

---

### Phase 2: Consistency (P1) - ⏸️ PENDING

**Goal:** Ensure consistent non-judgmental framing across all views.

**Scope:**
- `SectorView.tsx` - Activity selection messaging
- `NavSidebar.tsx` - Navigation labels
- `ProfilePicker.tsx` - Profile loading messaging
- Component descriptions throughout

**Estimated Effort:** 1-2 hours  
**Status:** Not yet started

---

### Phase 3: Terminology Audit (P2) - ⏸️ PENDING

**Goal:** Replace ambiguous terms like "tracking" with "analysis" across codebase.

**Scope:**
- Variable names
- Code comments
- Technical documentation
- Replace "tracking" with "analysis/observation"

**Estimated Effort:** 2-4 hours  
**Status:** Not yet started

---

## Key Results (Phase 1)

### User-Facing Language Eliminated

**Before Phase 1:**
- 6 instances of "your footprint"
- 2 instances of "your emissions"
- 1 instance of "your impact"
- 1 instance of "track your"
- 1 instance of "keep up the sustainable habits"
- 1 instance of "defensible footprint"
- Multiple prescriptive "you should" statements

**After Phase 1:**
- ✅ 0 instances of any guilt/blame patterns
- ✅ All comparisons use neutral framing
- ✅ No prescriptive advice
- ✅ No moralization
- ✅ Context-based explanations only

### Impact on Core User Flows

**Dashboard:**
- Header: "Your Carbon Footprint" → "Emissions Overview"
- Charts: "Track your carbon footprint" → "Observe emissions trends"
- Activities: "Compare your highest-emission" → "Compare activities by emission intensity"
- Empty state: "Ready to calculate your carbon footprint?" → "Ready to explore carbon accounting?"

**Quick Calculator (Most Critical):**
- Button: "Calculate my footprint" → "Estimate emissions"
- Results: "Your estimated annual footprint" → "Estimated Annual Emissions"
- Comparison: "You vs average" → "vs Global Average"
- Removed: ALL prescriptive advice ("reduce meat consumption", "use public transport")
- Removed: ALL moralization ("Keep up the sustainable habits!", "Great job!")
- Added: Neutral context about global average representation

**Onboarding:**
- Welcome: "Let's calculate your carbon footprint" → "Learn Carbon Accounting"
- Activities: "your daily activities" → "common activities"
- Reports: "making your footprint defensible" → "providing auditable and transparent data"

---

## Lessons Learned (Phase 1)

### What Worked Well

1. **Systematic grep audit** - Caught all instances of guilt language
2. **Text-only changes** - Zero logic modifications = low risk, easy rollback
3. **Comprehensive documentation** - Clear before/after examples for every change
4. **Build verification** - Confirmed no regressions before committing

### Challenges Encountered

1. **QuickCalculator prescriptive advice** - Most egregious guilt language, required complete rewrite of results messaging
2. **Balancing neutrality with engagement** - Ensured neutral language didn't become sterile or boring
3. **Maintaining consistency** - Some files used "your" in some places but not others

### Recommendations for Future Phases

1. **Phase 2 should be quick** - Most critical changes done in Phase 1
2. **Phase 3 requires caution** - Variable renaming could introduce bugs, needs thorough testing
3. **Consider automated linting** - Add ESLint rule to prevent "your footprint" from being reintroduced

---

## Documentation Complete

All documentation updated to reflect Phase 1 completion:
- [x] ACX079.md status updated
- [x] Implementation status section added
- [x] Key results documented
- [x] Lessons learned captured

**Next Actions:** Await user approval before proceeding to Phase 2/3.

