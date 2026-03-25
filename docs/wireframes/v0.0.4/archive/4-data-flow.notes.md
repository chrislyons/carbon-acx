# Data Flow Notes

**Version:** v0.0.4 (November 2025)
**Architecture:** CSV → Python → Artifacts → Next.js → UI → 3D

## Data Flow Overview

Carbon ACX follows a **build-time derivation + runtime rendering** pattern:

1. **Build Time:** CSV data → Python pipeline → Content-addressed artifacts
2. **Runtime:** Artifacts → Next.js SSR/SSG → React UI → 3D visualization

Key principle: **Data flows in one direction with immutable checkpoints.**

## 1. Data Update Workflow

### Developer Edits CSV

**Files Edited:**
- `data/activities.csv` - Add/modify activity definitions
- `data/emission_factors.csv` - Update emission factors
- `data/grid_intensity.csv` - Update regional electricity intensity
- `data/sources.csv` - Add new citation sources

**Example Edit:**
```csv
# data/activities.csv
activity_id,sector_id,layer_id,category,name,default_unit
TRAN.SCHOOLRUN.CAR.KM,SECTOR.PROFESSIONAL_SERVICES,professional,transportation,"School run—by car, per kilometre",km
```

### Trigger Build

**Command:** `make build`

**Makefile Target:**
```makefile
build:
	poetry run python -m calc.derive
	@echo "✓ Artifacts generated in dist/artifacts/"
```

**What Happens:**
- Poetry activates Python virtual environment
- Executes `calc/derive.py` main function
- Python reads all CSV files
- Validation, calculation, manifest generation
- Writes outputs to `dist/artifacts/<hash>/`

## 2. Validation & Loading

### CSV Parsing

**Technology:** Pandas + Pydantic

**Process:**
```python
# calc/derive.py
import pandas as pd
from calc.schema import Activity, EmissionFactor

# Read CSV
activities_df = pd.read_csv('data/activities.csv')

# Validate each row
validated_activities = []
for _, row in activities_df.iterrows():
    try:
        activity = Activity(**row.to_dict())
        validated_activities.append(activity)
    except ValidationError as e:
        print(f"Error in row {row['activity_id']}: {e}")
        raise
```

### Schema Validation (Pydantic)

**Model Example:**
```python
# calc/schema.py
from pydantic import BaseModel, field_validator
from enum import Enum

class LayerId(str, Enum):
    PROFESSIONAL = "professional"
    INDUSTRIAL = "industrial"
    MILITARY = "military"

class RegionCode(str, Enum):
    CA_ON = "CA-ON"
    US_CA = "US-CA"
    GB = "GB"
    # ... more regions

class Activity(BaseModel):
    activity_id: str
    sector_id: str
    layer_id: LayerId
    category: str
    name: str
    default_unit: str

    @field_validator('activity_id')
    def validate_activity_id(cls, v):
        # Must follow pattern: SECTOR.ACTIVITY.VARIANT.UNIT
        parts = v.split('.')
        if len(parts) != 4:
            raise ValueError(f"Invalid activity ID format: {v}")
        return v

class EmissionFactor(BaseModel):
    ef_id: str
    activity_id: str
    value_g_per_unit: float
    region: RegionCode
    scope_boundary: str
    gwp_horizon: str
    vintage_year: float
    source_id: str
    is_grid_indexed: bool = False

    @field_validator('value_g_per_unit')
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError("Emission factor must be positive")
        return v
```

**Validation Rules:**
- Activity IDs must follow `SECTOR.ACTIVITY.VARIANT.UNIT` pattern
- Region codes validate against enum (ISO 3166)
- Emission factor values must be positive
- Source IDs must reference existing sources
- Layer IDs must be in enum (professional, industrial, military)

**Error Handling:**
```python
try:
    activity = Activity(**row)
except ValidationError as e:
    print(f"Validation error in activities.csv row {index}:")
    for error in e.errors():
        print(f"  Field: {error['loc'][0]}")
        print(f"  Error: {error['msg']}")
    sys.exit(1)
```

