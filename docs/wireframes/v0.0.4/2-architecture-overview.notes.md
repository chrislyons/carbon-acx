# Architecture Overview Notes

**Version:** v0.0.4 (November 2025)
**Status:** Next.js 15 rebuild complete (Phase 1), 3D Universe integrated

## High-Level System Design

Carbon ACX is built on a **6-layer architecture** designed for transparency, immutability, and provenance tracking.

```
Data Sources → Derivation → Artifacts → Frontend → Visualization → Edge
```

Each layer has a single responsibility and communicates through well-defined interfaces.

## Layer 1: Data Sources

### Canonical CSV Files

**Location:** `/data/*.csv`

**Purpose:** Single source of truth for all carbon accounting data.

**Key Files:**
- **`activities.csv`** - Activity catalog (transportation, food, media, etc.)
- **`emission_factors.csv`** - EF values with regional variation
- **grid_intensity.csv`** - Electricity carbon intensity (g CO₂/kWh by region/year)
- **`sources.csv`** - Citation metadata for provenance

**Data Governance:**
- CSV format chosen for human readability and version control
- No database required (data small enough to fit in memory)
- Changes tracked via Git (full audit trail)
- Schema enforced by Pydantic models (runtime validation)

### Schema Validation

**Location:** `calc/schema.py` (725 lines)

**Technology:** Pydantic v2.6+

**Models:**
```python
class Activity(BaseModel):
    activity_id: str              # TRAN.SCHOOLRUN.CAR.KM
    sector_id: str                # SECTOR.PROFESSIONAL_SERVICES
    layer_id: LayerId             # Enum: professional, industrial, military
    category: str                 # transportation
    name: str                     # Human-readable label
    default_unit: str             # km, kg, hour, kWh
    emission_factor_ref: str?     # EF.CAR.KM

class EmissionFactor(BaseModel):
    ef_id: str                    # EF.CAR.KM
    activity_id: str              # Links to activity
    value_g_per_unit: float       # 180 (g CO₂e/km)
    region: RegionCode            # CA-ON, US-CA, GB, etc.
    scope_boundary: str           # WTT+TTW, Scope 1+2+3
    gwp_horizon: str              # GWP100 (AR6)
    vintage_year: float           # 2023
    source_id: str                # SRC.ECCC.NIR.2025
```

**Validation Rules:**
- Activity IDs must follow `SECTOR.ACTIVITY.VARIANT.UNIT` pattern
- Region codes validate against ISO 3166
- Emission factor values must be positive
- Source IDs must reference existing sources
- Units must be in functional units registry

## Layer 2: Python Derivation Engine

### Derivation Pipeline

**Location:** `calc/derive.py` (1,926 lines)

**Purpose:** Transform CSV data into figures with full provenance.

**Key Steps:**

**1. Load & Validate CSV**
```python
# Load activities with schema validation
activities = pd.read_csv('data/activities.csv')
validated_activities = [Activity(**row) for _, row in activities.iterrows()]
```

**2. Match Activities ↔ Emission Factors**
```python
# Regional matching with fallback hierarchy
def match_emission_factor(activity_id: str, region: RegionCode) -> EmissionFactor:
    # 1. Try exact region match (CA-ON)
    # 2. Fallback to country (CA)
    # 3. Fallback to global average
    # 4. Raise error if no match found
```

**3. Calculate Emissions**
```python
# Activity-based calculation
annual_emissions_kg = quantity × emission_factor_g_per_unit / 1000

