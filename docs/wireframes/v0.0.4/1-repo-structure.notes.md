# Repository Structure Notes

**Version:** v0.0.4 (November 2025)
**Status:** Reflects Next.js 15 rebuild (ACX093) and 3D Universe integration (ACX084/ACX094)

## Overview

Carbon ACX follows a **4-layer architecture** with clear separation of concerns:

1. **Data Layer** (`data/`) - Source of truth CSV files
2. **Derivation Layer** (`calc/`) - Python engine for emission calculations
3. **UI Layer** (`apps/`) - Next.js 15 frontend with 3D visualization
4. **Edge Layer** (`functions/`, `workers/`) - Cloudflare Pages/Workers

## Directory Purposes

### `/data` - Canonical Data Sources

**Purpose:** Single source of truth for all carbon accounting data.

**Key Files:**
- `activities.csv` - Activity definitions (TRAN, FOOD, MEDIA, etc.)
- `emission_factors.csv` - Emission factor values with regional variation
- `grid_intensity.csv` - Electricity carbon intensity by region/year
- `activity_schedule.csv` - Temporal scheduling metadata
- `functional_units.csv` - Unit definitions (km, kg, hour, kWh)
- `layers.csv` - Layer catalog (professional, industrial, military, etc.)
- `sources.csv` - Citation sources for provenance tracking

**Conventions:**
- All CSV files follow strict schema validation (Pydantic models)
- Regional codes follow ISO 3166 (e.g., CA-ON for Ontario, Canada)
- Activity IDs use dot-notation: `SECTOR.ACTIVITY.VARIANT.UNIT`
- Emission factors reference GHG Protocol, IPCC AR6, EPA, DEFRA

**Staging Area (`_staged/`):**
- Work-in-progress data updates before validation
- Not read by production build pipeline
- Use for testing schema changes

### `/calc` - Python Derivation Engine

**Purpose:** Transform canonical CSV data into figures with provenance.

**Architecture:**
- **`derive.py` (1,926 lines):** Main orchestration, emission calculations
- **`schema.py` (725 lines):** Pydantic models for type safety
- **`figures.py` (727 lines):** Generate JSON figures from activities
- **`figures_manifest.py` (183 lines):** Bundle manifests with byte hashes
- **`dal/` (Data Access Layer):** CSV/DuckDB/SQLite backends
- **`utils/hashio.py`:** SHA256 hashing utilities for content addressing

**Key Responsibilities:**
1. Load & validate CSV data against Pydantic schemas
2. Match activities to emission factors (region, vintage, scope)
3. Calculate emissions: `Quantity × EmissionFactor = CO₂e`
4. Generate figures (JSON) with calculation provenance
5. Create byte hashes (SHA256) for immutability
6. Bundle manifests with citations and references

**Testing:**
- `tests/` directory with pytest suite
- Validates schema compliance, calculation accuracy, manifest integrity

### `/apps` - Frontend Applications

**Current State:**
- **`carbon-acx-web/` (PRIMARY):** Next.js 15 frontend (ACX093 rebuild)
- **`carbon-acx-web-legacy/`:** Vite+React (being phased out)

**Focus on `apps/carbon-acx-web/`:**

#### `src/app/` - Next.js App Router

**Page Routes:**
- `/` - Home/landing page
- `/calculator` - Carbon footprint questionnaire
- `/explore` - Data exploration hub (2D/3D toggle)
- `/explore/3d` - 3D Universe visualization
- `/manifests` - Browse all manifests
- `/manifests/[id]` - Manifest detail with provenance
- `/methodology` - Calculation methodology docs

**API Routes:**
- `/api/health` - Health check endpoint
- `/api/manifests` - List all manifests (GET)
- `/api/manifests/[id]` - Single manifest detail (GET)

#### `src/components/` - React Components

**Organization:**
- `layout/` - Header, Footer (shared across pages)
- `providers/` - QueryProvider (TanStack Query wrapper)
- `viz/` - DataUniverse.tsx (3D visualization, 520 lines)
- `domain/` - Domain-specific components (activity cards, citation panels)

**Key Component: `viz/DataUniverse.tsx`**
- Three.js + React Three Fiber integration
- Central sphere (total emissions) + orbiting spheres (activities)
- Lazy-loaded with `React.lazy()` to prevent SSR errors
- 887KB bundle (241KB gzip), only loads when 3D view accessed

#### `src/lib/` - Server-Side Utilities

