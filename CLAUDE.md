# Carbon ACX Development Guide

**Inherits:** `~/chrislyons/dev/CLAUDE.md` (workspace) + `~/.claude/CLAUDE.md` (global)

Open reference stack for trustworthy carbon accounting — manifest-first architecture with byte hashes, schema versions, and provenance for downstream trust.

---

## Architecture Layers

### 1. Data Layer (`data/`)
- Activities, emission factors, schedules, grid intensity as canonical CSVs
- Source of truth for all calculations
- Schema evolution tracked through Git history

### 2. Derivation Engine (`calc/`)
- **Python 3.11+** with Pydantic schemas, Poetry
- `calc/derive.py` main entry point (run via `make build`)
- Validates inputs, computes emissions, exports intensity matrices
- Generates immutable manifests with hashed figures in `dist/artifacts/<hash>/`

### 3. User Interfaces

**Dash Operations Client (`app/`):**
- Analyst-focused Python Dash application
- Agency breakdowns, scenario toggles, provenance-aware references
- Launch: `make app`

**Modern Web Application (`apps/carbon-acx-web/`):**
- React 18 + TypeScript, Vite 5, Tailwind CSS, Radix UI
- Part of pnpm workspace monorepo
- Tests: Vitest (unit), Playwright (e2e)
- Run: `pnpm dev`

**Phase 1 Rebuild Architecture (Branch: `rebuild/canvas-story-engine`):**
- Canvas-first layout (viewport zones, not grids)
- Story-driven UI (XState journey orchestration)
- Design token system (CSS custom properties)
- Component tiers: Primitives → Layout → Visualizations → Domain
- State: Zustand (app state) + XState (journey flow)
- Viz: Apache ECharts 6.0 (canvas rendering, 60fps)
- Docs: `docs/acx/ACX080.md`

**Static React Site (`site/`):**
- Vite 5 + Tailwind CSS
- Mirrors Dash workflow for marketing/investor portals
- WebGPU local chat feature (`@mlc-ai/web-llm`)

### 4. Edge Delivery

**Cloudflare Pages Function (`functions/`):**
- Proxies artifact access with immutable caching
- File: `functions/carbon-acx/[[path]].ts`

**Cloudflare Worker API (`workers/`):**
- `/api/compute` and `/api/health` endpoints
- On-demand calculations with strict validation
- Deploy: `wrangler dev` (local) or `wrangler deploy`

---

## Technology Stack

### Python
- **Version:** 3.11+
- **Package manager:** Poetry
- **Libraries:** pandas, pydantic, plotly, dash, PyYAML, jinja2
- **Style:** Black + Ruff (line length: 100)

### JavaScript/TypeScript
- **Runtime:** Node.js 20.19.4
- **Package manager:** pnpm 10.5.2 (workspace monorepo)
- **Build:** Vite 5, TypeScript ~5.5.4
- **UI:** React 18, Tailwind CSS 3, Radix UI
- **Tests:** Vitest (unit), Playwright (e2e)
- **Phase 1:** Apache ECharts 6.0, XState 5.23, Zustand 4.5.4, TanStack Query 5.90.5

### Infrastructure
- Cloudflare Workers (edge compute and APIs)
- Cloudflare Pages (static site hosting)

---

## Key Workflows

### Build
```bash
make build                    # Full derivation pipeline
python -m calc.derive         # Direct invocation
make build-backend            # Use SQLite backend
```

### Run
```bash
make app                      # Dash application
pnpm dev                      # Modern web app
cd site && npm run dev        # Static React site
```

### Test
```bash
make validate                 # All checks (Ruff, Black, pytest, linters)
pytest tests/                 # Python tests
pnpm test                     # JavaScript tests
```

### Deploy
```bash
make package                  # Deployment bundle
wrangler deploy               # Deploy Worker API
```

---

## Phase 1 Development Patterns

### Design Tokens (Required)

**Use CSS custom properties:**
```typescript
// ✅ Correct
<div className="text-[var(--font-size-lg)] text-[var(--text-primary)]">

// ❌ Wrong
<div className="text-lg text-gray-900">
```

**Available Tokens:**
- Typography: `--font-size-xs` through `--font-size-5xl` (Major Third scale 1.250)
- Colors: `--carbon-low`, `--carbon-moderate`, `--carbon-high`, `--carbon-neutral`
- Story: `--color-goal`, `--color-baseline`, `--color-improvement`, `--color-insight`
- Spacing: `--space-1` through `--space-16` (4px base)
- Motion: `--motion-story-duration` (600ms), `--motion-story-ease`
- Zones: `--zone-hero-height` (70vh), `--zone-insight-height` (20vh), `--zone-detail-height` (10vh)

### Component Tiers

- **Tier 1:** Primitives (Button, Input, Dialog)
- **Tier 2:** Layout (CanvasZone, StoryScene, TransitionWrapper)
- **Tier 3:** Visualizations (HeroChart, TimelineViz, ECharts wrappers)
- **Tier 4:** Domain (OnboardingScene, EmissionCalculator, business logic)

### State Management

**App/UI state (Zustand):**
```typescript
import { useAppStore } from '../../hooks/useAppStore';

const activities = useAppStore((state) => state.activities);
const { addActivity, removeActivity } = useAppStore();
```