# Example: School run by car, 10km/day, 200 days/year
quantity = 10 * 200 = 2000 km
ef = 180 g CO₂e/km
emissions = 2000 × 180 / 1000 = 360 kg CO₂e/year
```

**4. Generate Figures**
```python
# Create JSON figure for each activity
figure = {
    "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
    "activity_name": "School run—by car, per kilometre",
    "quantity": 2000,
    "unit": "km",
    "emission_factor": 180,
    "annual_emissions_kg": 360,
    "category": "transportation",
    "citations": ["SRC.ECCC.NIR.2025"]
}
```

### Figure Generation

**Location:** `calc/figures.py` (727 lines)

**Output Types:**
- **Individual Activity Figures:** One JSON per activity
- **Layer Aggregations:** Roll-ups by layer (professional, industrial)
- **Comparative Analysis:** Cross-activity comparisons
- **Temporal Trends:** Year-over-year changes (if historical data)

### Manifest Creation

**Location:** `calc/figures_manifest.py` (183 lines)

**Purpose:** Bundle figures with byte-level provenance.

**Manifest Schema:**
```json
{
  "schema_version": "1.0.0",
  "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
  "figure_method": "activity-based",
  "generated_at": "2025-11-11T12:00:00Z",
  "hash_prefix": "a1b2c3d4",
  "figure_path": "figures/TRAN.SCHOOLRUN.CAR.KM-a1b2c3d4.json",
  "figure_sha256": "abc123...def789",
  "citation_keys": ["SRC.ECCC.NIR.2025"],
  "references": {
    "path": "references/references-xyz789.json",
    "sha256": "789xyz...abc456",
    "line_count": 50
  },
  "numeric_invariance": {
    "passed": true,
    "tolerance_percent": 0.01
  }
}
```

**Key Features:**
- **SHA256 Hashes:** Detect any byte-level changes
- **Schema Versioning:** Backward compatibility (semver)
- **Citation Lineage:** Full source tracking
- **Numeric Validation:** Ensure calculations don't drift over time

### Data Access Layer

**Location:** `calc/dal/` (multiple files)

**Supported Backends:**
- **CSV:** Default, simple file reading
- **DuckDB:** Fast analytical queries (for large datasets)
- **SQLite:** Persistent caching (optional)

**Design Pattern:**
```python
class DataStore(Protocol):
    def load_activities(self) -> pd.DataFrame: ...
    def load_emission_factors(self, region: RegionCode) -> pd.DataFrame: ...
    def load_grid_intensity(self, region: RegionCode, year: int) -> float: ...

# Implementations
csv_store = CSVDataStore(data_dir='data/')
duckdb_store = DuckDBDataStore(db_path='data.duckdb')
```

**Column Aliasing:**
- Handles backward compatibility for renamed columns
- Maps old column names to new schema

## Layer 3: Content-Addressed Artifacts

### Directory Structure

**Location:** `dist/artifacts/<hash>/`

**Hash Prefix:** First 8 characters of root manifest SHA256

**Contents:**
```
dist/artifacts/a1b2c3d4/
├── manifest.json                              # Root manifest (index)
├── manifests/
│   ├── TRAN.SCHOOLRUN.CAR.KM-manifest-abc.json
│   ├── FOOD.MEALS.HOME.MEAL-manifest-def.json
│   └── [more figure manifests]
├── figures/
│   ├── TRAN.SCHOOLRUN.CAR.KM-abc.json
│   ├── FOOD.MEALS.HOME.MEAL-def.json
│   └── [more figure data]
└── references/
    └── references-xyz.json
