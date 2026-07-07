# Entry Points - Architectural Notes

## Overview

Carbon ACX has **multiple entry points** serving different audiences and use cases: modern web app (end users), Dash operations client (analysts), CLI commands (developers/CI), Worker API (edge compute), and Pages Function (artifact proxy). Each entry point has distinct initialization flows and runtime environments.

## Web App Entry (Modern Interface)

### Entry Flow: Browser → HTML → React → Router → Page

**Step 1: Browser Request**

```
GET https://carbon-acx.pages.dev/
```

**Step 2: Cloudflare Pages Response**

```html
<!-- dist/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Carbon ACX</title>
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
    <link rel="stylesheet" href="/assets/index-xyz789.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**Step 3: JavaScript Execution**

```typescript
// apps/carbon-acx-web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CanvasApp } from './CanvasApp';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <CanvasApp />
  </React.StrictMode>
);
```

**Step 4: App Initialization**

```typescript
// apps/carbon-acx-web/src/CanvasApp.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WelcomePage } from './pages/WelcomePage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ExplorePage } from './pages/ExplorePage';
import { InsightsPage } from './pages/InsightsPage';

const queryClient = new QueryClient();

export function CanvasApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

**Step 5: Route Matching**

- URL: `/` → `<WelcomePage />`
- URL: `/calculator` → `<CalculatorPage />`
- URL: `/explore` → `<ExplorePage />`
- URL: `/insights` → `<InsightsPage />`

**Step 6: Page Component Render**

```typescript
// Example: WelcomePage.tsx
export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <Transition>
      <div className="hero">
        <h1>Carbon ACX</h1>
        <button onClick={() => navigate('/calculator')}>
          Get Started
        </button>
      </div>
    </Transition>
  );
}
```

### Initialization Order

1. **HTML Parse** → Browser parses `index.html`, finds `<div id="root">`
2. **Script Load** → Browser downloads `/assets/index-abc123.js` (372KB gzip)
3. **React Init** → `ReactDOM.createRoot(root).render(<CanvasApp />)`
4. **Router Setup** → `BrowserRouter` initializes, matches current URL
5. **Page Render** → Matched route component renders (e.g., `WelcomePage`)
6. **State Hydration** → Zustand reads `localStorage['carbon-acx-storage']`
7. **Data Fetch** → TanStack Query fetches artifacts (if needed)

### Dev Server Entry

**Command**: `pnpm dev` (from repo root)

**Expands to**: `pnpm --filter carbon-acx-web dev`

**Runs**: `npm run dev` inside `/apps/carbon-acx-web/`

