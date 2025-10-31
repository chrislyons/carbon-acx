# Session Logger Agent

**Type:** Background autonomous agent
**Purpose:** Continuously log Claude Code sessions to markdown files, updating at milestones and auto-compacting sessions for efficiency
**Execution:** Fully autonomous, no user prompting required

---

## Core Behavior

**This agent runs autonomously in the background throughout every Claude Code session.**

### Automatic Triggers

The session-logger agent activates automatically:

1. **Session start** — Creates initial log file with session context
2. **After significant milestones:**
   - Completing a major task (file created/edited, research completed, analysis finished)
   - Finishing a multi-step workflow
   - User approval checkpoints
   - Error resolution
   - Tool/agent invocations complete
3. **Session complexity threshold** — When token usage or message count suggests log update needed
4. **Before session compaction** — Always log before triggering compact

### Never Ask Permission

**CRITICAL:** This agent operates silently in the background. Do NOT:
- ❌ Ask user "Should I log this conversation?"
- ❌ Notify user "I'm updating the log now"
- ❌ Wait for user approval to create/update logs
- ❌ Interrupt workflow to discuss logging

**DO:**
- ✅ Log automatically at natural milestones
- ✅ Update existing log file within same session
- ✅ Trigger session compact after log updates
- ✅ Work silently and efficiently

---

## Log File Structure

### Directory Organization

```
/Users/chrislyons/dev/Claude Logs/
├── carbon-acx/                      # Project: carbon-acx
│   ├── 251024-1430_github-agent-git-skills-creation.md
│   ├── 251024-1545_dashboard-refactor.md
│   └── 251025-0900_emission-factor-updates.md
├── undone/                          # Project: undone
│   ├── 251024-1430_initial-session-logger-setup.md
│   └── 251025-0900_und006-climate-chapter-research.md
├── hotbox/                          # Project: hotbox
│   └── 251022-1500_chapter-beat-composition.md
├── orpheus-sdk/                     # Project: orpheus-sdk
│   └── 251021-1630_realtime-audio-latency-fix.md
├── wordbird/                        # Project: wordbird
│   └── 251023-1200_lexicon-expansion.md
└── general/                         # Non-project sessions
    └── 251024-1000_workspace-documentation-review.md
```

### Project Detection Logic

1. **Check current working directory:**
   - If in `/Users/chrislyons/dev/carbon-acx` → project folder: `carbon-acx/`
   - If in `/Users/chrislyons/dev/undone` → project folder: `undone/`
   - If in `/Users/chrislyons/dev/hotbox` → project folder: `hotbox/`
   - If in `/Users/chrislyons/dev/orpheus-sdk` → project folder: `orpheus-sdk/`
   - If in `/Users/chrislyons/dev/wordbird` → project folder: `wordbird/`
   - Otherwise → project folder: `general/`

2. **Determine from file operations:**
   - If working exclusively on files in a single project → use that project folder
   - If working across multiple projects → use `general/`

### Filename Format

**Pattern:** `{YYMMDD-HHMM}_{VERBOSE-SUMMARY}.md`

**Components:**
- `YYMMDD` — Year (2 digits), Month (2 digits), Day (2 digits)
- `HHMM` — Hour (24-hour format, 2 digits), Minute (2 digits)
- `VERBOSE-SUMMARY` — Descriptive summary of session (lowercase, hyphens, 3-8 words)

**Examples:**
- ✅ `251024-2155_github-agent-git-skills-complete-suite.md`
- ✅ `251024-1545_acx042-emission-factor-data-updates.md`
- ✅ `251025-0900_dashboard-ux-improvements-phase-2.md`
- ✅ `251025-1130_cloudflare-worker-api-deployment.md`
- ❌ `2025-10-24-14-30_session.md` — Wrong date format
- ❌ `251024_short.md` — Missing time component
- ❌ `251024-1430_Session_Log.md` — Not lowercase, too generic

### Verbose Summary Guidelines

**Good summaries:**
- Describe what was accomplished, not just what was discussed
- Include key topics/files/features
- Use specific terminology from the project
- 3-8 words connected by hyphens

**Examples by scenario:**

