# Component Map - Architectural Notes

## Overview

The Carbon ACX web application follows a strict **component tier hierarchy** (Primitives → Visualizations → Domain → Pages) with a **2D+3D hybrid architecture**. This structure balances simplicity with powerful visualization capabilities.

## Component Tiers

### Tier 1: Primitives (Radix UI)

**Purpose**: Foundation of accessible, unstyled UI components.

**Components**:
- `Button`, `Input`, `Dialog`, `Tabs`, `Tooltip`, `ScrollArea`
- All from Radix UI library
- Pre-built accessibility (ARIA, keyboard navigation, focus management)

**Why Radix**:
- Unstyled by default (full Tailwind control)
- Best-in-class accessibility
- Composable primitives

**Pattern**:
```typescript
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>...</Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Tier 2: Visualizations

#### 3D Module (DataUniverse)

**File**: `/apps/carbon-acx-web/src/components/viz/DataUniverse.tsx` (520 lines)

**Architecture**:
- **Central Sphere**: Total emissions, logarithmic size (`0.5 + log10(emissions) * 0.3`)
- **Orbiting Spheres**: Individual activities, orbital motion with phase offsets
- **Camera Choreography**: Intro zoom (far → close), click-to-fly infrastructure
- **Error Handling**: ErrorBoundary for WebGL failures, SSR safety checks

**SSR Safety Pattern** (Critical for Cloudflare Pages):
```typescript
// MUST use lazy loading to prevent Three.js SSR errors
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

<React.Suspense fallback={<LoadingSpinner />}>
  <DataUniverse totalEmissions={5200} activities={activities} />