**Build Fails if Validation Fails:** This ensures data quality at build time.

## 3. Derivation & Calculation

### Matching Activities ↔ Emission Factors

**Strategy:** Regional hierarchy with fallbacks

```python
def match_emission_factor(
    activity_id: str,
    region: RegionCode
) -> EmissionFactor:
    # 1. Try exact region match (CA-ON)
    exact = emission_factors[
        (emission_factors['activity_id'] == activity_id) &
        (emission_factors['region'] == region)
    ]
    if not exact.empty:
        return EmissionFactor(**exact.iloc[0].to_dict())

    # 2. Fallback to country (CA)
    country = region.split('-')[0]
    country_match = emission_factors[
        (emission_factors['activity_id'] == activity_id) &
        (emission_factors['region'].str.startswith(country))
    ]
    if not country_match.empty:
        return EmissionFactor(**country_match.iloc[0].to_dict())

    # 3. Fallback to global average
    global_match = emission_factors[
        (emission_factors['activity_id'] == activity_id) &
        (emission_factors['region'] == 'GLOBAL')
    ]
    if not global_match.empty:
        return EmissionFactor(**global_match.iloc[0].to_dict())

    # 4. No match found
    raise ValueError(f"No emission factor found for {activity_id} in {region}")
```

**Example Matching:**
- Activity: `TRAN.SCHOOLRUN.CAR.KM`
- Region: `CA-ON` (Ontario, Canada)
- Lookup sequence:
  1. Try `CA-ON` (exact) ✓ Found
  2. (skip country fallback)
  3. (skip global fallback)
- Result: `EF.CAR.KM` with value `180 g CO₂e/km` for CA-ON

### Emission Calculation

**Formula:**
```
Annual Emissions (kg CO₂e) = Quantity × Emission Factor (g/unit) / 1000
```

**Example:**
```python
# School run by car: 10km/day, 200 days/year
quantity = 10 * 200  # 2000 km/year
emission_factor = 180  # g CO₂e/km
annual_emissions_kg = (quantity * emission_factor) / 1000
# Result: 360 kg CO₂e/year
```

**Grid-Indexed Emissions (Electricity):**
```python
# For electricity activities (is_grid_indexed=True)
grid_intensity = get_grid_intensity(region, year)  # g CO₂e/kWh
quantity_kwh = 1000  # kWh/year
annual_emissions_kg = (quantity_kwh * grid_intensity) / 1000
```

**Example Grid Calculation:**
- Region: `CA-ON` (Ontario)
- Year: 2023
- Grid intensity: 30 g CO₂e/kWh (mostly hydro + nuclear)
- Quantity: 1000 kWh/year
- Result: 30 kg CO₂e/year

### Figure Generation

**Output Format (JSON):**
```json
{
  "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
  "activity_name": "School run—by car, per kilometre",
  "activity_id": "TRAN.SCHOOLRUN.CAR.KM",
  "category": "transportation",
  "layer": "professional",
  "quantity": 2000,
  "unit": "km",
  "emission_factor": 180,
  "emission_factor_unit": "g CO₂e/km",
  "annual_emissions_kg": 360,
  "region": "CA-ON",
  "scope_boundary": "WTT+TTW",
  "gwp_horizon": "GWP100 (AR6)",
  "vintage_year": 2023,
  "source_id": "SRC.ECCC.NIR.2025",
  "generated_at": "2025-11-11T12:00:00Z"
}
```

**Aggregations:**
- **By Layer:** Sum all activities in layer (professional, industrial, military)
- **By Category:** Sum all transportation, food, media, etc.
- **Temporal:** Year-over-year comparisons (if historical data)

## 4. Manifest Creation

### SHA256 Hashing

**Purpose:** Ensure bit-for-bit immutability

