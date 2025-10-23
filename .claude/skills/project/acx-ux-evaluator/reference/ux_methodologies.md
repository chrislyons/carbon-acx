# UX Evaluation Methodologies

This guide provides step-by-step procedures for conducting UX evaluations in Carbon ACX.

---

## 1. Heuristic Evaluation

### Overview
Expert-based inspection method where evaluators examine interfaces against established usability principles (heuristics).

**Best For:**
- Quick usability assessment (2-4 hours)
- Finding obvious usability issues
- Early-stage design review
- Pre-launch quality check

**Not Suitable For:**
- Identifying novel/unexpected user behaviors
- Quantitative metrics
- User preference insights

### Process

#### Step 1: Define Scope
**Questions to Answer:**
- Which interface? (Dash app, React web app, specific feature)
- Which user flows? (onboarding, calculation, reporting, etc.)
- Which heuristics? (Nielsen 1-10 + Carbon ACX 11-14)

**Example Scope:**
```
Interface: React web app activity browser
Flows: Browse activities, filter by layer, view details
Heuristics: All 14 (Nielsen + domain-specific)
Time Budget: 2 hours
```

#### Step 2: Familiarization
**Activities:**
1. Read component code (`ActivityBrowser.tsx`)
2. Run the interface (`pnpm dev`)
3. Experience the flow as a user
4. Take notes on initial impressions

**Time:** 15-30 minutes

#### Step 3: Systematic Evaluation
**For Each Heuristic:**
1. Re-examine interface specifically for that heuristic
2. Document violations with:
   - Heuristic number/name
   - Specific location (file:line)
   - Severity (Critical, High, Medium, Low)
   - Screenshot or code snippet
   - User impact description
   - Recommendation

**Template:**
```markdown
### Finding: [Brief Title]

**Heuristic Violated:** #N - [Name]
**Severity:** [Critical | High | Medium | Low]
**Location:** `file/path.tsx:123-145`

**Issue:**
[Describe what's wrong]

**User Impact:**
[How does this affect users?]

**Recommendation:**
[Specific, actionable fix with code example if applicable]

**Effort:** [Small | Medium | Large]
**Impact:** [High | Medium | Low]
```

**Time:** 60-90 minutes

#### Step 4: Prioritization
**Create Impact/Effort Matrix:**
```
         Low Effort      High Effort
High     Quick Wins      Strategic
Impact   (do first)      Projects

Low      Fill-ins        Time Sinks
Impact   (if time)       (avoid)
```

**Time:** 15-30 minutes

#### Step 5: Report Generation
**Sections:**
1. Executive Summary (3-5 key findings)
2. Methodology (which heuristics, scope)
3. Detailed Findings (each violation)
4. Recommendations Summary (prioritized table)
5. Next Steps (immediate, short-term, long-term)

**Time:** 30-45 minutes

### Example Output
See SKILL.md "Example 1: Activity Browser Heuristic Evaluation"

---

## 2. Cognitive Walkthrough

### Overview
Task-based evaluation method simulating a user's problem-solving process. Focus: learnability for first-time/infrequent users.

**Best For:**
- Evaluating onboarding flows
- Assessing learnability
- Identifying where users get stuck
- Understanding novice user experience

**Not Suitable For:**
- Expert user workflows
- Overall interface assessment
- Performance optimization

### Process

#### Step 1: Preparation
**Define Four Elements:**

1. **Who is the user?**
   - Persona (Sarah, Marcus, Liam - see user_personas.md)
   - Background knowledge (carbon accounting, technical skills)
   - Assumptions/expectations

2. **What is the task?**
   - Specific, achievable goal
   - Example: "Calculate Q3 emissions for coffee shop"
   - NOT vague: "Use the app"

3. **What is correct action sequence?**
   - Step-by-step optimal path
   - Example:
     1. Click "New Calculation"
     2. Select time period (Q3 2024)
     3. Add activities (coffee brewing, electricity, etc.)
     4. Review results
     5. Export report

