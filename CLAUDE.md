# CLAUDE.md - Claude Code Context for Carbon ACX

**Workspace:** This repo inherits general conventions from `~/chrislyons/dev/CLAUDE.md`

## Purpose
This document provides context and guidance for Claude Code when working with the Carbon ACX repository. It complements the general AI assistant guidelines in AGENTS.md with Claude-specific information.

---

## Repository Overview

Carbon ACX is an open reference stack for trustworthy carbon accounting that transforms auditable CSV inputs into reproducible datasets and delivers disclosures through multiple interfaces (Dash, React, Cloudflare).

**Key principle:** Manifest-first architecture where every chart, catalogue, and disclosure includes byte hashes, schema versions, and provenance for downstream trust.

---

## Architecture Layers

### 1. Data Layer (`data/`)
- **Activities, emission factors, schedules, grid intensity** stored as canonical CSVs
- Source of truth for all carbon accounting calculations
- Schema evolution tracked through Git history
- Files: `activities.csv`, `layers.csv`, `icons.csv`, etc.

### 2. Derivation Engine (`calc/`)
- **Python 3.11+** with Pydantic schemas, Poetry for dependencies
- `calc/derive.py` is the main entry point (run via `make build`)
- Validates inputs, computes emissions, exports intensity matrices
- Generates immutable manifests with hashed figures in `dist/artifacts/<hash>/`
- **Pattern:** Keep validation, figure generation, references in same code path

### 3. User Interfaces

#### Dash Operations Client (`app/`)
- Analyst-focused Python Dash application
- Agency breakdowns, scenario toggles, provenance-aware references
- Reads from `calc/outputs` or `ACX_ARTIFACT_DIR`
- Launch with `make app`

#### Modern Web Application (`apps/carbon-acx-web/`)
- **Next-generation interface** built with React 18 + TypeScript
- Vite 5 build system, Tailwind CSS, Radix UI components
- Part of pnpm workspace monorepo structure
- Tests: Vitest (unit), Playwright (e2e)
- Run: `pnpm dev` from root or `npm run dev` in app directory

**Phase 1 Rebuild Architecture (Branch: `rebuild/canvas-story-engine`):**
- **Canvas-first layout:** Viewport-aware zones instead of grid constraints
- **Story-driven UI:** XState machine orchestrating user journey
- **Design token system:** CSS custom properties for consistent theming
- **Component tiers:**
  - Tier 1 (Primitives): Button, Input, Dialog
  - Tier 2 (Layout): CanvasZone, StoryScene, TransitionWrapper
  - Tier 3 (Visualizations): HeroChart, TimelineViz, ComparisonOverlay, GaugeProgress
  - Tier 4 (Domain): OnboardingScene, BaselineScene, ExploreScene
- **State management:** Zustand (app state) + XState (journey flow)
- **Visualization:** Apache ECharts 6.0 with canvas rendering (60fps)
- **Documentation:** See `docs/acx/ACX080.md` for complete rebuild strategy
- **Examples:** `src/examples/CanvasExample.tsx`, `src/examples/JourneyExample.tsx`

#### Static React Site (`site/`)
- Vite 5 + Tailwind CSS
- Mirrors Dash workflow for marketing/investor portals
- Reads same manifest catalogue as other interfaces
- WebGPU local chat feature (`@mlc-ai/web-llm`)
- Launch: `npm run dev -- --host 0.0.0.0` in `site/`

### 4. Edge Delivery

#### Cloudflare Pages Function (`functions/`)
- Proxies artifact access with immutable caching
- Sanitized paths, optional upstream origins
- File: `functions/carbon-acx/[[path]].ts`

#### Cloudflare Worker API (`workers/`)
- `/api/compute` and `/api/health` endpoints
- On-demand calculations with strict input validation
- Configuration: `wrangler.toml`
- Deploy: `wrangler dev` (local) or `wrangler deploy`

---

## Technology Stack

### Python
- **Version:** 3.11+
- **Package manager:** Poetry
- **Key libraries:** pandas, pydantic, plotly, dash, PyYAML, jinja2
- **Code style:** Black + Ruff (line length: 100)
- **Testing:** pytest with coverage

