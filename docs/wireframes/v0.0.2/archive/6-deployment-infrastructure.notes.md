# Deployment Infrastructure - Architectural Notes

## Overview

Carbon ACX uses a **modern JAMstack architecture** with **Cloudflare Pages** (static hosting), **Cloudflare Workers** (edge compute), and **Cloudflare Pages Functions** (artifact proxy). Build process runs locally or in GitHub Actions, produces immutable artifacts with content-addressable hashing, and deploys globally to 150+ edge locations.

## Local Build Process

### Step-by-Step Build Flow

**Goal**: Transform CSV data → validated artifacts → deployable web bundle

**Step 1: Data Derivation** (`make build`)

```bash
make build
# Expands to:
ACX_GENERATED_AT=1970-01-01T00:00:00+00:00 \
ACX_DATA_BACKEND=csv \
ACX_OUTPUT_ROOT=dist/artifacts \
PYTHONPATH=. poetry run python -m calc.derive --output-root dist/artifacts
```

**Process**:
1. **Load CSVs** from `data/` directory (activities, emission_factors, profiles, etc.)
2. **Validate Schemas** using Pydantic models (type checking, required fields, foreign keys)
3. **Compute Emissions**:
   ```python
   annual_emissions = quantity_per_week * 52 * emission_factor_g_per_unit
   # Or for grid-indexed:
   annual_emissions = quantity_per_week * 52 * grid_intensity * kwh_per_unit
   ```
4. **Generate Figures** (stacked, bubble, sankey, feedback graphs)
5. **Collect Citations** (IEEE-style references, source IDs)
6. **Hash Manifest**:
   ```python
   manifest_payload = {
       "generated_at": "2025-10-27T12:00:00Z",
       "regions": ["US-CA", "CA-ON"],
       "sources": ["EPA2024", "GHG2023"],
       "layers": ["professional", "online"]
   }
   build_hash = hashlib.sha256(json.dumps({
       "manifest": manifest_payload,
       "rows": normalised_rows
   })).hexdigest()[:12]  # → "a1b2c3d4e5f6"
   ```
7. **Write Outputs**:
   ```
   dist/artifacts/a1b2c3d4e5f6/
   ├── calc/outputs/
   │   ├── export_view.csv       # All emissions data
   │   ├── export_view.json      # JSON format
   │   ├── manifest.json         # Build metadata
   │   ├── intensity_matrix.csv  # g CO₂ per functional unit
   │   └── figures/
   │       ├── stacked.json      # Stacked bar chart data
   │       ├── bubble.json       # Bubble chart data
   │       ├── sankey.json       # Sankey diagram data
   │       └── feedback.json     # Feedback loop graph
   └── manifests/
       ├── stacked.manifest.json
       ├── bubble.manifest.json
       └── ...
   ```
8. **Update Pointer**:
   ```json
   // dist/artifacts/latest-build.json
   {
     "build_hash": "a1b2c3d4e5f6",
     "artifact_dir": "dist/artifacts/a1b2c3d4e5f6"
   }
   ```

**Key Insight**: Same inputs → same hash → reproducible builds → immutable artifacts

**Step 2: Web Application Build** (`make package`)

```bash
make package
# Steps:
# 1. make build (if not already done)
# 2. pnpm run build:web
# 3. Copy artifacts + web dist → dist/site/
# 4. Add Cloudflare Pages config (_headers, _redirects)
```

**Web Build Details** (`pnpm run build:web`):

```bash
# Inside apps/carbon-acx-web/
npm run build
# Runs: vite build
```

**Vite Build Process**:
1. **Entry**: `index.html` → `src/main.tsx`
2. **Tree Shaking**: Remove unused code (imports, functions)
3. **Code Splitting**:
   - Main bundle: `index-abc123.js` (React, Router, Zustand, UI components)
   - DataUniverse chunk: `DataUniverse-xyz789.js` (Three.js, R3F, lazy-loaded)
4. **Minification**: Terser (JS), CSS minifier
5. **Hashing**: Content-based hashes in filenames (cache-busting)
6. **Source Maps**: `index-abc123.js.map` (debugging)
7. **CSS Extraction**: `index-xyz789.css` (separate file)
8. **Asset Optimization**: Images, fonts (copy to `dist/assets/`)