</React.Suspense>
```

**Technical Details**:
- Three.js scene graph: Canvas → Lights + Stars + Spheres + OrbitControls + CameraAnimator
- Material: `meshStandardMaterial` with emissive glow (0.2 → 1.0 on hover)
- Hover glow: Outer sphere at 1.2x scale, 30% opacity
- Orbital math: `angle = time + phaseOffset`, staggered speeds (0.0005 + index * 0.0001)

**Bundle Impact**: 887KB chunk (241KB gzipped), code-split from main bundle

#### 2D Charts (ECharts Wrappers)

**Files**: `TimelineViz.tsx`, `ComparisonOverlay.tsx`

**Library**: Apache ECharts 6.0 (canvas rendering, 60fps)

**Purpose**: Traditional timeline and comparison views for users who prefer 2D

### Tier 3: Domain Components

#### 2D Transparency Overlays

**CitationPanel** (285 lines):
- Shows emission factor sources, methodology, provenance
- Radix Dialog modal
- Links to source documents
- Example: "TRAN.SCHOOLRUN.CAR.KM → 0.180 kg CO₂e/km → Carbon ACX Verified Dataset"

**MethodologyModal** (395 lines):
- Explains calculation approach (activity × emission factor)
- Lists data sources (GHG Protocol, EPA, IPCC, DEFRA)
- Documents QA process (4-step verification)
- Transparency-first design

**ActivityManagement** (360 lines):
- 2D table view with inline editing
- Columns: Name | Quantity | Factor | Emissions | Actions
- Edit flow: Click edit → change number → save/cancel
- Delete with confirmation
- Citation button opens CitationPanel

**EmissionCalculator**:
- 4-question quick calculator
- Real-time feedback as user answers
- Outputs: Annual emissions, comparisons (flights, trees)

**ScenarioBuilder**:
- What-if modeling (change quantities, see impact)
- Scenario saving and comparison
- Future enhancement

### Tier 4: Pages

**WelcomePage**:
- Entry point with hero messaging
- Choice: Quick Calculator vs Manual Entry
- Links to methodology

**CalculatorPage**:
- Calculator flow (calculating → celebrating states)
- **2D → 3D reveal**: Results shown as numbers first, then "See in 3D Universe" button
- Intro animation plays on 3D reveal
- "Continue to Full Exploration" → ExplorePage

**ExplorePage**:
- Mode toggle: 3D Universe | Timeline | Comparison
- 3D mode uses DataUniverse with full controls
- Stats bar shows activity count, total emissions

**InsightsPage**:
- Display mode: Cards | 3D Universe
- 3D mode: DataUniverse on left, sidebar on right
- Sidebar shows selected activity details or key insights
- Click sphere → activity panel appears

## State Management

### Zustand Store (`appStore.ts`, 433 lines)

**Single source of truth** for application state.

**State Shape**:
```typescript
{
  profile: {
    activities: Activity[]        // User's tracked activities
    calculatorResults: CalculatorResult[]
    layers: ProfileLayer[]        // Scenario layers
    goals: CarbonGoal[]          // Reduction goals
    scenarios: Scenario[]        // What-if models
  }
}
```

**Actions**:
- `addActivity`, `removeActivity`, `updateActivityQuantity`
- `saveCalculatorResults`
- `addLayer`, `removeLayer`, `toggleLayerVisibility`
- `addGoal`, `updateGoal`, `removeGoal`
- `addScenario`, `updateScenario`, `removeScenario`
- `getTotalEmissions()` (computed)

**Persistence**: Uses `zustand/middleware` persist to localStorage (`carbon-acx-storage`)

**Why Zustand over XState**:
- Simpler mental model (removed ~4000 lines of XState machinery)
- Direct state access, no event-based orchestration needed
- Faster development, easier debugging

### TanStack Query (Server State)

**Purpose**: Fetch and cache artifact data from derivation pipeline.

**Features**:
- Automatic background revalidation
- Request deduplication
- Optimistic updates
- Error retry logic

**Pattern**:
```typescript
const { data: artifacts, isLoading } = useQuery({
  queryKey: ['artifacts', buildHash],
  queryFn: () => fetch(`/artifacts/${buildHash}/manifest.json`).then(r => r.json()),
  staleTime: Infinity, // Artifacts are immutable
});
```

## Module Boundaries

### 3D Visualization Module

**Responsibilities**:
- Render 3D scene with Three.js
- Handle orbital animations (requestAnimationFrame loop)
- Camera choreography (intro zoom, click-to-fly)
- Hover/click interactions with raycasting
- SSR safety (client-side only rendering)

**Does NOT handle**:
- Fetching activity data (uses props from parent)
- State mutations (callbacks only)
- Routing or navigation

**Integration points**:
- Props: `totalEmissions`, `activities`, `onActivityClick`, `enableIntroAnimation`, `enableClickToFly`
- Parent provides data, DataUniverse visualizes

### 2D Overlay Module

**Responsibilities**:
- Display transparency information (citations, methodology)
- Manage activity CRUD operations
- Modal/dialog presentation

**Does NOT handle**:
- 3D rendering
- Complex state logic (delegates to Zustand)

**Integration points**:
- Opens via user actions (button clicks)
- Reads from Zustand store
- Writes back via store actions

## Design Token System

**File**: `/apps/carbon-acx-web/src/index.css` (CSS custom properties)

**Categories**:
- **Typography**: `--font-size-xs` through `--font-size-5xl` (Major Third scale 1.250)
- **Colors**: `--carbon-low` (green), `--carbon-moderate` (amber), `--carbon-high` (red)
- **Story**: `--color-goal`, `--color-baseline`, `--color-improvement`, `--color-insight`
- **Spacing**: `--space-1` through `--space-16` (4px base)
- **Motion**: `--motion-story-duration` (600ms), `--motion-story-ease`

**Usage**:
```typescript
// ✅ Correct
<div className="text-[var(--font-size-lg)] text-[var(--text-primary)]">

