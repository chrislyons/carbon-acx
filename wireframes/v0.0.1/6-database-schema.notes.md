# Database Schema - Detailed Notes

## Overview

**Critical**: Carbon ACX web application has **no server-side database**. All data storage is **client-side only**, using browser localStorage via Zustand's persist middleware.

Backend data (emission factors, activities CSV) is read-only and bundled during build. User profile data lives entirely in the browser.

## Storage Architecture

### Client-Side Only

**Why no backend database?**
1. **Privacy**: User's carbon footprint never leaves their device
2. **Simplicity**: No authentication, no database hosting, no GDPR compliance
3. **Cost**: Zero backend infrastructure costs
4. **Speed**: Instant reads/writes (no network latency)
5. **Offline-first**: App works without internet connection

**Trade-offs**:
- Data lost if user clears browser storage
- No cross-device sync (yet)
- No collaborative features
- Limited by browser storage quota (~5MB for localStorage)

**Future considerations**: IndexedDB for larger datasets, sync via Cloudflare Durable Objects.

## Zustand Store Schema

### Store Structure

**Location**: `/apps/carbon-acx-web/src/store/appStore.ts`

**Type**: Zustand store with persist middleware

**Partitioning strategy**:
```typescript
partialize: (state) => ({
  profile: state.profile, // ONLY profile data persisted
})
```

**Rationale**: UI state (activeZone, transitionState) should not persist across sessions. Always start with default UI state on load.

### Root Store Interface

```typescript
interface AppStore {
  // UI State (NOT persisted)
  activeZone: CanvasZone;           // 'hero' | 'insight' | 'detail'
  transitionState: TransitionState;  // 'idle' | 'animating'

  // Profile Data (PERSISTED)
  profile: ProfileData;

  // Actions (40+ methods)
  // ...
}
```

**UI state fields**:
- `activeZone`: Current viewport focus zone (hero/insight/detail)
- `transitionState`: Animation lock (prevents concurrent transitions)

**Why separate UI state?**
- Prevents stale UI on reload
- Ensures predictable initial state
- Reduces localStorage footprint

## ProfileData Schema

### Structure

```typescript
interface ProfileData {
  activities: Activity[];
  calculatorResults: CalculatorResult[];
  layers: ProfileLayer[];
  goals: CarbonGoal[];
  scenarios: Scenario[];
  lastUpdated: string; // ISO 8601 timestamp
}
```

**Initialization** (empty profile):
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

**Field purposes**:
- `activities`: User-added emission activities (flights, commutes, energy use)
- `calculatorResults`: Output from quick calculator (diet, shopping, etc.)
- `layers`: Comparison profiles (baseline vs. goal, scenarios)
- `goals`: Reduction targets with milestones
- `scenarios`: "What-if" modeling (change quantities, see impact)
- `lastUpdated`: Audit trail for data freshness

### Activity Schema

**Purpose**: Represents a single emission-generating activity.

```typescript
interface Activity {
  id: string;                    // Unique identifier (UUID or activity-{timestamp})
  sectorId: string;              // Links to sector catalog (e.g., 'transport', 'energy')
  name: string;                  // Human-readable label ('Daily commute', 'Home electricity')
  category: string | null;       // Optional subcategory ('Car', 'Public transit')
  quantity: number;              // Amount (e.g., 50 for km/day, 300 for kWh/month)
  unit: string;                  // Unit of measure ('km/day', 'kWh/month')
  carbonIntensity: number;       // Emission factor (kg CO₂/unit)
  annualEmissions: number;       // Computed: quantity × carbonIntensity × scaling
  addedAt: string;               // ISO 8601 timestamp
  iconType?: string;             // Optional icon identifier
  iconUrl?: string;              // Optional custom icon URL
  badgeColor?: string;           // Optional UI badge color
}
```

**Key relationships**:
- `sectorId` links to backend CSV data (`data/activities.csv`)
- `carbonIntensity` sourced from `data/emission_factors.csv`
- `annualEmissions` is **derived**, never manually edited

**Emission calculation**:
```typescript
annualEmissions = quantity * carbonIntensity * (scaling factor based on unit)
```

Example:
- Activity: "Daily car commute"
- Quantity: 20 km/day
- Intensity: 0.12 kg CO₂/km
- Annual: 20 × 0.12 × 365 = 876 kg CO₂/year