### JavaScript/TypeScript
- **Runtime:** Node.js 20.19.4
- **Package manager:** pnpm 10.5.2 (workspace monorepo)
- **Build tools:** Vite 5, TypeScript ~5.5.4
- **UI frameworks:** React 18, Tailwind CSS 3, Radix UI
- **Testing:** Vitest (unit), Playwright (e2e)
- **Phase 1 additions:**
  - **Visualization:** Apache ECharts 6.0 (canvas rendering, 60fps animations)
  - **State machines:** XState 5.23 + @xstate/react 6.0 (journey orchestration)
  - **App state:** Zustand 4.5.4 (simplified state management)
  - **Server state:** TanStack Query 5.90.5 (data caching)
  - **Component dev:** Storybook 9.x (visual testing and documentation)

### Infrastructure
- **Cloudflare Workers** for edge compute and APIs
- **Cloudflare Pages** for static site hosting
- **Deployment:** `make package` creates deployment bundles

---

## Key Workflows

### Building the Dataset
```bash
make build                    # Full derivation pipeline
python -m calc.derive         # Direct invocation
make build-backend            # Use SQLite backend (ACX_DATA_BACKEND)
```

### Running User Interfaces
```bash
make app                      # Dash application
pnpm dev                      # Modern web app (apps/carbon-acx-web)
cd site && npm run dev        # Static React site
```

### Testing
```bash
make validate                 # Runs all checks (Ruff, Black, pytest, linters)
pytest tests/                 # Python tests
pnpm test                     # JavaScript tests in workspaces
```

### Packaging & Deployment
```bash
make package                  # Assembles dist/site with artifacts, headers, redirects
wrangler deploy               # Deploy Worker API
```

---

## File Organization Conventions

### Path References
When referencing code locations, use the pattern: `file_path:line_number`
- Example: "Error handling occurs in `calc/derive.py:712`"

### Important Directories
- `calc/` - Core derivation engine
- `app/` - Dash analytics interface
- `apps/` - Workspace applications (pnpm monorepo)
- `site/` - Static React interface
- `data/` - Source CSV files
- `scripts/` - Maintenance utilities
- `docs/` - Extended documentation
- `tests/` - Python test suite
- `dist/` - Build outputs and artifacts
- `functions/` - Cloudflare Pages functions
- `workers/` - Cloudflare Worker source

---

## Phase 1 Development Patterns

### Canvas-First Component Development

When creating new components for the modern web app (Phase 1 architecture):

**1. Use Design Tokens (Required):**
```typescript
// ✅ Correct - Using design tokens
<div className="text-[var(--font-size-lg)] text-[var(--text-primary)]">

// ❌ Wrong - Hardcoded values
<div className="text-lg text-gray-900">
```

**Available Design Tokens:**
- Typography: `--font-size-xs` through `--font-size-5xl` (Major Third scale 1.250)
- Colors: `--carbon-low`, `--carbon-moderate`, `--carbon-high`, `--carbon-neutral`
- Story colors: `--color-goal`, `--color-baseline`, `--color-improvement`, `--color-insight`
- Spacing: `--space-1` through `--space-16` (4px base)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Radii: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- Motion: `--motion-story-duration` (600ms), `--motion-story-ease`
- Zone heights: `--zone-hero-height` (70vh), `--zone-insight-height` (20vh), `--zone-detail-height` (10vh)

**2. Follow Component Tiers:**
- **Tier 1:** Primitives (Button, Input, Dialog) - Design system foundation
- **Tier 2:** Layout (CanvasZone, StoryScene, TransitionWrapper) - Canvas organization
- **Tier 3:** Visualizations (HeroChart, TimelineViz, etc.) - ECharts wrappers
- **Tier 4:** Domain (OnboardingScene, EmissionCalculator, etc.) - Business logic

**3. State Management Patterns:**

**For app/UI state (Zustand):**
```typescript
import { useAppStore } from '../../hooks/useAppStore';

// Read state
const activities = useAppStore((state) => state.activities);
const totalEmissions = useAppStore((state) => state.getTotalEmissions());

// Update state
const { addActivity, removeActivity } = useAppStore();
```

**For journey flow (XState):**
```typescript
import { useJourneyMachine } from '../../hooks/useJourneyMachine';

// Check current state
const { isOnboarding, isExplore, currentScene } = useJourneyMachine();

// Trigger transitions
const { completeOnboarding, viewInsights } = useJourneyMachine();
```