**Process:**
```python
# calc/utils/hashio.py
import hashlib
import json

def compute_sha256(file_path: str) -> str:
    """Compute SHA256 hash of file."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def compute_sha256_json(data: dict) -> str:
    """Compute SHA256 hash of JSON object."""
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode('utf-8')).hexdigest()
```

**Hash Prefixes:**
- Full hash: `a1b2c3d4e5f6g7h8...` (64 chars)
- Prefix: `a1b2c3d4` (first 8 chars)
- Used in: Directory names, file names

### Manifest Bundling

**Manifest Schema (v1.0.0):**
```json
{
  "schema_version": "1.0.0",
  "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
  "figure_method": "activity-based",
  "generated_at": "2025-11-11T12:00:00Z",
  "hash_prefix": "a1b2c3d4",
  "figure_path": "figures/TRAN.SCHOOLRUN.CAR.KM-a1b2c3d4.json",
  "figure_sha256": "a1b2c3d4e5f6g7h8...",
  "citation_keys": ["SRC.ECCC.NIR.2025"],
  "references": {
    "path": "references/references-xyz789.json",
    "sha256": "xyz789abc123...",
    "line_count": 50
  },
  "numeric_invariance": {
    "passed": true,
    "tolerance_percent": 0.01,
    "test_date": "2025-11-11T12:05:00Z"
  }
}
```

**Provenance Chain:**
1. **Figure File:** Raw calculation data
2. **Figure SHA256:** Byte hash of figure
3. **Citations:** Links to source files
4. **References:** Full citation metadata
5. **Numeric Invariance:** Test that calculations don't drift

**Root Manifest (Index):**
```json
{
  "dataset_manifest": {
    "path": "manifests/dataset-manifest.json",
    "sha256": "..."
  },
  "figures": [
    {
      "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
      "manifests": [
        { "path": "manifests/TRAN.SCHOOLRUN.CAR.KM-manifest-abc.json", "sha256": "..." }
      ],
      "figures": [
        { "path": "figures/TRAN.SCHOOLRUN.CAR.KM-abc.json", "sha256": "..." }
      ],
      "references": [
        { "path": "references/references-xyz.json", "sha256": "..." }
      ]
    }
  ]
}
```

### Writing Artifacts

**Directory Structure:**
```
dist/artifacts/a1b2c3d4/
├── manifest.json                             # Root index
├── manifests/
│   ├── TRAN.SCHOOLRUN.CAR.KM-manifest-abc123.json
│   ├── FOOD.MEALS.HOME.MEAL-manifest-def456.json
│   └── [more manifests]
├── figures/
│   ├── TRAN.SCHOOLRUN.CAR.KM-abc123.json
│   ├── FOOD.MEALS.HOME.MEAL-def456.json
│   └── [more figures]
└── references/
    └── references-xyz789.json
```

**Write Process:**
```python
# calc/figures_manifest.py
import json
from pathlib import Path

def write_manifest(manifest: dict, output_dir: Path):
    figure_id = manifest['figure_id']
    hash_prefix = manifest['hash_prefix']

    # Write figure file
    figure_path = output_dir / 'figures' / f"{figure_id}-{hash_prefix}.json"
    with open(figure_path, 'w') as f:
        json.dump(manifest['figure_data'], f, indent=2)

    # Compute figure hash
    figure_sha256 = compute_sha256(figure_path)
    manifest['figure_sha256'] = figure_sha256

    # Write manifest file
    manifest_path = output_dir / 'manifests' / f"{figure_id}-manifest-{hash_prefix}.json"
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
```

## 5. Frontend Build

### Next.js Build Process

**Command:** `pnpm --filter carbon-acx-web run build`

**Steps:**
1. **Compile TypeScript:** TSC checks all `.ts`/`.tsx` files
2. **Bundle Components:** Webpack/Turbopack creates chunks
3. **Static Generation (SSG):** Pre-render static pages
4. **Server Functions:** Compile API routes and Server Components
5. **Asset Optimization:** Minify JS/CSS, optimize images

