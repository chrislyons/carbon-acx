# Component Map - Detailed Notes

## Component Architecture Philosophy

Carbon ACX uses a **strict tier-based component hierarchy** to enforce separation of concerns and maximize reusability.

### Core Principle: **Dependency Direction**

Higher tiers can depend on lower tiers, but **never the reverse**:

```
Tier 5 (Scenes) → Tier 4 (Domain) → Tier 3 (Viz) → Tier 2 (Layout) → Tier 1 (Primitives)
```

**Violations are build errors** - enforced via import linting.

## Tier-by-Tier Breakdown

### Tier 1: Primitives (System Components)

**Location**: `src/components/system/`

**Purpose**: Atomic, reusable UI components with no business logic.

#### Button
**File**: `system/Button.tsx`

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Variants**:
- `primary`: Filled, accent color
- `secondary`: Filled, neutral color
- `ghost`: Transparent, hover effect
- `outline`: Border only

**Design tokens used**: `--interactive-primary`, `--space-*`, `--font-size-*`

#### Dialog
**File**: `system/Dialog.tsx`

**Built on**: Radix UI Dialog primitive

**Features**:
- Focus trap (keyboard accessibility)
- Scroll lock when open
- ESC to close
- Click outside to close (configurable)

**Usage**:
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

#### Collapsible
**File**: Uses Radix UI `@radix-ui/react-collapsible`

**Animations**: Configured in `tailwind.config.ts`
```typescript
keyframes: {
  collapse: { from: { height: 'var(--radix-collapsible-content-height)' }, to: { height: '0' } },
  expand: { from: { height: '0' }, to: { height: 'var(--radix-collapsible-content-height)' } }
}
```

**Usage in components**: EmissionCalculator, QuickCalculator (detail sections)

#### Input/Slider
**File**: `system/Input.tsx`

**Types**:
- Text input
- Number input
- Range slider
- Checkbox
- Radio

**Validation**: Integrates with React Hook Form

### Tier 2: Layout System (Canvas Components)

**Location**: `src/components/canvas/`

**Purpose**: Viewport-based layout primitives for canvas-first design.

#### CanvasZone
**File**: `canvas/CanvasZone.tsx`

**Purpose**: Defines viewport zones with fixed heights.

**Props**:
```typescript
interface CanvasZoneProps {
  zone: 'hero' | 'insight' | 'detail';
  zoneId: string;
  padding?: 'sm' | 'md' | 'lg';
  collapsible?: boolean;
  interactionMode?: 'explore' | 'compare' | 'drill';
  children: React.ReactNode;
}
```

**Zone Heights** (CSS custom properties):
- `hero`: 70vh (`--zone-hero-height`)
- `insight`: 20vh (`--zone-insight-height`)
- `detail`: 10vh (`--zone-detail-height`)

**Interaction Modes**:
- `explore`: Pan, zoom enabled
- `compare`: Side-by-side layouts
- `drill`: Click for details

**Example**:
```typescript
<CanvasZone zone="hero" padding="lg" interactionMode="explore">
  <TimelineViz data={chartData} />
</CanvasZone>
```

#### StoryScene
**File**: `canvas/StoryScene.tsx`

**Purpose**: Full-screen container for story-driven scenes.

**Props**:
```typescript
interface StorySceneProps {
  scene: 'onboarding' | 'baseline' | 'explore' | 'insight';
  layout: 'canvas' | 'centered';
  title?: string;
  children: React.ReactNode;
}
```

**Layout Modes**:
- `canvas`: Full viewport with zones
- `centered`: Max-width container (for onboarding)

**Behavior**: Manages scene entry/exit animations via TransitionWrapper.

#### TransitionWrapper
**File**: `canvas/TransitionWrapper.tsx`

**Purpose**: Smooth animations between scenes and zones.

**Built on**: framer-motion

**Transition Types**:
```typescript
type TransitionType = 'fade' | 'slide' | 'scale' | 'story';
```

