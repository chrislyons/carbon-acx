# Data Flow - Detailed Notes

## State Management Architecture

Carbon ACX uses a **hybrid state management approach** with three layers:

1. **Zustand** - Global application state (persisted)
2. **XState** - Journey orchestration (state machine)
3. **React State** - Local component state (ephemeral)

## Flow 1: User Completes Calculator

### Sequence

```
User Input → Local Calculation → Save to Zustand → Persist to localStorage → Navigate
```

### Detailed Steps

**1. User Interaction** (`QuickCalculator.tsx`):
```typescript
const [values, setValues] = useState({
  transportMode: 'car',
  commute: 10,
  diet: 'mixed',
  energy: 'average',
  shopping: 'moderate'
});

// Local state updates as user fills out form
onChange={(key, value) => setValues({ ...values, [key]: value })}
```

**2. Local Calculation**:
```typescript
const calculateFootprint = () => {
  const transportFactor = TRANSPORT_MODES[values.transportMode].factor;
  const commuteEmissions = values.commute * transportFactor * 365 * 2;
  // ... calculate diet, energy, shopping
  const total = breakdown.reduce((sum, item) => sum + item.annualEmissions, 0);
  return { total, breakdown };
};
```

**Calculation happens in-memory** - no server request needed.

**3. Save to Zustand**:
```typescript
const saveCalculatorResults = useAppStore((state) => state.saveCalculatorResults);

const handleSaveToProfile = () => {
  saveCalculatorResults(breakdown); // Array of CalculatorResult
  navigate('/dashboard');
};
```

**4. Zustand Updates** (`appStore.ts`):
```typescript
saveCalculatorResults: (results) =>
  set((state) => ({
    profile: {
      ...state.profile,
      calculatorResults: results.map((result) => ({
        ...result,
        calculatedAt: new Date().toISOString()
      })),
      lastUpdated: new Date().toISOString()
    }
  }))
```

**5. Persistence Middleware**:
```typescript
persist(
  (set, get) => ({ /* store definition */ }),
  {
    name: 'carbon-acx-storage',
    partialize: (state) => ({ profile: state.profile })
  }
)
```

**Zustand automatically writes to localStorage** when state changes.

**Storage Key**: `carbon-acx-storage`

**Storage Format**:
```json
{
  "state": {
    "profile": {
      "activities": [],
      "calculatorResults": [
        {
          "category": "commute",
          "label": "10km daily commute (Car)",
          "annualEmissions": 1314,
          "calculatedAt": "2025-10-26T20:00:00Z"
        }
      ],
      "layers": [],
      "lastUpdated": "2025-10-26T20:00:00Z"
    }
  },
  "version": 0
}
```

### Data Transformations

**Input** (user values):
```typescript
{
  transportMode: 'car',
  commute: 10,
  diet: 'mixed',
  energy: 'average',
  shopping: 'moderate'
}
```

**Intermediate** (breakdown):
```typescript
[
  { category: 'commute', label: '10km daily commute (Car)', annualEmissions: 1314 },
  { category: 'diet', label: 'Mixed diet', annualEmissions: 3300 },
  { category: 'energy', label: 'Average energy use', annualEmissions: 2500 },
  { category: 'shopping', label: 'Moderate shopping', annualEmissions: 1000 }
]
```

**Stored** (with timestamp):
```typescript
[
  { category: 'commute', label: '10km daily commute (Car)', annualEmissions: 1314, calculatedAt: '2025-10-26...' },
  // ... same for others
]
```

## Flow 2: Dashboard Loads User Data

### Sequence

```
App Mount → XState Check → Zustand Read → localStorage Hydrate → Render Scenes
```

### Detailed Steps

**1. App Initialization** (`CanvasApp.tsx`):
```typescript
export default function CanvasApp() {
  const {
    isOnboarding,
    isBaseline,
    isExplore,
    isInsight
  } = useJourneyMachine();

  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
  const activities = useAppStore((state) => state.activities);
  const totalEmissions = getTotalEmissions();

  // Smart initialization
  React.useEffect(() => {
    if (isOnboarding && (activities.length > 0 || totalEmissions > 0)) {
      skipOnboarding();
      baselineComplete();
      exploreSectors();
    }
  }, []);

  return (
    <div>
      <OnboardingScene show={isOnboarding} />
      <BaselineScene show={isBaseline} />
      <ExploreScene show={isExplore} />
      <InsightScene show={isInsight} />
    </div>
  );
}
```