4. **What experience does user have?**
   - First time using Carbon ACX?
   - Familiar with carbon accounting?
   - Tried similar tools before?

**Time:** 15-30 minutes

#### Step 2: Action-by-Action Walkthrough
**For Each Step, Ask Four Questions:**

**Q1: Will the user try to achieve the right effect?**
- Does the user's goal at this point match what the action accomplishes?
- Example: User wants to "add coffee brewing" → Correct action: click "Add Activity"
  - ✅ Yes, if user understands activities are building blocks
  - ❌ No, if user expects pre-calculated coffee shop template

**Q2: Will the user notice that the correct action is available?**
- Is the control visible?
- Is it above the fold, or requires scrolling?
- Example: "Add Activity" button
  - ✅ Yes, if prominently placed at top
  - ❌ No, if buried in dropdown menu

**Q3: Will the user associate the correct action with the effect they're trying to achieve?**
- Does the label/icon clearly indicate what the action does?
- Example: Button labeled "Add Activity"
  - ✅ Yes, clear action verb + object
  - ❌ No, if labeled "New +" (ambiguous what "new" means)

**Q4: If the correct action is performed, will the user see that progress is being made?**
- Is there feedback that action succeeded?
- Example: After clicking "Add Activity"
  - ✅ Yes, if form appears with "New Activity" header
  - ❌ No, if nothing happens (loading silently)

**Document Findings:**
```markdown
### Step 3: Add coffee brewing activity

**User Goal:** Add coffee shop's main activity (brewing coffee)

**Q1: Will user try to achieve right effect?**
❌ **Issue:** User expects to search for "coffee shop" template, not add individual activities.
**Impact:** User may be confused about granularity (one activity vs. many).

**Q2: Will user notice correct action?**
✅ "Add Activity" button is visible at top of page.

**Q3: Will user associate action with effect?**
⚠️ **Issue:** Button says "Add Activity" but doesn't clarify what an activity is.
**Impact:** New users may hesitate, unsure if they're doing it right.

**Q4: Will user see progress?**
✅ Form appears immediately with clear "New Activity" header.

**Recommendations:**
1. Add tooltip to "Add Activity": "Activities are emissions sources (e.g., coffee brewing, electricity)"
2. Consider "Quick Start" wizard suggesting common activities for coffee shops
```

**Time:** 60-120 minutes (depends on flow complexity)

#### Step 3: Summarize Friction Points
**Categorize Issues:**
- **Blockers:** User cannot proceed (critical)
- **Friction:** User can proceed but with difficulty (high/medium)
- **Confusion:** User can proceed but feels uncertain (low)

**Estimate Task Completion Likelihood:**
```
% Likelihood of Success:
- 0-25%: Critical issues, likely abandonment
- 26-50%: Major friction, user needs help
- 51-75%: Moderate friction, determined users succeed
- 76-100%: Minor issues, most users succeed
```

**Time:** 15-30 minutes

#### Step 4: Recommendations
**For Each Friction Point:**
- Specific UI change
- Effort estimate
- Expected impact on learnability

**Prioritize:**
1. Blockers first (enable task completion)
2. High-friction points (reduce frustration)
3. Confusion points (improve confidence)

**Time:** 30 minutes

### Example Output
See SKILL.md "Example 2: Cognitive Walkthrough for First Report"

---

## 3. User Journey Mapping

### Overview
Visualize end-to-end user experience across all touchpoints, including actions, thoughts, emotions, and pain points.

**Best For:**
- Understanding holistic experience
- Identifying pain points across touchpoints
- Aligning team on user perspective
- Prioritizing improvements by journey stage

**Not Suitable For:**
- Detailed interaction design
- Specific UI fixes
- Quantitative metrics

### Process