**4. Canvas Zone Layout:**
```typescript
<StoryScene scene="explore" layout="canvas">
  <CanvasZone zone="hero" padding="lg" interactionMode="explore">
    {/* Primary visualization - 70vh */}
  </CanvasZone>

  <CanvasZone zone="insight" padding="md" interactionMode="compare">
    {/* Supporting context - 20vh */}
  </CanvasZone>

  <CanvasZone zone="detail" padding="sm" collapsible interactionMode="drill">
    {/* Detail drawer - 10vh */}
  </CanvasZone>
</StoryScene>
```

**5. ECharts Visualization Pattern:**
```typescript
import { HeroChart } from '../viz/HeroChart';
import type { EChartsOption } from 'echarts';

const chartOption: EChartsOption = {
  // Use design token colors
  color: ['var(--color-baseline)', 'var(--color-goal)'],
  // ... rest of ECharts config
};

<HeroChart option={chartOption} height="100%" autoResize />
```

**6. Animation Patterns:**
```typescript
import { TransitionWrapper, StaggerWrapper } from '../canvas/TransitionWrapper';

// Single element transition
<TransitionWrapper type="story" show={isVisible} delay={300}>
  {content}
</TransitionWrapper>

// List animations
<StaggerWrapper staggerDelay={50} childTransition="slide-up">
  {items.map(item => <Item key={item.id} {...item} />)}
</StaggerWrapper>
```

### Key Architecture Principles

1. **Canvas-first over grid:** Use viewport-aware zones, not fixed grids
2. **Story-driven over route-driven:** Journey states guide UI, not just URLs
3. **Design tokens over hardcoding:** All styling uses CSS custom properties
4. **Composition over inheritance:** Small, reusable components
5. **Type-safety throughout:** Strict TypeScript, no `any` types
6. **Accessibility built-in:** ARIA labels, keyboard nav, semantic HTML

### Example Files to Reference

- **Component examples:** `apps/carbon-acx-web/src/examples/CanvasExample.tsx`
- **Journey integration:** `apps/carbon-acx-web/src/examples/JourneyExample.tsx`
- **Design tokens:** `apps/carbon-acx-web/src/styles/tokens.css`
- **State management:** `apps/carbon-acx-web/src/store/appStore.ts`
- **Journey machine:** `apps/carbon-acx-web/src/machines/journeyMachine.ts`
- **Documentation:** `apps/carbon-acx-web/src/examples/README.md`

---

## Working with Claude Code

### Read First, Then Edit
- Always read files before editing them
- Use Read tool for file inspection
- Use Edit tool for precise changes
- Use Glob/Grep for searching when location is uncertain

### Common Tasks

**Adding a new layer:**
1. Update `data/layers.csv` with new layer definition
2. Add emission factors to `data/emission_factors.csv`
3. Update activity mappings as needed
4. Run `make build` to regenerate artifacts
5. Update tests in `tests/` to cover new layer

**Modifying the derivation pipeline:**
1. Read `calc/derive.py` to understand current flow
2. Update Pydantic schemas in `calc/` if data structures change
3. Maintain manifest integrity and figure generation
4. Run `pytest tests/` to verify changes
5. Update documentation if API changes

**UI changes:**
1. For modern interface: work in `apps/carbon-acx-web/`
2. For legacy interface: work in `site/`
3. For analytics: work in `app/`
4. Follow existing component patterns
5. Run relevant tests (Vitest, Playwright, or manual Dash testing)

### Code Quality Standards
- Follow existing lint/format/test scripts
- Python: Black + Ruff with 100 character line length
- TypeScript: Follow project's tsconfig.json settings
- Prefer small, cohesive changes with clear rationale
- Include tests for non-trivial functionality
- Add docstrings/JSDoc for complex functions

---

## Autonomous Agent & Skill Usage

**CRITICAL:** Claude Code should autonomously use available agents and skills when appropriate for the task at hand. This is not optional - these tools exist to improve quality and efficiency.

### Available Agents

Located in `.claude/agents/`, these specialized agents should be used automatically when their use case matches the task:

**UX & Quality:**
- `acx-ux-auditor` - Conduct UX audits using heuristic evaluation, cognitive walkthroughs, and task analysis
  - **Use when:** Evaluating interfaces, before feature launches, UI refactoring, addressing usability feedback
  - **Example:** "Audit the dashboard for parameter overwhelm and progressive disclosure issues"

**Data & Validation:**
- `carbon-citation-checker` - Verify citation coverage and source attribution
  - **Use when:** Reviewing documentation, validating data provenance claims
  - **Example:** "Check all emission factor references have proper source citations"

- `carbon-manifest-validator` - Validate manifest integrity, hashes, and schema versions
  - **Use when:** After build pipeline changes, before deployment, debugging artifact issues
  - **Example:** "Validate all manifests in dist/artifacts/ for integrity"

- `carbon-dataset-rebuilder` - Rebuild dataset with validation and regression checks
  - **Use when:** Data changes, schema updates, after CSV modifications
  - **Example:** "Rebuild dataset after updating emission_factors.csv"

**Build & Deploy:**
- `carbon-site-builder` - Package and prepare static site for deployment
  - **Use when:** Creating deployment bundles, preparing releases
  - **Example:** "Build production site bundle with all artifacts"

- `carbon-intensity-exporter` - Export grid intensity matrices and time series
  - **Use when:** Updating grid data, generating intensity reports
  - **Example:** "Export Ontario grid intensity for 2024"

**Git & GitHub:**
- `carbon-github-agent` - Automate Git and GitHub workflows including commits, PRs, releases, and branch management
  - **Use when:** Creating commits, opening pull requests, preparing releases, managing branches, inspecting git history
  - **Example:** "Create a PR for this feature branch with comprehensive summary"

### Available Skills

Located in `.claude/skills/`, these skills encode domain expertise and should be invoked autonomously:

**Project-Specific Skills:**

1. **`carbon.data.qa`** - Answer analytical questions about carbon accounting data
   - **Trigger patterns:**
     - "What's the emission factor for...?"
     - "Show total emissions from..."
     - "Compare emissions between..."
     - "Convert X units to Y units"
   - **Example:** "What's the emission factor for HD video streaming per hour?"
   - **Read:** `.claude/skills/project/carbon-data-qa/SKILL.md`

2. **`acx.code.assistant`** - Generate code following Carbon ACX conventions
   - **Trigger patterns:**
     - "Create a React component for..."
     - "Generate a Cloudflare Worker endpoint..."
     - "Write a Python script to..."
     - "Scaffold tests for..."
   - **Example:** "Create a TypeScript component for displaying layer emissions with proper types"
   - **Read:** `.claude/skills/project/acx-code-assistant/SKILL.md`

3. **`acx.ux.evaluator`** - Systematic UX evaluation with specific methodologies
   - **Trigger patterns:**
     - "Evaluate UX of..."
     - "Run cognitive walkthrough for..."
     - "Check against Nielsen heuristics..."
   - **Example:** "Evaluate the activity entry flow for Sarah (Sustainability Analyst persona)"
   - **Read:** `.claude/skills/project/acx-ux-evaluator/SKILL.md`

4. **`carbon.report.gen`** - Generate formatted carbon accounting reports
   - **Trigger patterns:**
     - "Generate report for..."
     - "Create emissions summary..."
     - "Produce disclosure document..."
   - **Example:** "Generate Q1 2024 emissions report by layer"
   - **Read:** `.claude/skills/project/carbon-report-gen/SKILL.md`

**Shared Skills:**

1. **`schema.linter`** - Validate configuration files and data schemas
   - **Trigger patterns:**
     - "Validate schema..."
     - "Check configuration..."
     - "Lint data files..."
   - **Example:** "Validate all CSV schemas in data/ directory"
   - **Read:** `.claude/skills/shared/schema-linter/SKILL.md`

2. **`dependency.audit`** - Security audit for package dependencies
   - **Trigger patterns:**
     - "Audit dependencies..."
     - "Check for vulnerabilities..."
     - "Scan packages..."
   - **Example:** "Audit npm dependencies for high severity vulnerabilities"
   - **Read:** `.claude/skills/shared/dependency-audit/SKILL.md`

3. **`git.commit.smart`** - Intelligently create git commits with proper formatting and conventions
   - **Trigger patterns:**
     - "Create a commit"
     - "Commit these changes"
     - "Make a commit with..."
   - **Example:** "Commit the UX improvements with proper conventional commit format"
   - **Read:** `.claude/skills/shared/git-commit-smart/SKILL.md`