```

### Immutability Guarantees

**Principles:**
1. **Content Addressing:** Hash-prefixed directories
2. **Write-Once:** Artifacts never modified after generation
3. **Atomic Switching:** Deploy by changing root manifest reference
4. **Bit-for-Bit Reproducibility:** Same inputs → same outputs (byte-identical)

**Benefits:**
- **Trust:** Detect any tampering or corruption
- **Audit:** Full lineage from source to figure
- **Rollback:** Switch to previous artifact version instantly
- **Distribution:** Safe to cache indefinitely (content-addressed)

## Layer 4: Next.js 15 Frontend

### Architecture Decision (ACX093)

**Previous:** Vite + React 18 + React Router
**Current:** Next.js 15 + React 19 + App Router

**Rationale:**
- **Server Components:** Reduce client bundle size
- **Built-in SSR:** No manual Vite SSR configuration
- **API Routes:** Co-locate backend logic with frontend
- **File-Based Routing:** Convention over configuration
- **Cloudflare Pages Support:** First-class integration

### Server Components

**Location:** `apps/carbon-acx-web/src/app/`

**Default Behavior:** All components are Server Components unless marked `'use client'`

**Use Cases:**
- Data fetching (manifest loading)
- Layout components (Header, Footer)
- Static content rendering

**Example:**
```typescript
// apps/carbon-acx-web/src/app/manifests/page.tsx
export default async function ManifestsPage() {
  const manifests = await getManifests()  // Server-side file read

  return (
    <div>
      <h1>Manifests</h1>
      <ManifestList manifests={manifests} />
    </div>
  )
}
```

### Client Components

**Location:** `apps/carbon-acx-web/src/components/`

**Marked with:** `'use client'` directive

**Use Cases:**
- Interactive UI (forms, buttons, hover states)
- Browser APIs (window, localStorage)
- Third-party libraries requiring client (Three.js)

**Example:**
```typescript
'use client'

export function DataUniverse({ totalEmissions, activities }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  return isReady ? <Canvas>{/* Three.js scene */}</Canvas> : <Loading />
}
```

### API Routes

**Location:** `apps/carbon-acx-web/src/app/api/`

**Convention:** `route.ts` exports HTTP method handlers

**Example:**
```typescript
// apps/carbon-acx-web/src/app/api/manifests/route.ts
import { NextResponse } from 'next/server'
import { getManifests } from '@/lib/manifests'

export async function GET() {
  const manifests = await getManifests()

  return NextResponse.json(
    { manifests, count: manifests.length },
    {
      headers: {
        'Cache-Control': 'max-age=3600, s-maxage=3600'
      }
    }
  )
}
```

**Available Endpoints:**
- `GET /api/health` - Health check
- `GET /api/manifests` - List all manifests
- `GET /api/manifests/[id]` - Single manifest detail

### Manifest Library

**Location:** `apps/carbon-acx-web/src/lib/manifests.ts`

**Server-Side Helpers:**

```typescript
// Load root manifest (index of all figures)
export async function getRootManifest(): Promise<RootManifest>

// List all manifests
export async function getManifests(): Promise<ManifestListItem[]>

// Get single manifest by ID
export async function getManifest(id: string): Promise<FigureManifest | null>

// Verify manifest byte hash
export async function verifyManifest(id: string): Promise<boolean>
```

**Implementation:** Reads from `dist/artifacts/` directory (filesystem, no fetch)

## Layer 5: 3D Visualization

### Technology Stack

**Three.js Ecosystem:**
- **Three.js ^0.168.0** - Core 3D engine
- **React Three Fiber ^8.17.10** - Declarative React bindings
- **React Three Drei ^9.114.3** - Reusable 3D components (OrbitControls, Stars, Html)

### DataUniverse Component

**Location:** `apps/carbon-acx-web/src/components/viz/DataUniverse.tsx` (520 lines)

**Visual Design:**
- **Central Sphere:** Represents total annual emissions
  - Size: Logarithmic scale `0.5 + log₁₀(emissions) × 0.3`
  - Color: Based on total (green <1t, amber 1-5t, red >5t)
  - Animation: Pulsing scale (0.9 → 1.1)
- **Orbiting Spheres:** Individual activities
  - Orbit radius: `centralSize + 4 + index × 0.5`
  - Speed: Staggered `0.0005 + index × 0.0001`
  - Phase offset: Even distribution around orbit
  - Vertical wobble: `sin(time × 2) × 2`
- **Starfield:** 5000 particles at radius 100
- **Lighting:** Ambient (0.4) + point lights for depth

**Orbital Animation Math:**
```typescript
const speed = 0.0005 + index * 0.0001
const phaseOffset = (index / totalActivities) * Math.PI * 2
const time = Date.now() * speed
const angle = time + phaseOffset