#### Step 1: Define Journey Scope
**Questions:**
- Which persona? (Sarah, Marcus, Liam)
- Which journey? (e.g., "Sarah's first month using Carbon ACX")
- What's the trigger? (e.g., "Manager asks for Q3 emissions report")
- What's the end state? (e.g., "Report delivered to stakeholders")

**Example Scope:**
```
Persona: Sarah (Sustainability Analyst)
Journey: First month with Carbon ACX
Trigger: Started new job, manager requests carbon report
End State: Quarterly report delivered, Sarah feels confident
Timeline: Day 1 → Month 1
```

**Time:** 15 minutes

#### Step 2: Identify Stages
**Common Journey Stages:**
1. **Awareness:** How user learns about tool
2. **Consideration:** Evaluating if tool fits needs
3. **Onboarding:** First-time setup and learning
4. **Adoption:** Daily/weekly usage patterns
5. **Mastery:** Becoming power user
6. **Advocacy:** Recommending to others (or churning)

**Example for Sarah:**
1. Discovery (Week 1, Day 1)
2. Initial Setup (Week 1, Day 1-2)
3. First Calculation (Week 1, Day 3-5)
4. Daily Use (Week 2-3)
5. First Report (Week 4)

**Time:** 15 minutes

#### Step 3: Map Each Stage
**For Each Stage, Document:**

**Actions:**
- What user does (concrete steps)
- Example: "Searches for emission factors", "Adds 20 activities"

**Touchpoints:**
- Where interaction happens
- Example: "React web app", "Dash analytics", "Email support", "Documentation site"

**Thoughts:**
- What user is thinking (internal monologue)
- Example: "Is this the right emission factor?", "Why is this so complicated?"

**Emotions:**
- How user feels (1-5 scale: frustrated → delighted)
- Example: Curious (3/5), Confused (2/5), Confident (4/5)

**Pain Points:**
- What goes wrong or causes friction
- Example: "Can't find emission factor for specialty coffee", "Export is manual"

**Opportunities:**
- How to improve this stage
- Example: "Suggest emission factors based on industry", "One-click export"

**Template:**
```markdown
### Stage 2: Initial Setup (Day 1-2)

**Actions:**
- Create account
- Add organization details
- Import first activities (manual entry)
- Search for emission factors

**Touchpoints:**
- Sign-up page
- Onboarding wizard (missing!)
- Activity browser
- Documentation (external)

**Thoughts:**
- "Where do I start?"
- "Do I add all activities at once or one at a time?"
- "Which emission factor should I use?"
- "Is my data secure?"

**Emotions:**
😐 Neutral → 😕 Confused → 😟 Overwhelmed
(Emotion score: 2.5/5 - more frustrated than delighted)

**Pain Points:**
1. No guided onboarding (dumps user on dashboard)
2. Unclear what "activity" means (too technical)
3. Emission factor library is hard to search
4. No example data to explore

**Opportunities:**
1. **Add onboarding wizard** with sample data and guided tour
2. **Inline help** explaining carbon accounting concepts
3. **Smart emission factor suggestions** based on activity type
4. **Progress tracker** showing setup completion (e.g., "2 of 5 steps done")

**Evidence/Quotes:**
- User feedback: "I didn't know where to start. Too many options."
- Support ticket: "What's the difference between activity and emission factor?"
```

**Time:** 60-90 minutes for full journey

#### Step 4: Visualize Journey
**Create Visual Map:**

```
Stage:      Discovery    Setup        First Calc   Daily Use   Reporting
           ────────────────────────────────────────────────────────────►

Actions:    Find tool    Add org      Select       Update      Generate
            Sign up      Add acts     time period  quantities  export

Emotion:    😊 4/5       😕 2/5       😟 2/5       😐 3/5      😊 4/5
                         ↓                         ↓            ↑
Pain        None         Confusing    Unclear      Repetitive  Manual
Points:                  setup        factors      data entry  formatting

Opps:       ─            Onboarding   Smart        Bulk        One-click
                         wizard       defaults     import      export
```