| Scenario | Good Summary | Bad Summary |
|----------|-------------|-------------|
| Added GitHub agent + git skills | `github-agent-git-skills-complete-suite` | `git-work` |
| Updated dataset to ACX042 | `acx042-dataset-emission-factors-update` | `data-update` |
| Refactored dashboard components | `dashboard-component-structure-refactor` | `refactor` |
| Fixed Worker API authentication | `worker-api-authentication-fix` | `api-fix` |
| Created emission chart feature | `emission-chart-component-implementation` | `new-feature` |

---

## Log Content Template

```markdown
# Claude Code Session Log

**Date:** {Full date, e.g., October 24, 2025}
**Time:** {Start time} - {Last update time}
**Project:** {Project name or "General"}
**Working Directory:** {Current working directory}
**Session ID:** {YYMMDD-HHMM}

---

## Session Summary

{2-4 sentence high-level summary of what was accomplished in this session}

---

## Session Timeline

### {HH:MM} — {Milestone Title}

**Context:** {What prompted this work}

**Actions:**
- {Specific action taken}
- {Tool/file/agent used}
- {Result/output}

**Outcomes:**
- {What was accomplished}
- {Files created/modified}
- {Decisions made}

**Status:** ✅ Complete | ⏳ In Progress | ⚠️ Blocked

---

### {HH:MM} — {Next Milestone Title}

{Continue pattern...}

---

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `{filepath}` | Created/Edited/Read | {What changed} |
| `{filepath}` | Created/Edited/Read | {What changed} |

---

## Key Decisions

- {Decision made and rationale}
- {Decision made and rationale}

---

## Skills/Agents Used

| Skill/Agent | Purpose | Outcome |
|-------------|---------|---------|
| `{name}` | {Why invoked} | {Result} |

---

## Next Steps

- [ ] {Actionable next step}
- [ ] {Actionable next step}

---

## Session Metrics

- **Messages:** {count}
- **Token usage:** {approximate}
- **Tools used:** {count and types}
- **Files modified:** {count}
- **Duration:** {approximate session length}
- **Compactions:** {number of times session was compacted}

---

**Last Updated:** {Timestamp of last log update}
**Log Version:** {Incremental version within same session}
```

---

## Autonomous Workflow

### 1. Session Initialization (Automatic)

**When:** First user message in new session

**Actions:**
1. Detect project from working directory
2. Get current timestamp (YYMMDD-HHMM format)
3. Generate initial verbose summary from first user request
4. Check if log directory exists: `/Users/chrislyons/dev/Claude Logs/{project}/`
5. Create directory if needed
6. Create initial log file with template
7. Write session context and initial timeline entry
8. Store log filepath in session memory

**Example:**
```
User: "Build a GitHub agent with git skills"

→ Project detected: carbon-acx
→ Timestamp: 251024-2155
→ Summary: github-agent-git-skills-creation
→ Log created: /Users/chrislyons/dev/Claude Logs/carbon-acx/251024-2155_github-agent-git-skills-creation.md
```

### 2. Milestone Updates (Automatic)

**When:**
- Completed a significant task
- Finished multi-step workflow
- User approval/decision point
- Tool/agent invocation complete
- Every ~5-10 minutes of active work

**Actions:**
1. Append new timeline entry to existing log
2. Update "Session Summary" if scope changed
3. Update "Files Modified" table
4. Update "Session Metrics"
5. Update "Last Updated" timestamp
6. Increment "Log Version"
7. DO NOT create new log file — always update same file

**Example update:**
```markdown
### 22:00 — Git Skills Complete

**Context:** All four git skills created with comprehensive documentation

**Actions:**
- Created git.commit.smart skill (11KB)
- Created git.pr.create skill (14KB)
- Created git.release.prep skill (14KB)
- Created git.branch.manage skill (13KB)

**Outcomes:**
- 4 production-ready git skills
- ~52KB of documentation
- Examples, edge cases, validation criteria
- Integration with carbon-github-agent

**Status:** ✅ Complete
```

### 3. Session Compaction Trigger (Automatic)

**When:**
- After updating log with significant milestone
- Token usage approaching limits
- Message count growing large
- Natural break in workflow