**Output** (`apps/carbon-acx-web/dist/`):
```
dist/
├── index.html                      # 2KB, entry point
├── assets/
│   ├── index-abc123.js            # 1.1MB (372KB gzip) - main bundle
│   ├── DataUniverse-xyz789.js     # 887KB (241KB gzip) - lazy chunk
│   ├── index-xyz789.css           # 50KB (12KB gzip)
│   └── ...
└── vite.svg
```

**Step 3: Package for Deployment** (`scripts/prepare_pages_bundle.py`)

```bash
PYTHONPATH=. poetry run python -m scripts.prepare_pages_bundle \
  --site dist/site \
  --artifacts dist/packaged-artifacts
```

**Process**:
1. Copy `apps/carbon-acx-web/dist/*` → `dist/site/`
2. Copy `dist/artifacts/<hash>/*` → `dist/site/artifacts/<hash>/`
3. Create `_headers` (cache control, CORS):
   ```
   /assets/*
     Cache-Control: public, max-age=31536000, immutable

   /artifacts/*
     Cache-Control: public, max-age=31536000, immutable

   /*.html
     Cache-Control: no-cache
   ```
4. Create `_redirects` (SPA fallback):
   ```
   /*    /index.html    200
   ```

**Final Structure** (`dist/site/`):
```
dist/site/
├── index.html
├── assets/
│   ├── index-abc123.js
│   ├── DataUniverse-xyz789.js
│   └── index-xyz789.css
├── artifacts/
│   └── a1b2c3d4e5f6/
│       └── calc/outputs/
│           ├── manifest.json
│           └── figures/
│               ├── stacked.json
│               └── ...
├── _headers
└── _redirects
```

**Ready for deployment to Cloudflare Pages** ✅

## GitHub Actions CI/CD

### Workflow File

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Poetry
        run: |
          curl -sSL https://install.python-poetry.org | python3 -
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      - name: Setup Node.js 20.19.4
        uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'

      - name: Install pnpm
        run: npm install -g pnpm@10.5.2

      - name: Install Python dependencies
        run: poetry install --with dev --no-root

      - name: Install JavaScript dependencies
        run: pnpm install

      - name: Run linting and tests
        run: make validate

      - name: Build artifacts
        run: make build

      - name: Package for deployment
        run: make package

      - name: Upload to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: carbon-acx
          directory: dist/site
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### CI Steps Explained

**1. Checkout Code** (`actions/checkout@v4`)
- Clones repo to GitHub Actions runner
- Checks out commit SHA that triggered workflow

**2. Setup Python** (`actions/setup-python@v5`)
- Installs Python 3.11
- Sets up pip cache for faster installs

**3. Install Poetry**
- Downloads Poetry installer
- Adds to PATH for subsequent steps

**4. Setup Node.js** (`actions/setup-node@v4`)
- Installs Node.js 20.19.4
- Sets up npm cache

**5. Install pnpm**
- Global install: `npm install -g pnpm@10.5.2`
- Enables pnpm workspace commands

**6. Install Dependencies**
- Python: `poetry install --with dev --no-root`
- JavaScript: `pnpm install` (all workspace packages)

**7. Run Linting and Tests** (`make validate`)
- Ruff: Check Python code style
- Black: Check Python formatting
- pytest: Run Python tests
- ESLint/TypeScript: Check JS/TS (via pnpm scripts)

**8. Build Artifacts** (`make build`)
- Run derivation pipeline
- Generate artifacts with hash
- Create `latest-build.json`

**9. Package** (`make package`)
- Build web app (Vite)
- Copy artifacts to `dist/site/`
- Add `_headers`, `_redirects`

**10. Upload to Cloudflare Pages**
- Uses `cloudflare/pages-action@v1`
- Uploads `dist/site/` directory
- Creates deployment preview (PRs) or production (main)

### Build Time

**Typical CI Duration**: 3-5 minutes

**Breakdown**:
- Checkout + setup: 30s
- Install dependencies: 60s (cached), 180s (cold)
- Linting + tests: 30s
- Build artifacts: 20s
- Build web app: 15s
- Upload to Pages: 30s