**Tools:**
- Text-based (markdown tables)
- Visual (Miro, Figma, Mural)
- Code (mermaid diagrams)

**Time:** 30 minutes

#### Step 5: Prioritize Improvements
**Using Journey Insights:**
- Which stages have lowest emotion scores? (prioritize)
- Which pain points affect multiple stages? (systemic issues)
- Which opportunities have highest impact? (quick wins)

**Create Roadmap:**
```markdown
## Immediate (Critical Pain Points)
- [ ] Add onboarding wizard (impacts Setup stage, 2/5 → 4/5 emotion)
- [ ] Smart emission factor suggestions (impacts First Calc, 2/5 → 3.5/5)

## Short-Term (Major Friction)
- [ ] Bulk activity import (impacts Daily Use, 3/5 → 4/5)
- [ ] One-click report export (impacts Reporting, 4/5 → 4.5/5)

## Long-Term (Enhancements)
- [ ] In-app tutorials and videos (improves Mastery)
- [ ] Mobile app for field work (new touchpoint)
```

**Time:** 30 minutes

### Example Output Format
```markdown
# User Journey Map: Sarah's First Month

**Persona:** Sarah - Sustainability Analyst
**Trigger:** New job, manager requests Q3 emissions report
**Timeline:** Day 1 → Month 1 (4 weeks)

## Journey Overview
[Visual diagram or table]

## Stage-by-Stage Analysis
[Detailed analysis for each stage]

## Key Insights
1. **Biggest Pain Point:** Setup stage (emotion: 2/5) - no onboarding
2. **Highest Delight:** Reporting stage (emotion: 4/5) - export works well
3. **Systemic Issue:** Jargon throughout journey (activity, scope, layer unclear)

## Recommended Improvements
[Prioritized roadmap]
```

---

## 4. Task-Based Usability Analysis

### Overview
Evaluate how well interface supports specific user tasks by measuring success rate, efficiency, and satisfaction.

**Best For:**
- Evaluating critical user tasks
- Comparing design alternatives
- Setting usability benchmarks
- Identifying task completion blockers

**Not Suitable For:**
- Exploratory/open-ended workflows
- Overall aesthetic evaluation
- Brand perception

### Process

#### Step 1: Identify Critical Tasks
**For Carbon ACX, Common Critical Tasks:**

**Sarah (Analyst):**
1. Add new activity with emission factor
2. Calculate emissions for time period
3. Filter activities by layer
4. Export calculation results
5. Trace emission factor provenance

**Marcus (CFO):**
1. View total emissions (dashboard)
2. Check progress vs. target
3. Export executive summary

**Liam (Auditor):**
1. Verify emission factor source
2. Reproduce calculation
3. Export audit trail

**Select 3-5 Most Critical:**
- Frequency (daily vs. quarterly)
- Importance (compliance-critical vs. nice-to-have)
- User impact (blocks vs. inconvenience)

**Time:** 15 minutes

#### Step 2: Define Success Criteria
**For Each Task, Define:**

**Task Completion:**
- Can user finish task?
- Metrics: % completion rate
- Target: >90% for critical tasks

**Task Efficiency:**
- How long does it take?
- Metrics: Time on task, # of steps, # of errors
- Target: <5 minutes for routine tasks

**Task Satisfaction:**
- How does user feel?
- Metrics: Subjective rating (1-5), frustration points
- Target: >4/5 satisfaction

**Example:**
```
Task: Add new activity with emission factor

Success Criteria:
- Completion Rate: >95% (critical, can't use tool otherwise)
- Time on Task: <3 minutes (first time), <1 minute (repeat)
- Steps: <6 clicks
- Errors: <1 error per attempt
- Satisfaction: >4/5 ("easy" or "very easy")
```

**Time:** 15-30 minutes