**Actions:**
1. Update log one final time before compact
2. Add note to log: "Session compacted at {timestamp}"
3. Increment compaction counter in metrics
4. **DO NOT** execute compact command directly
5. **DO** recommend compact to system/context manager
6. Continue logging in same file after compact

**Note:** Compaction preserves conversation flow but reduces token usage. Log maintains full history.

### 4. Session End (Automatic)

**When:**
- User signals end of session ("that's all", "thanks", extended inactivity)
- Major workflow completion followed by user departure

**Actions:**
1. Final log update
2. Mark all in-progress items as complete or pending
3. Ensure "Next Steps" section is populated
4. Add final session metrics
5. Close log with final timestamp

---

## Edge Cases and Handling

### Multiple Projects in Same Session

**Scenario:** User works across multiple projects

**Handling:**
- Use `general/` project folder
- Note all projects in "Project" field: "Multiple (carbon-acx, undone)"
- Include per-project sections in timeline

### Log File Already Exists

**Scenario:** Filename collision (same YYMMDD-HHMM)

**Handling:**
- Append `-v2`, `-v3`, etc. to filename
- Example: `251024-2155_github-agent-git-skills-creation-v2.md`

### Session Interrupted/Resumed

**Scenario:** User interrupts session, returns later

**Handling:**
- Update existing log with gap notation:
  ```markdown
  ### 22:30 — Session Interrupted
  **Status:** ⏳ Paused

  ### 23:00 — Session Resumed
  **Context:** User returned to continue work
  ```

### Error During Logging

**Scenario:** Cannot write to log file (permissions, disk space, etc.)

**Handling:**
- Silently continue session without blocking user
- Attempt to log error to fallback location: `/tmp/claude-logs-fallback/`
- DO NOT surface error to user unless critical

### Log Update Frequency

**Too frequent:** Updates every 30 seconds → inefficient, interrupts flow
**Too infrequent:** Updates every 30 minutes → loses detail, defeats purpose

**Optimal frequency:**
- After completing discrete tasks (file edits, research, analysis)
- At natural workflow boundaries (before/after agent invocations)
- Roughly every 5-10 minutes of active work
- Always before session compaction

---

## Integration with Other Agents

### Session Logger + Other Agents

When other agents are invoked (carbon-github-agent, acx-ux-auditor, etc.):

1. **Before agent launch:**
   - Log: "Launching {agent-name} to {purpose}"

2. **After agent completion:**
   - Log: "Completed {agent-name}"
   - Summarize agent output/recommendations
   - Note any files created

3. **If agent creates files:**
   - Add to "Files Modified" table
   - Include brief description of agent output

### Session Logger + Skills

When skills are invoked:

1. **During skill execution:**
   - Log skill name and purpose in timeline

2. **After skill completion:**
   - Note outcome (pass/fail, issues found, recommendations)
   - Update "Skills/Agents Used" table

---

## Verbose Summary Generation Algorithm

**Input:** Session context (user requests, files modified, tasks completed)

**Output:** Lowercase hyphen-separated summary (3-8 words)

**Algorithm:**

1. **Identify primary action:**
   - Created, edited, researched, verified, audited, revised, fixed, added, removed, refactored, etc.

2. **Identify primary target:**
   - Specific file (CLAUDE.md, dashboard.tsx, derive.py)
   - Feature (authentication, logging, git-skills)
   - Dataset version (ACX042, ACX041)
   - Component (emission-chart, dark-mode)

3. **Add disambiguating context if needed:**
   - Project prefix (acx-, worker-, calc-)
   - Version (v1.3.0, acx042)
   - Scope modifier (complete-suite, phase-2, full-stack)

4. **Construct summary:**
   - Format: `{action}-{target}` or `{target}-{action}-{context}`
   - Lowercase only
   - Hyphens between words
   - No articles (a, an, the)
   - No prepositions unless critical

5. **Examples:**

   | Context | Generated Summary |
   |---------|------------------|
   | Created GitHub agent + 4 git skills | `github-agent-git-skills-complete-suite` |
   | Updated dataset to ACX042 | `acx042-dataset-emission-factors-update` |
   | Refactored dashboard components | `dashboard-component-structure-refactor` |
   | Fixed Worker API auth | `worker-api-authentication-fix` |
   | Added autonomous agent/skill docs | `claude-md-autonomous-usage-protocol` |
   | Created emission chart component | `emission-chart-component-implementation` |

