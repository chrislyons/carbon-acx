# Architecture Overview - Detailed Notes

## System Design Philosophy

Carbon ACX follows a **manifest-first, canvas-driven architecture** with three core principles:

1. **Data Immutability**: Source data never modified by applications
2. **Progressive Enhancement**: Mobile-first, desktop-enhanced
3. **Story-Driven UX**: Guided journeys over free-form exploration

## Architectural Layers

### 1. Data Layer

**Purpose**: Single source of truth for carbon accounting data.

**Components**:
- **CSV Datasets** (`data/`): Canonical emission factors and activities
- **Python Pipeline** (`calc/derive.py`): Validation and transformation
- **Artifacts** (`dist/artifacts/<hash>/`): Content-addressable outputs

**Data Flow**:
```
CSV → Python Validation → Pydantic Schemas → SQLite (optional) → JSON Manifests
```

**Key Decisions**:
- **Why CSV?** Human-readable, version-controllable, widely compatible
- **Why Python?** pandas for data manipulation, pydantic for validation
- **Why hashing?** Immutable artifacts, cache busting, provenance tracking

**Guarantees**:
- Schema validation via Pydantic
- Deterministic output (same input → same hash)
- Git history as audit trail

### 2. Application Layer (Phase 1)

**Architecture**: Canvas-first, story-driven React application.

**Tech Stack**:
- **React 18**: UI framework (concurrent features, suspense)
- **TypeScript 5.5**: Type safety throughout
- **Vite 5**: Fast builds, HMR, code splitting
- **Tailwind CSS 3**: Utility-first styling
- **Apache ECharts 6.0**: Canvas-rendered visualizations (60fps)

**State Management Pattern**:

**Three-layer state**:

1. **Zustand (Global State)**:
   - Profile data (activities, calculator results)
   - UI preferences
   - Persisted to localStorage
   - **When to use**: App-wide state that needs persistence

2. **XState (Journey Orchestration)**:
   - Onboarding → Baseline → Explore → Insight
   - Deterministic state transitions
   - **When to use**: Multi-step flows with complex logic

3. **React State (Local State)**:
   - Form inputs, UI toggles, ephemeral state
   - **When to use**: Component-scoped temporary state

**Component Hierarchy**:

```
Tier 5: Scenes (OnboardingScene, ExploreScene)
   ↓
Tier 4: Domain (EmissionCalculator, ActivityBrowser)
   ↓
Tier 3: Visualizations (TimelineViz, ComparisonOverlay)
   ↓
Tier 2: Layout (CanvasZone, StoryScene)
   ↓
Tier 1: Primitives (Button, Dialog)
```

**Rationale**: Strict separation of concerns, reusability, testability.

### 3. Edge Layer (Cloudflare)

**Purpose**: Global edge deployment for low-latency access.

**Components**:

**Cloudflare Pages**:
- Static asset hosting
- Edge functions for dynamic routes
- Immutable artifact proxying
- **Cache strategy**: `Cache-Control: public, immutable, max-age=31536000`

**Cloudflare Workers**:
- API endpoints (`/api/compute`, `/api/health`)
- On-demand calculations
- **Limitations**: No Node.js APIs, 50ms CPU limit

**Why Cloudflare?**:
- Global CDN (270+ cities)
- Zero cold starts
- Built-in DDoS protection
- Free tier generous for prototypes

### 4. Build Pipeline

**Vite Configuration**:
- Code splitting by route
- Tree shaking dead code
- CSS extraction and minification
- Asset hashing for cache busting

**Tailwind Processing**:
- JIT compiler (on-demand class generation)
- PurgeCSS in production (removes unused styles)
- PostCSS plugins for autoprefixing

**Output**:
```
dist/
  assets/
    index-<hash>.js      # Main bundle (~150KB gzipped)
    vendor-<hash>.js     # Dependencies
    index-<hash>.css     # Styles
  index.html             # Entry point
```

## Design Patterns

### 1. Canvas-First Layout

**Problem**: Traditional grid layouts don't adapt well to story-driven flows.

**Solution**: Viewport zones with dynamic heights:
- **Hero Zone** (70vh): Primary visualization
- **Insight Zone** (20vh): Contextual information
- **Detail Zone** (10vh): Collapsible controls

**Benefits**:
- Immersive full-screen experiences
- Smooth transitions between scenes
- Responsive without media queries (viewport units)

### 2. Story-Driven Navigation

**Problem**: Users get lost in complex carbon accounting interfaces.

**Solution**: XState journey machine enforces linear progression:
```
Onboarding → Baseline → Explore → Insight
```

**States**:
- `onboarding`: Welcome, path selection
- `baseline`: Establish carbon footprint
- `explore`: Data visualization and comparison
- `insight`: Personalized recommendations

**Transitions**: Explicit actions (e.g., `completeOnboarding()`, `viewInsights()`)

**Benefits**:
- Predictable user flow
- No dead ends
- Progress tracking built-in

### 3. Design Token System

**Problem**: Inconsistent styling, hard-coded values.

**Solution**: CSS custom properties as single source of truth:

```css
:root {
  /* Typography - Major Third scale (1.250) */
  --font-size-xs: 0.8rem;
  --font-size-sm: 0.889rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;

  /* Spacing - 4px base unit */
  --space-1: 0.25rem;
  --space-4: 1rem;

  /* Carbon intensity colors */
  --carbon-low: #10b981;
  --carbon-moderate: #f59e0b;
  --carbon-high: #ef4444;
}
```

**Usage**: Always reference tokens, never hardcode:
```typescript
<div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--carbon-high)' }}>
```

**Benefits**:
- Centralized theming
- Easy dark mode (override tokens)
- Design consistency enforced

### 4. Immutable Artifacts Pattern

**Problem**: Cache invalidation, data provenance tracking.

**Solution**: Content-addressable storage with SHA-256 hashing:

```
dist/artifacts/
  abc123.../
    manifest.json
    figures.json
    metadata.json
```

**Flow**:
1. Derive data → compute hash → store in `<hash>/`
2. Frontend requests artifact by hash
3. Cloudflare caches forever (immutable)

**Benefits**:
- No cache invalidation needed
- Provenance trail (hash → data)
- Atomic deployments (new hash = new version)

## External Service Integrations

### GitHub

**Role**: Version control + CI/CD orchestration

**Workflows**:
- `.github/workflows/ci.yml`: TypeScript, tests, build
- `.github/workflows/citations.yml`: Documentation checks

**Triggers**:
- Push to `main` → full CI + deploy
- Pull request → CI checks only

### Cloudflare

**Pages**:
- Auto-deploys from git push
- Preview deployments for PRs
- Custom domains supported

**Workers**:
- Manual deploy via `wrangler deploy`
- Separate from Pages deployment
- Environment variables via dashboard

## Technology Choices Rationale

### Why React?

- Component reusability
- Large ecosystem (Radix UI, ECharts)
- Concurrent features for smooth UX
- TypeScript support excellent

### Why Vite over Webpack?

- 10-100× faster builds
- Native ESM support
- Simpler configuration
- Better HMR (hot module replacement)

### Why Zustand over Redux?

- Simpler API (no boilerplate)
- Better TypeScript inference
- Smaller bundle size (3KB vs 20KB)
- Works well with React Suspense

### Why XState for journey?

- Visual state machines (easy to debug)
- Prevents impossible states
- Great TypeScript support
- Inspector tools for development

### Why Apache ECharts?

- Canvas rendering (60fps even with 10k+ points)
- Rich chart types out of the box
- Excellent responsive behavior
- Good TypeScript definitions

### Why Tailwind CSS?

- No naming conventions needed (utility classes)
- JIT compiler eliminates unused styles
- Consistent spacing/sizing (via design tokens)
- Plays well with component libraries

## Common Interaction Patterns

### 1. User Completes Calculator

```
User fills calculator
  → QuickCalculator saves to Zustand
  → Zustand persists to localStorage
  → Navigate to /dashboard
  → ExploreScene reads from Zustand
  → Display emissions in charts
```

### 2. User Adds Activity

```
User selects activity in ActivityBrowser
  → Domain component calls appStore.addActivity()
  → Zustand updates profile.activities
  → Triggers re-render in ExploreScene
  → Charts update with new data
```

### 3. Data Pipeline Update

```
Developer edits data/emission_factors.csv
  → Runs `make build`
  → calc/derive.py validates via Pydantic
  → Generates new manifest in dist/artifacts/<new-hash>/
  → Git commit + push
  → Cloudflare Pages rebuilds
  → Frontend requests new artifact by hash
```

## Performance Characteristics

### Bundle Sizes

- **Initial load**: ~150KB JS (gzipped)
- **Vendor bundle**: ~200KB (React, ECharts, etc.)
- **Lazy loaded scenes**: ~30-50KB each

### Load Times (p95)

- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Largest Contentful Paint**: <2.5s

### Runtime Performance

- **Chart rendering**: 60fps (canvas)
- **State updates**: <16ms (React concurrent)
- **localStorage reads**: <5ms

## Security Considerations

### Current State

**No authentication** - prototype stage, all data client-side

### Future Considerations

1. **Auth0 / Clerk** for user accounts
2. **Row-level security** if backend database added
3. **API rate limiting** on Workers
4. **Content Security Policy** headers

## Scalability Constraints

### Current Limits

- **localStorage**: 5-10MB (browser dependent)
- **Cloudflare Workers**: 50ms CPU, 128MB memory
- **CSV datasets**: <1MB (human-editable constraint)

### Scale Strategies

**If >10k users**:
1. Add backend database (PostgreSQL)
2. Move state from localStorage to server
3. Implement pagination in ActivityBrowser
4. Add Redis cache for computed results

**If >100k users**:
1. CDN for artifacts (already done via Cloudflare)
2. Split Workers by route (separate /compute from /health)
3. Add monitoring (Sentry, DataDog)

## Technical Debt

1. **Dual state systems**: ProfileContext + Zustand (migration 80% done)
2. **Test coverage**: <50% (needs improvement)
3. **Type safety**: Some `any` types remain
4. **Error boundaries**: Not comprehensive
5. **Offline support**: No service worker yet

## Related Diagrams

- See `component-map.mermaid.md` for detailed component relationships
- See `data-flow.mermaid.md` for state management flows
- See `entry-points.mermaid.md` for initialization sequences
- See `deployment-infrastructure.mermaid.md` for deployment architecture