#### Step 3: Walk Through Task
**Simulate Task Execution:**
1. Start from realistic entry point (not ideal path)
2. Document each action (clicks, typing, waits)
3. Note errors and friction
4. Time the flow (estimate)

**Document:**
```markdown
### Task: Add new activity with emission factor

**Persona:** Sarah (first-time user)
**Entry Point:** Dashboard (just logged in)

**Steps:**
1. (Dashboard) Look for "Add Activity" or similar
   - **Issue:** Multiple options visible: "Activities", "Layers", "Reports"
   - **Action:** Clicks "Activities" (correct)
   - **Time:** +5s (scanning options)

2. (Activity List) Look for "Add" button
   - **Action:** Clicks "Add Activity" button (top right)
   - **Time:** +2s
   - **Feedback:** Form appears ✓

3. (Activity Form) Fill in activity details
   - **Issue:** "Activity ID" field - unclear format
   - **Action:** Types "coffee-brewing" (guesses)
   - **Time:** +10s
   - **Error:** Validation error "Must match pattern: CATEGORY.ITEM"

4. (Activity Form) Fix activity ID
   - **Action:** Changes to "COFFEE.12OZ" (trial and error)
   - **Time:** +8s
   - **Feedback:** Validation passes ✓

5. (Activity Form) Fill in emission factor
   - **Issue:** Expects emission factor value (doesn't know it)
   - **Action:** Searches Google for "coffee emission factor"
   - **Time:** +60s (external)
   - **Note:** Left the app (high friction)

6. (Activity Form) Enter emission factor
   - **Action:** Enters "0.15" kgCO2e/cup (from Google)
   - **Time:** +5s
   - **Issue:** Unsure if this is correct source

7. (Activity Form) Submit
   - **Action:** Clicks "Save"
   - **Time:** +2s
   - **Feedback:** Activity appears in list ✓

**Total Time:** 92 seconds (1.5 minutes)
**Errors:** 1 (activity ID format)
**External Dependencies:** 1 (Google search)
**Completion:** ✓ Yes (but with friction)
```

**Time:** 30-60 minutes for 3-5 tasks

#### Step 4: Identify Failure Points
**Categorize Issues:**

**Blockers (task cannot be completed):**
- Missing required functionality
- Errors with no recovery path
- Example: "Can't save activity - button disabled, no error shown"

**Friction (task harder than necessary):**
- Unclear labels/instructions
- Unnecessary steps
- Poor error messages
- Example: "Activity ID validation error is cryptic"

**Suboptimal (works but could be better):**
- Slow interactions
- Repetitive actions
- Lack of shortcuts
- Example: "Must Google emission factors instead of using built-in library"

**Time:** 15 minutes

#### Step 5: Calculate Metrics & Recommendations
**Summary Table:**
```markdown
| Task | Completion | Time | Errors | Satisfaction | Priority |
|------|-----------|------|--------|--------------|----------|
| Add activity | 100% | 92s | 1 | 2/5 | High |
| Calculate emissions | 80% | 180s | 2 | 3/5 | Critical |
| Filter by layer | 100% | 15s | 0 | 4/5 | Low |
| Export results | 100% | 30s | 0 | 4/5 | Low |
| Trace provenance | 40% | N/A | N/A | 1/5 | Critical |

**Analysis:**
- **Critical Issue:** Only 40% complete provenance tracing (compliance risk!)
- **High Friction:** Add activity takes 92s with 1 error (should be <30s, 0 errors)
- **Working Well:** Filter and export are efficient and satisfying
```

**Recommendations:**
```markdown
## Critical (P0)
1. **Fix provenance tracing** (40% → 95% completion)
   - Add "View Source" link to every emission factor
   - Show citation in-line, not requiring navigation

## High (P1)
2. **Simplify activity creation** (92s → 30s)
   - Auto-generate activity ID from name
   - Suggest emission factors from library (no Google needed)
   - Improve validation error messages

## Medium (P2)
3. **Optimize calculation flow** (180s → 60s)
   - Pre-fill time period with current quarter
   - Remember last-used settings
```