const x = Math.cos(angle) * orbitRadius
const z = Math.sin(angle) * orbitRadius
const y = Math.sin(time * 2) * 2  // Vertical wobble
```

**Camera Choreography:**
- **Intro Zoom:** Camera flies from `[50, 50, 50]` → `[15, 15, 15]` over 1.25s
- **Easing:** Cubic ease-in-out for natural motion
- **User Control:** OrbitControls (drag rotate, scroll zoom)

**Interactions:**
- **Hover:** Glow effect (1.2x scale outer sphere at 30% opacity)
- **Click:** Select activity (callback to parent component)
- **Tooltip:** HTML overlay with activity details

**SSR Safety:**
```typescript
'use client'  // Client-side only

const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((m) => ({
    default: m.DataUniverse
  }))
)

<React.Suspense fallback={<div>Loading 3D Universe...</div>}>
  <DataUniverse {...props} />
</React.Suspense>
```

**Bundle Size:** 887KB (241KB gzip), only loads when 3D view accessed

## Layer 6: Edge Deployment

### Cloudflare Pages

**Target:** `carbon-acx.pages.dev`

**Configuration:** `apps/carbon-acx-web/wrangler.toml`

**Features:**
- **Global CDN:** 200+ edge locations
- **Automatic SSL:** HTTPS by default
- **Atomic Deployments:** Git branch → preview URL
- **SSR Support:** Cloudflare Workers runtime for Server Components

**Build Command:**
```bash
pnpm --filter carbon-acx-web run build
```

**Output Directory:** `.next/`

### Cloudflare Functions

**Location:** `functions/carbon-acx/`

**Convention:** File-based routing (e.g., `functions/api/hello.ts` → `/api/hello`)

**Current Usage:** Minimal (Next.js API routes preferred)

**Future Use Cases:**
- Webhook receivers
- Background jobs (cron triggers)
- Custom middleware

### Cloudflare Workers

**Location:** `workers/`

**Status:** Configured but not yet deployed

**Planned Use Cases:**
- API proxying (rate limiting, caching)
- Data transformation (CSV parsing at edge)
- Custom authentication middleware

## State Management Architecture

### Three-Tier Approach

**1. Server State (TanStack Query)**

**Purpose:** Cache API responses, manifest data

**Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      retry: false,                   // Don't retry failures
    },
  },
})
```