**Optimization**: Cache `node_modules` and `.poetry/cache` for faster subsequent builds

## Cloudflare Pages Deployment

### Deployment Flow

**Trigger**: GitHub Actions uploads `dist/site/` via API

**Cloudflare Pages Process**:
1. **Receive Upload**: ZIP file with all static assets
2. **Extract Files**: Unzip to temporary storage
3. **Detect Functions**: Find `functions/**/*.ts` (Pages Functions)
4. **Build Functions**: Compile TypeScript → JavaScript (esbuild)
5. **Deploy to Edge**: Distribute to 150+ locations globally
6. **Activate Deployment**: Switch DNS to new version (atomic swap)
7. **Purge Cache**: Invalidate old HTML (keep hashed assets cached)

**Deployment URL**:
- **Production** (main branch): `https://carbon-acx.pages.dev`
- **Preview** (PR): `https://abc123.carbon-acx.pages.dev`

### Static Asset Serving

**Path**: `/` → `index.html`

**Request Flow**:
1. Browser: `GET https://carbon-acx.pages.dev/`
2. Cloudflare Edge: Check cache for `index.html`
   - **Cache**: `no-cache` → Always revalidate with origin
   - **ETag**: `W/"abc123"` → If-None-Match check
3. Origin (Pages): Return `index.html` (2KB) or 304 Not Modified
4. Edge: Forward to browser
5. Browser: Parse HTML, request `/assets/index-abc123.js`
6. Edge: Check cache for hashed asset
   - **Cache Hit**: Serve from edge (< 10ms)
   - **Cache Miss**: Fetch from origin, cache for 1 year
7. Browser: Execute JavaScript, render React app

### Asset Hashing Strategy

**Problem**: Browser caching vs fresh deploys

**Solution**: Content-based hashing in filenames

**Example**:
```
Old deployment: /assets/index-abc123.js
New deployment: /assets/index-xyz789.js
```

**Result**: New hash = new URL = cache miss = fresh fetch. Old hash = old URL = still cached (no wasted bandwidth).

**Cache Headers**:
- `Cache-Control: public, max-age=31536000, immutable`
- `public`: Cacheable by CDN and browsers
- `max-age=31536000`: Cache for 1 year (365 days)
- `immutable`: Content will never change at this URL

### Pages Functions (Artifact Proxy)

**File**: `functions/carbon-acx/[[path]].ts`

**Purpose**: Proxy artifact requests to R2 bucket or bundled files

**Example Request**:
```
GET /artifacts/a1b2c3d4e5f6/manifest.json
```

**Handler**:
```typescript
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Parse path
  const path = url.pathname.replace('/artifacts/', '');
  const [hash, ...rest] = path.split('/');
  const artifactPath = rest.join('/');

  // Fetch from bundled assets or R2
  let content;
  if (env.ARTIFACTS_BUCKET) {
    // Production: R2 bucket
    const object = await env.ARTIFACTS_BUCKET.get(`${hash}/${artifactPath}`);
    if (!object) return new Response('Not Found', { status: 404 });
    content = await object.text();
  } else {
    // Fallback: Bundled in deployment
    try {
      const response = await fetch(`https://carbon-acx.pages.dev/artifacts/${hash}/${artifactPath}`);
      content = await response.text();
    } catch (err) {
      return new Response('Not Found', { status: 404 });
    }
  }

  // Return with immutable caching
  return new Response(content, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

**Benefits**:
- **Flexibility**: Can serve from bundle (small deploys) or R2 (large datasets)
- **Immutability**: Hash in path = safe to cache forever
- **Edge Execution**: Sub-10ms response time globally

## Cloudflare Workers Deployment

### Worker Code

**File**: `workers/index.ts`

**Endpoints**:
- `POST /api/compute`: On-demand emission calculations
- `GET /api/health`: Health check

**Deployment Command**:
```bash
wrangler deploy
```

**Process**:
1. **Bundle**: Compile TypeScript → JavaScript (esbuild)
2. **Upload**: Send bundle to Cloudflare API
3. **Deploy**: Activate on edge network (150+ locations)
4. **Bind Resources**: Attach KV, R2, D1 bindings (if configured)

**Runtime Environment**:
- **V8 Isolates**: Lightweight, fast startup (< 5ms)
- **Edge Execution**: Runs globally at user's nearest location
- **Limits**: 10ms CPU time/request (free tier), 50ms (paid)

### Environment Variables

**File**: `.dev.vars` (local) or Cloudflare dashboard (production)

**Example**:
```env
API_KEY=secret_123
SENTRY_DSN=https://...
```

**Access in Worker**:
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const apiKey = env.API_KEY;
    // ...
  }
};
```

### Bindings (KV, R2, D1)

**KV (Key-Value Store)**:
- Global, eventually consistent
- Use for: Configuration, feature flags

**R2 (Object Storage)**:
- S3-compatible, no egress fees
- Use for: Large artifacts (> 25MB), media files

**D1 (SQL Database)**:
- SQLite at the edge
- Use for: Queryable datasets, relational data

**Configuration** (`wrangler.toml`):
```toml
[[kv_namespaces]]
binding = "CONFIG"
id = "abc123"