**Time:** 30 minutes

### Example Output
```markdown
# Task-Based Usability Analysis

**Date:** 2025-10-22
**Persona:** Sarah (Sustainability Analyst)
**Tasks Evaluated:** 5 critical tasks

## Summary Metrics
[Table with completion, time, errors, satisfaction]

## Task Walkthroughs
[Detailed step-by-step for each task]

## Findings & Recommendations
[Prioritized by severity]
```

---

## 5. UX Flow Audit

### Overview
Analyze interaction sequences, state transitions, and navigation paths to identify flow issues (dead ends, loops, unclear paths).

**Best For:**
- Multi-step workflows
- State-heavy interfaces
- Navigation structure analysis
- Identifying dead ends and loops

**Not Suitable For:**
- Static pages (no flow)
- Single-action interfaces
- Visual design evaluation

### Process

#### Step 1: Map the Flow
**Identify:**
- **Entry Points:** How users enter the flow
- **Steps:** Each screen/state in the flow
- **Decision Points:** Where flow branches
- **Exit Points:** How flow ends (success, abandonment, error)

**Diagram Format:**
```
[Entry] → [Step 1] → [Decision] ─┬→ [Path A] → [Success]
                                  │
                                  └→ [Path B] → [Error] → [Recovery?]
```

**Example: Report Generation Flow**
```
[Dashboard]
    ↓ (click "Generate Report")
[Select Time Period]
    ↓ (choose Q3 2024)
[Select Activities] ─┬→ (select from list) → [Review]
                     └→ (import CSV) → [Validate CSV] ─┬→ [Review]
                                                       └→ [Error] → ?

[Review]
    ↓ (click "Generate")
[Calculating...] ─┬→ [Results] → [Export Options] → [Complete ✓]
                  └→ [Error] → ? (dead end?)
```

**Time:** 30-45 minutes

#### Step 2: Analyze Flow Characteristics
**Check For:**

**Linear vs. Non-Linear:**
- Linear: Step 1 → 2 → 3 (wizard)
- Non-linear: Hub-and-spoke, freeform

**Clarity:**
- Is the current step clear?
- Is next action obvious?
- Can user see progress?

**Reversibility:**
- Can user go back?
- Can user skip steps?
- Can user save and resume?

**Error Handling:**
- What happens if step fails?
- Can user recover?
- Are errors explained clearly?

**Example Analysis:**
```markdown
### Flow: Report Generation

**Type:** Linear with branching (wizard-like)

**Clarity:**
✅ Current step shown in breadcrumb
❌ No indication of total steps (step 2 of ?)
❌ "Review" step doesn't explain what to review

**Reversibility:**
⚠️ "Back" button exists but unclear if changes are saved
❌ Can't skip steps (even if user knows what they want)
❌ No save-and-resume (must complete in one session)

**Error Handling:**
❌ **Critical:** If calculation fails, no recovery path (dead end!)
⚠️ CSV validation errors shown, but user can't fix and retry
```

**Time:** 30 minutes

#### Step 3: Identify Flow Issues
**Common Problems:**

**Dead Ends:**
- Flow terminates with no next action
- Example: Error page with no "Try Again" button

**Loops:**
- User repeats same steps unnecessarily
- Example: Must re-enter data after error

**Unclear Paths:**
- User doesn't know what to do next
- Example: "Review" step with no guidance

**Forced Paths:**
- User must complete unnecessary steps
- Example: Can't skip onboarding even as expert

**Missing Paths:**
- No way to accomplish valid user goal
- Example: Can't edit report after generation (must start over)

