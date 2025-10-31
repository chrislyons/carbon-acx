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

**3D Universe Architecture (Current - Branch: `feature/3d-universe`):**
- Simplified navigation (React Router only, no XState)
- 3D visualization (Three.js, React Three Fiber, Drei helpers)
- Design token system (CSS custom properties)
- Component tiers: Primitives → Visualizations → Domain
- State: Zustand only (simplified from dual-store pattern)
- Viz: Apache ECharts 6.0 (2D charts) + Three.js (3D universe)
- 2D+3D Hybrid: Citations, methodology, activity management in 2D overlays
- Camera choreography: Intro animations, hover glow, click-to-fly infrastructure
- SSR safety: Lazy-loaded DataUniverse with React.Suspense for Cloudflare Pages
- Docs: `docs/acx/ACX084.md` (supersedes ACX080.md)

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
- **3D Visualization:** Three.js ^0.180.0, React Three Fiber ^9.4.0, Drei ^10.7.6
- **State & Data:** Zustand 4.5.4, TanStack Query 5.90.5, Apache ECharts 6.0

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

## 3D Universe Development Patterns

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

### Component Tiers

- **Tier 1:** Primitives (Button, Input, Dialog from Radix UI)
- **Tier 2:** Visualizations (DataUniverse, TimelineViz, ComparisonOverlay, ECharts wrappers)
- **Tier 3:** Domain (CitationPanel, ActivityManagement, MethodologyModal, EmissionCalculator, etc.)
- **Tier 4:** Pages (WelcomePage, CalculatorPage, ExplorePage, InsightsPage)

### State Management

**Single store (Zustand):**
```typescript
import { useAppStore } from '../../hooks/useAppStore';

// Access state
const activities = useAppStore((state) => state.activities);
const totalEmissions = useAppStore((state) => state.getTotalEmissions());

// Access actions
const { addActivity, removeActivity, updateActivityQuantity } = useAppStore();
```

**No journey machine** - Navigation via React Router:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/explore'); // Simple, direct navigation
```

### 3D Visualization Pattern

**DataUniverse Component (Lazy-Loaded for SSR Safety):**
```typescript
// IMPORTANT: Must use React.lazy() to prevent Three.js SSR errors
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

// Wrap in Suspense with fallback
<React.Suspense
  fallback={
    <div className="w-full h-full flex items-center justify-center"
         style={{ background: '#0a0e27', color: '#fff' }}>
      Loading 3D Universe...
    </div>
  }
>
  <DataUniverse
    totalEmissions={totalEmissions}           // kg CO₂ (central sphere size)
    activities={activities}                    // Array of Activity objects
    onActivityClick={handleActivityClick}     // Click handler
    enableIntroAnimation={true}                // Zoom animation on mount
    enableClickToFly={true}                    // Camera flies to clicked sphere
  />
</React.Suspense>
```

**Activity Data Shape:**
```typescript
interface Activity {
  id: string;
  name: string;
  annualEmissions: number; // kg CO₂
  category?: string;
  color?: string;
}
```

### 2D Overlay Pattern

**Citations, Methodology, Activity Management:**
```typescript
// 2D panels use Radix UI Dialog for modal overlays
import { CitationPanel } from '../components/domain/CitationPanel';
import { MethodologyModal } from '../components/domain/MethodologyModal';
import { ActivityManagement } from '../components/domain/ActivityManagement';

// Open citation for activity
<CitationPanel
  citation={citationData}
  open={showCitation}
  onClose={() => setShowCitation(false)}
/>

// Show methodology docs
<MethodologyModal
  open={showMethodology}
  onClose={() => setShowMethodology(false)}
/>

// Manage activities in table view
<ActivityManagement />
```

### Architecture Principles

1. Simplicity over abstraction (removed XState, CanvasZone complexity)
2. 2D+3D hybrid (transparency + visualization)
3. Design tokens over hardcoding
4. Composition over inheritance
5. Type-safety throughout
6. Accessibility built-in
7. Performance-first (SSR safety, lazy loading, error boundaries)

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
- `docs/acx/ACX080.md` — Phase 1 rebuild strategy (superseded by ACX084)
- `docs/acx/ACX084.md` — 3D Universe Foundation Sprint (current architecture)
- `apps/carbon-acx-web/src/examples/README.md` — Component examples

---

**Version:** 2.1
**Last Updated:** 2025-10-27
