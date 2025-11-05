# Strategic Frontend Rebuild Specification

**Document ID:** ACX092
**Status:** Approved
**Decision:** Strategic rebuild of frontend, preserve backend
**Date:** 2025-11-05
**Author:** Carbon ACX Strategic Planning

---

## Executive Summary

After comprehensive audit of the Carbon ACX codebase, this document recommends a **strategic rebuild of the frontend** while **preserving the excellent backend infrastructure**. The Python-based data pipeline, manifest-first architecture, and provenance tracking are working exactly as designed and should remain untouched. However, the React frontend exhibits architectural confusion, minimal test coverage, and drift from core objectives that warrant a clean rebuild rather than incremental fixes.

**Recommendation:** Build a modern Next.js 15-based frontend that directly surfaces manifests, byte hashes, and provenance while maintaining the 3D visualization work recently completed in ACX084.

---

## Table of Contents

1. [Audit Findings](#audit-findings)
2. [Decision Rationale](#decision-rationale)
3. [Current State Analysis](#current-state-analysis)
4. [Rebuild Strategy](#rebuild-strategy)
5. [Technology Stack](#technology-stack)
6. [Architecture Design](#architecture-design)
7. [Implementation Phases](#implementation-phases)
8. [Migration Strategy](#migration-strategy)
9. [Risk Analysis](#risk-analysis)
10. [Success Metrics](#success-metrics)
11. [References](#references)

---

## Audit Findings

### Backend Infrastructure: EXCELLENT ✅

The Python-based backend is a reference implementation of trustworthy carbon accounting:

**Strengths:**
- **Manifest-first architecture** working as designed (calc/derive.py:361-368)
- **Byte hashes** computed correctly using SHA256 (calc/derive.py:361-368)
- **Provenance tracking** embedded in all artifacts
- **Pydantic validation** ensures schema compliance
- **Multiple data backends** supported (CSV, SQLite, DuckDB)
- **Comprehensive test suite** for Python code
- **Clean separation of concerns**: DAL → Schema → Derive → Figures → Manifest
- **Reproducible builds** with immutable artifact hashing

**Data Pipeline Quality:**
```
CSV Inputs (data/)
    ↓
Pydantic Schemas (calc/schema.py)
    ↓
Derivation Engine (calc/derive.py)
    ↓
Figure Generation (calc/figures.py)
    ↓
Manifest Creation (calc/figures_manifest.py)
    ↓
Hashed Artifacts (dist/artifacts/<hash>/)
```

**Recommendation:** **PRESERVE ENTIRELY** - The backend is production-ready and exemplary.

---

### Frontend Infrastructure: PROBLEMATIC ❌

The React-based frontend shows signs of multiple false starts and architectural drift:

**Critical Issues:**

1. **Architectural Confusion**
   - **Two separate apps**: `App.tsx` and `CanvasApp.tsx` with unclear primary
   - **Two routing systems**: `router.tsx` (React Router v6) and `CanvasApp.tsx` router
   - **Three frontend references**:
     - `site/` directory mentioned in README
     - `apps/carbon-acx-web/` pnpm workspace
     - Legacy components scattered throughout

2. **Minimal Test Coverage**
   - **Only 2 test files** for entire frontend (confirmed via find)
   - No E2E testing evident
   - No integration tests for manifest consumption
   - Testing coverage estimated <5%

3. **Mission Drift from Core Objectives**
   - **Manifest visibility**: Byte hashes not shown in UI
   - **Provenance tracking**: Lineage not surfaced to users
   - **Citations**: Not prominently displayed
   - **Data transparency**: Methodology hidden in modals

4. **Recent Churn Indicates Deeper Problems**
   - ACX084 (Oct 2025): Removed 4000 lines of over-engineered code
   - XState journey machine removed (too complex)
   - CanvasZone orchestration deleted
   - Multiple navigation fixes in commit history
   - "Rock-solid sprint" mentioned but issues remain

5. **State Management Complexity**
   - **Multiple context providers**: ProfileContext, ToastContext, LayerContext
   - **Zustand store** with 500+ lines (appStore.ts)
   - **No clear data flow** from manifests to UI
   - Persisted state without clear migration strategy

6. **Deployment Ambiguity**
   - Makefile references both `site/` and `apps/carbon-acx-web`
   - Build process unclear for modern frontend
   - Cloudflare Pages deployment not well-documented

**Recommendation:** **REBUILD WITH MODERN FOUNDATIONS** - Incremental fixes won't resolve structural issues.

---

## Decision Rationale

### Why Rebuild Instead of Fix?

1. **Accidental Complexity**
   - Current frontend accumulated through multiple iterations
   - Each "simplification" (ACX084) leaves residue
   - Two apps, two routers, unclear entry points = fundamental confusion
   - Cost of fixing > cost of rebuilding

2. **Mission Alignment**
   - Core objectives (manifest-first, provenance, byte hashes) not evident in UI
   - Current UI treats backend as generic API
   - Rebuild allows "manifest-first UI" from day one

3. **Testing Foundation**
   - 2 test files indicates testing was afterthought
   - Retrofitting tests onto untested codebase is extremely difficult
   - Clean rebuild with TDD approach ensures 80%+ coverage

4. **Modern Best Practices**
   - Current: Client-side React, manual SSR workarounds
   - Modern: Next.js 15 Server Components, automatic SSR/SSG
   - Current: Multiple state management approaches
   - Modern: Server state (TanStack Query) + minimal client state (Zustand)

5. **Developer Experience**
   - Current: Confusion about which app to modify
   - Modern: Single entry point, clear conventions
   - Current: Manual SSR safety for Three.js (ACX084)
   - Modern: Automatic with Next.js App Router

6. **Preservation of Good Work**
   - 3D Universe from ACX084 was well-implemented
   - Can be ported to Next.js with React Three Fiber
   - Design tokens approach is solid, can be preserved

### What We're NOT Changing

**Backend (calc/, data/, Makefile, Python):**
- ✅ CSV data sources remain canonical
- ✅ Derivation pipeline unchanged
- ✅ Manifest generation process preserved
- ✅ Byte hash computation stays identical
- ✅ Pydantic schemas maintained
- ✅ Python testing suite continues

**Dash App (app/):**
- ✅ Operational dashboard for analysts
- ✅ Continues to read from same artifacts
- ✅ No changes required

**Cloudflare Workers (workers/, functions/):**
- ✅ API endpoints preserved
- ✅ Artifact serving unchanged
- ✅ May add Next.js API routes alongside

---

## Current State Analysis

### File Structure Audit

```
carbon-acx/
├── data/                     # ✅ KEEP - CSV source of truth
│   ├── activities.csv
│   ├── emission_factors.csv
│   ├── grid_intensity.csv
│   └── ...
│
├── calc/                     # ✅ KEEP - Derivation engine
│   ├── derive.py            # Core pipeline (1890 lines)
│   ├── schema.py            # Pydantic models
│   ├── figures.py           # Figure generation
│   ├── figures_manifest.py  # Manifest creation
│   └── dal.py               # Data access layer
│
├── app/                      # ✅ KEEP - Dash operational client
│   └── app.py
│
├── apps/carbon-acx-web/      # ❌ REPLACE - Modern React app
│   ├── src/
│   │   ├── App.tsx          # ??? Primary entry point?
│   │   ├── CanvasApp.tsx    # ??? Alternative entry point?
│   │   ├── router.tsx       # ??? Router #1
│   │   ├── main.tsx
│   │   ├── pages/           # 4 pages (Welcome, Calculator, Explore, Insights)
│   │   ├── components/      # 60+ components
│   │   ├── store/           # Zustand store (500+ lines)
│   │   ├── contexts/        # 3 context providers
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.ts
│
├── site/                     # ❌ REMOVE - Legacy static site?
│   └── (unclear if still used)
│
├── functions/                # ✅ KEEP - Cloudflare Pages function
│   └── carbon-acx/
│
├── workers/                  # ✅ KEEP - Cloudflare Worker API
│   └── compute/
│
└── Makefile                  # ⚠️ UPDATE - Remove site/ refs, add Next.js
```

### Codebase Metrics

**Backend (Python):**
- Files: ~40
- Lines: ~15,000
- Test coverage: ~70% (estimated from pytest)
- Quality: Excellent

**Frontend (React):**
- Files: ~90
- Lines: ~8,000
- Test files: 2 (!!)
- Test coverage: <5%
- Quality: Poor to fair

### Dependencies Audit

**Good Choices (Preserve in Rebuild):**
- `@radix-ui/*` - Excellent accessible primitives
- `three`, `@react-three/fiber`, `@react-three/drei` - 3D visualization
- `tailwindcss` - Utility-first styling
- `zustand` - Lightweight state management
- `framer-motion` - Animations

**Questionable (Evaluate):**
- `echarts`, `recharts` - Two charting libraries (why?)
- `swr` AND `@tanstack/react-query` - Two data fetching libraries
- Multiple context providers - Could be consolidated

**Missing (Add in Rebuild):**
- Test runners (minimal vitest setup)
- E2E testing (no Playwright evident)
- Accessibility testing (@axe-core present but unused)

---

## Rebuild Strategy

### Core Principles

1. **Manifest-First UI**
   - Every data point shows provenance
   - Byte hashes visible and verifiable
   - Citations prominent, not hidden
   - Lineage traceable through UI

2. **Test-Driven Development**
   - Write tests first
   - 80%+ coverage minimum
   - E2E tests for critical flows
   - Visual regression testing

3. **Modern Web Standards**
   - Server Components where possible
   - Progressive enhancement
   - Accessible by default (WCAG 2.2 AA)
   - Performance budget: LCP <2.5s, FID <100ms

4. **Preserve Good Work**
   - Port 3D Universe from ACX084
   - Keep design token system
   - Maintain Radix UI components
   - Preserve accessibility features

### Migration Path

**Phase 0: Preparation** (Before starting)
- Archive current `apps/carbon-acx-web` to `apps/carbon-acx-web-legacy`
- Document all features in current UI
- Export Zustand persisted state schema
- Audit which features are actually used (analytics?)

**Phase 1-5: Implementation** (Detailed below)

**Phase 6: Cutover**
- Run both frontends in parallel (different routes)
- A/B test with real users
- Monitor metrics (perf, errors, engagement)
- Gradual traffic shift: 10% → 50% → 100%
- Deprecate legacy after 2 weeks stable

**Phase 7: Cleanup**
- Remove `apps/carbon-acx-web-legacy`
- Remove `site/` if confirmed unused
- Update all documentation
- Archive ACX084, ACX080 with "superseded by ACX092" note

---

## Technology Stack

### Frontend Framework

**Choice: Next.js 15 (App Router)**

**Rationale:**
1. **Built-in SSR/SSG** - No manual hydration workarounds needed
2. **Server Components** - Fetch manifest data server-side, reduce client JS
3. **Automatic code-splitting** - Better performance than manual React.lazy()
4. **API Routes** - Proxy to Python backend, add caching layer
5. **Image optimization** - Automatic WebP/AVIF generation
6. **TypeScript-first** - Better DX than Vite + manual config
7. **Cloudflare Pages support** - Already deploying there

**Alternatives Considered:**
- ❌ **Remix** - Smaller ecosystem, less mature
- ❌ **Astro** - Great for content sites, less ideal for complex apps
- ❌ **Keep Vite + React** - Doesn't solve architectural problems

### UI Layer

**Choices:**
- **React 19** - Latest stable, RSC support
- **TypeScript 5.5+** - Strict mode, no implicit any
- **Tailwind CSS 4** - Continue utility-first approach
- **Radix UI** - Preserve existing accessible primitives
- **Framer Motion** - Preserve animation library
- **Lucide React** - Icon library (already in use)

### Data Fetching

**Choice: TanStack Query v5 (React Query)**

**Rationale:**
1. **Server state management** - Perfect for manifest data
2. **Automatic caching** - Reduce backend requests
3. **Optimistic updates** - Better UX for mutations
4. **Devtools** - Debug queries easily
5. **SSR support** - Works with Next.js Server Components

**Remove:**
- ❌ **SWR** - Redundant with TanStack Query
- ❌ **Multiple context providers** - Use TQ for server state

### Client State

**Choice: Zustand 5 (Minimal)**

**Rationale:**
1. **Lightweight** - Only for true client state (UI preferences, temp data)
2. **Already in use** - Team familiar
3. **No boilerplate** - Unlike Redux
4. **Persisted state** - Continue using for user preferences

**Scope:** Use ONLY for:
- UI state (sidebar open/closed, theme, etc.)
- Temporary calculator inputs (before submission)
- User preferences (units, default view)

**Don't use for:**
- ❌ Server data (use TanStack Query)
- ❌ Form state (use React Hook Form)
- ❌ Derived data (compute in components)

### 3D Visualization

**Choices:**
- **Three.js ^0.180** - Keep current version
- **React Three Fiber ^9.4** - Keep current version
- **Drei ^10.7** - Keep current version

**Port from ACX084:**
- DataUniverse component (520 lines) - Port to Next.js page
- Camera animation system - Preserve
- Orbital mechanics - Preserve
- Hover/click interactions - Preserve

### Testing

**Choices:**
- **Vitest** - Fast, Vite-compatible unit testing
- **Testing Library** - Component testing
- **Playwright** - E2E testing
- **Axe** - Accessibility auditing
- **Chromatic** (optional) - Visual regression

**Coverage Targets:**
- Unit: 80%+
- Integration: 60%+
- E2E: Critical flows only
- Accessibility: 100% Axe compliance

### Build & Deploy

**Choices:**
- **pnpm 10.5.2** - Already in use
- **Node 20.19.4** - Already in use
- **Cloudflare Pages** - Already in use
- **Next.js Adapter** - @cloudflare/next-on-pages

### Development Tools

**Choices:**
- **ESLint 9** - Flat config, strict rules
- **Prettier 3** - Code formatting
- **TypeScript strict** - No implicit any
- **Husky** - Pre-commit hooks
- **lint-staged** - Only lint changed files

---

## Architecture Design

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Server     │  │    Server    │  │    API       │      │
│  │  Components  │  │    Actions   │  │   Routes     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│              ┌────────────────────────┐                     │
│              │   Manifest Data Layer  │                     │
│              └────────────┬───────────┘                     │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Python Backend (Unchanged)   │
            ├───────────────────────────────┤
            │  • calc/derive.py             │
            │  • Manifest generation        │
            │  • Byte hash computation      │
            │  • Artifact creation          │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │ dist/artifacts/<hash>/        │
            │  • manifests/                 │
            │  • figures/                   │
            │  • references/                │
            └───────────────────────────────┘
```

### Page Structure

```
app/
├── layout.tsx                    # Root layout, fonts, analytics
├── page.tsx                      # Homepage / Welcome
├── error.tsx                     # Error boundary
├── loading.tsx                   # Loading state
│
├── calculator/
│   ├── page.tsx                  # Calculator interface
│   └── layout.tsx                # Calculator-specific layout
│
├── explore/
│   ├── page.tsx                  # Data exploration
│   ├── 3d/
│   │   └── page.tsx              # 3D Universe view
│   ├── timeline/
│   │   └── page.tsx              # Timeline view
│   └── comparison/
│       └── page.tsx              # Comparison view
│
├── insights/
│   ├── page.tsx                  # Insights dashboard
│   └── [insightId]/
│       └── page.tsx              # Individual insight detail
│
├── manifests/
│   ├── page.tsx                  # Manifest explorer
│   ├── [manifestId]/
│   │   └── page.tsx              # Individual manifest viewer
│   └── verify/
│       └── page.tsx              # Byte hash verification tool
│
├── methodology/
│   └── page.tsx                  # Methodology documentation
│
├── api/
│   ├── manifests/
│   │   ├── route.ts              # List manifests
│   │   └── [id]/route.ts         # Get manifest by ID
│   ├── activities/
│   │   └── route.ts              # List activities
│   ├── emissions/
│   │   └── route.ts              # Calculate emissions
│   └── health/
│       └── route.ts              # Health check
│
└── _components/                  # Shared components (underscore = not route)
    ├── ui/                       # Radix UI wrappers
    ├── domain/                   # Domain-specific components
    ├── viz/                      # Visualization components
    └── system/                   # System components (error, loading)
```

### Data Flow

**Server-Side (Preferred):**
```typescript
// app/manifests/page.tsx - Server Component
import { getManifests } from '@/lib/manifests';

export default async function ManifestsPage() {
  const manifests = await getManifests(); // Direct file read, no API

  return <ManifestList manifests={manifests} />;
}

// lib/manifests.ts
import { readFile } from 'fs/promises';
import path from 'path';

export async function getManifests() {
  const manifestPath = path.join(process.cwd(), 'dist/artifacts/manifest.json');
  const data = await readFile(manifestPath, 'utf-8');
  return JSON.parse(data);
}
```

**Client-Side (When Needed):**
```typescript
// app/_components/calculator/EmissionForm.tsx - Client Component
'use client';

import { useMutation } from '@tanstack/react-query';

export function EmissionForm() {
  const calculate = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/emissions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  });

  // Form logic...
}
```

### Key Features

#### 1. Manifest Explorer

**Purpose:** Make manifest-first architecture visible to users

**Features:**
- Browse all generated manifests
- View byte hashes with verification status
- See provenance chain for each artifact
- Download raw manifest JSON
- Verify hashes client-side (SHA256 in browser)

**UI:**
```
╔════════════════════════════════════════════════════════╗
║ Manifest: stacked.6a4f2b8c.manifest.json             ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║ Generated: 2025-11-05T14:32:11Z                       ║
║ Build Hash: 6a4f2b8c                                  ║
║ Figure SHA256: 6a4f2b8c... [Verify ✓]                ║
║                                                        ║
║ ┌──────────────────────────────────────────────────┐  ║
║ │ Provenance Chain                                │  ║
║ ├──────────────────────────────────────────────────┤  ║
║ │ 1. data/activities.csv (SHA256: abc123...)      │  ║
║ │ 2. data/emission_factors.csv (SHA256: def456...)│  ║
║ │ 3. calc/derive.py v2.1.0                        │  ║
║ │ 4. Figure generation (timestamp: ...)           │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                        ║
║ Citation Keys: [1], [2], [3], [4], [5]               ║
║ Layers: professional, online                          ║
║                                                        ║
║ [View Figure] [Download Manifest] [Verify Hash]      ║
╚════════════════════════════════════════════════════════╝
```

**Implementation:**
- Server Component fetches manifest from `dist/artifacts/manifests/`
- Client Component handles hash verification (crypto.subtle.digest)
- Display diff if local hash doesn't match manifest hash (tampering detection)

#### 2. Activity Calculator

**Purpose:** Port existing calculator with better UX

**Features:**
- Multi-step wizard (4 questions: commute, diet, energy, shopping)
- Real-time emission preview
- Unit conversion (metric ↔ imperial)
- Comparison visualizations (flights, trees, meals)
- Save calculations to profile
- Export results (CSV, JSON)

**Flow:**
```
Welcome → Wizard Step 1 → Step 2 → Step 3 → Step 4 → Results
                                                         ↓
                                           [Save] [Export] [Explore in 3D]
```

**State Management:**
- Form state: React Hook Form (uncontrolled)
- Temporary calculations: Zustand (persisted to localStorage)
- Submitted data: TanStack Query (POST /api/emissions)

#### 3. 3D Universe (Port from ACX084)

**Purpose:** Preserve excellent 3D visualization work

**Features:**
- Central sphere = total emissions
- Orbiting spheres = individual activities
- Color coding (green <1t, amber 1-5t, red >5t)
- Camera choreography (intro zoom, click-to-fly)
- Hover tooltips with emission details
- Starfield background

**Port Strategy:**
1. Copy `DataUniverse.tsx` (520 lines) to `app/_components/viz/`
2. Adapt for Next.js (ensure client-side only with `'use client'`)
3. Preserve all ACX084 implementations:
   - Logarithmic size scaling
   - Orbital motion calculations
   - Camera animations
   - Raycasting for hover/click
4. Add manifest integration:
   - Show byte hash when clicking sphere
   - Link to citation panel
   - Display provenance on hover

**Example:**
```tsx
// app/explore/3d/page.tsx
import { Suspense } from 'react';
import { DataUniverse } from '@/components/viz/DataUniverse';
import { getActivities } from '@/lib/activities';

export default async function Universe3DPage() {
  const activities = await getActivities(); // Server-side fetch

  return (
    <Suspense fallback={<Loading3D />}>
      <ClientDataUniverse activities={activities} />
    </Suspense>
  );
}

// app/_components/viz/ClientDataUniverse.tsx
'use client';
import { DataUniverse } from './DataUniverse'; // Port from ACX084

export function ClientDataUniverse({ activities }) {
  return <DataUniverse activities={activities} />;
}
```

#### 4. Transparency Panel

**Purpose:** Prominently display citations, methodology, and data sources

**Features:**
- Floating action button (always visible)
- Slide-out panel with tabs:
  - **Citations**: Numbered IEEE-style references
  - **Methodology**: Calculation approach, assumptions
  - **Data Sources**: Emission factor lineage
  - **Changelog**: Recent data updates
- Per-component citations (show [1][2][3] next to data points)
- Download citation export (BibTeX, RIS)

**UI Pattern:**
```
┌───────────────────────────────────────┐
│ Emission: 5.2 tonnes CO₂/yr [1][2]   │ ← Citations inline
└───────────────────────────────────────┘

[Click citation] →

╔═══════════════════════════════════════╗
║ References                            ║
╠═══════════════════════════════════════╣
║ [1] GHG Protocol (2024). Corporate    ║
║     Accounting Standard. Retrieved    ║
║     from https://...                  ║
║                                       ║
║ [2] EPA (2023). Emission Factors      ║
║     for Greenhouse Gas Inventories.   ║
║     https://...                       ║
╚═══════════════════════════════════════╝
```

**Implementation:**
- Server Component fetches `references/<figure>_refs.txt`
- Parse IEEE format to structured JSON
- Display in Radix Dialog
- Provide download options

#### 5. Export Suite

**Purpose:** Programmatic access to all data

**Features:**
- **Download Buttons**: CSV, JSON, PDF (charts)
- **API Access**: Public REST API for manifests
- **Embeddable Widgets**: `<iframe>` snippets for charts
- **Webhooks** (future): Notify on new manifest generation

**Example API:**
```
GET /api/manifests              → List all manifests
GET /api/manifests/[id]         → Get specific manifest
GET /api/manifests/[id]/verify  → Verify byte hash
GET /api/activities             → List activities
POST /api/emissions             → Calculate emissions
GET /api/health                 → Health check
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up Next.js scaffold and manifest integration

**Tasks:**
1. **Scaffold Next.js 15 project**
   ```bash
   pnpm create next-app@latest carbon-acx-next \
     --typescript \
     --tailwind \
     --app \
     --src-dir \
     --import-alias "@/*"
   ```

2. **Install dependencies**
   ```bash
   pnpm add @tanstack/react-query zustand \
     @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
     framer-motion lucide-react

   pnpm add -D vitest @testing-library/react \
     @playwright/test @axe-core/playwright
   ```

3. **Configure build**
   - Update `next.config.ts` for Cloudflare Pages
   - Add `@cloudflare/next-on-pages` adapter
   - Configure environment variables

4. **Create manifest data layer**
   ```typescript
   // lib/manifests.ts
   export async function getManifests(): Promise<Manifest[]>
   export async function getManifest(id: string): Promise<Manifest>
   export async function verifyManifest(id: string): Promise<boolean>
   ```

5. **Implement API routes**
   - `app/api/manifests/route.ts`
   - `app/api/manifests/[id]/route.ts`
   - `app/api/health/route.ts`

**Deliverables:**
- ✅ Next.js app running at `localhost:3000`
- ✅ Manifest API working
- ✅ Basic layout (header, footer)
- ✅ CI/CD pipeline (GitHub Actions)

**Tests:**
- Unit: `lib/manifests.test.ts` (manifest parsing)
- Integration: `app/api/manifests/route.test.ts` (API endpoints)
- E2E: None yet

---

### Phase 2: Core Features (Week 3-4)

**Goal:** Implement calculator and manifest explorer

**Tasks:**

1. **Activity Calculator**
   - Port wizard logic from `CalculatorPage.tsx`
   - Create multi-step form (React Hook Form)
   - Implement real-time emission calculation
   - Add comparison visualizations (2D charts)
   - Save results to Zustand + localStorage

2. **Manifest Explorer**
   - List view of all manifests
   - Detail view with provenance chain
   - Byte hash verification UI
   - Download manifest button

3. **Activity Browser**
   - Filterable table of activities
   - Search by name, category
   - Sort by emissions, intensity
   - Link to emission factors

**Deliverables:**
- ✅ `/calculator` route functional
- ✅ `/manifests` route functional
- ✅ Basic navigation between pages
- ✅ 60%+ test coverage

**Tests:**
- Unit: Form validation, calculation logic
- Integration: Calculator → API → Results flow
- E2E: Complete calculator journey (Playwright)

---

### Phase 3: 3D Visualization (Week 5-6)

**Goal:** Port DataUniverse from ACX084 and integrate with manifests

**Tasks:**

1. **Port DataUniverse Component**
   - Copy `DataUniverse.tsx` (520 lines)
   - Adapt for Next.js (`'use client'` directive)
   - Ensure SSR safety (no hydration errors)
   - Test on Cloudflare Pages

2. **Preserve ACX084 Features**
   - Logarithmic size scaling
   - Orbital motion (requestAnimationFrame)
   - Camera choreography (intro zoom, click-to-fly)
   - Raycasting for interactions
   - Hover glow effects

3. **Add Manifest Integration**
   - Click sphere → show manifest details
   - Display byte hash in tooltip
   - Link to citation panel
   - Show provenance on hover

4. **Optimize Performance**
   - Code-split Three.js bundle
   - Lazy-load 3D components
   - Use React.memo for expensive renders
   - Profile with Chrome DevTools

**Deliverables:**
- ✅ `/explore/3d` route with DataUniverse
- ✅ All ACX084 features working
- ✅ Manifest integration complete
- ✅ Performance meets budget (LCP <2.5s)

**Tests:**
- Unit: Orbital calculations, size scaling
- Integration: Activity data → 3D rendering
- E2E: 3D interaction flow (click, hover, navigate)
- Visual: Screenshot regression with Chromatic

---

### Phase 4: Transparency Features (Week 7-8)

**Goal:** Surface citations, methodology, and data transparency

**Tasks:**

1. **Transparency Panel**
   - Floating action button (bottom-right)
   - Slide-out panel (Radix Dialog)
   - Tabs: Citations, Methodology, Data Sources, Changelog

2. **Inline Citations**
   - Parse IEEE references from `references/*.txt`
   - Display [1][2][3] next to data points
   - Click citation → open transparency panel
   - Implement citation tooltips

3. **Methodology Documentation**
   - Render methodology as MDX
   - Interactive examples (try calculation)
   - Link to emission factor sources
   - Download full methodology PDF

4. **Data Source Lineage**
   - Visualize data flow (CSV → Derive → Manifest)
   - Show last updated timestamps
   - Display data quality indicators
   - Link to raw data downloads

**Deliverables:**
- ✅ Transparency panel accessible from all pages
- ✅ Citations displayed inline
- ✅ Methodology documentation complete
- ✅ Data lineage visualized

**Tests:**
- Unit: Citation parsing, IEEE formatting
- Integration: Citation data → UI rendering
- E2E: Open panel, navigate tabs, download citations
- Accessibility: Axe audit passes

---

### Phase 5: Testing & Optimization (Week 8-9)

**Goal:** Achieve 80%+ coverage and meet performance budgets

**Tasks:**

1. **Unit Testing**
   - Test all utility functions
   - Test all data transformations
   - Test all calculation logic
   - Target: 85%+ coverage

2. **Integration Testing**
   - Test all API routes
   - Test data flow (API → UI)
   - Test form submissions
   - Target: 70%+ coverage

3. **E2E Testing**
   - Test critical user journeys
   - Test 3D interactions
   - Test manifest verification
   - Test export features

4. **Performance Optimization**
   - Lighthouse CI integration
   - Code-splitting analysis
   - Bundle size optimization
   - Image optimization (Next.js Image)

5. **Accessibility Audit**
   - Axe DevTools scan
   - Keyboard navigation testing
   - Screen reader testing
   - WCAG 2.2 AA compliance

**Deliverables:**
- ✅ 80%+ test coverage
- ✅ All Lighthouse scores >90
- ✅ 100% Axe compliance
- ✅ Performance budget met

**Tests:**
- Unit: 85%+ coverage
- Integration: 70%+ coverage
- E2E: All critical flows
- Accessibility: 100% Axe pass rate

---

### Phase 6: Migration & Deployment (Week 9-10)

**Goal:** Deploy to production and migrate users

**Tasks:**

1. **Parallel Deployment**
   - Deploy Next.js app to `/next` route
   - Keep legacy app at root `/`
   - Configure Cloudflare routing

2. **A/B Testing**
   - Split traffic: 10% Next.js, 90% legacy
   - Track metrics: bounce rate, engagement, errors
   - Collect user feedback

3. **Gradual Migration**
   - Week 1: 10% traffic
   - Week 2: 50% traffic
   - Week 3: 100% traffic (if metrics positive)

4. **Data Migration**
   - Export legacy Zustand state
   - Migrate to new schema
   - Provide import tool for users

5. **Documentation**
   - Update README.md
   - Write migration guide
   - Document new features
   - Archive ACX084, ACX080 with superseded notes

**Deliverables:**
- ✅ Next.js deployed to production
- ✅ A/B test results positive
- ✅ Users migrated successfully
- ✅ Documentation updated

**Metrics:**
- Error rate <0.1%
- Bounce rate improved by >10%
- User satisfaction >4/5

---

## Migration Strategy

### Data Migration

**Zustand State (localStorage):**

Current schema (legacy):
```typescript
{
  profile: {
    activities: Activity[],
    calculatorResults: CalculatorResult[],
    layers: ProfileLayer[],
    goals: CarbonGoal[],
    scenarios: Scenario[],
    emissionsHistory: EmissionSnapshot[],
    lastUpdated: string,
  }
}
```

New schema (Next.js):
```typescript
{
  version: 2,
  preferences: {
    theme: 'light' | 'dark',
    units: 'metric' | 'imperial',
    defaultView: '2d' | '3d',
  },
  calculator: {
    draft: CalculatorDraft | null, // Temporary form state
  },
  // Server data moved to TanStack Query cache
}
```

**Migration Script:**
```typescript
function migrateV1ToV2(v1State: any) {
  return {
    version: 2,
    preferences: {
      theme: 'light',
      units: 'metric',
      defaultView: '2d',
    },
    calculator: {
      draft: null,
    },
    // Upload v1.profile to backend
    legacy: v1State.profile,
  };
}
```

**Process:**
1. Detect v1 state in localStorage
2. Show migration prompt
3. Upload activities to backend (POST /api/profiles/import)
4. Clear localStorage
5. Set v2 state

### Feature Parity

**Must-Have (Launch Blockers):**
- ✅ Activity calculator (4-question wizard)
- ✅ Results visualization (2D charts + comparisons)
- ✅ 3D Universe (DataUniverse port)
- ✅ Manifest explorer
- ✅ Export features (CSV, JSON)

**Nice-to-Have (Can Launch Without):**
- ⚠️ Layers (complex feature, defer to v2)
- ⚠️ Goals (defer to v2)
- ⚠️ Scenarios (defer to v2)
- ⚠️ Emissions history chart (defer to v2)

**Deprecated (Remove):**
- ❌ LegacyApp.tsx (if exists)
- ❌ Multiple routing systems
- ❌ Canvas orchestration (was removed in ACX084)

### Rollback Plan

**If Issues Detected:**
1. Monitor error rates (>1% = abort)
2. Monitor user feedback (negative = investigate)
3. Monitor performance (regression = optimize)

**Rollback Procedure:**
1. Switch Cloudflare routing back to legacy
2. Investigate root cause
3. Fix in dev environment
4. Re-deploy when ready

**Success Criteria for No-Rollback:**
- Error rate <0.1% for 7 days
- Performance metrics improved
- User feedback positive
- No data loss incidents

---

## Risk Analysis

### Technical Risks

**Risk 1: Three.js SSR Issues** (High Impact, Medium Probability)
- **Mitigation:** Test extensively on Cloudflare Pages
- **Fallback:** Client-side only rendering with loading state
- **Status:** ACX084 already solved this with lazy loading

**Risk 2: Manifest Parsing Errors** (High Impact, Low Probability)
- **Mitigation:** Comprehensive unit tests for parsing logic
- **Fallback:** Show raw JSON if parsing fails
- **Status:** Backend manifests are well-formed

**Risk 3: Performance Regression** (Medium Impact, Medium Probability)
- **Mitigation:** Lighthouse CI, performance budgets
- **Fallback:** Code-splitting, lazy loading
- **Status:** Next.js optimizations should improve perf

**Risk 4: Data Migration Failures** (High Impact, Low Probability)
- **Mitigation:** Backup localStorage before migration
- **Fallback:** Manual export/import tool
- **Status:** Provide clear migration instructions

### Business Risks

**Risk 5: User Confusion** (Medium Impact, High Probability)
- **Mitigation:** Clear onboarding, migration guide
- **Fallback:** Keep legacy app accessible for 30 days
- **Status:** A/B testing will surface issues early

**Risk 6: Feature Gaps** (Low Impact, Medium Probability)
- **Mitigation:** Feature parity analysis, prioritize must-haves
- **Fallback:** Defer nice-to-haves to v2
- **Status:** Most features are well-documented

**Risk 7: Extended Timeline** (Medium Impact, Medium Probability)
- **Mitigation:** Weekly progress reviews, adjust scope
- **Fallback:** Launch with MVP, iterate post-launch
- **Status:** 10-week timeline has buffer

### Organizational Risks

**Risk 8: Knowledge Loss** (Low Impact, Low Probability)
- **Mitigation:** Document all decisions in ACX092
- **Fallback:** Keep legacy code archived
- **Status:** Comprehensive documentation planned

**Risk 9: Stakeholder Rejection** (High Impact, Low Probability)
- **Mitigation:** Demo early and often, gather feedback
- **Fallback:** Adjust approach based on feedback
- **Status:** Strategic decision approved

---

## Success Metrics

### Performance Metrics

**Core Web Vitals (Target: >90):**
- Largest Contentful Paint (LCP): <2.5s
- First Input Delay (FID): <100ms
- Cumulative Layout Shift (CLS): <0.1

**Lighthouse Scores (Target: >90):**
- Performance: >90
- Accessibility: 100
- Best Practices: >90
- SEO: >90

**Bundle Size:**
- Initial JS: <150KB (gzip)
- Total JS: <500KB (gzip)
- 3D chunk (lazy): <250KB (gzip)

### Quality Metrics

**Test Coverage:**
- Unit: >85%
- Integration: >70%
- E2E: All critical flows
- Accessibility: 100% Axe pass

**Error Rates:**
- Frontend errors: <0.1%
- API errors: <0.5%
- Build failures: 0%

### User Metrics

**Engagement:**
- Bounce rate: <30% (improve from baseline)
- Time on site: >3min (improve from baseline)
- Calculator completion: >60%

**Satisfaction:**
- User feedback: >4/5
- Feature requests: <10% negative
- Bug reports: <5/month

### Business Metrics

**Deployment:**
- Build time: <5min
- Deploy time: <10min
- Rollback time: <5min

**Maintenance:**
- Time to fix critical bug: <4hrs
- Time to ship new feature: <1 week
- Documentation coverage: 100%

---

## References

[1] Next.js 15 Documentation - https://nextjs.org/docs
[2] React 19 Documentation - https://react.dev/
[3] TanStack Query v5 - https://tanstack.com/query/latest
[4] Radix UI Primitives - https://www.radix-ui.com/
[5] Tailwind CSS 4 - https://tailwindcss.com/
[6] Three.js Documentation - https://threejs.org/docs/
[7] React Three Fiber - https://docs.pmnd.rs/react-three-fiber/
[8] Vitest Documentation - https://vitest.dev/
[9] Playwright Documentation - https://playwright.dev/
[10] Web Accessibility Initiative (WAI) - https://www.w3.org/WAI/
[11] Cloudflare Pages Documentation - https://developers.cloudflare.com/pages/
[12] @cloudflare/next-on-pages - https://github.com/cloudflare/next-on-pages
[13] ACX084 - 3D Universe Foundation Sprint (internal)
[14] ACX080 - Phase 1 Rebuild Strategy (internal, superseded)
[15] Carbon ACX README.md - Manifest-first architecture overview

---

## Appendix A: Detailed Component Inventory

### Components to Port (Priority 1)

From `apps/carbon-acx-web/src/`:

1. **Calculator Flow:**
   - `pages/CalculatorPage.tsx` → `app/calculator/page.tsx`
   - `components/QuickCalculator.tsx` → `app/_components/calculator/Calculator.tsx`
   - `components/domain/EmissionCalculator.tsx` → `app/_components/calculator/EmissionCalculator.tsx`

2. **3D Visualization:**
   - `components/viz/DataUniverse.tsx` → `app/_components/viz/DataUniverse.tsx` (520 lines)
   - `components/viz/DataUniverseWrapper.tsx` → Remove (Next.js handles SSR)

3. **Domain Components:**
   - `components/domain/CitationPanel.tsx` → `app/_components/transparency/CitationPanel.tsx`
   - `components/domain/MethodologyModal.tsx` → `app/_components/transparency/MethodologyModal.tsx`
   - `components/domain/ActivityManagement.tsx` → `app/_components/activities/ActivityManagement.tsx`

### Components to Rebuild (Priority 2)

1. **Navigation:**
   - Current: Multiple routers (router.tsx, CanvasApp router)
   - Next.js: Built-in App Router

2. **State Management:**
   - Current: Zustand (500 lines) + 3 Context providers
   - Next.js: TanStack Query (server state) + Zustand (client state only)

3. **Layout:**
   - Current: Multiple layout approaches
   - Next.js: `app/layout.tsx` (root), nested layouts

### Components to Deprecate

1. **App.tsx** - Legacy entry point
2. **CanvasApp.tsx** - Conflicting entry point
3. **StoryScene.tsx** - Removed in ACX084
4. **CanvasZone.tsx** - Removed in ACX084
5. **journeyMachine.ts** - Removed in ACX084

---

## Appendix B: API Endpoints

### Public API (Read-Only)

```
GET /api/manifests
  → List all available manifests
  Response: { manifests: Manifest[] }

GET /api/manifests/[id]
  → Get specific manifest by ID
  Response: { manifest: Manifest }

GET /api/manifests/[id]/verify
  → Verify byte hash of manifest
  Response: { verified: boolean, hash: string }

GET /api/activities
  → List all activities
  Query: ?category=string&search=string
  Response: { activities: Activity[] }

GET /api/emission-factors
  → List emission factors
  Response: { factors: EmissionFactor[] }

GET /api/health
  → Health check
  Response: { status: 'ok', version: string }
```

### Calculation API (POST)

```
POST /api/emissions
  → Calculate emissions from activities
  Body: { activities: ActivityInput[] }
  Response: {
    totalEmissions: number,
    breakdown: CategoryBreakdown[],
    comparisons: Comparison[],
  }

POST /api/profiles/import
  → Import legacy profile data
  Body: { version: 1, profile: ProfileData }
  Response: { success: boolean, profileId: string }
```

### Internal API (Server Components)

```typescript
// lib/manifests.ts
export async function getManifests(): Promise<Manifest[]>
export async function getManifest(id: string): Promise<Manifest>
export async function verifyManifest(id: string): Promise<boolean>

// lib/activities.ts
export async function getActivities(filters?: ActivityFilters): Promise<Activity[]>
export async function getActivity(id: string): Promise<Activity>

// lib/emissions.ts
export async function calculateEmissions(activities: ActivityInput[]): Promise<EmissionResult>
```

---

## Appendix C: Environment Variables

```bash
# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://carbon-acx.pages.dev

# Backend Integration
ACX_DATA_BACKEND=csv
ACX_ARTIFACT_DIR=/Users/chrislyons/dev/carbon-acx/dist/artifacts

# Feature Flags
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_EXPORTS=true
NEXT_PUBLIC_ENABLE_API=true

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=

# Cloudflare
CF_PAGES=1
CF_PAGES_URL=
CF_PAGES_COMMIT_SHA=

# Build
NEXT_TELEMETRY_DISABLED=1
```

---

## Appendix D: Testing Strategy

### Unit Tests (Vitest)

**Coverage Target: 85%+**

```typescript
// lib/manifests.test.ts
describe('getManifests', () => {
  it('should parse manifests from artifacts directory', async () => {
    const manifests = await getManifests();
    expect(manifests).toHaveLength(4);
    expect(manifests[0]).toHaveProperty('generated_at');
  });
});

// lib/emissions.test.ts
describe('calculateEmissions', () => {
  it('should calculate total emissions from activities', () => {
    const result = calculateEmissions([
      { activity: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 100 },
    ]);
    expect(result.totalEmissions).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Testing Library)

**Coverage Target: 70%+**

```typescript
// app/calculator/__tests__/Calculator.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import Calculator from '../page';

describe('Calculator', () => {
  it('should complete 4-step wizard', async () => {
    render(<Calculator />);

    // Step 1: Commute
    await userEvent.click(screen.getByText('Car'));
    await userEvent.type(screen.getByLabelText('Distance'), '10');
    await userEvent.click(screen.getByText('Next'));

    // Step 2-4: Similar...

    // Results
    expect(screen.getByText(/tonnes CO₂\/yr/)).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

**Coverage: Critical flows**

```typescript
// e2e/calculator.spec.ts
import { test, expect } from '@playwright/test';

test('complete calculator and view in 3D', async ({ page }) => {
  await page.goto('/calculator');

  // Complete wizard
  await page.click('text=Car');
  await page.fill('input[name="distance"]', '10');
  await page.click('text=Next');
  // ... steps 2-4

  // View results
  await expect(page.locator('text=/tonnes CO₂/')).toBeVisible();

  // Navigate to 3D
  await page.click('text=View in 3D');
  await expect(page.locator('canvas')).toBeVisible();
});
```

### Accessibility Tests (Axe)

**Coverage: 100% WCAG 2.2 AA**

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## Appendix E: Performance Budget

### Bundle Size Limits

```
Initial Load (Critical Path):
  HTML: <50KB (gzip)
  CSS: <20KB (gzip)
  JS (First Load): <150KB (gzip)

Route Chunks:
  /calculator: <50KB (gzip)
  /explore: <30KB (gzip)
  /explore/3d: <250KB (gzip, includes Three.js)
  /manifests: <30KB (gzip)

Shared Chunks:
  React + Next.js: ~100KB (gzip)
  Radix UI: ~40KB (gzip)
  TanStack Query: ~15KB (gzip)

Total Transfer (Full App): <500KB (gzip)
```

### Load Time Targets

```
First Contentful Paint (FCP): <1.5s
Largest Contentful Paint (LCP): <2.5s
Time to Interactive (TTI): <3.5s
First Input Delay (FID): <100ms
Cumulative Layout Shift (CLS): <0.1
```

### Runtime Performance

```
3D Rendering:
  Frame Rate: 60 FPS (desktop)
  Frame Rate: 30 FPS (mobile, acceptable)
  WebGL Calls: <1000 per frame

Memory Usage:
  Idle: <50MB
  Calculator: <100MB
  3D Universe: <200MB

API Response Times:
  /api/manifests: <200ms
  /api/emissions: <500ms (includes calculation)
```

---

## Appendix F: Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Lighthouse scores >90
- [ ] Accessibility audit passes (Axe)
- [ ] Performance budget met
- [ ] Security audit passes (Snyk, npm audit)
- [ ] Environment variables configured
- [ ] Cloudflare Pages adapter tested
- [ ] SSR verified on Cloudflare
- [ ] API routes functional
- [ ] Error tracking configured (Sentry?)

### Deployment

- [ ] Build production bundle (`pnpm build`)
- [ ] Verify bundle sizes
- [ ] Deploy to staging (e.g., `staging.carbon-acx.pages.dev`)
- [ ] Smoke test critical flows
- [ ] Deploy to production (`production.carbon-acx.pages.dev`)
- [ ] Monitor error rates (first 1 hour)
- [ ] Monitor performance metrics
- [ ] Verify analytics tracking

### Post-Deployment

- [ ] Update documentation (README, CLAUDE.md)
- [ ] Archive legacy codebase
- [ ] Create ACX093 deployment report
- [ ] Celebrate! 🎉

---

## Appendix G: Lessons from ACX084

### What Worked Well

1. **Logarithmic Scaling** - Makes small and large emissions visible simultaneously
2. **Orbital Motion** - Engaging without being distracting
3. **SSR Safety Pattern** - `typeof window !== 'undefined'` + useEffect prevents hydration issues
4. **2D+3D Hybrid** - Best of both worlds (transparency AND visualization)
5. **Progressive Enhancement** - 2D numbers first, 3D reveal second
6. **Camera Choreography** - Intro animation makes 3D feel intentional

### Challenges Overcome

1. **Bundle Size** - Three.js adds ~2MB, lazy loading made it acceptable
2. **SSR Errors** - Fixed with client-side mounting and error boundaries
3. **Camera State** - useFrame hook required understanding R3F render loop
4. **Orbital Calculations** - Matched requestAnimationFrame timing with Date.now()

### What to Improve in Port

1. **Code Splitting** - Further split DataUniverse into smaller chunks
2. **Web Workers** - Move orbital calculations to worker thread for heavy loads
3. **Level-of-Detail (LOD)** - Reduce sphere complexity when >50 activities (32→16→8 segments)
4. **Instancing** - Use THREE.InstancedMesh for identical spheres (performance boost)

---

**End of ACX092 Strategic Frontend Rebuild Specification**

**Next Steps:**
1. Review and approve this specification
2. Set up Next.js project (Phase 1)
3. Weekly progress reviews
4. Adjust timeline/scope as needed
5. Launch in 10 weeks!
