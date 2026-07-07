# Component Map Notes

**Version:** v0.0.4 (November 2025)
**Framework:** Next.js 15 + React 19 + App Router

## Component Architecture Overview

Carbon ACX uses **Next.js App Router** conventions with a clear separation between:

1. **Server Components** (default) - Data fetching, layout, static content
2. **Client Components** (`'use client'`) - Interactivity, browser APIs, 3D rendering
3. **API Routes** (`route.ts`) - Backend endpoints
4. **Server Libraries** (`lib/`) - Reusable server-side utilities

## App Router Structure

### Root Layout (`app/layout.tsx`)

**Type:** Server Component

**Responsibilities:**
- Root HTML structure (`<html>`, `<body>`)
- Global metadata (title, description, Open Graph)
- Global providers (QueryProvider for TanStack Query)
- Shared layout components (Header, Footer)
- Font loading (system fonts, no external CDN)

**Key Code:**
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <Header />
          {children}
          <Footer />
        </QueryProvider>
      </body>
    </html>
  )
}
```

**Providers Included:**
- **QueryProvider:** TanStack Query client for server state caching

### Page Components

#### Home Page (`app/page.tsx`)

**Type:** Server Component

**Purpose:** Landing page with navigation to main features

**Design:**
- Hero section with project description
- 3-card navigation grid:
  - **Calculator** → `/calculator` (Measure your footprint)
  - **Explore** → `/explore` (Visualize emissions)
  - **Methodology** → `/methodology` (Learn how it works)

#### Calculator Page (`app/calculator/page.tsx`)

**Type:** Mixed (Server Component with Client children)

**Purpose:** Interactive carbon footprint questionnaire

**Features:**
- Activity selection wizard (transportation, food, media, etc.)
- Real-time emission calculations
- Results display with comparisons (flights, trees, meals)
- 2D → 3D reveal button
- Lazy-loads DataUniverse for 3D preview

**State Management:**
- Local useState for wizard steps
- Form validation
- Activity accumulation

**Child Components:**
- ActivityCard (domain)
- CitationPanel (domain)
- MethodologyModal (domain)
- DataUniverse (viz, lazy-loaded)

#### Explore Page (`app/explore/page.tsx`)

**Type:** Server Component

**Purpose:** Hub for data exploration (2D/3D toggle)

**Features:**
- View mode selector (2D charts | 3D Universe)
- Launch buttons for each mode
- Activity count and total emissions display

#### 3D Universe Page (`app/explore/3d/page.tsx`)

**Type:** Mixed (Server Component with Client children)

**Purpose:** Full 3D visualization experience

**Features:**
- Full-screen DataUniverse component
- Activity selection sidebar
- Stats panel (activity count, total emissions)
- Back button to Explore hub

**Integration:**
```typescript
const DataUniverse = React.lazy(() =>
  import('@/components/viz/DataUniverse').then((m) => ({
    default: m.DataUniverse
  }))
)

<Suspense fallback={<Loading3D />}>
  <DataUniverse
    totalEmissions={total}
    activities={activities}
    enableIntroAnimation={true}
  />