[[r2_buckets]]
binding = "ARTIFACTS_BUCKET"
bucket_name = "carbon-acx-artifacts"
```

## CDN & Caching

### Cloudflare Edge Network

**Scale**: 150+ data centers globally

**Tiered Cache**:
1. **Browser Cache**: User's device (controlled by Cache-Control)
2. **Edge Cache (Tier 1)**: Closest location to user (sub-10ms)
3. **Edge Cache (Tier 2)**: Regional hub (10-50ms)
4. **Origin**: Cloudflare Pages/Workers (50-200ms)

**Cache Hit Ratio**: Typically 95%+ for static assets (hashed filenames)

### Cache Invalidation

**Problem**: How to update cached content?

**Solutions**:

**1. Hashed Assets** (Automatic):
- New build → new hash → new URL → cache miss
- Example: `index-abc123.js` → `index-xyz789.js`

**2. HTML (Manual Revalidation)**:
- `Cache-Control: no-cache`
- Browser must revalidate with origin (If-None-Match, ETag)
- If content unchanged → 304 Not Modified (fast)

**3. API Purge** (Rare):
```bash
# Purge specific file
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {token}" \
  -d '{"files":["https://carbon-acx.pages.dev/index.html"]}'
```

### Performance Metrics

**Cold Cache** (first visit):
- HTML: 200ms (origin)
- JS bundle: 300ms (download 372KB gzip)
- DataUniverse chunk: 200ms (lazy load 241KB gzip)
- Artifacts: 100ms (Pages Function → R2)
- **Total Time to Interactive**: ~800ms

**Warm Cache** (subsequent visits):
- HTML: 50ms (ETag revalidation)
- JS bundle: < 10ms (edge cache)
- DataUniverse chunk: < 10ms (edge cache)
- Artifacts: < 10ms (edge cache)
- **Total Time to Interactive**: ~100ms

## SSR Safety & Environment

### The SSR Problem

**Issue**: Three.js tries to access `window`, `document` during server-side rendering

**Error**:
```
ReferenceError: window is not defined
  at node_modules/three/build/three.module.js:1234
```

**Cause**: Cloudflare Pages pre-renders HTML on server (no browser globals)

### Solution: Lazy Loading

**Pattern**:
```typescript
// ❌ Wrong (causes SSR error)
import { DataUniverse } from '../components/viz/DataUniverse';

// ✅ Correct (SSR-safe)
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

function ExplorePage() {
  return (
    <React.Suspense
      fallback={<div>Loading 3D Universe...</div>}
    >
      <DataUniverse totalEmissions={5200} activities={activities} />
    </React.Suspense>
  );
}
```

**How It Works**:
1. **Server-side**: `React.lazy()` registers async import, renders `<Suspense fallback>`
2. **Client-side**: Browser executes `import()`, downloads DataUniverse chunk
3. **Mount**: Three.js initializes with browser globals available
4. **Render**: 3D scene displays

**Benefits**:
- No SSR errors
- Code-split chunk (smaller main bundle)
- Faster initial page load

### Additional SSR Guards

**Client-Only Check**:
```typescript
const [isClient, setIsClient] = React.useState(false);

React.useEffect(() => {
  setIsClient(typeof window !== 'undefined');
}, []);