**Story Transition** (600ms, custom ease):
```typescript
transition={{
  duration: 0.6,
  ease: [0.43, 0.13, 0.23, 0.96] // Custom cubic-bezier
}}
```

**Respects**: `prefers-reduced-motion` (disables animations if set)

### Tier 3: Visualizations

**Location**: `src/components/viz/`

**Purpose**: Data visualization components wrapping Apache ECharts.

#### TimelineViz
**File**: `viz/TimelineViz.tsx`

**Purpose**: Line chart showing emissions over time with milestones.

**Props**:
```typescript
interface TimelineVizProps {
  data: Array<{ timestamp: string; value: number; breakdown?: object }>;
  milestones?: Array<{ timestamp: string; label: string; value: number }>;
  height?: string;
  enableZoom?: boolean;
}
```

**Features**:
- Time-series line chart
- Milestone markers (visual indicators)
- Zoom/pan controls
- Tooltip with breakdown
- Responsive (canvas auto-resize)

**ECharts Options**:
```typescript
{
  xAxis: { type: 'time' },
  yAxis: { type: 'value', name: 'kg CO₂' },
  series: [{ type: 'line', smooth: true }],
  dataZoom: [{ type: 'inside' }]
}
```

#### ComparisonOverlay
**File**: `viz/ComparisonOverlay.tsx`

**Purpose**: Side-by-side chart comparison (profiles, scenarios).

**Props**:
```typescript
interface ComparisonOverlayProps {
  baseline: { label: string; option: EChartsOption };
  comparison: { label: string; option: EChartsOption };
  height?: string;
}
```

**Layout**: 50/50 split on desktop, stacked on mobile.

**Usage**: Compare user profile vs global average, or two layers.

#### GaugeProgress
**File**: `viz/GaugeProgress.tsx`

**Purpose**: Circular gauge for goal tracking.

**Props**:
```typescript
interface GaugeProgressProps {
  current: number;
  target: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}
```

**Visual**:
- Circular progress ring
- Percentage in center
- Color transitions (red → yellow → green)

**Calculation**: `(current / target) * 100`

### Tier 4: Domain Components

**Location**: `src/components/domain/`

**Purpose**: Business logic components that understand carbon accounting.

#### EmissionCalculator
**File**: `domain/EmissionCalculator.tsx`

**Purpose**: In-depth calculator with real-time feedback (Baseline Scene).

**Props**:
```typescript
interface EmissionCalculatorProps {
  onComplete: (results: CalculatorResults) => void;
  onCancel?: () => void;
}
```

**Questions** (5 steps):
1. Transport mode selection
2. Commute distance (slider)
3. Diet type
4. Energy usage
5. Shopping frequency

**Features**:
- Multi-step wizard
- Real-time emissions calculation
- Expandable detail sections (Collapsible)
- Responsive horizontal grids (desktop)
- GaugeProgress showing current vs goal

**State**: Local state for form, saves to Zustand on completion.

**Emission Calculation**:
```typescript
const commuteEmissions = TRANSPORT_MODES[mode].factor * distance * 365 * 2;
// factor = kg CO₂/km, distance = km, 365 days, 2 = round trip
```

#### QuickCalculator
**File**: `domain/QuickCalculator.tsx`

**Purpose**: 2-minute estimate in dialog (Onboarding Scene).

**Differences from EmissionCalculator**:
- Dialog-based (not full-screen)
- Simplified questions (5 steps total)
- Faster completion (~2 min vs ~5 min)
- Same emission factors (data consistency)

**Added Recently** (commit e981aff):
- Transport mode selection
- Responsive grids for desktop
- Expandable detail sections

**Navigation**:
- "Save to Profile" → saves + navigates to `/dashboard`
- "Explore data" → navigates to `/dashboard` (commit d999cb0 fix)

#### ActivityBrowser
**File**: `domain/ActivityBrowser.tsx`

**Purpose**: Browse and select activities from backend dataset.