**Usage:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['manifests'],
  queryFn: () => fetch('/api/manifests').then(r => r.json())
})
```

**2. Client State (Zustand)**

**Purpose:** Minimal local component state

**Current Usage:** Component-level selections (hover, active tabs)

**Future:** User preferences (theme, units, region)

**3. URL State (Next.js Search Params)**

**Purpose:** Shareable, bookmarkable state

**Use Cases:**
- Filters (region, category, date range)
- Navigation (selected activity, view mode)
- Search queries

**Example:**
```typescript
const searchParams = useSearchParams()
const region = searchParams.get('region') || 'CA-ON'
```

## External Services Integration

### Emission Factor Sources

**Referenced, not fetched at runtime:**

- **GHG Protocol** - Corporate accounting standards
- **EPA** - US emission factors
- **IPCC AR6** - GWP horizons (100-year)
- **DEFRA** - UK government factors

**Integration:** Citation keys link to `sources.csv` → manifest → UI display

## Design Patterns in Use

### 1. Manifest-First Architecture

**Every calculation result is paired with:**
- SHA256 byte hash (immutability)
- Schema version (backward compatibility)
- Citation keys (provenance)
- Generated timestamp (auditability)

### 2. Content Addressing

**Hash-prefixed artifacts enable:**
- Bit-for-bit reproducibility
- Atomic deployments (switch by hash)
- Integrity verification
- Safe indefinite caching

### 3. Progressive Enhancement

**2D → 3D User Journey:**
1. Calculator results (2D numbers, comparisons)
2. "See in 3D Universe" button
3. 3D visualization with intro animation
4. Full exploration mode (drag, zoom, hover)

**Fallback Strategy:**
- WebGL not supported → Show 2D fallback
- Three.js load failure → Error boundary with message
- Slow device → Reduced quality (LOD)

### 4. Server-First Rendering

**Next.js Server Components:**
- Default to server rendering
- Client components only when needed
- Reduces JavaScript bundle size
- Improves initial page load

### 5. Lazy Loading for Heavy Assets

**Three.js (887KB) lazy loaded:**
```typescript
const DataUniverse = React.lazy(() => import('./DataUniverse'))
```

**Benefits:**
- Doesn't block initial page load
- Only loads when 3D view accessed
- Prevents SSR errors (Three.js requires browser APIs)

## Performance Characteristics

### Build Performance

- **Python Derivation:** 5-10 seconds
- **Next.js Build:** 30-60 seconds
- **Full CI Pipeline:** 2-3 minutes

### Runtime Performance

- **3D Rendering:** 60fps (modern devices), 30-40fps (older laptops)
- **Manifest Loading:** <100ms (local file read)
- **API Response Time:** <50ms (static artifacts)
- **Initial Page Load:** ~1.5s (without 3D), ~2.5s (with 3D)

### Bundle Sizes

- **Main Bundle:** 1,120KB (372KB gzip)
- **DataUniverse (3D):** 887KB (241KB gzip) - lazy loaded
- **Total Initial:** ~700KB gzip (without 3D)

## Security Considerations

### Current State

**No Authentication:** Public read-only app

**Input Validation:**
- CSV schema validation (Pydantic)
- API input sanitization (Next.js)
- No user-generated content

**Future Considerations:**
- User accounts (calculator history)
- API rate limiting (Cloudflare Workers)
- Content Security Policy headers

## Scalability Considerations

### Current Limits

**Data Volume:**
- Activities: ~500 rows
- Emission Factors: ~2,000 rows
- CSV files: <5MB total
- Artifacts: ~50MB after build

**User Concurrency:**
- Cloudflare Pages: Unlimited (static assets)
- API Routes: ~1,000 req/s (Cloudflare Workers limit)

**Growth Plan:**
- Current: Single CSV files (fits in memory)
- 10x growth: DuckDB backend
- 100x growth: PostgreSQL + read replicas

## Technical Debt

### Known Issues

1. **Type Conflicts:** React 19 + R3F incompatibilities (temporarily ignored)
2. **Test Coverage:** Minimal E2E tests (Playwright configured but not written)
3. **Legacy Site:** Vite app still exists (scheduled for removal)
4. **Manifest Verification:** Infrastructure ready but not in UI

### Future Improvements

1. **Performance:**
   - Level-of-detail (LOD) for 3D (reduce segments on distant spheres)
   - Web Workers for orbital calculations
   - Instancing for many identical spheres

2. **Features:**
   - VR mode (WebXR support)
   - Time-based animations (show emissions over time)
   - Export 3D scene (GLTF export)
   - Screenshot/video capture

3. **Infrastructure:**
   - E2E test coverage (Playwright)
   - Component Storybook
   - Performance monitoring (Web Vitals)

## Related Diagrams

- **Repo Structure** (`1-repo-structure.mermaid.md`) - Directory organization
- **Component Map** (`3-component-map.mermaid.md`) - React component relationships
- **Data Flow** (`4-data-flow.mermaid.md`) - How data moves through layers
- **Entry Points** (`5-entry-points.mermaid.md`) - All ways to interact
- **Deployment** (`6-deployment-infrastructure.mermaid.md`) - CI/CD pipeline

## References

- ACX084.md - 3D Universe Foundation Sprint
- ACX093.md - Strategic Rebuild Specification
- ACX094.md - DataUniverse Port to Next.js 15
- CLAUDE.md - Development guide (v3.0)