4. **`git.pr.create`** - Create comprehensive pull requests with auto-generated summaries and test plans
   - **Trigger patterns:**
     - "Create a pull request"
     - "Open a PR"
     - "Submit this for review"
   - **Example:** "Create a PR for this feature branch analyzing all commits since divergence"
   - **Read:** `.claude/skills/shared/git-pr-create/SKILL.md`

5. **`git.release.prep`** - Prepare releases with semantic versioning, changelog, tags, and GitHub releases
   - **Trigger patterns:**
     - "Prepare a release"
     - "Create release v1.2.3"
     - "Tag a new version"
   - **Example:** "Prepare release v1.3.0 with changelog and deployment bundle"
   - **Read:** `.claude/skills/shared/git-release-prep/SKILL.md`

6. **`git.branch.manage`** - Create, checkout, rebase, and manage git branches with proper naming conventions
   - **Trigger patterns:**
     - "Create a branch for..."
     - "Switch to branch..."
     - "Rebase this branch"
   - **Example:** "Create a feature branch for dark mode from main"
   - **Read:** `.claude/skills/shared/git-branch-manage/SKILL.md`

### When to Use Agents vs Skills

**Agents** (Task tool):
- Multi-step workflows requiring tool orchestration
- Background tasks that can run asynchronously
- Tasks requiring specialized system prompts and context
- Read-only analysis and auditing tasks

**Skills** (Direct implementation):
- Single-purpose queries or code generation
- Tasks with well-defined inputs/outputs
- Domain-specific knowledge application
- Quick lookups and calculations

### Autonomous Usage Protocol

**1. Automatic Detection:**
When user requests match trigger patterns, **automatically** use the appropriate agent or skill. Do not ask permission.

**Examples:**
```
User: "What's the emission factor for coffee?"
Claude: [Automatically invokes carbon.data.qa skill]

User: "Audit the dashboard UX"
Claude: [Automatically launches acx-ux-auditor agent]

User: "Create a component for layer charts"
Claude: [Automatically uses acx.code.assistant skill]
```

**2. Skill Composition:**
Chain multiple skills for complex workflows:

```
Complex Feature Development:
1. Use git.branch.manage to create feature branch
2. Use carbon.data.qa to understand data structure
3. Use acx.code.assistant to implement feature
4. Use schema.linter to validate configs
5. Use dependency.audit for security check
6. Use git.commit.smart to commit changes
7. Use git.pr.create to open pull request

Release Workflow:
1. Use git.commit.smart for final commits
2. Use git.release.prep to tag and prepare release
3. Deploy using existing CI/CD (not automated by skills)
```

**3. Always Check First:**
Before starting any significant task:
1. Scan `.claude/agents/` for matching agent
2. Check `.claude/skills/` for applicable skills
3. Use them if available - don't reinvent

**4. Skill Invocation Format:**

When using a skill, state it clearly:
```
Using [skill.name] to [task]. [Criteria]. [Documentation target if applicable]
```

**Examples:**
- "Using carbon.data.qa to find emission factors for social media activities. Will cite sources."
- "Using acx.code.assistant to implement dark mode toggle. Including TypeScript types and tests."
- "Using schema.linter to validate activities.csv schema. Checking against data/schemas/."
- "Using git.commit.smart to commit UX improvements with conventional commit format and Claude footer."
- "Using git.pr.create to open PR analyzing all 5 commits since branch divergence from main."
- "Using git.release.prep to create v1.3.0 release with changelog and GitHub release notes."

### Discovery Commands

Check what's available:

```bash
# List all agents
ls -1 .claude/agents/

# List all skills
find .claude/skills -name "SKILL.md"

# Read agent definition
cat .claude/agents/acx-ux-auditor.json

# Read skill documentation
cat .claude/skills/project/carbon-data-qa/SKILL.md
```

### Error Handling

If agent/skill fails:
1. Check tool access and permissions
2. Verify input format matches expected I/O
3. Fall back to manual implementation if necessary
4. Document failure for skill/agent maintenance

### Success Criteria