**Vite Config** (`apps/carbon-acx-web/vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all interfaces
    open: true, // Open browser on start
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**Dev Flow**:
1. Vite starts HTTP server on `http://localhost:5173`
2. Serves `index.html` with injected HMR client
3. Watches for file changes (`src/**/*.tsx`, `src/**/*.css`)
4. On change → compiles → pushes update via WebSocket → browser applies without refresh
5. React component state preserved across HMR updates

## Dash Operations Client (Analyst Interface)

### Entry Flow: CLI → Python → Dash Server → Browser

**Step 1: Launch Command**

```bash
make app
# Expands to:
ACX_DATA_BACKEND=csv PYTHONPATH=. poetry run python -m app.app
```

**Step 2: Dash App Initialization**

```python
# app/app.py
import dash
from dash import dcc, html
from dash.dependencies import Input, Output

app = dash.Dash(__name__, suppress_callback_exceptions=True)

# Define layouts
app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    html.Div(id='page-content'),
])

# Define callbacks
@app.callback(
    Output('page-content', 'children'),
    Input('url', 'pathname')
)
def display_page(pathname):
    if pathname == '/':
        return render_dashboard()
    elif pathname == '/layers':
        return render_layers()
    # ...
```

**Step 3: Flask Server Start**

```python
if __name__ == '__main__':
    app.run_server(
        debug=True,
        host='0.0.0.0',
        port=8050,
    )
```

**Step 4: Browser Access**

- Navigate to `http://localhost:8050`
- Dash serves HTML with Plotly charts
- JavaScript handles interactivity (callbacks)

### Use Cases

- **Internal Analysis**: Analysts explore agency-level emissions
- **Scenario Testing**: Toggle layers, adjust assumptions
- **Data Validation**: Cross-check calculations against source data
- **Report Generation**: Export charts, tables for documentation

## CLI Commands (Build & Data Processing)

### Make Targets (Orchestration)

**File**: `/Makefile`

**Common Targets**:

#### `make build`

**Purpose**: Full derivation pipeline (CSV → artifacts)

**Expands to**:
```bash
ACX_GENERATED_AT=1970-01-01T00:00:00+00:00 \
ACX_DATA_BACKEND=csv \
ACX_OUTPUT_ROOT=dist/artifacts \
PYTHONPATH=. poetry run python -m calc.derive --output-root dist/artifacts/csv
```

**Steps**:
1. Load CSVs from `data/` directory
2. Validate schemas (Pydantic)
3. Compute emissions (quantity × factor)
4. Generate manifest with hash
5. Write to `dist/artifacts/<hash>/`
6. Update `dist/artifacts/latest-build.json` pointer

**Output**:
```
dist/artifacts/
├── a1b2c3d4e5f6/  # Build hash
│   └── calc/outputs/
│       ├── export_view.csv
│       ├── export_view.json
│       ├── manifest.json
│       └── figures/
│           ├── stacked.json
│           ├── bubble.json
│           └── ...
└── latest-build.json  # { "build_hash": "a1b2c3d4e5f6" }
```

#### `make app`

**Purpose**: Launch Dash analytics dashboard

**Expands to**:
```bash
ACX_DATA_BACKEND=csv PYTHONPATH=. poetry run python -m app.app
```

**Result**: Dash server at `http://localhost:8050`

#### `make package`

**Purpose**: Build web app + package artifacts for deployment

**Expands to**:
```bash
# 1. Build artifacts
make build

# 2. Package artifacts
PYTHONPATH=. poetry run python -m scripts.package_artifacts \
  --src dist/artifacts \
  --dest dist/packaged-artifacts

# 3. Build web app
pnpm run build:web

# 4. Copy to dist/site
rm -rf dist/site
mkdir -p dist/site
cp -R apps/carbon-acx-web/dist/* dist/site/

# 5. Prepare Pages bundle (add _headers, _redirects, etc.)
PYTHONPATH=. poetry run python -m scripts.prepare_pages_bundle \
  --site dist/site \
  --artifacts dist/packaged-artifacts
```

**Output**: `dist/site/` ready for Cloudflare Pages deployment

#### `make validate`

**Purpose**: Run all quality checks (linting, tests)

**Expands to**:
```bash
# Python linting
PYTHONPATH=. poetry run ruff check .
PYTHONPATH=. poetry run black --check .

# Python tests
PYTHONPATH=. poetry run pytest

# Asset validation
PYTHONPATH=. python tools/validate_assets.py
```

### Python Module Invocations

#### `python -m calc.derive`

**Purpose**: Main derivation engine

**Arguments**:
- `--output-root <path>`: Base directory for outputs (default: `dist/artifacts`)
- `--db <path>`: SQLite database path (if using sqlite backend)
- `--backend <csv|sqlite|duckdb>`: Override `ACX_DATA_BACKEND`

**Example**:
```bash
python -m calc.derive --output-root /tmp/test-build
```

**Process**:
1. Choose backend (`choose_backend()` from `ACX_DATA_BACKEND` env var)
2. Load data via backend (`datastore.load_activities()`, etc.)
3. Compute emissions for each activity schedule
4. Build figures (stacked, bubble, sankey, feedback)
5. Generate manifest with hash
6. Write JSON/CSV outputs

#### `python -m calc.derive intensity`

**Purpose**: Export intensity matrices (g CO₂ per functional unit)

**Arguments**:
- `--output-dir <path>`: Directory for intensity artifacts
- `--fu <id|all>`: Filter by functional unit (e.g., `km`, `hour`, or `all`)
- `--profile <id>`: Filter by profile

**Example**:
```bash
python -m calc.derive intensity --fu all --output-dir dist/
```

**Output**: `dist/intensity_matrix.csv`

#### `python -m calc.make_catalog`

**Purpose**: Generate layer catalog (JSON index of all layers)

**Output**: `artifacts/catalog.json`

**Schema**:
```json
{
  "layers": [
    {
      "id": "professional",
      "name": "Professional",
      "color": "#3b82f6",
      "activities": ["TRAN.COMMUTE.CAR.KM", "FOOD.LUNCH.MEAL", ...]
    },
    ...
  ]
}
```

#### `python -m scripts.package_artifacts`

**Purpose**: Bundle artifacts for deployment

**Arguments**:
- `--src <path>`: Source artifacts directory
- `--dest <path>`: Destination package directory

**Process**:
1. Copy latest build artifacts from `dist/artifacts/<hash>/`
2. Generate `manifest.json` with file list, hashes
3. Create `dist/packaged-artifacts/` bundle

## Cloudflare Worker API (Edge Compute)

### Entry Flow: HTTP Request → Worker Fetch → Response

**Deployment**: `wrangler deploy`

**Runtime**: Cloudflare Workers (V8 isolates, edge locations globally)

**Entry Point**: `workers/index.ts`

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route: POST /api/compute
    if (url.pathname === '/api/compute' && request.method === 'POST') {
      return handleCompute(request, env);
    }

    // Route: GET /api/health
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 404 for other routes
    return new Response('Not Found', { status: 404 });
  },
};
```

### API Endpoints

#### `POST /api/compute`

**Purpose**: On-demand emission calculations (stateless)

**Request Body**:
```json
{
  "activities": [
    {
      "id": "TRAN.CAR.KM",
      "quantity": 10,
      "carbonIntensity": 0.18
    }
  ],
  "profile": {
    "default_grid_region": "US-CA"
  }
}
```

**Response**:
```json
{
  "totalEmissions": 936,
  "activities": [
    {
      "id": "TRAN.CAR.KM",
      "annualEmissions": 936
    }
  ]
}
```

**Implementation**:
```typescript
async function handleCompute(request: Request, env: Env): Promise<Response> {
  // 1. Parse request body
  const body = await request.json();

  // 2. Validate inputs
  if (!body.activities || !Array.isArray(body.activities)) {
    return new Response('Invalid request', { status: 400 });
  }

  // 3. Calculate emissions
  const results = body.activities.map((activity) => {
    const annualEmissions = activity.quantity * 260 * activity.carbonIntensity;
    return { ...activity, annualEmissions };
  });

  const totalEmissions = results.reduce((sum, r) => sum + r.annualEmissions, 0);

  // 4. Return response
  return new Response(JSON.stringify({ totalEmissions, activities: results }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CORS
    },
  });
}
```

#### `GET /api/health`

**Purpose**: Health check endpoint (monitoring, uptime checks)

**Response**:
```json
{ "status": "ok" }
```

### Dev Server

**Command**: `wrangler dev`

**Local Endpoint**: `http://localhost:8787`