**Build Output:**
```
apps/carbon-acx-web/.next/
├── standalone/              # Standalone server (if configured)
├── static/                  # Static assets
│   ├── chunks/
│   │   ├── main-abc123.js
│   │   ├── DataUniverse-def456.js  # Lazy-loaded 3D
│   │   └── [other chunks]
│   └── css/
├── server/                  # Server functions
│   ├── app/
│   │   ├── page.js
│   │   ├── api/
│   │   └── [routes]
│   └── chunks/
└── cache/                   # Build cache
```

### Static Generation (SSG)

**Pages Pre-Rendered at Build Time:**
- `/` (Home)
- `/methodology` (Static content)

**Dynamic Pages (SSR or ISR):**
- `/calculator` (Interactive, can't pre-render)
- `/explore` (Depends on user data)
- `/manifests` (Could be SSG but currently SSR)
- `/manifests/[id]` (Dynamic route, SSR)

**Manifest Loading at Build Time:**
```typescript
// apps/carbon-acx-web/src/app/manifests/page.tsx
import { getManifests } from '@/lib/manifests'

export default async function ManifestsPage() {
  // This runs at BUILD TIME for SSG
  const manifests = await getManifests()

  return (
    <div>
      <h1>Manifests ({manifests.length})</h1>
      {manifests.map((m) => (
        <ManifestCard key={m.figure_id} manifest={m} />
      ))}
    </div>
  )
}
```

## 6. Runtime: User Visits /manifests

### Server Component Rendering

**Request Flow:**
1. User navigates to `/manifests`
2. Cloudflare Pages receives request
3. Next.js Server Component executes `getManifests()`
4. `lib/manifests.ts` reads from `dist/artifacts/`
5. Data serialized to JSON
6. HTML rendered with data
7. Response sent to browser

**No Client Fetch Required:** Data embedded in initial HTML

**Performance:**
- **Time to First Byte (TTFB):** ~50ms
- **Total Load Time:** ~500ms (including HTML parse)
- **No Loading State:** Data available immediately

### Filesystem Read

**Implementation:**
```typescript
// apps/carbon-acx-web/src/lib/manifests.ts
import { readFile } from 'fs/promises'
import path from 'path'

export async function getManifests(): Promise<ManifestListItem[]> {
  // Read root manifest
  const manifestPath = path.join(
    process.cwd(),
    'dist/artifacts/manifest.json'
  )
  const content = await readFile(manifestPath, 'utf-8')
  const rootManifest: RootManifest = JSON.parse(content)

  // Extract list
  return rootManifest.figures.map((fig) => ({
    figure_id: fig.figure_id,
    schema_version: fig.manifests[0]?.schema_version || '1.0.0',
    generated_at: fig.manifests[0]?.generated_at || '',
    hash_prefix: fig.manifests[0]?.hash_prefix || '',
  }))
}
```

**Error Handling:**
```typescript
try {
  const manifests = await getManifests()
} catch (error) {
  console.error('Failed to load manifests:', error)
  return {
    notFound: true  // Show 404 page
  }
}
```

## 7. Runtime: Client-Side Data Fetch

### TanStack Query Integration

**When Client Fetch is Used:**
- Dynamic updates (refetch on user action)
- Client-side navigation (SPA-style routing)
- Polling/real-time data

**Setup:**
```typescript
// apps/carbon-acx-web/src/app/manifests/client-view.tsx
'use client'

import { useQuery } from '@tanstack/react-query'

export function ManifestsClientView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['manifests'],
    queryFn: () => fetch('/api/manifests').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading manifests</div>

  return (
    <div>
      {data.manifests.map((m) => (
        <ManifestCard key={m.figure_id} manifest={m} />
      ))}
    </div>
  )
}
```

### API Route Handler

**Endpoint:** `GET /api/manifests`

```typescript
// apps/carbon-acx-web/src/app/api/manifests/route.ts
import { NextResponse } from 'next/server'
import { getManifests } from '@/lib/manifests'

export async function GET() {
  try {
    const manifests = await getManifests()

    return NextResponse.json(
      { manifests, count: manifests.length },
      {
        headers: {
          'Cache-Control': 'max-age=3600, s-maxage=3600',  // 1 hour
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load manifests' },
      { status: 500 }
    )
  }
}
```

### TanStack Query Cache

**Cache Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // Data fresh for 5 minutes
      gcTime: 10 * 60 * 1000,         // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,    // Don't refetch on tab switch
      retry: false,                    // Don't retry failures
    },
  },
})
```

**Benefits:**
- **Reduced API Calls:** Same data used across components
- **Automatic Revalidation:** Refetch after staleTime expires
- **Loading States:** Built-in `isLoading`, `isFetching` flags
- **Error Handling:** Automatic error boundaries

## 8. Runtime: 3D Visualization

### Lazy Loading Trigger

**User Action:** Clicks "See in 3D Universe"

**Code Execution:**
```typescript
// apps/carbon-acx-web/src/app/calculator/page.tsx
const DataUniverse = React.lazy(() =>
  import('@/components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
)

const [show3D, setShow3D] = useState(false)

// User clicks button
<button onClick={() => setShow3D(true)}>
  See in 3D Universe
</button>

// 3D component lazy-loads
{show3D && (
  <Suspense fallback={<div>Loading 3D...</div>}>
    <DataUniverse {...props} />
  </Suspense>
)}
```

**Network Request:**
- Browser fetches `DataUniverse-def456.js` chunk (887KB, 241KB gzip)
- Three.js library included in bundle
- React Three Fiber bindings included

### Data Transformation

**Input:** Array of Activity objects

```typescript
interface Activity {
  id: string
  name: string
  annualEmissions: number  // kg CO₂
  category?: string
}

const activities = [
  { id: 'TRAN.SCHOOLRUN.CAR.KM', name: 'School run—by car', annualEmissions: 360, category: 'transportation' },
  { id: 'FOOD.MEALS.HOME.MEAL', name: 'Meals—home cooked', annualEmissions: 1200, category: 'food' },
  // ... more activities
]
```

**Size Calculation (Logarithmic):**
```typescript
function getEmissionSize(emissions: number): number {
  const minSize = 0.5
  const scale = 0.3
  return minSize + Math.log10(Math.max(emissions, 1)) * scale
}

// Examples:
// 100 kg → 0.5 + log10(100) * 0.3 → 0.5 + 0.6 → 1.1
// 1000 kg → 0.5 + log10(1000) * 0.3 → 0.5 + 0.9 → 1.4
// 10000 kg → 0.5 + log10(10000) * 0.3 → 0.5 + 1.2 → 1.7
```

**Color Mapping:**
```typescript
function getEmissionColor(emissions: number): string {
  const tonnes = emissions / 1000

  if (tonnes < 1) return '#10b981'  // Green (low)
  if (tonnes < 5) return '#f59e0b'  // Amber (moderate)
  return '#ef4444'                   // Red (high)
}
```

### Orbital Position Calculation

**Formula:**
```typescript
const speed = 0.0005 + index * 0.0001
const phaseOffset = (index / totalActivities) * Math.PI * 2
const time = Date.now() * speed
const angle = time + phaseOffset

const orbitRadius = centralSize + 4 + index * 0.5

const x = Math.cos(angle) * orbitRadius
const z = Math.sin(angle) * orbitRadius
const y = Math.sin(time * 2) * 2  // Vertical wobble
```

**Animation Loop:**
```typescript
// In OrbitingActivity component
useFrame((state, delta) => {
  if (!meshRef.current) return

  const time = Date.now() * speed
  const angle = time + phaseOffset

  const x = Math.cos(angle) * orbitRadius
  const z = Math.sin(angle) * orbitRadius
  const y = Math.sin(time * 2) * 2

  meshRef.current.position.set(x, y, z)
})
```

### 3D Scene Creation

**Scene Graph:**
```
Canvas (root)
├── ambientLight (intensity: 0.4)
├── pointLight [10, 10, 10] (intensity: 1.5)
├── pointLight [-10, -10, -10] (intensity: 0.5)
├── Stars (count: 5000, radius: 100)
├── CentralSphere
│   ├── sphereGeometry (radius: computed, segments: 32x32)
│   ├── meshStandardMaterial (color, emissive)
│   └── Html (label overlay)
├── OrbitingActivity[] (for each activity)
│   ├── sphereGeometry (radius: computed, segments: 16x16)
│   ├── meshStandardMaterial (color, emissive, hover glow)
│   ├── ringGeometry (orbit path indicator)
│   └── Html (tooltip on hover)
├── OrbitControls (user interaction)
└── CameraAnimator (intro zoom)
```

## 9. Runtime: User Interaction

### Hover Detection (Raycasting)

**Process:**
1. User moves mouse over canvas
2. React Three Fiber converts mouse position to 3D ray
3. Raycaster checks intersection with sphere meshes
4. `onPointerOver` event fires on intersected mesh
5. Component updates hover state
6. Glow effect applied (1.2x scale outer sphere)
7. HTML tooltip shown above sphere

**Code:**
```typescript
// In OrbitingActivity component
const [localHovered, setLocalHovered] = useState(false)

<mesh
  onPointerOver={(e) => {
    e.stopPropagation?.()
    setLocalHovered(true)
    onHoverChange?.(true)
  }}
  onPointerOut={(e) => {
    e.stopPropagation?.()
    setLocalHovered(false)
    onHoverChange?.(false)
  }}
>
  <sphereGeometry args={[size, 16, 16]} />
  <meshStandardMaterial
    emissiveIntensity={localHovered ? 1.0 : 0.2}
  />
</mesh>

{/* Glow effect on hover */}
{localHovered && (
  <mesh>
    <sphereGeometry args={[size * 1.2, 16, 16]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={0.3}
      depthWrite={false}
    />
  </mesh>
)}
```

### Click Handling

**Process:**
1. User clicks sphere
2. Raycaster detects click event
3. `onClick` handler fires
4. `onActivityClick` callback passed to parent
5. Parent updates selection state
6. UI shows activity details panel

**Code:**
```typescript
// In DataUniverse component
<OrbitingActivity
  activity={activity}
  onClick={(activity) => {
    console.log('Activity clicked:', activity.name)
    onActivityClick?.(activity)
  }}
/>

// In parent page
<DataUniverse
  activities={activities}
  onActivityClick={(activity) => {
    setSelectedActivity(activity)
    setShowDetailPanel(true)
  }}
/>
```

## 10. Verification Workflow

### Request Manifest Detail

**Flow:**
1. User navigates to `/manifests/TRAN.SCHOOLRUN.CAR.KM`
2. Next.js calls `getManifest('TRAN.SCHOOLRUN.CAR.KM')`
3. `lib/manifests.ts` reads manifest file
4. Data returned to page
5. Page renders manifest details

### Byte Hash Verification

**User Action:** Clicks "Verify Integrity" button

**API Call:**
```typescript
const response = await fetch('/api/manifests/TRAN.SCHOOLRUN.CAR.KM/verify')
const result = await response.json()
// { verified: true, expected: "abc123...", actual: "abc123..." }
```

**Server-Side Verification:**
```typescript
// lib/manifests.ts
export async function verifyManifest(id: string): Promise<boolean> {
  // 1. Read manifest to get expected hash
  const manifest = await getManifest(id)
  if (!manifest) return false

  const expectedHash = manifest.figure_sha256

  // 2. Read figure file
  const figurePath = path.join(
    process.cwd(),
    'dist/artifacts',
    manifest.figure_path
  )
  const figureContent = await readFile(figurePath, 'utf-8')

  // 3. Compute actual hash
  const actualHash = crypto
    .createHash('sha256')
    .update(figureContent)
    .digest('hex')

  // 4. Compare
  return expectedHash === actualHash
}
```

**UI Update:**
```typescript
const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle')

const handleVerify = async () => {
  setVerificationStatus('verifying')
  const response = await fetch(`/api/manifests/${manifestId}/verify`)
  const result = await response.json()

  if (result.verified) {
    setVerificationStatus('verified')
  } else {
    setVerificationStatus('failed')
  }
}

// Render
{verificationStatus === 'verified' && <Badge color="green">✓ Verified</Badge>}
{verificationStatus === 'failed' && <Badge color="red">✗ Verification Failed</Badge>}
```

## Key Data Transformations

### CSV → Pydantic Model
- Raw text → Typed Python objects
- Validation at schema level

### Pydantic Model → Figure JSON
- Typed objects → JSON output
- Add calculated fields (emissions)

### Figure JSON → Manifest
- Data file → Provenance bundle
- Add byte hashes, citations

### Manifest → React Props
- Server file read → TypeScript interfaces
- JSON → React component props

### React Props → Three.js Scene
- Flat data → 3D positions
- Emissions → Sizes, colors, positions

## State Management Across Layers

### Build-Time State
- Python: In-memory DataFrames
- Validation: Pydantic model instances
- Output: Written to disk (artifacts)

### Runtime State (Server)
- Next.js: File reads from artifacts
- Memory: No persistent cache (stateless)
- Session: No server-side sessions

### Runtime State (Client)
- TanStack Query: Server state cache
- Zustand: Minimal client state
- Three.js: Scene graph state (meshes, materials)

## Performance Considerations

### Build Performance
- **CSV Parsing:** ~1s for all files
- **Validation:** ~2s for all rows
- **Calculations:** ~2s for all figures
- **Hashing:** ~1s for all files
- **Total:** ~5-10s for full build

### Runtime Performance
- **Manifest Load (Server):** <100ms per file
- **API Response:** <50ms (local artifacts)
- **3D Bundle Load:** ~500ms (241KB gzip over network)
- **3D Scene Init:** ~200ms (WebGL context + meshes)
- **Rendering:** 60fps (modern devices)

### Caching Strategy

**Build Artifacts:** Never cached (regenerated on each build)
**API Responses:** Cached 1 hour (`Cache-Control` header)
**TanStack Query:** Cached 5 min (client-side)
**Three.js Assets:** Cached indefinitely (code-split chunk with hash in filename)

## Error Handling

### Build-Time Errors
- **Validation Errors:** Fail fast, show row/field
- **Missing Files:** Exit with error message
- **Hash Collisions:** Unlikely (SHA256), but would error

### Runtime Errors
- **File Not Found:** Return 404 with error message
- **Parse Errors:** Return 500 with error details
- **WebGL Errors:** Show error boundary with fallback UI
- **Network Errors:** TanStack Query retries (configurable)

## Security Considerations

### Data Integrity
- **Byte Hashes:** Detect any tampering
- **Manifest Verification:** User can verify at any time
- **Immutable Artifacts:** Write-once, never modify

### Input Validation
- **CSV Schema:** Pydantic validates all inputs
- **API Inputs:** Next.js validates route params
- **No User Content:** Read-only application (no writes)

## Related Diagrams

- **Repo Structure** (`1-repo-structure.mermaid.md`) - Directory organization
- **Architecture Overview** (`2-architecture-overview.mermaid.md`) - High-level layers
- **Component Map** (`3-component-map.mermaid.md`) - React components
- **Entry Points** (`5-entry-points.mermaid.md`) - All interaction points
- **Deployment** (`6-deployment-infrastructure.mermaid.md`) - CI/CD pipeline

## References

- ACX084.md - 3D Universe Foundation Sprint
- ACX093.md - Strategic Rebuild Specification
- calc/derive.py:361-1779 - Derivation logic
- calc/schema.py - Pydantic models
- apps/carbon-acx-web/src/lib/manifests.ts - Server-side data access