**2. Zustand Hydration** (automatic):

Zustand `persist` middleware automatically:
- Reads from `localStorage` on mount
- Parses JSON
- Validates schema (basic)
- Merges with default state

**Hydration happens synchronously** before first render (no loading state needed).

**3. Scene Rendering** (`ExploreScene.tsx`):
```typescript
const profile = useAppStore((state) => state.profile);
const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
const totalEmissions = getTotalEmissions();

// Generate timeline data
const timelineData = React.useMemo(() => {
  const dataPoints = [];
  for (let i = 11; i >= 0; i--) {
    const value = totalEmissions + Math.sin(i / 2) * 500; // Simulate variation
    dataPoints.push({
      timestamp: dateStr,
      value,
      breakdown: { /* calculated from calculatorResults */ }
    });
  }
  return { dataPoints, milestones };
}, [totalEmissions]);
```

**4. Chart Rendering** (`TimelineViz.tsx`):
```typescript
const option: EChartsOption = {
  xAxis: { type: 'time' },
  yAxis: { type: 'value', name: 'kg CO₂/year' },
  series: [{
    type: 'line',
    data: data.map(d => [d.timestamp, d.value]),
    smooth: true
  }],
  tooltip: { trigger: 'axis' }
};

<ReactECharts option={option} style={{ height }} />
```

**ECharts renders to canvas** (hardware-accelerated, 60fps).

### Computed Values

**`getTotalEmissions()` implementation**:
```typescript
getTotalEmissions: () => {
  const state = get();
  const activityTotal = state.profile.activities.reduce(
    (sum, activity) => sum + activity.annualEmissions, 0
  );
  const calculatorTotal = state.profile.calculatorResults.reduce(
    (sum, result) => sum + result.annualEmissions, 0
  );
  const layerTotal = state.profile.layers
    .filter(layer => layer.visible)
    .reduce((sum, layer) => {
      const layerEmissions = layer.activities.reduce(
        (layerSum, activity) => layerSum + activity.annualEmissions, 0
      );
      return sum + layerEmissions;
    }, 0);
  return activityTotal + calculatorTotal + layerTotal;
}
```

**Why computed?** Ensures consistency - always sums from current state.

## Flow 3: Add Activity from Browser

### Sequence

```
User Selection → Zustand Action → Duplicate Check → Update State → Persist → Re-render
```

### Detailed Steps

**1. User Interaction** (`ActivityBrowser.tsx`):
```typescript
const addActivity = useAppStore((state) => state.addActivity);

const handleAddActivity = (activity: Activity) => {
  addActivity({
    id: activity.id,
    sectorId: sector.id,
    name: activity.name,
    quantity: 1, // Default
    unit: activity.unit,
    carbonIntensity: activity.carbonIntensity,
    annualEmissions: activity.carbonIntensity * 1
  });
};
```

**2. Zustand Action** (`appStore.ts`):
```typescript
addActivity: (activity) =>
  set((state) => {
    // Prevent duplicates
    if (state.profile.activities.some(a => a.id === activity.id)) {
      return state; // No change
    }

    return {
      profile: {
        ...state.profile,
        activities: [
          ...state.profile.activities,
          {
            ...activity,
            addedAt: new Date().toISOString()
          }
        ],
        lastUpdated: new Date().toISOString()
      }
    };
  })
```

**3. State Update**:
- Zustand creates new state object (immutability)
- Triggers subscribers (all components using `useAppStore`)
- Persist middleware writes to localStorage

**4. Component Re-render**:

**ExploreScene** subscribes to store:
```typescript
const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
const totalEmissions = getTotalEmissions(); // Recalculated automatically
```

When state changes:
- `useAppStore` hook detects change
- Component re-renders
- `getTotalEmissions()` runs again
- New total includes added activity
- Chart updates with new data

### Reactivity Chain

```
addActivity() → Zustand state update → localStorage persist
                    ↓
            All subscribers notified
                    ↓
        Components re-render with new data
                    ↓
            Charts update (ECharts)
```

