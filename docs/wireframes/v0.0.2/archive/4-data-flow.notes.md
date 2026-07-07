# Data Flow - Architectural Notes

## Overview

Data flows through the Carbon ACX system in distinct pipelines: **user journey flows** (navigation), **data derivation** (Python backend), **state management** (Zustand + TanStack Query), **3D rendering** (Three.js loop), and **artifact loading** (immutable caching).

## User Journey Flows

### Welcome → Calculator → Explore → Insights

**Step 1: Arrival** (`/`)
- User lands on WelcomePage
- Sees hero messaging, explanation of carbon accounting
- Choice: "Quick Calculator" (guided) or "Manual Entry" (advanced)

**Step 2: Calculator** (`/calculator`)
- Guided 4-question flow (commute, diet, energy, shopping)
- Real-time feedback: "That's about X kg CO₂/year"
- State: `calculating` → `celebrating`

**Step 3: Results (2D)**
- Total emissions displayed: "5.2 tonnes CO₂/year"
- Comparisons: "Equal to 13 round-trip flights" or "48 trees/year to offset"
- Methodology context: "How we calculate this" link

**Step 4: 3D Reveal**
- Button: "See in 3D Universe"
- `React.lazy()` loads DataUniverse chunk (241KB gzip)
- Intro animation: Camera zooms from [50,50,50] → [15,15,15] over ~1.25s
- Starfield appears, central sphere pulsing, activities orbiting

**Step 5: Explore** (`/explore`)
- Mode toggle: 3D Universe | Timeline | Comparison
- 3D mode: Full DataUniverse with OrbitControls
- Stats bar: "12 activities, 5.2t CO₂/year"
- Click sphere → activity details in stats bar

**Step 6: Insights** (`/insights`)
- Display mode: Cards | 3D + sidebar
- 3D mode: DataUniverse on left (70%), sidebar on right (30%)
- Click sphere → sidebar shows activity details + key insights
- "Clear selection" returns to insights list

### Data Flow Pattern

```
User Input → Navigator → Page Load → Lazy Load Components → Render → User Interaction
```

**Key Principle**: Progressive disclosure (2D numbers first, 3D visualization second)

## Data Derivation Pipeline

### Python Backend (Offline Build Process)

**Trigger**: `make build` or `python -m calc.derive`

**Input Sources** (`data/` directory):
- `activities.csv`: Activity definitions (ID, name, category, default_unit)
- `emission_factors.csv`: Emission factors (value_g_per_unit, region, source)
- `profiles.csv`: User profiles (profile_id, default_grid_region, office_days_per_week)
- `activity_schedule.csv`: Activity schedules (profile_id, activity_id, quantity_per_week)
- `grid_intensity.csv`: Grid carbon intensity (region, intensity_g_per_kwh, vintage_year)

**Processing Steps**:

1. **Load & Validate** (`calc/schema.py`):
   - Load CSVs into Pydantic models
   - Validate field types, required fields, foreign keys
   - Reject invalid rows with clear error messages

2. **Compute Emissions** (`calc/derive.py`):
   ```python
   # For direct emission factors:
   annual_emissions = quantity_per_week * 52 * emission_factor_g_per_unit

   # For grid-indexed factors:
   annual_emissions = quantity_per_week * 52 * grid_intensity_g_per_kwh * electricity_kwh_per_unit
   ```
   - Calculate mean, low, high (uncertainty ranges)
   - Apply regional grid intensity where applicable

3. **Generate Manifest** (`calc/figures_manifest.py`):
   - Build export view (all emissions calculations)
   - Generate figures (stacked, bubble, sankey, feedback)
   - Collect citation keys for references
   - Format IEEE-style citations

4. **Hash & Store** (`calc/derive.py`):
   ```python
   build_hash = hashlib.sha256(json.dumps({
       "manifest": manifest_payload,
       "rows": normalised_rows
   })).hexdigest()[:12]

   output_path = f"dist/artifacts/{build_hash}/calc/outputs/"
   ```
   - Content-addressable storage
   - Immutable artifacts (never overwrite)
   - Pointer file: `dist/artifacts/latest-build.json`

**Output Structure**:
```
dist/artifacts/<hash>/
├── calc/outputs/
│   ├── export_view.csv
│   ├── export_view.json
│   ├── manifest.json
│   ├── intensity_matrix.csv
│   └── figures/
│       ├── stacked.json
│       ├── bubble.json
│       ├── sankey.json
│       └── feedback.json
└── manifests/
    ├── stacked.manifest.json
    ├── bubble.manifest.json
    └── ...
```

**Key Features**:
- **Reproducibility**: Same inputs → same hash → same artifacts
- **Immutability**: Hash-based paths prevent overwrites
- **Provenance**: Every figure includes citation_keys, references, generated_at