</Suspense>
```

#### Manifests List Page (`app/manifests/page.tsx`)

**Type:** Server Component (async)

**Purpose:** Browse all generated manifests

**Data Fetching:**
```typescript
export default async function ManifestsPage() {
  const manifests = await getManifests()  // Server-side file read

  return (
    <div>
      <h1>Manifests ({manifests.length})</h1>
      <div className="grid">
        {manifests.map((m) => (
          <ManifestCard key={m.figure_id} manifest={m} />
        ))}
      </div>
    </div>
  )
}
```

**No Fetch Required:** Data loaded from `dist/artifacts/` at render time

#### Manifest Detail Page (`app/manifests/[id]/page.tsx`)

**Type:** Server Component (dynamic route)

**Purpose:** Display full manifest with provenance

**Features:**
- Schema version display
- Byte hash verification UI
- Citation list with source links
- References section
- Generated timestamp

**Data Fetching:**
```typescript
export default async function ManifestDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const manifest = await getManifest(params.id)

  if (!manifest) {
    notFound()
  }

  return <ManifestDetailView manifest={manifest} />
}
```

#### Methodology Page (`app/methodology/page.tsx`)

**Type:** Server Component

**Purpose:** Documentation of calculation methods

**Content:**
- Activity-based calculation formula
- Emission factor data sources
- Quality assurance process
- Limitations and assumptions
- Links to external standards (GHG Protocol, IPCC)

## API Routes

### Health Check (`api/health/route.ts`)

**Endpoint:** `GET /api/health`

**Purpose:** Monitoring and uptime checks

**Response:**
```json
{
  "status": "ok"
}
```

### List Manifests (`api/manifests/route.ts`)

**Endpoint:** `GET /api/manifests`

**Purpose:** Get all manifests for client-side queries

**Response:**
```json
{
  "manifests": [
    {
      "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
      "schema_version": "1.0.0",
      "generated_at": "2025-11-11T12:00:00Z",
      "hash_prefix": "a1b2c3d4"
    }
  ],
  "count": 42
}
```

**Caching:**
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'max-age=3600, s-maxage=3600'  // 1 hour
  }
})
```

### Get Manifest by ID (`api/manifests/[id]/route.ts`)

**Endpoint:** `GET /api/manifests/:id`

**Purpose:** Fetch single manifest detail

**Response:** Full `FigureManifest` object

**Error Handling:**
```typescript
if (!manifest) {
  return NextResponse.json(
    { error: 'Manifest not found' },
    { status: 404 }
  )
}
```

## Layout Components

### Header (`components/layout/Header.tsx`)

**Type:** Server Component (can be, but often Client for nav state)

**Features:**
- Logo and branding
- Navigation links (Home, Calculator, Explore, Manifests, Methodology)
- Mobile menu (hamburger icon)
- Active link highlighting

### Footer (`components/layout/Footer.tsx`)

**Type:** Server Component

**Features:**
- Copyright notice
- Link to GitHub repository
- Version information
- Social links (if applicable)

## Provider Components

### QueryProvider (`components/providers/QueryProvider.tsx`)

**Type:** Client Component (`'use client'`)

**Purpose:** Wrap app in TanStack Query client

**Configuration:**
```typescript
'use client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes (garbage collection)
      refetchOnWindowFocus: false,     // Don't refetch on tab switch
      retry: false,                     // Don't retry failures
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Why Client Component:** TanStack Query requires client-side state

## Visualization Components

### DataUniverse (`components/viz/DataUniverse.tsx`)

**Type:** Client Component (lazy-loaded)

**Lines:** 520

**Purpose:** 3D visualization of emissions data using Three.js

**Props Interface:**
```typescript
interface DataUniverseProps {
  totalEmissions: number              // Total annual kg CO₂
  activities: Activity[]              // Array of activities
  manifest?: ManifestInfo            // Optional manifest metadata
  onActivityClick?: (activity: Activity) => void
  enableIntroAnimation?: boolean      // Zoom in on load
  enableClickToFly?: boolean          // Click to fly to sphere
}

interface Activity {
  id: string
  name: string
  annualEmissions: number             // kg CO₂/year
  category?: string
  color?: string
  manifestId?: string
}
```

**Internal Structure:**

#### CentralSphere (Internal)

**Purpose:** Represent total emissions

**Features:**
- Logarithmic size scaling: `0.5 + log₁₀(emissions) × 0.3`
- Color-coded: Green (<1t), Amber (1-5t), Red (>5t)
- Pulsing animation: `scale(0.9 → 1.1)`
- Emissive material with 0.3-0.6 intensity
- Hover state with increased glow

**Material:**
```typescript
<meshStandardMaterial
  color={color}
  emissive={color}
  emissiveIntensity={hovered ? 0.6 : 0.3}
  metalness={0.5}
  roughness={0.4}