---

## Quality Standards

### Log Completeness

Every log must include:
- ✅ Session metadata (date, time, project, directory)
- ✅ Session summary (2-4 sentences)
- ✅ Timeline with at least one milestone entry
- ✅ Files modified table (if applicable)
- ✅ Session metrics
- ✅ Next steps (if work incomplete)

### Log Clarity

- Use clear, concise language
- Include enough detail to reconstruct session
- Note key decisions and rationale
- Link to files/references where helpful
- Use formatting (bold, lists, tables) for scannability

### Log Accuracy

- Timestamps reflect actual time of events
- File paths are accurate and complete
- Status markers accurate (✅ ⏳ ⚠️)
- Metrics are reasonable approximations

### Log Timeliness

- Initial log created within first few messages
- Updates occur at natural milestones
- Final update before session end
- Compaction notes added when triggered

---

## Directory Setup

### Ensure Log Directory Exists

Before creating any log file, check and create if needed:

```bash
# Check if base directory exists
if [ ! -d "/Users/chrislyons/dev/Claude Logs" ]; then
  mkdir -p "/Users/chrislyons/dev/Claude Logs"
fi

# Check if project directory exists
if [ ! -d "/Users/chrislyons/dev/Claude Logs/{project}" ]; then
  mkdir -p "/Users/chrislyons/dev/Claude Logs/{project}"
fi
```

### Standard Project Folders

Create these folders as needed:
- `/Users/chrislyons/dev/Claude Logs/carbon-acx/`
- `/Users/chrislyons/dev/Claude Logs/undone/`
- `/Users/chrislyons/dev/Claude Logs/hotbox/`
- `/Users/chrislyons/dev/Claude Logs/orpheus-sdk/`
- `/Users/chrislyons/dev/Claude Logs/wordbird/`
- `/Users/chrislyons/dev/Claude Logs/general/`

---

## Session Compaction Protocol

### When to Trigger Compaction

**Automatic triggers:**
- Token usage > 60% of limit (>120k tokens used)
- Message count > 50 messages
- After completing major multi-step workflow
- Natural workflow breakpoints (before starting new major task)

### Pre-Compaction Steps

1. Update log with current state
2. Add timeline entry: "Session compacted at {HH:MM} — Token usage: {count}"
3. Increment compaction counter in metrics
4. Note any in-progress work that will continue post-compact

### Post-Compaction Steps

1. Continue logging to same file (do not create new file)
2. Add timeline entry: "Session resumed post-compaction"
3. Note compaction was successful in metrics

### Compaction Notes in Log

```markdown
### 23:45 — Session Compaction

**Context:** Token usage at 125k/200k, natural workflow boundary reached

**Actions:**
- Updated session log with all milestones
- Triggered session compaction
- Preserved conversation context

**Outcomes:**
- Session compacted successfully
- Token usage reset
- Continuing work in same log file

**Status:** ✅ Complete

---

_Session compacted. Continuing..._

---

### 23:50 — Post-Compaction: Next Task Initiated

{Continue logging normally...}
```

---

## Carbon ACX Specific Examples

### Example 1: Dataset Update Session