**Features**:
- Local V8 isolate runtime (matches production)
- Environment variable loading (`.dev.vars`)
- KV/R2/D1 emulation (miniflare)
- Hot reload on code changes

**Example Request**:
```bash
curl -X POST http://localhost:8787/api/compute \
  -H "Content-Type: application/json" \
  -d '{"activities":[{"id":"TRAN.CAR.KM","quantity":10,"carbonIntensity":0.18}]}'
```

## Cloudflare Pages Function (Artifact Proxy)

### Entry Flow: HTTP Request → Pages Function → Artifact Response

**File**: `functions/carbon-acx/[[path]].ts`

**Pattern**: Catch-all route (`[[path]]` = wildcard)

**Purpose**: Proxy requests to artifacts stored in R2/KV or bundled in Pages deployment

**Entry Point**:
```typescript
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/carbon-acx/', '');

  // Parse path: /artifacts/<hash>/manifest.json
  const match = path.match(/^artifacts\/([a-f0-9]{12})\/(.*)/);
  if (!match) {
    return new Response('Invalid artifact path', { status: 400 });
  }

  const [, buildHash, artifactPath] = match;

  // Fetch from R2 or bundled assets
  const artifact = await env.ARTIFACTS_BUCKET.get(`${buildHash}/${artifactPath}`);
  if (!artifact) {
    return new Response('Artifact not found', { status: 404 });
  }

  // Return with immutable caching
  return new Response(artifact.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

### Caching Strategy

**Cache-Control Headers**:
- `public`: Cacheable by CDN and browsers
- `max-age=31536000`: Cache for 1 year (365 days)
- `immutable`: Content will never change (hash-based URL)

**CDN Behavior**:
- First request: Cache miss → fetch from R2 → store in edge cache
- Subsequent requests: Cache hit → serve from edge (sub-10ms)
- New build: New hash → new URL → cache miss → fresh fetch

### Example Request Flow

1. **Browser**: `GET https://carbon-acx.pages.dev/artifacts/a1b2c3d4e5f6/manifest.json`
2. **Cloudflare Edge**: Check cache for key `artifacts/a1b2c3d4e5f6/manifest.json`
   - **Cache Hit**: Return cached response (< 10ms)
   - **Cache Miss**: Invoke Pages Function
3. **Pages Function**: Fetch from R2 bucket `ARTIFACTS_BUCKET.get('a1b2c3d4e5f6/manifest.json')`
4. **R2**: Return artifact data (~50ms)
5. **Pages Function**: Add cache headers, return response
6. **Cloudflare Edge**: Cache response, forward to browser
7. **Browser**: Receive JSON, parse, use

## Development Servers

### Web Dev Server (`pnpm dev`)

**Port**: 5173
**Features**:
- Hot Module Replacement (HMR) - sub-second updates
- React Fast Refresh - preserves component state
- Source maps - debug original TypeScript
- Proxy API requests (if needed)

**Start**:
```bash
pnpm dev  # From repo root
# OR
cd apps/carbon-acx-web && npm run dev
```

**Console Output**:
```
  VITE v5.4.20  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h to show help
```

### Legacy Site Dev (`cd site && npm run dev`)

