# Entry Points - Detailed Notes

## Overview

Carbon ACX has multiple entry points depending on the deployment target and development mode. The modern application uses a canvas-first architecture with smart initialization, while legacy applications remain available for analytics and marketing.

## Modern Application Entry Flow

### 1. HTML Entry (`index.html`)

**Location**: `/apps/carbon-acx-web/index.html`

The root HTML file provides:
- `<div id="root">` mount point
- Meta tags (viewport, charset, theme-color)
- Links to design tokens and global styles
- Script tag pointing to `src/main.tsx`

**Critical elements**:
```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

### 2. Bootstrap Layer (`main.tsx`)

**Location**: `/apps/carbon-acx-web/src/main.tsx`

**Purpose**: Dynamic app loader based on environment variable.

**Decision logic**:
```typescript
const useLegacy = (import.meta.env.ACX_LEGACY_UI ?? import.meta.env.VITE_ACX_LEGACY_UI) === '1';
const loadApp = useLegacy ? () => import('./legacy/LegacyApp') : () => import('./NewApp');
```

**Why environment-based loading?**
- Allows A/B testing of new vs. legacy UI
- Maintains backward compatibility during Phase 1 rollout
- Reduces bundle size via code splitting (only loads one app)

**Default behavior**: Load modern app (`NewApp.tsx`)

**React 18 rendering**:
```typescript
ReactDOM.createRoot(rootElement!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Uses React 18 concurrent rendering for:
- Automatic batching
- Suspense support
- Concurrent features (future-ready)

### 3. Modern App Entry (`NewApp.tsx` → `CanvasApp.tsx`)

**Location**:
- `/apps/carbon-acx-web/src/NewApp.tsx` (re-export)
- `/apps/carbon-acx-web/src/CanvasApp.tsx` (actual implementation)

**Architecture**: Canvas-first, story-driven application.

**Key responsibilities**:
1. Import design tokens and global styles
2. Initialize state management hooks
3. Implement smart initialization logic
4. Render story scenes with error boundaries

**Smart Initialization**:
```typescript
React.useEffect(() => {
  if (isOnboarding && (activities.length > 0 || totalEmissions > 0)) {
    // User has baseline data - skip to Explore
    skipOnboarding();
    baselineComplete();
    exploreSectors();
  }
}, []); // Empty deps = run once on mount
```

**Why smart initialization?**
- Returning users skip onboarding
- Persisted data allows immediate exploration
- Improves UX by respecting user progress

**Scene rendering**:
```typescript
<OnboardingScene show={isOnboarding} onComplete={handleOnboardingComplete} />
<BaselineScene show={isBaseline} mode={baselineMode} onComplete={baselineComplete} />
<ExploreScene show={isExplore} initialMode="timeline" />
<InsightScene show={isInsight} />
```

Only one scene visible at a time (controlled by XState journey machine).

**Development Debug Panel**:
- Only renders when `import.meta.env.DEV === true`
- Shows current state, emissions, quick navigation
- Positioned fixed bottom-right
- z-index: 9999 to stay on top

## State Initialization

### Zustand Store Hydration

**Location**: `/apps/carbon-acx-web/src/store/appStore.ts`

**Initialization flow**:
1. Create store with `create()` from zustand
2. Apply `persist()` middleware
3. Check localStorage for key `'carbon-acx-storage'`
4. If found: Hydrate profile data
5. If not found: Use initial state (empty profile)

**Persisted data**:
```typescript
partialize: (state) => ({
  profile: state.profile, // Only persist profile data
})
```

**Why partial persistence?**
- UI state (activeZone, transitionState) should not persist
- Prevents stale UI state on reload
- Reduces localStorage size

**Initial profile structure**:
```typescript
const initialProfile: ProfileData = {
  activities: [],
  calculatorResults: [],
  layers: [],
  goals: [],
  scenarios: [],
  lastUpdated: new Date().toISOString(),
};
```

### XState Journey Machine Initialization

**Location**: `/apps/carbon-acx-web/src/machines/journeyMachine.ts`

**Initial state**: `'onboarding'`

**Initial context**:
```typescript
context: {
  hasCompletedOnboarding: false,
  hasEstablishedBaseline: false,
  activitiesAdded: 0,
  scenariosCreated: 0,
  goalsSet: 0,
  exportsGenerated: 0,
  startedAt: null,
  currentStepCompletedAt: null,
}
```

**Entry action**:
When entering `onboarding` state:
```typescript
entry: assign({
  startedAt: () => new Date().toISOString(),
})
```

**Why XState for journey orchestration?**
- Declarative state transitions
- Prevents impossible states (can't be in Insight without Baseline)
- Visual debugging (XState inspector)
- Context tracking (when did user complete each step?)

### Hook Integration

**Location**: `/apps/carbon-acx-web/src/hooks/useJourneyMachine.ts`

Provides ergonomic API for components:
```typescript
const {
  isOnboarding,    // Boolean state checks
  isBaseline,
  isExplore,
  skipOnboarding,  // Event senders
  completeOnboarding,
  baselineComplete,
} = useJourneyMachine();
```

**Type-safe events**: All transitions validated by TypeScript.

## Legacy React Router Entry

**Location**: `/apps/carbon-acx-web/src/legacy/LegacyApp.tsx`

**Status**: Deprecated, preserved for backward compatibility.

**Routes**:
- `/` → HomeView
- `/dashboard` → CanvasApp (new)
- `/dashboard-legacy` → DashboardView (old grid UI)
- `/sectors/:sectorId` → SectorView
- `/datasets/:datasetId` → DatasetView

**Why keep legacy router?**
- Some deep links still point to `/sectors/:id`
- Analytics pages use route-based navigation
- Gradual migration to canvas-first

**Suspense lazy loading**:
```typescript
const Layout = lazy(() => import('./views/Layout'));
const CanvasApp = lazy(() => import('./CanvasApp'));
```

Reduces initial bundle size by code-splitting views.

## Development Server Entry

### Vite Dev Server

**Command**: `pnpm dev` (from root) or `npm run dev` (from `apps/carbon-acx-web/`)

**Configuration**: `/apps/carbon-acx-web/vite.config.ts`

**Port**: 5173 (default Vite)

**Features**:
1. **Hot Module Replacement (HMR)**
   - React Fast Refresh for instant updates
   - Preserves component state during edits
   - CSS updates without full reload

2. **Sample Queries API Middleware**
   - Mock API endpoints for development
   - Endpoints:
     - `/api/sectors` → List all sectors
     - `/api/sectors/:id` → Sector details + activities + profiles
     - `/api/datasets` → List datasets
     - `/api/datasets/:id` → Dataset details + references
     - `/api/emission-factors` → All emission factors
     - `/references/*` → Serve files from `dist/references/`

   **Why middleware?**
   - Development without backend dependency
   - Faster iteration (no network latency)
   - Consistent test data

3. **Environment variable injection**
   ```typescript
   envPrefix: ['VITE_', 'ACX_'],
   ```
   Exposes `VITE_*` and `ACX_*` variables to client code.

### Starting development:
```bash
# From monorepo root
pnpm dev

# From web app directory
cd apps/carbon-acx-web && npm run dev
```

Both resolve to same Vite dev server.

## Production Build Entry

### Build Process

**Command**: `pnpm build:web` (from root)

**Steps**:
1. **Install dependencies**: `pnpm --filter carbon-acx-web install --frozen-lockfile`
2. **Prebuild script**: `pnpm run prebuild:web`
   - Generates semantic schema from CSV data
   - Runs before Vite build
3. **Vite build**: `pnpm --filter carbon-acx-web run build`
   - TypeScript compilation
   - Tree-shaking (remove unused code)
   - Minification (Terser for JS, cssnano for CSS)
   - Code splitting (vendor chunks, route chunks)
   - Asset hashing (cache busting)

**Output directory**: `/apps/carbon-acx-web/dist/`

**Structure**:
```
dist/
├── index.html           (Entry HTML)
├── assets/
│   ├── index-[hash].js  (Main bundle)
│   ├── vendor-[hash].js (React, Zustand, XState)
│   ├── index-[hash].css (Compiled styles)
│   └── *.woff2          (Font files)
└── manifest.json        (Build manifest)
```

**Wrangler configuration** (`wrangler.toml`):
```toml
pages_build_output_dir = "apps/carbon-acx-web/dist"
```

Points Cloudflare Pages to correct output directory.

## Legacy Application Entry Points

### Python Dash App (Analytics)

**Location**: `/app/`

**Entry command**: `make app`

**Server**: Python Dash (Flask-based)

**Port**: 8050 (default Dash)

**Purpose**: Analyst-focused operations client
- Agency breakdowns
- Scenario toggles
- Provenance-aware references
- Time series visualizations

**Dependencies**:
- Python 3.11+
- Poetry
- Dash, Plotly, pandas

**Typical use**: Internal analysis, not public-facing.

### Static React Site (Marketing)

**Location**: `/site/`

**Entry command**: `cd site && npm run dev`

**Server**: Vite dev server

**Port**: 5174 (to avoid conflict with main app)

**Purpose**: Marketing/investor portal
- Mirrors Dash workflow
- WebGPU local chat feature (`@mlc-ai/web-llm`)
- Static site generation

**Status**: Maintained for specific use cases, not primary interface.

## Entry Point Decision Matrix

| Use Case | Entry Point | Command | Port |
|----------|-------------|---------|------|
| Modern app development | CanvasApp (via main.tsx) | `pnpm dev` | 5173 |
| Legacy UI testing | LegacyApp (via ACX_LEGACY_UI=1) | `ACX_LEGACY_UI=1 pnpm dev` | 5173 |
| Analytics/operations | Python Dash | `make app` | 8050 |
| Marketing site | Static React | `cd site && npm run dev` | 5174 |
| Production build | CanvasApp (via main.tsx) | `pnpm build:web` | N/A (static) |

## Error Boundaries

All scene components wrapped in `<ErrorBoundary>`:
```typescript
<ErrorBoundary>
  <OnboardingScene show={isOnboarding} onComplete={handleOnboardingComplete} />
</ErrorBoundary>
```

**Location**: `/apps/carbon-acx-web/src/components/system/ErrorBoundary.tsx`

**Purpose**:
- Catch React errors during render
- Prevent full app crash
- Show fallback UI
- Log errors for debugging

**Granularity**: One error boundary per scene
- Scene crash doesn't affect other scenes
- User can navigate away from broken scene

## Initialization Performance

**Metrics** (from development):
- **Time to Interactive (TTI)**: ~800ms (cold start, no cache)
- **First Contentful Paint (FCP)**: ~200ms
- **Largest Contentful Paint (LCP)**: ~600ms

**Optimizations**:
1. Code splitting (React Router lazy loading)
2. Zustand persistence (skip network requests)
3. Suspense boundaries (progressive loading)
4. React 18 concurrent rendering (prioritized updates)

**Future improvements**:
- Service worker caching
- Prefetch critical routes
- Optimize bundle size (currently ~180KB gzipped)

## Environment Variables

**Development**:
- `VITE_ACX_LEGACY_UI`: Set to `'1'` to load legacy app
- `DEV`: Automatically set by Vite (enables debug panel)

**Production**:
- `ACX_GENERATED_AT`: Timestamp for artifact generation
- `ACX_DATA_BACKEND`: `'csv'` or `'sqlite'`
- `ACX_OUTPUT_ROOT`: Output directory for build artifacts

**Where defined**:
- `.env` (local overrides, gitignored)
- `wrangler.toml` (Cloudflare deployment)
- GitHub Actions workflows (CI/CD)

## Common Issues

### Issue: "Root element not found"
**Cause**: HTML file missing `<div id="root">`
**Fix**: Ensure `index.html` has root div before script tag

### Issue: Blank screen on load
**Cause**: JavaScript error during initialization
**Fix**: Check browser console, likely Zustand hydration error or XState type mismatch

### Issue: "Module not found" during dev
**Cause**: Dependencies not installed or pnpm workspace link broken
**Fix**: Run `pnpm install` from monorepo root

### Issue: Legacy app loads instead of modern app
**Cause**: `ACX_LEGACY_UI` environment variable set
**Fix**: Unset `ACX_LEGACY_UI` or set to `'0'`

## Related Diagrams

- See `architecture-overview.mermaid.md` for system-level view
- See `component-map.mermaid.md` for component hierarchy
- See `data-flow.mermaid.md` for state management flows
- See `deployment-infrastructure.mermaid.md` for production entry points