**`manifests.ts`:**
- Server-side helpers for reading artifact files
- Functions: `getRootManifest()`, `getManifests()`, `getManifest(id)`, `verifyManifest(id)`
- Reads from `dist/artifacts/` directory
- No client-side fetch needed (Next.js Server Components)

#### `src/types/` - TypeScript Definitions

- `manifest.ts` - TypeScript interfaces for manifest schema
- `react-three-fiber.d.ts` - Three.js type extensions

### `/dist` - Build Outputs

**Purpose:** Content-addressed artifacts with byte-level immutability.

**Structure:**
```
dist/artifacts/<hash>/
├── manifest.json              # Root manifest (index of all figures)
├── manifests/                 # Figure manifests
│   └── TRAN.SCHOOLRUN.CAR.KM-manifest-abc123.json
├── figures/                   # Generated figure data
│   └── TRAN.SCHOOLRUN.CAR.KM-abc123.json
└── references/                # Citation lineage
    └── references-xyz789.json
```

**Key Principles:**
- **Content Addressing:** Directory names include hash prefixes
- **Immutability:** Once generated, artifacts never change
- **Provenance:** Every figure links to sources via citation keys
- **Verification:** SHA256 hashes enable bit-for-bit validation

**Example Manifest:**
```json
{
  "schema_version": "1.0.0",
  "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
  "generated_at": "2025-11-11T12:00:00Z",
  "figure_sha256": "abc123...",
  "citation_keys": ["SRC.ECCC.NIR.2025"]
}
```

### `/functions` & `/workers` - Edge Computing

**`functions/`:**
- Cloudflare Pages Functions (file-based routing)
- Currently minimal usage (Next.js API routes preferred)

**`workers/`:**
- Reserved for future Cloudflare Workers
- Potential use cases: API proxying, data transformation, webhooks

### `/docs` - Documentation

#### `docs/acx/` - ACX Series Documentation

**Purpose:** Sprint reports, architecture specs, audit reports.

**Key Documents:**
- `INDEX.md` - Doc catalog (next available: ACX095)
- `ACX084.md` - 3D Universe Foundation Sprint (Oct 2025)
- `ACX093.md` - Strategic Rebuild Specification (Nov 2025)
- `ACX094.md` - DataUniverse Port to Next.js 15

**Archive Policy:**
- Documents older than 180 days moved to `acx/archive/`
- Reduces token usage for Claude Code context
- Run: `~/dev/scripts/archive-old-docs.sh carbon-acx ACX`

#### `docs/wireframes/` - Architecture Diagrams

**Versioning:**
- `v0.0.1`, `v0.0.2`, `v0.0.3`, `v1.0.0`, **`v0.0.4` (current)**
- Each version reflects repo state at time of generation
- Paired files: `{topic}.mermaid.md` + `{topic}.notes.md`

#### `docs/guides/` - Developer Guides

- `Mermaid + Docs Prompt.md` - Instructions for generating wireframes
- Additional guides for feature development

### `/tests` - Testing Infrastructure

**Python Tests (`tests/`):**
- pytest suite for data validation
- Manifest integrity checks
- Calculation accuracy tests
- Schema compliance verification

**Frontend Tests (`apps/carbon-acx-web/tests/`):**
- Vitest for unit tests (components, utilities)
- Playwright for E2E tests (planned, not yet implemented)

### Configuration Files (Root)

**`Makefile` (176 lines):**
- Build orchestration for all layers
- Targets: `install`, `build`, `validate`, `test`, `package`, `ci_build_pages`
- Single source of truth for CI/CD pipeline

**`pyproject.toml`:**
- Python dependencies managed by Poetry
- Dev dependencies: pytest, ruff, black, mypy
- Python 3.11+ required

**`package.json` (Root):**
- pnpm workspace configuration
- Manages multiple apps (carbon-acx-web, legacy)
- Node 20.19.4, pnpm 10.5.2

**`CLAUDE.md` (v3.0):**
- Development guide for AI assistants
- File boundaries, architecture patterns, workflow examples
- Critical context budget rules (use Plan Mode for large refactors)

## Code Organization Patterns

### Python Patterns

**Data Access Layer (DAL):**
- Abstraction over CSV/DuckDB/SQLite backends
- Column aliasing for backward compatibility
- Type-safe queries using Pydantic

**Manifest-First Design:**
- Every output paired with manifest
- Byte hashes prevent silent corruption
- Schema versioning enables backward compatibility

### React/TypeScript Patterns

**Server Components (Next.js 15):**
- Default to Server Components for data fetching
- Client Components only when needed (interactivity, browser APIs)
- `'use client'` directive marks client boundaries