**Port**: 5174
**Purpose**: Maintain legacy Vite site (pre-monorepo migration)
**Usage**: Uncommon (modern app preferred)

### Worker Dev Server (`wrangler dev`)

**Port**: 8787
**Features**:
- Local V8 isolate runtime
- Environment variable loading (`.dev.vars`)
- KV/R2/D1 emulation
- Live reload on code changes

**Start**:
```bash
wrangler dev  # From repo root (workers/ directory)
```

**Console Output**:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

## Production Entry Points

### Cloudflare Pages Domain

**URL**: `https://carbon-acx.pages.dev`

**Entry Points**:
- `/` → `index.html` (main app)
- `/assets/*` → Hashed JS/CSS bundles
- `/artifacts/*` → Pages Function proxy
- `/api/*` → Worker routes

### Request Routing

```
Browser Request: https://carbon-acx.pages.dev/explore
    ↓
Cloudflare Edge (global network)
    ↓
Cloudflare Pages (static site)
    ↓
index.html (served from edge cache)
    ↓
Browser parses HTML, downloads /assets/index-abc123.js
    ↓
React Router matches /explore → <ExplorePage />
    ↓
useQuery() fetches /artifacts/a1b2c3d4e5f6/manifest.json
    ↓
Pages Function proxies artifact from R2
    ↓
Response cached at edge, returned to browser
```

### Performance Metrics

- **HTML (index.html)**: ~2KB, served in < 10ms (edge cache)
- **JS bundle (main)**: 372KB gzip, ~50ms download (edge cache)
- **JS bundle (DataUniverse)**: 241KB gzip, ~30ms download (lazy loaded)
- **Artifacts (manifest.json)**: ~50KB, ~10ms (edge cache after first load)
- **Total Time to Interactive**: ~500ms (first load), ~100ms (cached)

## Common Patterns

### Adding a New Web Route

1. Create page component: `apps/carbon-acx-web/src/pages/NewPage.tsx`
2. Add route in `CanvasApp.tsx`:
   ```typescript
   <Route path="/new" element={<NewPage />} />
   ```
3. Add navigation link:
   ```typescript
   <button onClick={() => navigate('/new')}>Go to New Page</button>
   ```

### Adding a New CLI Command

1. Create Python module: `scripts/my_command.py`
2. Add `if __name__ == '__main__':` block with argparse
3. Add Make target in `Makefile`:
   ```makefile
   my_command:
       PYTHONPATH=. poetry run python -m scripts.my_command
   ```
4. Run: `make my_command`

### Adding a New Worker Endpoint

1. Edit `workers/index.ts`:
   ```typescript
   if (url.pathname === '/api/new-endpoint') {
     return handleNewEndpoint(request, env);
   }
   ```
2. Implement handler function
3. Deploy: `wrangler deploy`
4. Test: `curl https://carbon-acx.pages.dev/api/new-endpoint`

## Troubleshooting

### "Web app won't load"

**Symptoms**: Blank page, console errors
**Causes**:
1. **Build error**: TypeScript compilation failed
2. **Routing issue**: React Router not matching path
3. **Missing dependencies**: `node_modules` not installed

**Solutions**:
1. Check `pnpm run build` for errors
2. Verify route definition in `CanvasApp.tsx`
3. Run `pnpm install`

### "Dash app 'Connection refused'"

**Symptoms**: `http://localhost:8050` unreachable
**Causes**:
1. **Not running**: Forgot to start with `make app`
2. **Port conflict**: Another process using 8050
3. **Python error**: Exception during startup

**Solutions**:
1. Run `make app`, check console output
2. Kill conflicting process: `lsof -i :8050`, `kill <PID>`
3. Check traceback, fix Python errors

### "Worker API 404"

**Symptoms**: `/api/compute` returns 404
**Causes**:
1. **Not deployed**: Worker not published
2. **Wrong route**: Path mismatch in `workers/index.ts`
3. **CORS error**: Preflight request failing

**Solutions**:
1. Run `wrangler deploy`, check deployment status
2. Verify pathname check: `url.pathname === '/api/compute'`
3. Add `Access-Control-Allow-Origin: *` header

### "Artifacts not loading"

**Symptoms**: Pages Function 404 or 500
**Causes**:
1. **Wrong hash**: `latest-build.json` points to non-existent hash
2. **R2 missing**: Artifact not uploaded to R2 bucket
3. **Function error**: Exception in Pages Function

**Solutions**:
1. Check `/artifacts/latest-build.json`, verify hash exists
2. Upload artifacts: `wrangler r2 object put ...`
3. Check function logs: `wrangler pages deployment tail`

## Related Diagrams

- **component-map**: Shows components loaded after routing
- **data-flow**: How data moves after page loads
- **deployment-infrastructure**: How entry points are deployed