**Journey flow (XState):**
```typescript
import { useJourneyMachine } from '../../hooks/useJourneyMachine';

const { isOnboarding, currentScene } = useJourneyMachine();
const { completeOnboarding, viewInsights } = useJourneyMachine();
```

### Canvas Zone Layout

```typescript
<StoryScene scene="explore" layout="canvas">
  <CanvasZone zone="hero" padding="lg" interactionMode="explore">
    {/* Primary viz - 70vh */}
  </CanvasZone>

  <CanvasZone zone="insight" padding="md" interactionMode="compare">
    {/* Context - 20vh */}
  </CanvasZone>

  <CanvasZone zone="detail" padding="sm" collapsible interactionMode="drill">
    {/* Detail - 10vh */}
  </CanvasZone>
</StoryScene>
```

### Architecture Principles

1. Canvas-first over grid
2. Story-driven over route-driven
3. Design tokens over hardcoding
4. Composition over inheritance
5. Type-safety throughout
6. Accessibility built-in

---

## Skills & Agents (Use Autonomously)

### Project Skills (`.claude/skills/project/`)

**Always use proactively:**

- **carbon.data.qa** — Answer analytical questions about carbon data
  - Triggers: "What's the emission factor for...", "Show total emissions from...", "Compare emissions..."

- **acx.code.assistant** — Generate code following Carbon ACX conventions
  - Triggers: "Create a React component for...", "Generate Cloudflare Worker endpoint...", "Write Python script..."

- **acx.ux.evaluator** — Systematic UX evaluation with methodologies
  - Triggers: "Evaluate UX of...", "Run cognitive walkthrough...", "Check Nielsen heuristics..."

- **carbon.report.gen** — Generate formatted carbon accounting reports
  - Triggers: "Generate report for...", "Create emissions summary...", "Produce disclosure..."

### Shared Skills (`.claude/skills/shared/`)

- **schema.linter** — Validate configuration files and data schemas
- **dependency.audit** — Security audit for packages
- **git.commit.smart** — Create conventional commits
- **git.pr.create** — Create comprehensive pull requests
- **git.release.prep** — Prepare releases with semver, changelog, tags
- **git.branch.manage** — Create, checkout, rebase, manage branches

### Agents (`.claude/agents/`)

**Use for deep work:**

- **acx-ux-auditor** — UX audits (heuristic evaluation, cognitive walkthroughs, task analysis)
- **carbon-citation-checker** — Verify citation coverage and source attribution
- **carbon-manifest-validator** — Validate manifest integrity, hashes, schema versions
- **carbon-dataset-rebuilder** — Rebuild dataset with validation and regression checks
- **carbon-site-builder** — Package and prepare static site for deployment
- **carbon-intensity-exporter** — Export grid intensity matrices and time series
- **carbon-github-agent** — Automate Git/GitHub workflows (commits, PRs, releases, branches)

---

## Common Tasks

### Adding a Layer
1. Update `data/layers.csv`
2. Add emission factors to `data/emission_factors.csv`
3. Update activity mappings
4. Run `make build`
5. Update `tests/` to cover new layer

### Modifying Derivation Pipeline
1. Read `calc/derive.py`
2. Update Pydantic schemas if data structures change
3. Maintain manifest integrity
4. Run `pytest tests/`
5. Update docs if API changes

### UI Changes
1. Modern interface: `apps/carbon-acx-web/`
2. Legacy interface: `site/`
3. Analytics: `app/`
4. Follow existing component patterns
5. Run tests (Vitest, Playwright, manual Dash)

---

## Important Constraints

### Runtime
- Cloudflare Workers have edge runtime limitations (no Node.js APIs)
- Include binding names for resources (KV, R2, D1, Queues)

### Repository
- **No binary files** in commits
- Avoid contiguous token "F a s t A P I" in docs (hygiene check)
- Changes to `wrangler.toml`, `.github/workflows/`, `Makefile` are high-risk
- Use `ai-generated` PR label and `Generated-by: claude-code` commit footer

### Dependencies
- Propose updates separately from feature work
- Justify new packages (license, size, maintenance)
- Python: `poetry add <package>`
- JavaScript: `pnpm add <package>` (workspace-aware)

---

## Monorepo Structure

**pnpm workspaces:**
```
package.json              # Root workspace config
pnpm-workspace.yaml       # Workspace definitions
apps/
  carbon-acx-web/         # Modern web app
site/                     # Legacy static site
```

**Commands:**
- Root: `pnpm --filter carbon-acx-web dev`
- Within app: `cd apps/carbon-acx-web && npm run dev`

---

## Quick Reference

```bash
# Setup
poetry install --with dev --no-root
make site_install
pnpm install

# Build & Validate
make build                  # Build dataset
make validate               # All quality checks
make test                   # Test suite

# Development
make app                    # Dash
pnpm dev                    # Modern web app
cd site && npm run dev      # Static site
wrangler dev                # Worker API

# Packaging
make package                # Deployment bundle
make catalog                # Layer catalogs
make sbom                   # Software bill of materials
```

---

## Essential Docs

- `README.md` — Overview, getting started
- `AGENTS.md` — AI assistant policies, review gates
- `docs/WHAT_RUNS_WHERE.md` — Environment expectations
- `docs/TESTING_NOTES.md` — QA expectations
- `docs/acx/ACX080.md` — Phase 1 rebuild strategy
- `apps/carbon-acx-web/src/examples/README.md` — Component examples

---

**Version:** 2.0
**Last Updated:** 2025-10-26