**Lazy Loading for 3D:**
```typescript
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse')
)

<Suspense fallback={<Loading />}>
  <DataUniverse {...props} />
</Suspense>
```

**State Management:**
- Server State: TanStack Query (manifest data, API responses)
- Client State: Zustand (minimal, local component state)
- URL State: Next.js Search Params (filters, navigation)

## Where to Find Things

### Making Changes to Specific Areas

| Task | Location | Key Files |
|------|----------|-----------|
| **Add new activity** | `data/activities.csv` | Update CSV, run `make build` |
| **Update emission factor** | `data/emission_factors.csv` | Update CSV, validate with `pytest tests/test_emission_factors.py` |
| **Modify derivation logic** | `calc/derive.py` | Main calculation engine (line 361-1779) |
| **Add new page** | `apps/carbon-acx-web/src/app/{route}/page.tsx` | Next.js App Router convention |
| **Create UI component** | `apps/carbon-acx-web/src/components/` | Organize by type (layout, viz, domain) |
| **Modify 3D visualization** | `apps/carbon-acx-web/src/components/viz/DataUniverse.tsx` | Three.js scene (520 lines) |
| **Update manifest schema** | `calc/manifest_model.py` | Pydantic model, increment `schema_version` |
| **Add API endpoint** | `apps/carbon-acx-web/src/app/api/{route}/route.ts` | Next.js API route convention |
| **Configure build** | `Makefile`, `next.config.ts` | Build targets and Next.js config |
| **Write documentation** | `docs/acx/ACX{NEXT}.md` | Use next available number (ACX095) |

### Common Workflows

**Data Update Workflow:**
1. Edit CSV in `data/`
2. Run `make build` (validates + derives)
3. Run `make test` (validates manifests)
4. Commit and push

**Frontend Development:**
1. Create feature branch
2. Develop in `apps/carbon-acx-web/src/`
3. Run `pnpm dev` (local Next.js dev server)
4. Test with `pnpm typecheck` and `pnpm test`
5. Create PR, deploy to Cloudflare Pages preview

**3D Component Changes:**
1. Edit `components/viz/DataUniverse.tsx`
2. Test locally at `/explore/3d`
3. Verify SSR safety (no errors in build)
4. Check bundle size: `pnpm run build` (should stay ~241KB gzip)

## Technical Debt & Areas of Complexity

### Current Challenges

**Legacy Vite Site:**
- `apps/carbon-acx-web-legacy/` still exists
- Scheduled for deprecation after Next.js migration complete
- Causes confusion about which app is canonical

**Type Conflicts:**
- React 19 + React Three Fiber type incompatibilities
- Temporarily ignored with `typescript.ignoreBuildErrors: true`
- Waiting for R3F to update type definitions

**Test Coverage:**
- Python: Good coverage on derivation logic
- Frontend: Minimal (E2E tests planned but not implemented)
- Playwright configured but no tests written yet

**Manifest Verification:**
- Infrastructure in place (`verifyManifest()` function)
- Not yet integrated into UI workflows
- Future: Add "Verify Integrity" button to manifest detail pages

### Areas Requiring Careful Attention

**Build Artifacts:**
- Never commit `dist/artifacts/` to Git
- Artifacts are generated at build time from CSV sources
- Exception: Root `manifest.json` may be committed for static deployments

**SSR Safety:**
- Always lazy-load Three.js components
- Use `typeof window !== 'undefined'` checks for browser APIs
- Wrap in `<Suspense>` with fallback UI

**Context Budget (Token Usage):**
- Archive old docs (>180 days) before large refactors
- Use Plan Mode (Shift+Tab twice) for exploration tasks
- Read PREFIX files first (ACX084, ACX080, INDEX.md)

## Related Diagrams

- **Architecture Overview** (`2-architecture-overview.mermaid.md`) - High-level system design
- **Component Map** (`3-component-map.mermaid.md`) - React component relationships
- **Data Flow** (`4-data-flow.mermaid.md`) - How data moves through layers
- **Entry Points** (`5-entry-points.mermaid.md`) - All ways to interact with codebase
- **Deployment Infrastructure** (`6-deployment-infrastructure.mermaid.md`) - CI/CD and hosting

## Version History

- **v0.0.1** - Initial Vite React implementation
- **v0.0.2** - Canvas-first architecture with XState
- **v0.0.3** - 3D Universe integration (ACX084)
- **v1.0.0** - Pre-Next.js rebuild snapshot
- **v0.0.4** (Current) - Next.js 15 rebuild (ACX093), DataUniverse port (ACX094)
