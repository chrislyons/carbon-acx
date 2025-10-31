# Repository Structure - Detailed Notes

## Overview

Carbon ACX is a **monorepo** with multiple applications sharing a common data pipeline. The repository combines Python-based data processing with modern web applications.

## Key Organizational Patterns

### 1. **Monorepo Workspace Structure**

The repo uses **pnpm workspaces** for managing multiple JavaScript/TypeScript applications:

```
package.json (root)
pnpm-workspace.yaml
apps/
  carbon-acx-web/  (modern Phase 1 app)
site/              (legacy static site)
app/               (legacy Python Dash)
```

**Rationale**: Shared dependencies, consistent tooling, easier cross-app refactoring.

### 2. **Data Pipeline Separation**

Backend data processing is isolated in `data/` and `calc/`:
- **data/**: Source of truth CSV files (never edited by apps)
- **calc/**: Python derivation engine that validates and transforms data
- **dist/artifacts/**: Generated output with content-addressable hashing

**Why separate?**: Data integrity, reproducibility, audit trail.

### 3. **Component Tier System (Phase 1 Architecture)**

Located in `apps/carbon-acx-web/src/components/`, organized by abstraction level:

**Tier 1 - Primitives** (`system/`):
- Atomic UI components (Button, Dialog, Input)
- No business logic
- Reusable across any project

**Tier 2 - Layout** (`canvas/`):
- Canvas-first layout primitives
- CanvasZone, StoryScene, TransitionWrapper
- Handles responsive zones and animations

**Tier 3 - Visualizations** (`viz/`):
- Apache ECharts wrappers
- TimelineViz, ComparisonOverlay, GaugeProgress
- Data-agnostic chart components

**Tier 4 - Domain** (`domain/`):
- Business logic components
- EmissionCalculator, ActivityBrowser, QuickCalculator
- Knows about carbon accounting concepts

**Tier 5 - Scenes** (`scenes/`):
- Full-screen story-driven experiences
- OnboardingScene, BaselineScene, ExploreScene, InsightScene
- Orchestrate multiple lower-tier components

### 4. **State Management Strategy**

Three layers of state:

1. **Zustand (`store/appStore.ts`)**: Global app state
   - Profile data (activities, layers, calculator results)
   - UI state (active zones, transitions)
   - Persisted to localStorage

2. **React Context (`contexts/ProfileContext.tsx`)**: Legacy profile context
   - Being migrated away from (see commit d999cb0)
   - Still used in some legacy components

3. **XState (`hooks/useJourneyMachine`)**: Journey orchestration
   - Onboarding flow state machine
   - Scene transitions and user flow

**Migration in progress**: Moving from ProfileContext → Zustand for consistency.

## Directory Purposes

### `/data` - Canonical Data Sources

**Purpose**: Immutable source of truth for emission factors and activities.

**Key files**:
- `emission_factors.csv` (99 factors, ~15KB)
- `activities.csv` (107 activities, ~8KB)
- `schedules.csv` (time-based schedules)

**Never modified by apps** - only updated manually or via backend sync.

### `/calc` - Derivation Engine

**Purpose**: Python-based data validation and computation pipeline.

**Entry point**: `calc/derive.py`

**Run via**:
```bash
make build              # Full derivation
python -m calc.derive   # Direct invocation
```

**Outputs**: `dist/artifacts/<hash>/` with content-addressable manifests.

### `/apps/carbon-acx-web` - Modern Application (Phase 1)

**Purpose**: Canvas-first, story-driven carbon accounting app.

**Tech stack**:
- React 18 + TypeScript
- Vite 5 (build tool)
- Tailwind CSS 3 (styling)
- Apache ECharts 6.0 (visualizations)
- Zustand 4.5.4 (state management)
- XState 5.23 (journey orchestration)
- Radix UI (accessible primitives)

**Entry points**:
- Development: `pnpm dev` (http://localhost:5173)
- Build: `pnpm build`
- Test: `pnpm test` (Vitest)

**Key subdirectories**:
- `src/components/` - Component library (tier-based)
- `src/hooks/` - React hooks
- `src/store/` - Zustand state
- `src/views/` - Page-level components
- `src/styles/` - Design tokens + global styles

### `/legacy` - Archived Grid-Based App

**Status**: Deprecated, preserved for reference.

**Original implementation**: 8×10 grid UI for activity selection.

**Replaced by**: Canvas-first architecture (Phase 1).

### `/docs` - Documentation

**Structure**:
- `docs/acx/ACX001.md` → `ACX082.md` (sequential docs)
- `docs/WHAT_RUNS_WHERE.md` (environment guide)
- `docs/TESTING_NOTES.md` (QA guide)

**Naming convention**: See `CLAUDE.md` - sequential numbering, never renumber.

### `/workers` - Cloudflare Workers API

**Purpose**: Edge compute API endpoints.

**Endpoints**:
- `/api/compute` - On-demand calculations
- `/api/health` - Health check

**Deploy**: `wrangler deploy`

### `/functions` - Cloudflare Pages Functions

**Purpose**: Edge functions for Pages deployment.

**File**: `functions/carbon-acx/[[path]].ts` (catch-all route)

**Role**: Proxy artifact access with immutable caching.

### `/wireframes` - Architecture Documentation

**Purpose**: Mermaid diagrams + explanatory notes (this directory!)

**Format**: Paired `.mermaid.md` + `.notes.md` files.

## Configuration Files

### `package.json` (root)

- Defines workspace structure
- Scripts for common tasks
- Dependencies for root-level tooling

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'site'
```

Defines workspace members.

### `Makefile`

Automation for common tasks:
- `make build` - Run derivation pipeline
- `make validate` - Run all quality checks
- `make app` - Launch Python Dash app

### `CLAUDE.md` (repo-specific)

Guidelines for AI assistants and developers:
- Documentation naming conventions
- Skill discovery protocol
- Architecture patterns
- Tech stack details

## Code Organization Patterns

### 1. **Colocation**

Components colocate related files:
```
EmissionCalculator.tsx
EmissionCalculator.test.tsx
EmissionCalculator.stories.tsx
```

### 2. **Barrel Exports**

Each directory has an `index.ts` for clean imports:
```typescript
// components/system/index.ts
export { Button } from './Button';
export { Dialog } from './Dialog';
```

### 3. **Design Token Isolation**

All styling via CSS custom properties:
```css
/* styles/tokens.css */
:root {
  --font-size-base: 1rem;
  --space-4: 1rem;
  --carbon-low: #10b981;
}
```

**Never hardcode**: Colors, spacing, typography.

### 4. **Strict TypeScript**

`tsconfig.json` enforces strict mode:
- No implicit any
- Strict null checks
- No unused locals/parameters

## Where to Find Things

### Adding a new feature:
1. **Component**: `src/components/{tier}/{FeatureName}.tsx`
2. **State**: Add to `src/store/appStore.ts`
3. **Route**: Update `src/router.tsx`
4. **Types**: Colocate or add to component file

### Modifying calculations:
1. Backend data: `data/*.csv`
2. Derivation logic: `calc/derive.py`
3. Frontend display: `src/components/domain/EmissionCalculator.tsx`

### Styling changes:
1. Design tokens: `src/styles/tokens.css`
2. Tailwind config: `tailwind.config.ts`
3. Component styles: Inline with token references

### Fixing bugs:
1. Check journey state: `src/hooks/useJourneyMachine.ts`
2. Check app state: `src/store/appStore.ts`
3. Check data flow: See `data-flow.mermaid.md`

## Technical Debt Areas

1. **Dual state systems**: ProfileContext vs Zustand (migration ongoing)
2. **Legacy components**: Some still use old patterns
3. **Test coverage**: Needs improvement (especially E2E)
4. **Type safety**: Some `any` types still exist
5. **Documentation**: In-code comments need expansion

## Common Workflows

### Starting development:
```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
```

### Making data changes:
```bash
# Edit data/*.csv
make build            # Regenerate artifacts
pnpm dev              # See changes in app
```

### Deploying:
```bash
pnpm build            # Build production bundle
# Cloudflare Pages auto-deploys from git push
```

## Related Diagrams

- See `architecture-overview.mermaid.md` for system design
- See `component-map.mermaid.md` for component relationships
- See `data-flow.mermaid.md` for state management flows