if (!isClient) {
  return <LoadingSpinner />;
}

return <DataUniverse />;
```

**Error Boundary**:
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>3D Visualization Unavailable (WebGL not supported)</div>;
    }
    return this.props.children;
  }
}

<ErrorBoundary>
  <DataUniverse />
</ErrorBoundary>
```

## Monitoring & Analytics

### Cloudflare Analytics

**Dashboard**: `dash.cloudflare.com` → Pages → carbon-acx → Analytics

**Metrics**:
- **Requests**: Total requests, requests/second
- **Bandwidth**: Data transferred (in/out)
- **Cache Hit Ratio**: % requests served from cache
- **Response Time**: P50, P95, P99 latencies
- **Status Codes**: 2xx, 3xx, 4xx, 5xx distribution

**Example Query**:
```
Cache Hit Ratio = (Cache Hits / Total Requests) * 100%
Target: > 95% for static assets
```

### Real-Time Logs

**Wrangler Tail** (Worker/Function logs):
```bash
# Tail Worker logs
wrangler tail

# Tail Pages Function logs
wrangler pages deployment tail
```

**Console Output**:
```json
{
  "timestamp": "2025-10-27T12:34:56Z",
  "level": "info",
  "message": "Artifact fetched: a1b2c3d4e5f6/manifest.json",
  "metadata": {
    "path": "/artifacts/a1b2c3d4e5f6/manifest.json",
    "cacheStatus": "HIT",
    "responseTime": "8ms"
  }
}
```

### Error Tracking (Optional: Sentry)

**Client-Side Errors**:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://...@sentry.io/...',
  environment: 'production',
  tracesSampleRate: 0.1, // 10% of transactions
});

// Wrap app
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <CanvasApp />
</Sentry.ErrorBoundary>
```

**Benefits**:
- Real-time error notifications
- Stack traces with source maps
- User impact analysis (affected users, sessions)
- Performance monitoring (slow renders, API calls)

## Production Request Flow

### Example: User Loads Homepage

**Step-by-Step**:

1. **User**: Types `https://carbon-acx.pages.dev` in browser, presses Enter
2. **DNS Resolution**: Browser queries DNS for `carbon-acx.pages.dev`
   - Response: Cloudflare Anycast IP (closest edge location)
3. **TCP Handshake**: Browser connects to edge server
4. **HTTP Request**: `GET / HTTP/2`
5. **Edge Router**: Checks cache for `/index.html`
   - Cache-Control: `no-cache` → Revalidate with origin
   - ETag: `W/"abc123"` → Send `If-None-Match: "abc123"`
6. **Origin Check**: Pages origin compares ETag
   - Match → 304 Not Modified (no body, fast)
   - Mismatch → 200 OK with new HTML
7. **Edge Response**: Forward to browser (50ms total)
8. **Browser**: Parse HTML, find `<script src="/assets/index-abc123.js">`
9. **Asset Request**: `GET /assets/index-abc123.js`
10. **Edge Cache Hit**: Hashed asset → immutable → cached for 1 year
    - Response: < 10ms from edge cache
11. **Browser**: Download, parse, execute JavaScript
12. **React Init**: `ReactDOM.createRoot().render(<CanvasApp />)`
13. **Router Match**: URL `/` → `<WelcomePage />`
14. **Render**: WelcomePage displays
15. **Data Fetch**: `useQuery('artifacts')` → `GET /artifacts/a1b2c3d4e5f6/manifest.json`
16. **Pages Function**: Proxy request to R2 or bundled file
17. **Artifact Response**: JSON with emissions data (< 10ms from edge cache)
18. **UI Update**: Populate layer selector, citation data
19. **User Interaction**: Click "Get Started" → Navigate to `/calculator`
20. **Router Transition**: Unmount WelcomePage, mount CalculatorPage

**Total Time**: ~500ms (cold cache), ~100ms (warm cache)

## Common Workflows

### Deploying a New Version

**Local**:
```bash
# 1. Make changes to code
# 2. Build artifacts
make build

# 3. Package for deployment
make package

# 4. Test locally (optional)
cd dist/site && python -m http.server 8000

# 5. Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin main
```

**GitHub Actions**: Automatically builds and deploys to production