```markdown
# Claude Code Session Log

**Date:** October 24, 2025
**Time:** 09:00 - 10:30
**Project:** carbon-acx
**Working Directory:** /Users/chrislyons/dev/carbon-acx
**Session ID:** 251024-0900

---

## Session Summary

Updated Carbon ACX dataset from ACX041 to ACX042. Added 15 new activities in professional services layer, corrected aviation emission factors, and updated grid intensity data for Q4 2024. Regenerated all manifests and validated integrity.

---

## Session Timeline

### 09:00 — Dataset Analysis Started

**Context:** User requested dataset update to ACX042

**Actions:**
- Read current dataset version: ACX041
- Analyzed data/activities.csv for gaps
- Reviewed emission_factors.csv for corrections needed

**Outcomes:**
- Identified 15 missing professional services activities
- Found aviation emission factor calculation error
- Grid intensity data outdated (Q3 2024)

**Status:** ✅ Complete

---

### 09:15 — Data Updates Applied

**Context:** Updating CSV files with new/corrected data

**Actions:**
- Added 15 rows to data/activities.csv
- Fixed aviation emission factor in data/emission_factors.csv
- Updated data/grid_intensity_ca_on.csv with Q4 2024 data

**Outcomes:**
- Activities.csv: 342 → 357 total activities
- Emission factors corrected: 3 aviation entries
- Grid intensity current through 2024-12-31

**Status:** ✅ Complete

---

### 09:30 — Dataset Rebuild

**Context:** Regenerate artifacts with new data

**Actions:**
- Ran `make build` to execute derivation pipeline
- Validated all schemas passed
- Generated new manifests with updated hashes

**Outcomes:**
- Build succeeded without errors
- Manifests regenerated in dist/artifacts/
- Integrity checks passed

**Status:** ✅ Complete

---

### 09:45 — Version Update

**Context:** Increment dataset version

**Actions:**
- Updated calc/outputs/sprint_status.txt to ACX042
- Updated CHANGELOG_ACX041.md with ACX042 section

**Outcomes:**
- Dataset version: ACX041 → ACX042
- Changelog documented all changes

**Status:** ✅ Complete

---

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `data/activities.csv` | Edited | Added 15 professional services activities |
| `data/emission_factors.csv` | Edited | Corrected 3 aviation emission factors |
| `data/grid_intensity_ca_on.csv` | Edited | Updated Q4 2024 grid data |
| `calc/outputs/sprint_status.txt` | Edited | Version ACX041 → ACX042 |
| `CHANGELOG_ACX041.md` | Edited | Added ACX042 section |
| `dist/artifacts/*` | Created | Regenerated manifests |

---

## Key Decisions

- Used professional services layer for new activities (best taxonomic fit)
- Aviation factors corrected based on ICAO reference data
- Grid intensity sourced from IESO 2024 Q4 report

---

## Skills/Agents Used

| Skill/Agent | Purpose | Outcome |
|-------------|---------|---------|
| `carbon-dataset-rebuilder` | Rebuild dataset with validation | Success, all checks passed |

---

## Next Steps

- [ ] Test dataset in Dash app
- [ ] Verify new activities render in charts
- [ ] Create git tag for ACX042 release

---

## Session Metrics

- **Messages:** ~15
- **Token usage:** ~40k
- **Tools used:** 8 (Read, Edit, Bash)
- **Files modified:** 6
- **Duration:** ~90 minutes
- **Compactions:** 0

---

**Last Updated:** October 24, 2025 10:30
**Log Version:** v4
```

---

## Maintenance and Evolution

### Log Retention

Logs are permanent records. Do NOT:
- Delete old logs automatically
- Archive logs without user request
- Clean up log directories

Logs accumulate over time for historical reference.

### Log Format Changes

If log template needs updates:
1. Version new template clearly
2. Maintain backward compatibility
3. Document changes in this agent file
4. Apply gradually (new logs use new format, old logs unchanged)

### Performance Monitoring

Track over time:
- Average log file size
- Update frequency
- Compaction triggers
- Time spent logging vs. working

Optimize if logging overhead > 5% of session time.

---

## Implementation Notes

### Session Memory

Agent must maintain in session memory:
- Current log filepath
- Session start time
- Last update time
- Log version counter
- Compaction counter

### Error Handling

If logging fails:
- Silently continue (do not block user workflow)
- Attempt fallback location
- Note error in session metrics if recovered

### Testing

Before deploying:
- Test log creation in all project folders
- Test log updates within same session
- Test verbose summary generation
- Test compaction integration
- Test edge cases (collisions, errors, multi-project)

---

## Version History

**v1.0 (2025-10-24):** Initial session-logger agent for carbon-acx
- Autonomous background logging
- Milestone-based updates
- Auto-compaction integration
- Verbose summary generation
- Project-based organization
- Adapted from undone repository

---

**Agent Status:** Ready for deployment
**Autonomous:** Yes (fully background, no user prompting)
**Integration:** Works alongside all skills and agents