## State Management Flows

### Zustand Store Updates

**Pattern**: Action → Immutable Update → Persist → Re-render

**Example: Adding an Activity**

```typescript
// 1. User action
const handleAddActivity = () => {
  const { addActivity } = useAppStore();
  addActivity({
    id: 'TRAN.BIKE.KM',
    name: 'Bike commute',
    quantity: 10,
    carbonIntensity: 0,
    annualEmissions: 0,
    // ... other fields
  });
};

// 2. Store action (internal)
addActivity: (activity) =>
  set((state) => {
    // Prevent duplicates
    if (state.profile.activities.some((a) => a.id === activity.id)) {
      return state; // No change
    }

    // Immutable update
    return {
      profile: {
        ...state.profile,
        activities: [
          ...state.profile.activities,
          {
            ...activity,
            addedAt: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
    };
  })

// 3. Persist (automatic via middleware)
// localStorage.setItem('carbon-acx-storage', JSON.stringify(state))

// 4. Re-render (automatic)
// All components using useAppStore() receive updated state
```

**State Update Guarantees**:
- **Immutability**: Never mutate existing objects, always return new references
- **Atomicity**: Each action completes fully or not at all
- **Reactivity**: Components re-render only when subscribed slices change

### TanStack Query (Server State)

**Pattern**: Request → Cache Check → Fetch/Revalidate → Update

**Example: Loading Artifacts**

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['artifacts', buildHash],
  queryFn: async () => {
    const response = await fetch(`/artifacts/${buildHash}/manifest.json`);
    if (!response.ok) throw new Error('Failed to load manifest');
    return response.json();
  },
  staleTime: Infinity, // Artifacts are immutable, never stale
  cacheTime: 1000 * 60 * 60, // Cache for 1 hour
  retry: 3, // Retry on network errors
});
```

**Cache Flow**:

1. **Request**: Component calls `useQuery({ queryKey: ['artifacts', hash] })`
2. **Cache Check**: Does cache have fresh data for this key?
   - If yes → return cached data immediately
   - If no → proceed to fetch
3. **Fetch**: Execute `queryFn()`, request from server
4. **Update**: Store response in cache, trigger re-render
5. **Background Revalidation**: If `staleTime` expires, refetch in background

**Benefits**:
- **Request Deduplication**: Multiple components requesting same key → single fetch
- **Optimistic Updates**: Show pending state immediately, sync later
- **Automatic Retry**: Network errors retry with exponential backoff
- **DevTools**: TanStack Query DevTools for cache inspection

## 3D Rendering Loop

### Three.js Frame-by-Frame Rendering

**Lifecycle**: Mount → Setup → Loop → Unmount

**Phase 1: Mount & Setup**

```typescript
// User loads DataUniverse component
<DataUniverse totalEmissions={5200} activities={activities} />

// 1. React.lazy() loads Three.js chunk asynchronously
const DataUniverse = React.lazy(() => import('./DataUniverse'));

// 2. SSR safety check
React.useEffect(() => {
  if (typeof window !== 'undefined') {
    setIsReady(true); // Client-side only
  }
}, []);

// 3. Canvas setup
<Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
  <ambientLight intensity={0.4} />
  <Stars count={5000} />
  <CentralSphere size={centralSize} emissions={totalEmissions} />
  {activities.map(activity => <OrbitingActivity key={activity.id} {...props} />)}
  <OrbitControls />
  <CameraAnimator introAnimation />
</Canvas>
```

**Phase 2: Render Loop** (60fps)

```typescript
// useFrame hook (React Three Fiber)
useFrame((state, delta) => {
  // 1. Orbital calculation
  const time = Date.now() * speed;
  const angle = time + phaseOffset;
  const x = Math.cos(angle) * orbitRadius;
  const z = Math.sin(angle) * orbitRadius;
  const y = Math.sin(time * 2) * 2; // Vertical wobble

  // 2. Update mesh position
  if (groupRef.current) {
    groupRef.current.position.set(x, y, z);
  }

  // 3. Camera animation (if active)
  if (animationState.isAnimating) {
    const newProgress = Math.min(animationState.progress + delta * 0.8, 1);
    const t = easeInOut(newProgress);
    camera.position.lerp(targetPosition, t);
  }

  // 4. Mesh updates (hover effects)
  if (hovered && meshRef.current) {
    meshRef.current.material.emissiveIntensity = 1.0;
  }

  // WebGL automatically renders frame after useFrame completes
});
```

**Frame-Rate Independence**:
- `delta` = time since last frame (e.g., 0.016s at 60fps, 0.033s at 30fps)
- `progress += delta * 0.8` → same perceived speed on fast/slow devices
- Orbital speeds use `Date.now()` for consistency across page loads

**Performance**:
- **60fps on modern devices** (WebGL hardware acceleration)
- **30-40fps on older laptops** (graceful degradation)
- **Rendering cost**: ~5ms/frame for 20 activities, ~15ms for 100 activities

### Orbital Calculation Details

**Math**:
```javascript
// Stagger speeds to avoid overlap
const speed = 0.0005 + index * 0.0001;

