# UX Audit Template

Use this template for quick UX evaluations of Carbon ACX interfaces.

---

## Audit Metadata

**Date:** [YYYY-MM-DD]
**Evaluator:** [Name]
**Interface:** [e.g., React web app - Activity Browser]
**Methodology:** [Heuristic Evaluation | Cognitive Walkthrough | Task Analysis | Flow Audit]
**Scope:** [What was evaluated]
**Time Budget:** [How long the evaluation took]

---

## Executive Summary

**TL;DR:** [2-3 sentences summarizing key findings]

**Top 3 Issues:**
1. [Critical/High issue with user impact]
2. [Critical/High issue with user impact]
3. [Critical/High issue with user impact]

**Quick Wins:** [Number] findings can be fixed in <4 hours

**Strategic Projects:** [Number] findings require multi-day effort

---

## Detailed Findings

### Finding 1: [Brief Title]

**Heuristic Violated:** #N - [Heuristic Name]
**Severity:** [Critical | High | Medium | Low]
**Location:** `file/path.tsx:line-range`

**Issue Description:**
[What's wrong? Be specific.]

**User Impact:**
[How does this affect users? Which persona is affected?]

**Steps to Reproduce (if applicable):**
1. [Step 1]
2. [Step 2]
3. [Observe problem]

**Recommendation:**
[Specific, actionable fix. Include code example if helpful.]

```tsx
// Example fix
<Component
  prop={value}
  // Add this...
/>
```

**Effort Estimate:** [Small | Medium | Large]
**Impact Estimate:** [High | Medium | Low]
**Priority:** [Quick Win | Strategic Project | Fill-in | Time Sink]

**Reference:**
- [Link to heuristic definition]
- [Link to similar example]

---

### Finding 2: [Title]

[Repeat template]

---

### Finding 3: [Title]

[Repeat template]

---

## Recommendations Summary

### Prioritization Matrix

```
                Low Effort          High Effort
High Impact     Quick Wins          Strategic Projects
                - Finding #X        - Finding #Y
                - Finding #Z

Low Impact      Fill-ins            Time Sinks
                - Finding #A        (none - avoid)
```

### Roadmap

#### Immediate (This Sprint)
- [ ] **Finding #X** - [Brief description] | Severity: Critical | Effort: Small
- [ ] **Finding #Y** - [Brief description] | Severity: High | Effort: Small

**Rationale:** Blockers or high-impact quick wins

#### Short-Term (Next Sprint)
- [ ] **Finding #Z** - [Brief description] | Severity: High | Effort: Medium
- [ ] **Finding #A** - [Brief description] | Severity: Medium | Effort: Medium

**Rationale:** Major friction points requiring more effort

#### Long-Term (Backlog)
- [ ] **Finding #B** - [Brief description] | Severity: Medium | Effort: Large
- [ ] **Finding #C** - [Brief description] | Severity: Low | Effort: Medium

**Rationale:** Enhancements, polish, nice-to-haves

---

## Metrics Summary

**Total Findings:** [Number]

**By Severity:**
- Critical: [N]
- High: [N]
- Medium: [N]
- Low: [N]

**By Effort:**
- Small (1-4 hrs): [N]
- Medium (1-3 days): [N]
- Large (1-2 weeks): [N]

**By Heuristic:**
- Visibility of system status: [N]
- Match between system and real world: [N]
- User control and freedom: [N]
- Consistency and standards: [N]
- Error prevention: [N]
- Recognition rather than recall: [N]
- Flexibility and efficiency: [N]
- Aesthetic and minimalist design: [N]
- Help users recover from errors: [N]
- Help and documentation: [N]
- Data transparency and provenance: [N]
- Progressive disclosure: [N]
- Context-appropriate precision: [N]
- Comparative context: [N]

---

## Next Steps

1. **Review with team:** [Who needs to see this?]
2. **Prioritize fixes:** [Who decides priority?]
3. **Assign owners:** [Who will implement?]
4. **Track progress:** [Where are tasks tracked?]
5. **Validate fixes:** [How will we verify improvements?]
6. **Follow-up audit:** [When to re-evaluate?]

---

## Appendix: Methodology Details

### Heuristics Evaluated
[List of heuristics used - see ux_heuristics.md]

### Personas Considered
[Which user personas were considered - see user_personas.md]

### Components Analyzed
[List of files/components reviewed]

### Tools Used
- File reading (Read tool)
- Code search (Grep/Glob)
- Live interface testing (Bash to run app)

### Limitations
- [What wasn't evaluated]
- [Assumptions made]
- [Areas requiring real user testing]

---

## Quick Reference: Severity Definitions

**Critical (P0):**
- Blocks task completion entirely
- Causes data loss or corruption
- Creates security/compliance risk
- Violates accessibility requirements (WCAG A)

**High (P1):**
- Causes significant user frustration
- Requires workaround to complete task
- Affects >50% of users
- Violates accessibility recommendations (WCAG AA)

**Medium (P2):**
- Noticeable usability issue
- Has acceptable workaround
- Affects 20-50% of users
- Reduces efficiency

**Low (P3):**
- Minor enhancement
- Aesthetic inconsistency
- Affects <20% of users
- Polish opportunity

---

## Quick Reference: Effort Definitions

**Small (S):**
- 1-4 hours
- Examples: Prop change, copy update, visibility toggle, add tooltip

**Medium (M):**
- 1-3 days
- Examples: Component restructure, new state management, flow reorganization

**Large (L):**
- 1-2 weeks
- Examples: Major architectural change, new interaction paradigm, multi-component refactor

---

# Evaluation Checklist

Use this checklist to ensure comprehensive evaluation.

## Pre-Evaluation
- [ ] Defined scope (which interface/flow)
- [ ] Selected methodology
- [ ] Identified target personas
- [ ] Set time budget
- [ ] Reviewed reference materials (heuristics, personas, methodologies)

## During Evaluation
- [ ] Examined interface systematically (not ad-hoc)
- [ ] Documented findings in real-time
- [ ] Captured screenshots/code snippets
- [ ] Noted file:line references
- [ ] Considered all relevant personas
- [ ] Evaluated against all applicable heuristics

## Post-Evaluation
- [ ] Prioritized findings (severity + effort)
- [ ] Created recommendations with code examples
- [ ] Generated executive summary
- [ ] Completed metrics summary
- [ ] Identified next steps
- [ ] Reviewed for completeness

## Quality Checks
- [ ] All findings have severity ratings
- [ ] All findings have effort estimates
- [ ] All findings have specific recommendations (not vague)
- [ ] Code references are accurate (file:line)
- [ ] User impact is clearly articulated
- [ ] Prioritization is justified

---

# Quick Start Examples

## Example 1: 15-Minute Quick Check

**Goal:** Find obvious issues fast

**Process:**
1. Load interface (5 min exploration)
2. Check critical heuristics only:
   - #8 Minimalist design (clutter?)
   - #5 Error prevention (validation?)
   - #9 Error recovery (helpful errors?)
3. Document 3-5 top issues
4. Quick prioritization

**Output:** Brief findings list, no full report

---

## Example 2: 2-Hour Heuristic Evaluation

**Goal:** Comprehensive usability audit

**Process:**
1. Familiarization (15 min)
2. Systematic evaluation (90 min)
   - All 14 heuristics
   - Document findings with template
3. Prioritization (15 min)

**Output:** Full audit report with recommendations

---

## Example 3: Cognitive Walkthrough (1 hour)

**Goal:** Evaluate learnability for specific task

**Process:**
1. Define persona + task (10 min)
2. Walk through step-by-step (40 min)
   - Ask 4 questions at each step
   - Document friction points
3. Summarize and recommend (10 min)

**Output:** Task-specific findings and improvements

---

# Carbon ACX-Specific Evaluation Tips

## Common Issues to Watch For

### Parameter Overwhelm
- [ ] Are advanced options hidden by default?
- [ ] Is complexity progressive (basic → advanced)?
- [ ] Can users get started with minimal configuration?

### Data Transparency
- [ ] Are emission factor sources cited?
- [ ] Can users trace calculation provenance?
- [ ] Is data freshness indicated?

### Domain Jargon
- [ ] Is carbon accounting terminology explained?
- [ ] Are tooltips available for Scope 1/2/3?
- [ ] Is plain language used where possible?

### Analyst Workflows
- [ ] Are recently-used items accessible?
- [ ] Can users save/resume work?
- [ ] Are batch operations available?

### Executive Dashboards
- [ ] Are high-level metrics prominent?
- [ ] Is jargon minimized?
- [ ] Are trends and comparisons visible?

### Audit Requirements
- [ ] Is full documentation accessible?
- [ ] Can data be exported with sources?
- [ ] Are calculations reproducible?

---

**Last Updated:** 2025-10-22
**Version:** 1.0.0