**Layout** (commit d999cb0):
- Mobile: Vertical stack (sectors tabs → activity list)
- Desktop: Sidebar (280px sectors → activity list)

**Features**:
- Sector filtering
- Search input
- Activity cards with emissions
- Add to profile action

**Data source**: Would load from backend API (currently mock data).

**State**: Reads from Zustand `activities` array.

#### SceneNavigation
**File**: `domain/SceneNavigation.tsx`

**Purpose**: Progress indicator and scene switcher.

**Props**:
```typescript
interface SceneNavigationProps {
  currentScene: 'onboarding' | 'baseline' | 'explore' | 'insight';
}
```

**Visual**: Horizontal stepper with checkmarks for completed scenes.

**Behavior**: Uses `useJourneyMachine` to trigger scene transitions.

### Tier 5: Story Scenes

**Location**: `src/components/scenes/`

**Purpose**: Full-screen experiences that orchestrate multiple components.

#### OnboardingScene
**File**: `scenes/OnboardingScene.tsx`

**Purpose**: Welcome screen + path selection.

**Props**:
```typescript
interface OnboardingSceneProps {
  show: boolean;
  onComplete: (pathChoice: 'calculator' | 'manual') => void;
  onSkip: () => void;
}
```

**User Flow**:
1. Welcome message
2. Path choice:
   - "Quick Calculator" → QuickCalculator dialog → Baseline
   - "Manual Entry" → ActivityBrowser → Explore
3. Skip button → Explore (if returning user)

**Layout**: Centered container (`StoryScene layout="centered"`)

#### BaselineScene
**File**: `scenes/BaselineScene.tsx`

**Purpose**: Establish carbon baseline via calculator or manual entry.

**Props**:
```typescript
interface BaselineSceneProps {
  show: boolean;
  mode: 'calculator' | 'manual';
  onComplete: () => void;
}
```

**Modes**:
- `calculator`: Shows EmissionCalculator
- `manual`: Shows ActivityBrowser

**Celebration View**: After completion, shows stats + "Continue to Explore" button.

**Layout**: Full canvas with hero zone for calculator.

#### ExploreScene
**File**: `scenes/ExploreScene.tsx`

**Purpose**: Interactive data exploration with timeline and comparison modes.

**Props**:
```typescript
interface ExploreSceneProps {
  show: boolean;
  initialMode?: 'timeline' | 'comparison';
}
```

**Modes**:
- `timeline`: TimelineViz showing emissions over time
- `comparison`: ComparisonOverlay (user vs global average, or layer comparison)

**Controls**:
- Mode toggle (Timeline / Compare)
- Filter button (opens detail zone)
- Export button (download chart)
- "View Insights" → transition to InsightScene

**Layout**: Canvas with hero (chart), insight (stats), detail (filters).

**Data Source**: Reads from Zustand `calculatorResults` + `activities`.

#### InsightScene
**File**: `scenes/InsightScene.tsx`

**Purpose**: Personalized recommendations and goal setting.

**Props**:
```typescript
interface InsightSceneProps {
  show: boolean;
}
```

**Features**:
- Top emission sources (ranked)
- Reduction suggestions (e.g., "Switch to subway saves 2.5t/year")
- Goal creation (set target emissions)
- Scenario comparison

**Layout**: Grid of insight cards (1 column mobile, 2 tablet, 3 desktop - commit d999cb0).

**State**: Reads from Zustand, can create goals/scenarios.

## State Management Integration

### Zustand (useAppStore)

**File**: `src/store/appStore.ts`

**Used by**: All domain components, scenes

**Key Actions**:
```typescript
// Profile
addActivity(activity)
removeActivity(activityId)
saveCalculatorResults(results)

// Layers (for comparison)
addLayer(layer)
toggleLayerVisibility(layerId)

// Goals
addGoal(goal)
updateGoal(goalId, updates)

// Computed
getTotalEmissions() → number
```

**Persistence**: Zustand middleware auto-persists to `localStorage`.