**Immutability**: Once created, all fields except `quantity` are immutable. Changing quantity triggers recalculation of `annualEmissions`.

### CalculatorResult Schema

**Purpose**: Output from quick carbon calculator (simplified entry method).

```typescript
interface CalculatorResult {
  category: 'commute' | 'diet' | 'energy' | 'shopping'; // Predefined categories
  label: string;                                        // User-facing description
  annualEmissions: number;                              // Total kg CO₂/year
  calculatedAt: string;                                 // ISO 8601 timestamp
}
```

**Why separate from Activity?**
- Calculator provides estimates (less precise than Activity)
- Different UX flow (questionnaire vs. manual entry)
- Can be converted to Activities later

**Example**:
```json
{
  "category": "diet",
  "label": "Omnivore diet (average)",
  "annualEmissions": 2100,
  "calculatedAt": "2025-10-26T12:34:56Z"
}
```

### ProfileLayer Schema

**Purpose**: Snapshot of activities for comparison (baseline vs. target, scenarios).

```typescript
interface ProfileLayer {
  id: string;                    // Unique identifier
  name: string;                  // Layer label ('2024 Baseline', 'Net Zero Target')
  sourceProfileId: string | null; // Optional parent profile (for derived layers)
  color: string;                 // Hex color for visualization (#10b981)
  visible: boolean;              // Toggle in UI
  activities: Activity[];        // Snapshot of activities at creation time
  createdAt: string;             // ISO 8601 timestamp
}
```

**Use cases**:
1. **Baseline tracking**: Freeze current state as "2024 Baseline"
2. **Goal modeling**: Create "Net Zero 2030" layer with modified activities
3. **Scenario comparison**: Compare multiple what-if scenarios

**Important**: `activities` is a **snapshot**. Changes to main profile don't affect layer activities.

**Visibility toggle**: Useful for chart overlays (show/hide layers in timeline).

### CarbonGoal Schema

**Purpose**: Reduction target with progress tracking.

```typescript
interface CarbonGoal {
  id: string;                    // Unique identifier
  name: string;                  // Goal label ('Halve emissions by 2026')
  targetEmissions: number;       // Goal value (kg CO₂/year)
  currentEmissions: number;      // Current value (kg CO₂/year)
  deadline?: string;             // Optional ISO 8601 date
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  milestones: Milestone[];       // Progress checkpoints
}

interface Milestone {
  percent: number;               // Progress percentage (25, 50, 75, 100)
  achieved: boolean;             // Has milestone been reached?
  achievedAt?: string;           // Optional timestamp of achievement
}
```

**Progress calculation**:
```typescript
const progress = ((currentEmissions - targetEmissions) / currentEmissions) * 100;
```

**Milestone tracking**:
- Auto-generated: 25%, 50%, 75%, 100%
- Marked `achieved: true` when `currentEmissions` crosses threshold
- `achievedAt` captures timestamp for celebration/audit

**Update logic**:
- `currentEmissions` recalculated from `getTotalEmissions()` whenever profile changes
- `updatedAt` timestamp refreshed on any field change

### Scenario Schema

**Purpose**: "What-if" modeling (change activity quantities, see impact).

```typescript
interface Scenario {
  id: string;                    // Unique identifier
  name: string;                  // Scenario label ('Switch to public transit')
  description?: string;          // Optional explanation
  changes: ScenarioChange[];     // List of activity modifications
  totalImpact: number;           // Net kg CO₂ saved (positive) or added (negative)
  percentageChange: number;      // Percentage change from baseline
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

interface ScenarioChange {
  activityId: string;            // Links to Activity.id
  activityName: string;          // For display (cached)
  originalQuantity: number;      // Baseline quantity
  newQuantity: number;           // Modified quantity
  quantityDiff: number;          // newQuantity - originalQuantity
  emissionsDiff: number;         // Impact in kg CO₂/year (can be negative)
}
```

**Example scenario**: "Switch to public transit"
```json
{
  "id": "scenario-1730000000000",
  "name": "Switch to public transit",
  "description": "Replace daily car commute with train",
  "changes": [
    {
      "activityId": "activity-car-commute",
      "activityName": "Daily car commute",
      "originalQuantity": 20,
      "newQuantity": 0,
      "quantityDiff": -20,
      "emissionsDiff": -876
    },
    {
      "activityId": "activity-train-commute",
      "activityName": "Daily train commute",
      "originalQuantity": 0,
      "newQuantity": 20,
      "quantityDiff": 20,
      "emissionsDiff": 146
    }
  ],
  "totalImpact": -730,
  "percentageChange": -12.4,
  "createdAt": "2025-10-26T12:00:00Z",
  "updatedAt": "2025-10-26T12:00:00Z"
}
```