/>
```

#### OrbitingActivity (Internal)

**Purpose:** Represent individual activities

**Features:**
- Size based on activity emissions (logarithmic)
- Orbit radius: `centralSize + 4 + index × 0.5`
- Orbital motion: `speed = 0.0005 + index × 0.0001`
- Phase offset for even distribution: `(index / total) × 2π`
- Vertical wobble: `sin(time × 2) × 2`
- Hover glow: 1.2x scale outer sphere at 30% opacity
- Click handler for selection
- HTML label on hover (name, emissions, category)

**Animation Math:**
```typescript
const speed = 0.0005 + index * 0.0001
const phaseOffset = (index / totalActivities) * Math.PI * 2
const time = Date.now() * speed
const angle = time + phaseOffset

const x = Math.cos(angle) * orbitRadius
const z = Math.sin(angle) * orbitRadius
const y = Math.sin(time * 2) * 2
```

**Raycasting:**
```typescript
const handlePointerOver = (e: any) => {
  e.stopPropagation?.()
  setLocalHovered(true)
  onHoverChange?.(true)
}
```

#### CameraAnimator (Internal)

**Purpose:** Smooth camera animations

**Features:**
- Intro zoom: `[50, 50, 50]` → `[15, 15, 15]` over ~1.25s
- Easing: Cubic ease-in-out
- Frame-rate independent: Uses delta time
- Click-to-fly infrastructure (ready but not fully activated)

**Easing Function:**
```typescript
const t = progress < 0.5
  ? 2 * progress * progress
  : -1 + (4 - 2 * progress) * progress
```

#### Stars (from @react-three/drei)

**Purpose:** Starfield background

**Configuration:**
```typescript
<Stars
  radius={100}
  depth={50}
  count={5000}
  factor={4}
  saturation={0}
  fade
  speed={1}
/>
```

#### OrbitControls (from @react-three/drei)

**Purpose:** User camera control

**Features:**
- Drag to rotate camera
- Scroll to zoom
- Touch support (mobile)
- Damping for smooth motion

**Configuration:**
```typescript
<OrbitControls
  enableZoom={true}
  enablePan={true}
  enableRotate={true}
  dampingFactor={0.05}
  minDistance={5}
  maxDistance={100}
/>
```

### SSR Safety Pattern

**Problem:** Three.js requires browser APIs (WebGL, window)

**Solution:** Lazy loading with Suspense

**Implementation:**
```typescript
// In parent component (Calculator, Explore)
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
)

// Usage
<React.Suspense fallback={<LoadingUI />}>
  <DataUniverse {...props} />