**Result**: New version live at `https://carbon-acx.pages.dev` in ~5 minutes

### Rolling Back a Deployment

**Via Cloudflare Dashboard**:
1. Navigate to Pages → carbon-acx → Deployments
2. Find previous successful deployment
3. Click "Rollback to this deployment"
4. Confirm → Deployment switched instantly

**Via Git**:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard abc123
git push origin main --force
```

**Result**: Previous version restored in ~5 minutes

### Adding Environment Variables

**Local** (`.dev.vars`):
```env
NEW_API_KEY=secret_123
```

**Production** (Cloudflare Dashboard):
1. Pages → carbon-acx → Settings → Environment Variables
2. Add variable: `NEW_API_KEY` = `secret_123`
3. Choose environment: Production / Preview / Both
4. Save → Redeploy required

**Access in Code**:
```typescript
export const onRequestGet: PagesFunction = async ({ env }) => {
  const apiKey = env.NEW_API_KEY;
  // ...
};
```

## Troubleshooting

### "Deployment failed"

**Symptoms**: GitHub Actions shows red X
**Causes**:
1. **Build error**: TypeScript compilation failed
2. **Test failure**: pytest or Vitest failed
3. **Cloudflare API error**: Invalid token or quota exceeded

**Solutions**:
1. Check GitHub Actions logs → find failing step
2. Run `make validate` locally, fix errors
3. Verify `CLOUDFLARE_API_TOKEN` secret is valid

### "Assets returning 404"

**Symptoms**: Browser console shows `GET /assets/index-abc123.js 404`
**Causes**:
1. **Wrong build**: `dist/site/` missing files
2. **Upload incomplete**: GitHub Actions upload failed
3. **Cache issue**: Old deployment cached

**Solutions**:
1. Run `make package`, check `dist/site/assets/` exists
2. Check GitHub Actions logs for upload errors
3. Purge cache in Cloudflare dashboard

### "SSR errors in production"

**Symptoms**: Blank page, console shows "window is not defined"
**Causes**:
1. **Missing lazy load**: Three.js imported directly
2. **SSR guard missing**: Client-only code in server context

**Solutions**:
1. Convert to `React.lazy()` + `Suspense`
2. Add `typeof window !== 'undefined'` check
3. Wrap in ErrorBoundary for graceful fallback

### "Artifacts not loading"

**Symptoms**: `GET /artifacts/a1b2c3d4e5f6/manifest.json` 404
**Causes**:
1. **Wrong hash**: `latest-build.json` points to non-existent hash
2. **Missing files**: Artifacts not copied to `dist/site/`
3. **Function error**: Pages Function exception

**Solutions**:
1. Check `/artifacts/latest-build.json`, verify hash exists
2. Run `make package`, check `dist/site/artifacts/<hash>/` exists
3. Check function logs: `wrangler pages deployment tail`

## Performance Optimization

### Bundle Size Reduction

**Current**:
- Main bundle: 1,120KB (372KB gzip)
- DataUniverse: 887KB (241KB gzip)

**Opportunities**:
1. **Tree Shaking**: Remove unused Radix components
2. **Dynamic Imports**: Lazy load more components
3. **Library Alternatives**: Replace heavy libraries (moment.js → date-fns)
4. **Code Splitting**: Split by route (WelcomePage chunk, CalculatorPage chunk)

**Target**: Main bundle < 300KB gzip

### Cache Hit Ratio Improvement

**Current**: ~95%
**Target**: 98%+

**Strategies**:
1. **Longer Cache Durations**: Increase max-age for assets
2. **Preload Critical Resources**: `<link rel="preload" href="/assets/index-abc123.js">`
3. **Service Worker**: Cache assets for offline access
4. **HTTP/3**: Faster connection establishment (Cloudflare supports)

### Edge Function Performance

**Current**: Pages Function ~10-20ms
**Target**: < 10ms

**Optimizations**:
1. **Reduce Logic**: Minimize computation in function
2. **Cache Aggressively**: Set long max-age for artifacts
3. **Use KV for Metadata**: Store frequently accessed data in KV (low latency)

## Related Diagrams

- **component-map**: Shows components deployed in bundles
- **data-flow**: How data moves after deployment
- **entry-points**: How deployed apps initialize