**Impact calculation**:
```typescript
totalImpact = changes.reduce((sum, change) => sum + change.emissionsDiff, 0);
percentageChange = (totalImpact / baselineEmissions) * 100;
```

**Why cache activityName?**
- Activity might be deleted later
- Preserves scenario history even if source activity gone

## XState Journey Machine Context

**Location**: `/apps/carbon-acx-web/src/machines/journeyMachine.ts`

**Type**: XState machine context (ephemeral, NOT persisted)

```typescript
interface JourneyContext {
  // Completion flags
  hasCompletedOnboarding: boolean;
  hasEstablishedBaseline: boolean;

  // Progress counters
  activitiesAdded: number;       // Total activities added (increments only)
  scenariosCreated: number;      // Total scenarios created
  goalsSet: number;              // Total goals set
  exportsGenerated: number;      // Total exports (PDF, JSON)

  // Journey metadata
  startedAt: string | null;               // Session start timestamp
  currentStepCompletedAt: string | null;  // Last step completion
}
```

**Why not persist?**
- Journey state resets each session (onboarding re-shown if needed)
- Counters are informational only (analytics)
- Session metadata not useful across sessions

**How it interacts with Zustand**:
- XState context tracks **user flow** (which scenes visited)
- Zustand profile tracks **user data** (activities, goals)
- Journey machine reads Zustand to make decisions (skip onboarding if data exists)

**Example transition with context update**:
```typescript
COMPLETE_ONBOARDING: {
  target: 'baseline',
  actions: assign({
    hasCompletedOnboarding: true,
    currentStepCompletedAt: () => new Date().toISOString(),
  }),
}
```

## LocalStorage Format

### Storage Key

**Key**: `'carbon-acx-storage'`

**Format**: JSON string

**Example structure**:
```json
{
  "state": {
    "profile": {
      "activities": [...],
      "calculatorResults": [...],
      "layers": [...],
      "goals": [...],
      "scenarios": [...],
      "lastUpdated": "2025-10-26T12:34:56Z"
    }
  },
  "version": 0
}
```

**Zustand persist format**:
- `state`: Contains partialized state (only `profile`)
- `version`: Middleware version (for migration)

### Size Constraints

**Browser limit**: ~5MB for localStorage (varies by browser)

**Current usage** (typical user):
- Empty profile: ~200 bytes
- 10 activities: ~2KB
- 5 calculator results: ~500 bytes
- 3 layers with 10 activities each: ~6KB
- 2 goals with milestones: ~800 bytes
- 2 scenarios with 5 changes each: ~1.5KB
- **Total**: ~11KB (well under limit)

**Scaling estimate**:
- 100 activities: ~20KB
- 50 layers: ~100KB
- 1000 activities: ~200KB (extreme edge case)

**Still safe**: Even power users unlikely to hit 5MB limit.

### Migration Strategy

**Current version**: 0 (initial schema)

**Future migrations**: Zustand persist middleware supports versioning:
```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'carbon-acx-storage',
    version: 1,
    migrate: (persistedState, version) => {
      if (version === 0) {
        // Migrate from v0 to v1
        return {
          ...persistedState,
          // Add new fields, transform old fields
        };
      }
      return persistedState;
    },
  }
)
```

**When to migrate**:
- Adding new required fields
- Renaming fields
- Changing data types
- Splitting/merging entities

**Example migration**: Add `tags` to Activity
```typescript
if (version === 0) {
  return {
    ...persistedState,
    profile: {
      ...persistedState.profile,
      activities: persistedState.profile.activities.map(a => ({
        ...a,
        tags: [], // New field with default value
      })),
    },
  };
}
```

## Data Access Patterns

### Reading Data

**Direct access** (within Zustand store):
```typescript
const activities = useAppStore((state) => state.profile.activities);
```

**Computed values** (within Zustand store):
```typescript
const totalEmissions = useAppStore((state) => state.getTotalEmissions());
```

**Convenience accessors**:
```typescript
const activities = useAppStore((state) => state.activities); // Shorthand
const layers = useAppStore((state) => state.layers);
```