## Flow 4: Journey State Transitions

### XState Machine States

```
┌─────────────┐
│ onboarding  │
└──────┬──────┘
       │ completeOnboarding()
       ↓
┌─────────────┐
│  baseline   │
└──────┬──────┘
       │ baselineComplete()
       ↓
┌─────────────┐
│   explore   │
└──────┬──────┘
       │ viewInsights()
       ↓
┌─────────────┐
│   insight   │
└─────────────┘
```

### State Machine Definition

**File**: `hooks/useJourneyMachine.ts`

```typescript
const journeyMachine = createMachine({
  id: 'journey',
  initial: 'onboarding',
  states: {
    onboarding: {
      on: {
        SKIP: 'explore',
        COMPLETE: 'baseline'
      }
    },
    baseline: {
      on: {
        COMPLETE: 'explore'
      }
    },
    explore: {
      on: {
        VIEW_INSIGHTS: 'insight',
        BACK_TO_BASELINE: 'baseline'
      }
    },
    insight: {
      on: {
        BACK_TO_EXPLORE: 'explore'
      }
    }
  }
});
```

### Hook Interface

```typescript
export function useJourneyMachine() {
  const [state, send] = useMachine(journeyMachine);

  return {
    // State checks
    isOnboarding: state.matches('onboarding'),
    isBaseline: state.matches('baseline'),
    isExplore: state.matches('explore'),
    isInsight: state.matches('insight'),

    // Actions
    skipOnboarding: () => send('SKIP'),
    completeOnboarding: () => send('COMPLETE'),
    baselineComplete: () => send({ type: 'COMPLETE' }),
    exploreSectors: () => send('VIEW_INSIGHTS'), // Note: naming mismatch
    viewInsights: () => send('VIEW_INSIGHTS')
  };
}
```

### Conditional Rendering

**CanvasApp** uses state checks to show/hide scenes:

```typescript
<OnboardingScene show={isOnboarding} onComplete={completeOnboarding} />
<BaselineScene show={isBaseline} onComplete={baselineComplete} />
<ExploreScene show={isExplore} />
<InsightScene show={isInsight} />
```

**Only one scene visible at a time** (controlled by XState).

### Smart Initialization

```typescript
React.useEffect(() => {
  if (isOnboarding && (activities.length > 0 || totalEmissions > 0)) {
    // User has data - skip to Explore
    skipOnboarding();
    baselineComplete();
    exploreSectors();
  }
}, []); // Run once on mount
```

**Why?** Returning users don't need to see onboarding again.

## Flow 5: Layer Comparison

### Purpose

Compare multiple carbon profiles side-by-side (e.g., personal vs work, or scenarios).

### Data Structure

```typescript
interface ProfileLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  activities: Activity[];
  createdAt: string;
}
```

### Comparison Flow

**1. User Action**:
```typescript
// In ExploreScene
<button onClick={() => setMode('comparison')}>
  Compare
</button>
```

**2. Fetch Visible Layers**:
```typescript
const layers = useAppStore((state) => state.profile.layers);
const visibleLayers = layers.filter(layer => layer.visible);
```

**3. Calculate Layer Totals**:
```typescript
const layer1Emissions = layer1.activities.reduce(
  (sum, a) => sum + a.annualEmissions, 0
);
const layer2Emissions = layer2.activities.reduce(
  (sum, a) => sum + a.annualEmissions, 0
);
```

**4. Generate Chart Options**:
```typescript
const leftOption: EChartsOption = {
  title: { text: layer1.name },
  series: [{
    type: 'pie',
    data: layer1.activities.map(a => ({
      value: a.annualEmissions,
      name: a.name
    })),
    color: layer1.color
  }]
};

const rightOption: EChartsOption = { /* same for layer2 */ };
```

**5. Render Side-by-Side**:
```typescript
<ComparisonOverlay
  baseline={{ label: 'Baseline', option: leftOption }}
  comparison={{ label: 'Comparison', option: rightOption }}
  height="500px"
/>
```

**ComparisonOverlay** renders two ECharts instances in a grid (50/50 split).

## Flow 6: Data Pipeline (Backend)