**Required behaviors:**
- ✅ Automatically detect when agent/skill matches task
- ✅ Use without asking permission (unless high-risk)
- ✅ State which agent/skill is being used
- ✅ Follow agent systemPrompt and skill guidelines
- ✅ Report results clearly to user
- ✅ Document in session notes if new skill needed

**Prohibited behaviors:**
- ❌ Reimplementing functionality that exists in a skill
- ❌ Asking "Should I use the X skill?" when pattern clearly matches
- ❌ Ignoring available agents/skills for convenience
- ❌ Using skills for tasks outside their scope

---

## Security & Secrets

**Never expose:**
- API tokens or credentials in code
- Production data in prompts or commits
- Environment variables (use `.env` files, not committed)

**Storage locations:**
- Local dev: `.env` files (gitignored)
- GitHub CI: Repository Settings → Secrets
- Cloudflare Workers: `wrangler secret put <NAME>`

---

## Important Constraints

### Runtime Constraints
- Cloudflare Workers have edge runtime limitations (no Node.js APIs)
- Specify runtime constraints when modifying Worker code
- Include binding names for resources (KV, R2, D1, Queues)

### Repository Constraints
- **No binary files** in commits
- Avoid the contiguous token "F a s t A P I" in docs (hygiene check)
- Changes to `wrangler.toml`, `.github/workflows/`, `Makefile` are high-risk
- All AI-generated changes require human review
- Use `ai-generated` PR label and `Generated-by: claude-code` commit footer

### Dependency Management
- Propose dependency updates separately from feature work
- Justify new packages (license, size, maintenance status)
- Document lockfile update commands in PRs
- Python: `poetry add <package>`
- JavaScript: `pnpm add <package>` (workspace-aware)

---

## References to Other Documentation

- **README.md** - Comprehensive repository overview and getting started
- **AGENTS.md** - General AI assistant policies and review gates
- **CONTRIBUTING.md** - Pull request expectations and contribution guidelines
- **docs/WHAT_RUNS_WHERE.md** - Environment expectations and deployment guidance
- **docs/TESTING_NOTES.md** - QA expectations across environments
- **CHANGELOG_ACX041.md** - Dataset version history

---

## Monorepo Structure

This repository uses **pnpm workspaces** for JavaScript packages:

```
package.json              # Root workspace config
pnpm-workspace.yaml       # Workspace package definitions
apps/
  carbon-acx-web/         # Modern web application
    package.json
site/                     # Legacy static site (separate package)
  package.json
```

When working with JavaScript:
- Run commands from root: `pnpm --filter carbon-acx-web dev`
- Or within app directory: `cd apps/carbon-acx-web && npm run dev`
- Shared dependencies hoisted to root `node_modules/`

---

## Dataset Versioning

Current dataset version tracked in: `calc/outputs/sprint_status.txt`

When updating data:
- Maintain provenance through commit messages
- Update references and citations synchronously
- Re-run derivation pipeline to update manifests
- Verify integrity checks pass

---

## Quick Command Reference

```bash
# Setup
poetry install --with dev --no-root
make site_install
pnpm install

# Build & Validate
make build                  # Build dataset
make validate               # Run all quality checks
make test                   # Run test suite

# Development
make app                    # Launch Dash
pnpm dev                    # Launch modern web app
cd site && npm run dev      # Launch static site
wrangler dev                # Launch Worker API locally

# Packaging
make package                # Create deployment bundle
make catalog                # Maintain layer catalogs
make sbom                   # Generate software bill of materials
```

---

## Tips for Effective Assistance

1. **Start with context:** Read README.md and relevant source files first
2. **Follow patterns:** Match existing code style and architecture
3. **Test thoroughly:** Run appropriate test suites before completing tasks
4. **Document changes:** Update docs when modifying interfaces or data schemas
5. **Small iterations:** Prefer incremental changes over large refactors
6. **Verify references:** Ensure manifest integrity and figure lineage maintained
7. **Check environments:** Consider Dash, React, and Worker contexts for changes

---

## Last Updated

2025-10-25 (Phase 1 architecture patterns added)

---

## Questions or Clarifications?

When uncertain:
1. Reference README.md for architecture overview
2. Check AGENTS.md for policy questions
3. Read existing code patterns in the relevant directory
4. Ask the user for clarification on ambiguous requirements
5. Propose a plan before making significant structural changes