// ❌ Wrong (hardcoded)
<div className="text-lg text-gray-900">
```

## Key Decisions

### Why Lazy Loading for DataUniverse?

**Problem**: Three.js tries to access WebGL during SSR on Cloudflare Pages → crash
**Solution**: `React.lazy()` + `Suspense` defers Three.js loading until client-side
**Benefit**: Production SSR safety + code-splitting (241KB gzip chunk loads on-demand)

### Why 2D+3D Hybrid?

**Philosophy**: Visualization enhances understanding, but transparency requires text/numbers
**Approach**: 3D for exploration, 2D overlays for citations/methodology
**Result**: Best of both worlds (engaging + trustworthy)

### Why Logarithmic Scaling for Spheres?

**Problem**: Linear scaling makes small activities invisible, large ones huge
**Solution**: `size = 0.5 + log10(emissions) * 0.3`
**Result**: All activities visible, size differences still meaningful

### Why Simplified State (Zustand Only)?

**Original**: XState journey machine + Zustand (dual-store pattern)
**Problem**: Over-engineered for current needs, 4000+ lines of complexity
**Solution**: Removed XState, use React Router for navigation
**Result**: -2360 lines, faster development, easier debugging

## Common Patterns

### Adding a New Page Component

1. Create `NewPage.tsx` in `/apps/carbon-acx-web/src/pages/`
2. Wrap with `<Transition>` for page animations
3. Add route in `CanvasApp.tsx` (React Router)
4. Import state with `useAppStore()` hook
5. Follow design token system (no hardcoded colors/sizes)

### Adding a New 2D Overlay

1. Create component in `/apps/carbon-acx-web/src/components/domain/`
2. Use Radix Dialog for modal presentation
3. Read data from `useAppStore()` or `useArtifacts()`
4. Mutate state via store actions
5. Include "Close" button for accessibility

### Integrating DataUniverse in New Context

```typescript
// ALWAYS use lazy loading
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

function MyPage() {
  const activities = useAppStore((state) => state.activities);
  const totalEmissions = useAppStore((state) => state.getTotalEmissions());

  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <DataUniverse
        totalEmissions={totalEmissions}
        activities={activities}
        onActivityClick={(activity) => console.log('Clicked:', activity)}
        enableIntroAnimation={true}
      />
    </React.Suspense>
  );
}
```

## Technical Debt & Complexity

### Current Complexity Areas

1. **DataUniverse orbital calculations**: Mixing Date.now() and requestAnimationFrame timing
   - Works well but could be refactored to pure useFrame timing

2. **Dual hover state** (local + parent callback):
   - Needed for precise raycasting, adds complexity
   - Consider consolidating to single state source

3. **Bundle size**: 887KB DataUniverse chunk is large
   - Could explore THREE.InstancedMesh for many spheres
   - Level-of-detail (LOD) for 50+ activities

### Future Refactoring Opportunities

- **Web Workers**: Move orbital calculations off main thread
- **Code splitting**: Further split DataUniverse into smaller chunks
- **Storybook stories**: Component documentation and visual testing
- **Unit tests**: Currently limited (2 test files), needs expansion

## Where to Make Changes

### To modify 3D visualization behavior:
- **File**: `/apps/carbon-acx-web/src/components/viz/DataUniverse.tsx`
- **Lines**: Orbital motion (338-359), Camera animation (534-560), Hover glow (397-407)

### To add/modify 2D overlays:
- **Directory**: `/apps/carbon-acx-web/src/components/domain/`
- **Examples**: `CitationPanel.tsx`, `MethodologyModal.tsx`, `ActivityManagement.tsx`

### To update state management:
- **File**: `/apps/carbon-acx-web/src/store/appStore.ts`
- **Pattern**: Add action → update profile → return new state → persist to localStorage

### To adjust design tokens:
- **File**: `/apps/carbon-acx-web/src/index.css`
- **Pattern**: Add CSS custom property → use with `className="text-[var(--token-name)]"`

## Related Diagrams

- **data-flow**: How data moves through components (user actions → state → visualization)
- **deployment-infrastructure**: How components are built and deployed to Cloudflare Pages
- **entry-points**: How main.tsx loads CanvasApp and routes to pages