### XState (useJourneyMachine)

**File**: `src/hooks/useJourneyMachine.ts`

**Used by**: CanvasApp, SceneNavigation

**States**:
```typescript
'onboarding' | 'baseline' | 'explore' | 'insight'
```

**Actions**:
```typescript
skipOnboarding()
completeOnboarding()
baselineComplete()
exploreSectors()
viewInsights()
```

**Current State Checks**:
```typescript
isOnboarding: boolean
isBaseline: boolean
isExplore: boolean
isInsight: boolean
```

## Component Communication Patterns

### 1. Props Down, Events Up

**Example**: EmissionCalculator
```typescript
<EmissionCalculator
  onComplete={(results) => {
    saveCalculatorResults(results);
    navigate('/dashboard');
  }}
/>
```

### 2. Global State (Zustand)

**Example**: ActivityBrowser adding activity
```typescript
const addActivity = useAppStore((state) => state.addActivity);

const handleAdd = () => {
  addActivity({
    id: activity.id,
    sectorId: sector.id,
    // ... other fields
  });
};
```

### 3. Journey Transitions (XState)

**Example**: OnboardingScene completion
```typescript
const { completeOnboarding } = useJourneyMachine();

const handleComplete = (path: 'calculator' | 'manual') => {
  setBaselineMode(path);
  completeOnboarding(); // XState transition
};
```

## Component Reusability Matrix

| Component | Reusable? | Used In | Tied to Domain? |
|-----------|-----------|---------|-----------------|
| Button | ✅ High | All scenes | ❌ No |
| Dialog | ✅ High | QuickCalculator | ❌ No |
| CanvasZone | ✅ Medium | All scenes | ❌ No |
| TimelineViz | ⚠️ Medium | ExploreScene | ⚠️ Somewhat |
| EmissionCalculator | ❌ Low | BaselineScene | ✅ Yes |
| QuickCalculator | ❌ Low | OnboardingScene, HomeView | ✅ Yes |

## Testing Strategy by Tier

**Tier 1 (Primitives)**:
- Unit tests with Vitest
- Visual regression with Storybook
- Accessibility tests (axe-core)

**Tier 2 (Layout)**:
- Integration tests (component + layout)
- Responsive tests (viewport sizes)

**Tier 3 (Visualizations)**:
- Mock ECharts
- Snapshot tests for options
- Interaction tests (click, zoom)

**Tier 4 (Domain)**:
- Unit tests for calculations
- Integration tests with Zustand
- E2E tests for critical flows

**Tier 5 (Scenes)**:
- E2E tests (Playwright)
- User flow testing
- Visual regression

## Component File Structure

Standard structure for each component:

```
ComponentName/
  ComponentName.tsx       # Main component
  ComponentName.test.tsx  # Unit tests
  ComponentName.stories.tsx # Storybook stories
  index.ts               # Barrel export
```

Or flat file if simple:
```
ComponentName.tsx
```

## Import Conventions

**Absolute imports** from `src/`:
```typescript
import { Button } from '@/components/system/Button';
import { useAppStore } from '@/hooks/useAppStore';
```

**Relative imports** for same-tier:
```typescript
import { CanvasZone } from './CanvasZone';
```

## Common Pitfalls

1. **Importing higher tier from lower tier**
   - ❌ Button importing EmissionCalculator
   - ✅ EmissionCalculator importing Button

2. **Business logic in primitives**
   - ❌ Button knowing about carbon calculations
   - ✅ Button accepting onClick prop

3. **Direct localStorage access**
   - ❌ Component calling `localStorage.setItem()`
   - ✅ Component calling Zustand action

4. **Hardcoded styles**
   - ❌ `<div className="text-lg text-gray-900">`
   - ✅ `<div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>`

## Related Diagrams

- See `data-flow.mermaid.md` for state flow between components
- See `architecture-overview.mermaid.md` for system context
- See `entry-points.mermaid.md` for initialization sequence