</React.Suspense>
```

**Benefits:**
- Prevents SSR errors on Cloudflare Pages
- Code-splits 3D bundle (887KB → 241KB gzip)
- Only loads when needed
- Graceful loading state

## Domain Components

### ActivityCard

**Purpose:** Display activity details in cards

**Features:**
- Activity name and category
- Emissions value with units
- Color-coded badge
- Hover effects

### CitationPanel

**Purpose:** Show data source transparency

**Features:**
- Emission factor value
- Source reference (e.g., "SRC.ECCC.NIR.2025")
- Methodology description
- Link to source URL
- Last updated date
- Modal presentation (Radix UI Dialog)

### ActivityManagement

**Purpose:** Manage user's tracked activities

**Features:**
- 2D table view (Name | Quantity | Factor | Emissions | Actions)
- Inline quantity editing (click edit → input → save/cancel)
- Delete with confirmation dialog
- View citation button
- Color-coded emissions
- AnimatePresence for smooth add/remove

### MethodologyModal

**Purpose:** Explain calculation methodology

**Features:**
- Activity-based formula with example
- Data sources list (GHG Protocol, EPA, IPCC, DEFRA)
- Quality assurance process (4 steps)
- Limitations and assumptions
- Calculator vs. manual entry comparison
- Download link for full dataset

### ManifestCard

**Purpose:** Display manifest summary in grid

**Features:**
- Figure ID (e.g., "TRAN.SCHOOLRUN.CAR.KM")
- Generated date (human-readable)
- Hash prefix (first 8 chars)
- Citation count
- Link to detail page

### ManifestDetailView

**Purpose:** Full manifest provenance display

**Features:**
- Schema version badge
- Full SHA256 hash (monospace font)
- "Verify Integrity" button (verifies byte hash)
- Citation list with expandable details
- References section (source files)
- Timestamp with timezone

## Server-Side Libraries

### Manifests Library (`lib/manifests.ts`)

**Type:** Server-only utilities

**Purpose:** Read artifact files from filesystem

**Functions:**

#### `getRootManifest()`
```typescript
async function getRootManifest(): Promise<RootManifest>
```
- Reads `dist/artifacts/manifest.json`
- Returns root manifest (index of all figures)
- Throws if not found

#### `getManifests()`
```typescript
async function getManifests(): Promise<ManifestListItem[]>
```
- Reads root manifest
- Extracts list of all figure manifests
- Returns array for list display
- Used by: Manifests list page, API route

#### `getManifest(id)`
```typescript
async function getManifest(id: string): Promise<FigureManifest | null>
```
- Loads specific manifest by figure ID
- Returns full manifest object
- Returns null if not found
- Used by: Manifest detail page, API route

#### `verifyManifest(id)`
```typescript
async function verifyManifest(id: string): Promise<boolean>
```
- Reads manifest file
- Recomputes SHA256 hash
- Compares with stored hash
- Returns true if match, false otherwise
- Infrastructure ready, not yet in UI

### Utils Library (`lib/utils.ts`)

**Purpose:** General-purpose utilities

**Functions:**
- `cn()` - Merge Tailwind classes (clsx + tailwind-merge)
- `formatEmissions()` - Format kg to tonnes with units
- `formatDate()` - Human-readable dates
- `formatHash()` - Truncate hashes for display

## Type Definitions

### Manifest Types (`types/manifest.ts`)

**Interfaces:**

```typescript
interface RootManifest {
  dataset_manifest: { path: string; sha256: string }
  figures: FigureEntry[]
}

interface FigureEntry {
  figure_id: string
  manifests: FileRef[]
  figures: FileRef[]
  references: FileRef[]
}

interface FileRef {
  path: string
  sha256: string
}

interface FigureManifest {
  schema_version: string
  figure_id: string
  figure_method: string
  generated_at: string
  hash_prefix: string
  figure_path: string
  figure_sha256: string
  citation_keys: string[]
  references: {
    path: string
    sha256: string
    line_count: number
  }
  numeric_invariance?: {
    passed: boolean
    tolerance_percent: number
  }
}

interface Activity {
  id: string
  name: string
  annualEmissions: number
  category?: string
  color?: string
  manifestId?: string
}