### Offline Pipeline

**No runtime API calls** - all data computed ahead of time.

### Steps

**1. Edit CSV**:
```bash
vim data/emission_factors.csv
# Add new emission factor row
```

**2. Run Derivation**:
```bash
make build
# Or: python -m calc.derive
```

**3. Python Validation** (`calc/derive.py`):
```python
import pandas as pd
from pydantic import BaseModel, validator

class EmissionFactor(BaseModel):
    activity_id: str
    factor: float
    unit: str
    source: str

    @validator('factor')
    def factor_positive(cls, v):
        if v < 0:
            raise ValueError('Factor must be positive')
        return v

# Load and validate
df = pd.read_csv('data/emission_factors.csv')
factors = [EmissionFactor(**row) for row in df.to_dict('records')]
```

**4. Transform & Compute**:
```python
# Join activities with emission factors
merged = activities.merge(emission_factors, on='activity_id')

# Compute intensity matrices
intensity = compute_intensity_matrix(merged)

# Generate manifest
manifest = {
  'version': '1.0',
  'generated_at': datetime.now().isoformat(),
  'data': {
    'emission_factors': factors,
    'activities': activities,
    'intensity': intensity
  }
}
```

**5. Hash & Store**:
```python
import hashlib
import json

manifest_json = json.dumps(manifest, sort_keys=True)
content_hash = hashlib.sha256(manifest_json.encode()).hexdigest()

output_dir = f'dist/artifacts/{content_hash}/'
os.makedirs(output_dir, exist_ok=True)

with open(f'{output_dir}/manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)
```

**Output**: `dist/artifacts/abc123.../manifest.json`

**6. Frontend Loads** (hypothetical - not yet implemented):
```typescript
const manifest = await fetch(`/artifacts/${ARTIFACT_HASH}/manifest.json`);
const data = await manifest.json();

// Use data to populate ActivityBrowser
setActivities(data.data.activities);
```

**7. Cloudflare Caching**:
```http
GET /artifacts/abc123.../manifest.json

Cache-Control: public, immutable, max-age=31536000
```

**Hash never changes** → cache forever.

## State Persistence Strategy

### localStorage Schema

**Key**: `carbon-acx-storage`

**Value**:
```json
{
  "state": {
    "profile": {
      "activities": [ /* Activity[] */ ],
      "calculatorResults": [ /* CalculatorResult[] */ ],
      "layers": [ /* ProfileLayer[] */ ],
      "goals": [ /* CarbonGoal[] */ ],
      "scenarios": [ /* Scenario[] */ ],
      "lastUpdated": "2025-10-26T20:00:00Z"
    }
  },
  "version": 0
}
```

### Limitations

- **5MB limit** (most browsers)
- **String only** (no binary data)
- **Synchronous** (blocks UI if large)
- **No expiration** (persists forever)

### Mitigation

- Partialize (only store profile, not UI state)
- Compress large datasets (future: use IndexedDB)
- Periodic cleanup (remove old snapshots)

## Data Validation Points

1. **User Input**: Form validation in components
2. **Calculator**: Type checks in TypeScript
3. **Zustand Actions**: Duplicate checks, schema validation
4. **Python Pipeline**: Pydantic schemas
5. **localStorage**: JSON.parse error handling

## Error Handling

### Zustand Actions

```typescript
addActivity: (activity) => {
  try {
    set((state) => {
      // Validation
      if (!activity.id || !activity.carbonIntensity) {
        console.error('Invalid activity', activity);
        return state; // No change
      }

      // Duplicate check
      if (state.profile.activities.some(a => a.id === activity.id)) {
        console.warn('Activity already exists', activity.id);
        return state;
      }

      // Update state
      return { /* new state */ };
    });
  } catch (error) {
    console.error('Failed to add activity', error);
    // Could show toast notification
  }
}
```

### localStorage Failures

```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'carbon-acx-storage',
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error('Failed to hydrate from localStorage', error);
        // Fallback to empty state
      }
    }
  }
)
```

## Related Diagrams

- See `component-map.mermaid.md` for component relationships
- See `architecture-overview.mermaid.md` for system context
- See `entry-points.mermaid.md` for initialization flow