// Evenly distribute initial positions
const phaseOffset = (index / totalActivities) * Math.PI * 2;

// Current angle based on time
const time = Date.now() * speed;
const angle = time + phaseOffset;

// Position on circular orbit
const x = Math.cos(angle) * orbitRadius;
const z = Math.sin(angle) * orbitRadius;

// Vertical wobble for visual interest
const y = Math.sin(time * 2) * 2;
```

**Result**: Activities orbit at staggered speeds, evenly distributed around central sphere, gentle vertical motion.

## Activity CRUD Operations

### Add Activity Flow

1. **User Input**: Click "Add Activity" button, fill form
2. **Validation**: Check for required fields, duplicate IDs
3. **Create Object**:
   ```typescript
   const newActivity: Activity = {
     id: generateId(), // e.g., 'TRAN.BIKE.KM'
     sectorId: 'TRAN',
     name: 'Bike commute',
     category: 'Transport',
     quantity: 10,
     unit: 'km',
     carbonIntensity: 0,
     annualEmissions: 0,
     addedAt: new Date().toISOString(),
   };
   ```
4. **Update Store**: `useAppStore().addActivity(newActivity)`
5. **Recalculate Total**: `getTotalEmissions()` recomputes sum
6. **Update 3D**: DataUniverse receives updated `activities` prop → new sphere appears

### Edit Activity Flow

1. **User Input**: Click edit icon, change quantity (e.g., 10 → 20 km)
2. **Update Store**: `updateActivityQuantity(activityId, 20)`
3. **Store Logic**:
   ```typescript
   activities.map(activity =>
     activity.id === activityId
       ? {
           ...activity,
           quantity: 20,
           annualEmissions: 20 * activity.carbonIntensity,
         }
       : activity
   )
   ```
4. **Recalculate Total**: Sum changes (e.g., 5200 → 5300 kg CO₂)
5. **Update 3D**: Central sphere size recalculates, activity sphere may resize

### Delete Activity Flow

1. **User Input**: Click delete icon, confirm dialog
2. **Update Store**: `removeActivity(activityId)`
3. **Store Logic**:
   ```typescript
   activities.filter(a => a.id !== activityId)
   ```
4. **Recalculate Total**: Sum decreases
5. **Update 3D**: Sphere disappears, remaining activities re-orbit

**Key Insight**: State updates are **synchronous** → UI updates are **immediate** (React re-renders on state change)

## Artifact Loading Flow

### Immutable Caching Strategy

**Problem**: Fetching large JSON files on every page load is slow.

**Solution**: Content-addressable artifacts + aggressive caching.

**Flow**:

1. **Page Load**: User navigates to `/explore`
2. **Query Artifacts**:
   ```typescript
   const buildHash = 'a1b2c3d4e5f6'; // From latest-build.json
   const { data: manifest } = useQuery({
     queryKey: ['manifest', buildHash],
     queryFn: () => fetch(`/artifacts/${buildHash}/manifest.json`).then(r => r.json()),
     staleTime: Infinity, // Never refetch (hash guarantees immutability)
   });
   ```
3. **Fetch Manifest**: First request hits server, downloads ~50KB JSON
4. **Parse JSON**: Extract layers, citation_keys, references
5. **Populate UI**: Layer selector shows "Professional | Online | Industrial Light"
6. **Cache Forever**: TanStack Query cache + browser HTTP cache (hash-based URL)

**Caching Strategy**:
- **Immutability**: Hash in URL → same hash = same content → cache forever
- **Invalidation**: New build → new hash → new URL → cache miss → fresh fetch
- **CDN**: Cloudflare Pages caches at edge (sub-10ms response time globally)

### Loading States

**Pattern**: Loading → Success | Error

```typescript
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <Content data={data} />;
```

**User Experience**:
- **Skeleton screens**: Show layout immediately, fill with data as it loads
- **Optimistic updates**: Assume success, rollback on error
- **Error boundaries**: Catch errors, show friendly message, offer retry

## Common Workflows

### Workflow: User Adds Activity via Calculator

1. User answers "Do you commute?" → "Yes, 10 km by car"
2. Calculator computes: `10 km × 260 days × 0.18 kg/km = 468 kg CO₂/year`
3. Saves to store: `saveCalculatorResults([{ category: 'commute', emissions: 468 }])`
4. Results page shows: "468 kg from commuting" + comparisons
5. Click "See in 3D" → DataUniverse loads, shows 1 orbiting sphere
6. User navigates to `/explore` → same sphere visible, can add more activities

### Workflow: User Edits Activity in ActivityManagement

1. User clicks edit icon next to "Car commute: 10 km"
2. Inline input appears with current value (10)
3. User changes to 20, clicks checkmark
4. Store action: `updateActivityQuantity('TRAN.CAR.KM', 20)`
5. Recalculation: `20 × 260 × 0.18 = 936 kg` (doubled)
6. 3D Universe updates: Sphere grows (size ∝ log(emissions))
7. Total emissions increases: Central sphere grows

### Workflow: Offline Build → Online Deploy

1. **Local Build** (developer machine):
   ```bash
   make build  # Runs calc/derive.py
   ```
   - Reads CSVs, validates, computes emissions
   - Outputs to `dist/artifacts/<hash>/`
   - Creates `dist/artifacts/latest-build.json` pointer

2. **Package for Deploy**:
   ```bash
   make package  # Builds web app + copies artifacts
   ```
   - Runs `pnpm build:web` → Vite builds React app
   - Copies artifacts to `dist/site/`
   - Adds `_headers`, `_redirects` for Cloudflare Pages

3. **CI/CD Deploy** (GitHub Actions):
   - Push to `main` branch
   - GitHub Actions runs `make ci_build_pages`
   - Uploads `dist/site/` to Cloudflare Pages
   - Pages builds, deploys globally to edge

4. **User Loads Page** (production):
   - Browser fetches `/`
   - HTML includes `<script src="/assets/index-abc123.js">`
   - JS loads, reads `/artifacts/latest-build.json`
   - Extracts build hash, fetches `/artifacts/<hash>/manifest.json`
   - Populates UI with latest data

## Performance Considerations

### Bundle Sizes

- **Main bundle**: 1,120KB (372KB gzip) - React, Router, Zustand, UI components
- **DataUniverse chunk**: 887KB (241KB gzip) - Three.js, R3F, Drei
- **Total download** (first load): ~613KB gzip
- **Subsequent loads**: ~0KB (cached)

### Optimization Strategies

1. **Code Splitting**: Lazy load DataUniverse (only when 3D view requested)
2. **Tree Shaking**: Vite eliminates unused code
3. **Compression**: Gzip on all assets (Cloudflare Pages automatic)
4. **Caching**: Aggressive caching (hash-based URLs, staleTime: Infinity)
5. **CDN**: Cloudflare edge network (sub-10ms globally)

### Rendering Performance

- **60fps Target**: useFrame budget = 16.67ms
- **Actual Cost** (20 activities):
  - Orbital calculations: ~1ms
  - Camera updates: ~0.5ms
  - Mesh updates: ~2ms
  - WebGL draw: ~3ms
  - **Total**: ~6.5ms (39% of budget, plenty of headroom)

- **Degradation** (100 activities):
  - Orbital calculations: ~5ms
  - Mesh updates: ~10ms
  - **Total**: ~18ms → ~55fps (still smooth)

## Troubleshooting

### "DataUniverse won't load"

**Symptoms**: Blank screen, no 3D visualization
**Causes**:
1. **SSR Error**: Three.js trying to run on server → Check console for "WebGL not defined"
2. **Lazy Load Failed**: Chunk download error → Check network tab
3. **WebGL Unsupported**: Old browser → ErrorBoundary should show fallback

**Solutions**:
1. Ensure `React.lazy()` + `Suspense` wrapper present
2. Check `SSRCheck` condition: `typeof window !== 'undefined'`
3. Add ErrorBoundary with graceful fallback message

### "State updates not persisting"

**Symptoms**: Refresh page → data gone
**Causes**:
1. **Persist Middleware Not Configured**: Check `zustand/middleware`
2. **localStorage Blocked**: Private browsing mode
3. **Storage Quota Exceeded**: >5MB data

**Solutions**:
1. Verify `persist()` wrapper in `appStore.ts`
2. Check `localStorage.getItem('carbon-acx-storage')`
3. Clear old data, implement storage cleanup

### "Artifacts not loading"

**Symptoms**: "Loading..." spinner forever
**Causes**:
1. **Wrong Build Hash**: `latest-build.json` points to non-existent hash
2. **Network Error**: CDN down, CORS issue
3. **Malformed JSON**: Invalid manifest file

**Solutions**:
1. Check `/artifacts/latest-build.json` → verify hash exists in `/artifacts/<hash>/`
2. Inspect network tab for 404/500 errors
3. Validate JSON with `jq` or linter

## Related Diagrams

- **component-map**: Shows which components consume this data flow
- **entry-points**: How data flow initializes (main.tsx → CanvasApp.tsx → routes)
- **deployment-infrastructure**: How derivation pipeline runs in CI/CD