interface ManifestInfo {
  figure_id: string
  schema_version: string
  generated_at: string
}
```

### React Three Fiber Types (`types/react-three-fiber.d.ts`)

**Purpose:** Extend JSX namespace for Three.js primitives

**Example:**
```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any
      sphereGeometry: any
      meshStandardMaterial: any
      // ... more Three.js types
    }
  }
}
```

**Note:** Temporary solution while waiting for R3F + React 19 type compatibility

## Component Boundaries

### Server vs. Client Boundary

**Server Components (default):**
- Pages in `app/`
- Layout components
- API routes
- `lib/` utilities

**Client Components (`'use client'`):**
- QueryProvider (TanStack Query)
- DataUniverse (Three.js)
- Form components (useState, event handlers)
- Interactive UI (hover, click, drag)

**Key Rule:** Server Components can import Client Components, but not vice versa

### Public APIs

**DataUniverse:**
```typescript
export { DataUniverse } from './components/viz/DataUniverse'
```

**Manifests Library:**
```typescript
export {
  getRootManifest,
  getManifests,
  getManifest,
  verifyManifest
} from './lib/manifests'
```

**Types:**
```typescript
export type {
  RootManifest,
  FigureManifest,
  Activity,
  ManifestInfo
} from './types/manifest'
```

## Shared Utilities

### Tailwind Class Merger (`cn`)

**Purpose:** Safely merge Tailwind classes with conflict resolution

**Usage:**
```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)}>
```

### Emission Formatters

**Purpose:** Consistent emission value display

**Example:**
```typescript
formatEmissions(3600)  // "3.60t CO₂/year"
formatEmissions(120)   // "120kg CO₂/year"
```

## Component Dependencies

### Internal Dependencies

**DataUniverse depends on:**
- Three.js (3D engine)
- React Three Fiber (React bindings)
- React Three Drei (OrbitControls, Stars, Html)
- Types: Activity, ManifestInfo

**Pages depend on:**
- Layout (Header, Footer)
- QueryProvider (TanStack Query)
- lib/manifests (data fetching)
- Domain components (ActivityCard, etc.)

### External Dependencies

**UI Components:**
- Radix UI (Dialog, Tabs, Tooltip, Dropdown)
- Lucide React (icons)
- Framer Motion (animations)

**State Management:**
- TanStack Query (server state)
- Zustand (client state, minimal)
- Next.js router (URL state)

## Module Boundaries

### Separation of Concerns

**By Layer:**
- `app/` - Routing and page orchestration
- `components/` - Reusable UI components
- `lib/` - Business logic and data access
- `types/` - Type definitions

**By Domain:**
- `components/layout/` - Layout components
- `components/viz/` - Visualization (3D)
- `components/domain/` - Domain-specific (activities, manifests)
- `components/providers/` - Context providers

## Common Workflows

### Adding a New Page

1. Create `app/my-page/page.tsx`
2. Add navigation link in Header
3. Create any domain components in `components/domain/`
4. Add route to sitemap/metadata

### Adding a New Visualization

1. Create component in `components/viz/`
2. Mark as Client Component (`'use client'`)
3. Lazy-load in parent page
4. Wrap in Suspense with fallback

### Adding a New API Route

1. Create `app/api/my-endpoint/route.ts`
2. Export HTTP method handlers (`GET`, `POST`, etc.)
3. Use `lib/` utilities for data access
4. Return `NextResponse.json()`

## Areas of Technical Debt

### Known Issues

1. **Type Conflicts:** React 19 + R3F incompatibilities (ignored with `ignoreBuildErrors: true`)
2. **Test Coverage:** No unit tests for components (Vitest configured but not written)
3. **E2E Tests:** Playwright configured but no tests implemented
4. **Storybook:** Not yet set up (would help with component development)

### Future Improvements

1. **Component Library:** Extract reusable components to Storybook
2. **Unit Tests:** Add tests for all domain components
3. **E2E Tests:** Cover critical user flows (calculator, 3D exploration)
4. **Accessibility:** Add ARIA labels, keyboard navigation
5. **Performance:** Implement virtual scrolling for long lists
6. **Internationalization:** Add i18n support for multiple languages

## Related Diagrams

- **Repo Structure** (`1-repo-structure.mermaid.md`) - Directory organization
- **Architecture Overview** (`2-architecture-overview.mermaid.md`) - High-level system design
- **Data Flow** (`4-data-flow.mermaid.md`) - How data moves through components
- **Entry Points** (`5-entry-points.mermaid.md`) - All ways to interact
- **Deployment** (`6-deployment-infrastructure.mermaid.md`) - CI/CD pipeline

## References

- Next.js 15 Documentation: https://nextjs.org/docs
- React 19 Documentation: https://react.dev/
- TanStack Query: https://tanstack.com/query/latest
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- Radix UI: https://www.radix-ui.com/
- ACX084.md - 3D Universe Foundation Sprint
- ACX093.md - Strategic Rebuild Specification