**Document:**
```markdown
### Issue 1: Dead End on Calculation Error [Critical]

**Location:** Report Generation → Calculating → Error

**Flow:**
[Review] → [Calculating...] → [Error: "Calculation failed"] → ❌ (dead end)

**Problem:**
- No "Try Again" button
- No indication of what went wrong
- No way to fix without starting over

**User Impact:**
- Loses all work (time period, activity selection)
- Doesn't know if it's a temporary error or data problem
- Likely to abandon task

**Recommendation:**
```tsx
<ErrorState
  title="Calculation Failed"
  message="One or more activities are missing emission factors."
  actions={[
    <Button onClick={retry}>Try Again</Button>,
    <Button onClick={fixActivities}>Fix Missing Data</Button>,
    <Button variant="ghost" onClick={goBack}>Go Back</Button>
  ]}
/>
```

**Effort:** Small (2-3 hours)
**Priority:** Critical (blocks task completion)
```

**Time:** 30-60 minutes

#### Step 4: Evaluate State Management
**Questions:**

**Persistence:**
- What data persists between steps?
- What's lost if user refreshes page?
- Can user resume where they left off?

**Consistency:**
- Does UI reflect current state accurately?
- Can state get out of sync (frontend vs backend)?

**Clarity:**
- Can user see current state (selected options, filters, etc.)?
- Is state change feedback immediate?

**Example:**
```markdown
### State Management Analysis

**Persistence:**
❌ No auto-save - user loses work if browser crashes
✅ Selected time period persists in URL params
❌ Activity selections lost on refresh

**Consistency:**
⚠️ Filter state sometimes doesn't match displayed data (bug)
✅ Loading states prevent interactions during async operations

**Clarity:**
✅ Selected items highlighted in list
❌ No indication of unsaved changes (should show "draft" or "•" indicator)
```

**Time:** 15-30 minutes

#### Step 5: Recommendations
**Prioritize:**
1. Dead ends (critical - users get stuck)
2. Error paths (high - poor experience)
3. Forced unnecessary steps (medium - efficiency)
4. Missing convenience features (low - enhancements)

**Example Output:**
```markdown
## UX Flow Audit: Report Generation

**Flow Analyzed:** Dashboard → Report Generation → Export

### Flow Diagram
[Visual diagram or mermaid code]

### Findings

#### Critical Issues
1. Dead end on calculation error (no recovery)
2. No save-and-resume (loses work on refresh)

#### High Priority
3. Unclear "Review" step (what to review?)
4. Can't edit report post-generation (must regenerate)

#### Medium Priority
5. Forced linear flow (experts can't skip steps)
6. No progress indicator (step X of Y)

### Recommendations
[Prioritized action items with effort estimates]
```

---

## Methodology Selection Guide

| Use Case | Best Methodology |
|----------|------------------|
| Quick usability check | Heuristic Evaluation |
| Onboarding evaluation | Cognitive Walkthrough |
| Understanding user experience holistically | User Journey Mapping |
| Measuring task success | Task-Based Usability Analysis |
| Multi-step workflow issues | UX Flow Audit |
| Finding obvious issues fast | Heuristic Evaluation |
| Testing with real users | (Not covered - requires actual users) |
| Quantitative metrics | (Not covered - requires analytics) |

---

## Combining Methodologies

**Recommended Combos:**

**1. Full UX Audit:**
- Start: Heuristic Evaluation (find obvious issues)
- Then: Task-Based Analysis (critical tasks)
- Then: UX Flow Audit (multi-step workflows)
- Time: 6-8 hours

**2. Onboarding Optimization:**
- Start: User Journey Mapping (first week experience)
- Then: Cognitive Walkthrough (specific onboarding tasks)
- Time: 3-4 hours

**3. Feature Launch Prep:**
- Start: Heuristic Evaluation (quality check)
- Then: Task-Based Analysis (verify key tasks work)
- Time: 3-4 hours

---

**Last Updated:** 2025-10-22
**Version:** 1.0.0