**Why selectors?**
- Re-render only when selected data changes
- Avoid unnecessary component updates
- Improve performance for large datasets

### Writing Data

**Add activity**:
```typescript
const { addActivity } = useAppStore();

addActivity({
  id: 'activity-1730000000000',
  sectorId: 'transport',
  name: 'Daily commute',
  category: 'Car',
  quantity: 20,
  unit: 'km/day',
  carbonIntensity: 0.12,
  annualEmissions: 876,
  // addedAt auto-populated by store
});
```

**Update activity quantity**:
```typescript
const { updateActivityQuantity } = useAppStore();

updateActivityQuantity('activity-1730000000000', 30); // Change from 20 to 30 km/day
// Store automatically recalculates annualEmissions
```

**Remove activity**:
```typescript
const { removeActivity } = useAppStore();

removeActivity('activity-1730000000000');
```

**All mutations**:
1. Trigger Zustand state update
2. Update `lastUpdated` timestamp
3. Persist to localStorage (automatic via middleware)

## Data Validation

### Type Safety

**TypeScript strict mode**: All fields strongly typed

**Runtime validation**: None (trusts localStorage data)

**Future enhancement**: Zod schema validation on hydration
```typescript
import { z } from 'zod';

const ActivitySchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  // ...
});
```

**Why add validation?**
- Detect corrupted localStorage
- Graceful degradation (fallback to empty profile)
- Migration safety (catch schema mismatches)

### Constraints

**Activity constraints**:
- `quantity` must be >= 0
- `carbonIntensity` must be >= 0
- `annualEmissions` must be >= 0
- `id` must be unique (enforced by addActivity check)

**Layer constraints**:
- `id` must be unique
- `color` should be valid hex (#RRGGBB)
- `activities` is snapshot (immutable after creation)

**Goal constraints**:
- `targetEmissions` must be >= 0
- `currentEmissions` must be >= 0
- Milestones sorted by percent ascending

**Scenario constraints**:
- All `changes` must reference valid activity IDs (at creation time)
- `totalImpact` = sum of `emissionsDiff`
- `percentageChange` = (totalImpact / baseline) * 100

**Enforcement**: Currently manual (in store action implementations). Future: Zod validation.

## Data Export/Import

### Export

**Not yet implemented**, but planned:
```typescript
const { exportData } = useJourneyMachine();

exportData(); // Triggers export flow
```

**Export formats**:
1. JSON (raw profile data)
2. CSV (activities list)
3. PDF (summary report)

**JSON export structure**:
```json
{
  "version": "1.0",
  "exportedAt": "2025-10-26T12:34:56Z",
  "profile": { /* ProfileData */ }
}
```

### Import

**Not yet implemented**, but planned:
```typescript
const { importProfile } = useAppStore();

importProfile(jsonData); // Merge or replace
```

**Import strategies**:
1. **Replace**: Clear current profile, load imported data
2. **Merge**: Add imported activities to existing profile
3. **Layer**: Create new layer with imported activities

**Validation**: Zod schema check before import (prevent corruption).

## Computed Values

### Total Emissions

**Location**: `appStore.getTotalEmissions()`

**Algorithm**:
```typescript
getTotalEmissions: () => {
  const state = get();

  const activityTotal = state.profile.activities.reduce(
    (sum, activity) => sum + activity.annualEmissions,
    0
  );

  const calculatorTotal = state.profile.calculatorResults.reduce(
    (sum, result) => sum + result.annualEmissions,
    0
  );

  const layerTotal = state.profile.layers
    .filter((layer) => layer.visible)
    .reduce((sum, layer) => {
      const layerEmissions = layer.activities.reduce(
        (layerSum, activity) => layerSum + activity.annualEmissions,
        0
      );
      return sum + layerEmissions;
    }, 0);

  return activityTotal + calculatorTotal + layerTotal;
}
```

**Why include visible layers?**
- Layers are overlays (comparison profiles)
- Only visible layers contribute to current total
- Allows toggling scenarios on/off

**Performance**: O(n) where n = total activities across all entities. Fast enough for typical usage (~100 activities).

## Related Diagrams

- See `data-flow.mermaid.md` for state mutation flows
- See `entry-points.mermaid.md` for Zustand initialization
- See `architecture-overview.mermaid.md` for storage layer context
