# Deployment Infrastructure Notes

**Version:** v0.0.4 (November 2025)
**Deployment Target:** Cloudflare Pages
**Production URL:** https://carbon-acx.pages.dev

## Overview

Carbon ACX uses **Cloudflare Pages** for hosting with automatic CI/CD from GitHub. The deployment pipeline builds both Python artifacts and Next.js frontend, then serves everything from Cloudflare's global edge network.

**Key Features:**
- **Automatic Deployment:** Push to `main` → auto-deploy to production
- **Preview Deployments:** Push to any branch → unique preview URL
- **Global CDN:** 200+ edge locations worldwide
- **SSR Support:** Server Components + API routes run on Cloudflare Workers
- **Zero Configuration:** Git integration handles everything

## Development Environment

### Local Development (Frontend)

**Command:**
```bash
cd apps/carbon-acx-web
pnpm dev
```

**What it provides:**
- Next.js dev server on http://localhost:3000
- Hot Module Replacement (HMR)
- React Fast Refresh (state preserved)
- Source maps for debugging
- TypeScript error display in browser

**Environment:**
- `NODE_ENV=development`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- React DevTools enabled
- Detailed error messages

**Use Cases:**
- Component development
- UI testing
- Real-time code changes
- Debugging

### Local Development (Python)

**Setup:**
```bash
poetry shell  # Activate virtual environment
```

**Common Tasks:**
```bash
# Run derivation
python -m calc.derive

# Run tests in watch mode
pytest tests/ --watch

# Start Jupyter notebook
jupyter notebook

# Format code
black calc/
ruff check calc/
```

**Environment:**
- Python 3.11+
- Poetry virtual environment
- Local file system for data
- SQLite/DuckDB for development database

## Version Control (GitHub)

### Repository Structure

**URL:** https://github.com/chrislyons/carbon-acx

**Branches:**
- `main` - Production branch (protected)
- `feature/*` - Feature development
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Main Branch (Production)

**Protections:**
- Requires pull request
- Requires code review (optional)
- Status checks must pass (CI)
- Cannot force push

**Auto-Deploy:**
- Every commit to `main` triggers production deployment
- Build runs on Cloudflare Pages
- Deploy completes in ~3-5 minutes
- Production URL updated: https://carbon-acx.pages.dev

### Feature Branches

**Workflow:**
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit code ...

# Commit
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature
```

**Auto-Preview:**
- Cloudflare creates preview URL: `https://<hash>.carbon-acx.pages.dev`
- Unique URL per commit
- Full isolated environment
- Shareable with team

**Benefits:**
- Test changes before merge
- Show stakeholders progress
- QA testing
- No local setup required for reviewers

## CI/CD Pipeline

### Pipeline Overview

**Trigger:** Git push to any branch

**Steps:**
1. **Install:** Dependencies (Python + Node.js)
2. **Lint:** Code style checks (Ruff, Black, ESLint)
3. **Test:** Run test suite (pytest, Vitest)
4. **Build Artifacts:** Python derivation → manifests
5. **Build Next.js:** TypeScript compile → bundles
6. **Package:** Combine artifacts + web build
7. **Deploy:** Upload to Cloudflare Pages

**Total Time:** ~3-5 minutes

### Step 1: Install Dependencies

**Command:**
```bash
make install
```

**What it does:**
```bash
poetry install --with dev
pnpm install
```

**Output:**
- Python packages installed in virtual environment
- Node.js packages installed in `node_modules/`
- Dev dependencies included

**Time:** ~30-60 seconds (cached on subsequent builds)

### Step 2: Lint

**Command:**
```bash
make lint
```

**Python Linting:**
```bash
ruff check calc/    # Fast Python linter
black --check calc/ # Format checker
```

**TypeScript Linting:**
```bash
pnpm --filter carbon-acx-web run lint
```

**Failures:**
- Pipeline stops if linting fails
- Errors displayed in logs
- Must fix before deployment

**Time:** ~10-20 seconds

### Step 3: Test

**Command:**
```bash
make test
```

**Python Tests:**
```bash
pytest tests/
```

**Test Coverage:**
- `test_emission_factors.py` - Emission factor validation
- `test_manifests.py` - Manifest integrity checks
- `test_schema.py` - Pydantic model validation
- `test_calculations.py` - Calculation accuracy

**Frontend Tests (planned):**
```bash
pnpm test  # Vitest unit tests
```

**Current Status:** Python tests comprehensive, frontend tests minimal

**Time:** ~20-30 seconds

### Step 4: Build Python Artifacts

**Command:**
```bash
python -m calc.derive
```

**Process:**
1. Load CSV files from `data/`
2. Validate schemas with Pydantic
3. Match activities ↔ emission factors
4. Calculate emissions
5. Generate figure JSONs
6. Compute SHA256 hashes
7. Bundle manifests with provenance
8. Write to `dist/artifacts/<hash>/`

**Output:**
```
dist/artifacts/a1b2c3d4/
├── manifest.json
├── manifests/*.json
├── figures/*.json
└── references/*.json
```

**Time:** ~5-10 seconds

### Step 5: Build Next.js

**Command:**
```bash
pnpm --filter carbon-acx-web run build
```

**Process:**
1. TypeScript compilation (`tsc --noEmit`)
2. Component bundling (Webpack/Turbopack)
3. Static generation (SSG for static pages)
4. Code splitting (DataUniverse lazy-loaded)
5. Minification and tree shaking
6. Asset optimization

**Output:**
```
apps/carbon-acx-web/.next/
├── static/
│   ├── chunks/
│   │   ├── main-abc123.js (372KB gzip)
│   │   ├── DataUniverse-def456.js (241KB gzip)
│   │   └── [other chunks]
│   └── css/
├── server/
│   ├── app/ (Server Components)
│   └── chunks/
└── cache/
```

**Bundle Sizes:**
- **Main Bundle:** 1,120KB raw (372KB gzip)
- **DataUniverse:** 887KB raw (241KB gzip, lazy-loaded)
- **Total Initial Load:** ~700KB gzip (without 3D)

**Time:** ~30-60 seconds

### Step 6: Package

**Command:**
```bash
make package
```

**Combines:**
- Python artifacts (`dist/artifacts/`)
- Next.js build (`.next/`)
- Static assets (`public/`)

**Output:**
- Ready for deployment to Cloudflare Pages

**Time:** ~5 seconds

## Cloudflare Pages

### Build Configuration

**File:** `wrangler.toml`

```toml
name = "carbon-acx-web"
compatibility_date = "2025-01-01"
pages_build_output_dir = ".next"

[env.production]
routes = [
  { pattern = "carbon-acx.pages.dev", custom_domain = true }
]
```

**Build Command:** `make ci_build_pages`

**Output Directory:** `.next`

**Node Version:** 20.19.4

**Environment Variables:**
- `NODE_ENV=production`
- `CF_PAGES=1` (enables Cloudflare-specific optimizations)

### Cloudflare Build Process

**Executed On:** Cloudflare Pages infrastructure

**Steps:**
1. Clone Git repository
2. Install dependencies (cached)
3. Run build command: `make ci_build_pages`
4. Validate output directory exists
5. Upload assets to CDN
6. Deploy Server Functions to Workers

**Build Logs:**
- Available in Cloudflare dashboard
- Console output visible
- Error traces included

### Cloudflare Deploy

**Process:**
1. **Upload Assets:** `.next/static/` → CDN
2. **Server Functions:** `.next/server/` → Workers runtime
3. **Artifacts:** `dist/artifacts/` → CDN
4. **Routing:** Configure routes for pages + APIs

**Deploy Time:** ~30-60 seconds

**CDN Propagation:** ~1-2 minutes (global)

### Cloudflare Edge Network

**Architecture:**
- **200+ Locations:** Edge servers worldwide
- **Anycast Routing:** User requests → nearest edge
- **Smart Routing:** Dynamic route optimization

**Performance:**
- **TTFB:** <50ms (first byte)
- **Total Load:** ~1-2s (including render)
- **3D Bundle:** Lazy-loaded (only when needed)

**Caching:**
- **Static Assets:** Cached indefinitely (immutable, hash-based filenames)
- **HTML Pages:** Cached with `Cache-Control` headers
- **API Responses:** Cached per route config

## Production Environment

### Production URL

**URL:** https://carbon-acx.pages.dev

**Features:**
- **HTTPS:** Automatic SSL certificate
- **HTTP/2:** Multiplexing, header compression
- **Compression:** Brotli + gzip
- **IPv6:** Dual-stack support

**Custom Domain (future):**
- Configure DNS: `CNAME carbon-acx.pages.dev`
- Cloudflare manages SSL certificate
- No additional cost

### Preview URLs

**Pattern:** `https://<hash>.carbon-acx.pages.dev`

**Example:** `https://abc123def.carbon-acx.pages.dev`

**Features:**
- Unique URL per branch/commit
- Full isolated environment
- Same features as production
- Shareable link (no auth required)

**Lifetime:**
- Active as long as branch exists
- Deleted when branch deleted
- Can manually delete in dashboard

**Use Cases:**
- QA testing
- Stakeholder reviews
- Feature demos
- Bug reproduction

## Static Assets

### HTML Pages

**Generated:** Static Site Generation (SSG) + Server-Side Rendering (SSR)

**SSG Pages:**
- `/` (Home)
- `/methodology` (Documentation)

**SSR Pages:**
- `/calculator` (Interactive)
- `/explore` (Dynamic)
- `/manifests` (List)
- `/manifests/:id` (Detail)

**Size:** ~50KB gzipped per page

**Caching:**
- SSG: Cached indefinitely
- SSR: Cached with `Cache-Control` (configurable)

### JavaScript Bundles

**Main Bundle:**
- **Size:** 1,120KB raw, 372KB gzipped
- **Contents:** React, Next.js, core components
- **Load:** Initial page load

**DataUniverse Bundle (Lazy-Loaded):**
- **Size:** 887KB raw, 241KB gzipped
- **Contents:** Three.js, React Three Fiber, Drei
- **Load:** Only when 3D view accessed

**Code Splitting:**
- Automatic by Next.js
- Route-based chunks
- Dynamic imports for heavy components

**Caching:**
- Immutable (hash in filename)
- Cached indefinitely at edge
- New deploy = new hashes

### CSS Stylesheets

**Source:** Tailwind CSS + custom styles

**Build Process:**
1. PostCSS processes Tailwind
2. PurgeCSS removes unused classes
3. Minification
4. Gzip/Brotli compression

**Size:** ~20KB gzipped

**Inlining:**
- Critical CSS inlined in `<head>`
- Rest loaded as external stylesheet

### Artifacts (JSON)

**Location:** `dist/artifacts/` in deployment

**Contents:**
- `manifest.json` (root index)
- `manifests/*.json` (figure manifests)
- `figures/*.json` (calculation data)
- `references/*.json` (citation metadata)

**Total Size:** ~5MB uncompressed

**Caching:**
- Cached with `Cache-Control: max-age=3600` (1 hour)
- Can be cached longer (artifacts immutable)

**Access:**
- Direct URL: `https://carbon-acx.pages.dev/dist/artifacts/manifest.json`
- API routes: `/api/manifests` → reads from filesystem

## Edge Functions

### API Routes

**Implemented As:** Cloudflare Pages Functions

**Routes:**
- `GET /api/health` - Health check
- `GET /api/manifests` - List all manifests
- `GET /api/manifests/:id` - Get single manifest

**Runtime:** Cloudflare Workers (V8 isolates)

**Execution:**
- Sub-millisecond startup
- Run at edge (nearest location to user)
- No cold starts

**Limits:**
- CPU time: 50ms per request (free tier)
- Memory: 128MB per request
- Concurrent requests: 1,000+ (auto-scale)

### SSR Pages

**Server Components:**
- Next.js Server Components run on Workers
- Filesystem access to artifacts
- No client-side fetch required

**Benefits:**
- Faster initial load (data embedded in HTML)
- Better SEO (fully rendered HTML)
- Reduced JavaScript bundle size

**Example:**
```typescript
// Server Component
export default async function ManifestsPage() {
  const manifests = await getManifests()  // Server-side file read

  return (
    <div>
      {manifests.map((m) => (
        <ManifestCard key={m.figure_id} manifest={m} />
      ))}
    </div>
  )
}
```

### ISR (Incremental Static Regeneration)

**Status:** Not yet enabled

**Planned Use:**
- `/manifests` page (regenerate every hour)
- `/manifests/:id` (regenerate on-demand)

**Configuration (future):**
```typescript
export const revalidate = 3600  // 1 hour
```

**Benefits:**
- Static performance + dynamic freshness
- Automatic background updates
- No manual cache purging

## Monitoring & Analytics

### Cloudflare Analytics

**Dashboard:** https://dash.cloudflare.com

**Metrics:**
- **Page Views:** Total visits, unique visitors
- **Bandwidth:** Data transferred (upload + download)
- **Requests:** Total HTTP requests
- **Cache Hit Rate:** % of requests served from cache
- **Response Time:** TTFB, total load time

**Granularity:**
- Real-time (last 30 minutes)
- Hourly (last 7 days)
- Daily (last 30 days)

**Export:**
- CSV export available
- GraphQL API for custom queries

### Function Logs

**Location:** Cloudflare dashboard → Pages → Logs

**Contents:**
- `console.log()` output from Server Components
- `console.error()` error messages
- Request traces (URL, method, status code)
- Execution time

**Retention:** 7 days (free tier)

**Example:**
```typescript
// In API route
export async function GET(request: Request) {
  console.log('Manifest request:', request.url)

  try {
    const manifests = await getManifests()
    console.log(`Loaded ${manifests.length} manifests`)
    return NextResponse.json({ manifests })
  } catch (error) {
    console.error('Failed to load manifests:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Uptime Monitoring

**Status:** Planned (not yet implemented)

**Tools:**
- Cloudflare Health Checks (paid feature)
- External monitoring (UptimeRobot, Pingdom)
- Custom script hitting `/api/health`

**Health Check Endpoint:**
```typescript
// GET /api/health
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

**Alerting (planned):**
- Email notifications on downtime
- Slack webhook integration
- PagerDuty for critical alerts

## Deployment Workflow

### Automatic Deployment (Main Branch)

**Trigger:** Push to `main` branch

```bash
git checkout main
git merge feature/my-feature
git push origin main
```

**What Happens:**
1. GitHub webhook → Cloudflare Pages
2. Cloudflare clones repository
3. Runs build command: `make ci_build_pages`
4. Validates build output
5. Uploads to CDN
6. Deploys Server Functions
7. Updates production URL
8. Sends deployment notification (email)

**Total Time:** ~3-5 minutes

**Rollback:**
- Cloudflare dashboard → Deployments → Rollback to previous
- Instant rollback (no rebuild required)

### Manual Deployment

**Using Wrangler CLI:**

```bash
# Build locally
cd apps/carbon-acx-web
pnpm build

# Deploy manually
wrangler pages deploy .next
```

**When to Use:**
- Testing deployment process
- Emergency hotfix
- Rollback to specific version
- CI pipeline failure

### Preview Deployment

**Trigger:** Push to any branch except `main`

```bash
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
```

**What Happens:**
1. Cloudflare detects push
2. Creates unique preview URL
3. Builds + deploys to preview environment
4. Posts URL in GitHub commit status

**Example URL:** `https://abc123def.carbon-acx.pages.dev`

**Comparison with Production:**
- Same build process
- Same runtime environment
- Same features available
- Isolated from production traffic

## Performance Optimization

### Build Performance

**Optimizations:**
- **Dependency Caching:** `node_modules/` cached between builds
- **Incremental Compilation:** Only changed files recompiled
- **Parallel Builds:** Python + Next.js can run in parallel (if configured)

**Current Build Time:** ~3-5 minutes

**Future Improvements:**
- Turborepo for monorepo caching
- Remote caching (Vercel or custom S3)
- Split build into separate jobs

### Runtime Performance

**Edge Caching:**
- Static assets: Cached indefinitely
- HTML pages: Cached 1 hour (SSG)
- API responses: Cached 1 hour (configurable)

**Code Splitting:**
- Route-based splitting (automatic)
- DataUniverse lazy-loaded (manual)
- Heavy libraries isolated

**Image Optimization:**
- Next.js Image component (future)
- Cloudflare Image Resizing (paid feature)

**Current Metrics:**
- **TTFB:** ~50ms
- **First Contentful Paint:** ~1s
- **Time to Interactive:** ~2s
- **3D Load (optional):** +500ms

## Security Considerations

### HTTPS

**Provided By:** Cloudflare (automatic SSL certificate)

**Configuration:**
- Automatic certificate issuance
- Automatic renewal (Let's Encrypt)
- TLS 1.2+ only
- Strong cipher suites

### Content Security Policy

**Status:** Not yet implemented

**Planned Headers:**
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]
```

### Environment Variables

**Build-Time:**
- `NEXT_PUBLIC_*` - Exposed to browser
- Regular variables - Server-side only

**Runtime:**
- No secrets in codebase
- All data from public CSV files
- No database credentials

### Rate Limiting

**Cloudflare Protection:**
- DDoS mitigation (automatic)
- Rate limiting (configurable)
- Bot protection (optional)

**API Routes:**
- Currently no rate limiting
- Plan: Implement per-IP rate limits
- Cloudflare Workers: 1,000 req/s per IP (free tier)

## Cost Considerations

### Cloudflare Pages (Free Tier)

**Included:**
- Unlimited bandwidth
- Unlimited requests
- 500 builds/month
- 1 concurrent build
- Automatic SSL
- Global CDN

**Limits:**
- 20,000 files per deployment
- 25MB per file
- 100MB total deployment size (exceeds: paid tier)

**Current Usage:**
- Deployment size: ~50MB (well under limit)
- Builds/month: ~50-100 (well under limit)

**Upgrade Triggers:**
- Need for staging environment (separate project)
- Advanced analytics (Web Analytics Pro)
- Image optimization (Image Resizing)

## Disaster Recovery

### Backup Strategy

**Git Repository:**
- Primary backup (GitHub)
- All code versioned
- Full history preserved

**Artifacts:**
- Regenerated from CSV data
- CSV files versioned in Git
- Deterministic builds (same input → same output)

**Deployments:**
- Cloudflare stores last 50 deployments
- Can rollback to any previous version
- No data loss (static site)

### Rollback Procedure

**Cloudflare Dashboard:**
1. Navigate to carbon-acx project
2. Click "Deployments"
3. Find previous working deployment
4. Click "Rollback"
5. Confirm rollback

**Result:**
- Instant rollback (no rebuild)
- Production URL updated
- Previous deployment remains in history

**Git Rollback:**
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force  # Use with caution
```

## Troubleshooting

### Build Failures

**Common Issues:**
1. **Dependency Errors:** `make install` failed
   - Solution: Check `pyproject.toml` and `package.json` syntax

2. **Linting Errors:** `make lint` failed
   - Solution: Run `black calc/` and `ruff check --fix calc/`

3. **Test Failures:** `make test` failed
   - Solution: Fix failing tests, check test logs

4. **TypeScript Errors:** Build failed during Next.js compilation
   - Solution: Run `pnpm typecheck` locally, fix type errors

**Debug Commands:**
```bash
# Check build logs
wrangler pages deployment list

# View specific deployment log
wrangler pages deployment logs <deployment-id>
```

### Runtime Errors

**Common Issues:**
1. **500 Internal Server Error:** Server Component failed
   - Check Cloudflare function logs
   - Look for `console.error()` output

2. **404 Not Found:** Route not configured
   - Check `next.config.ts` routing
   - Verify file exists in `app/` directory

3. **WebGL Error:** DataUniverse failed to load
   - Error boundary shows fallback
   - Check browser console for details

**Debug Tools:**
- Browser DevTools → Console
- Cloudflare Dashboard → Logs
- Next.js error overlay (development)

## Related Diagrams

- **Repo Structure** (`1-repo-structure.mermaid.md`)
- **Architecture Overview** (`2-architecture-overview.mermaid.md`)
- **Component Map** (`3-component-map.mermaid.md`)
- **Data Flow** (`4-data-flow.mermaid.md`)
- **Entry Points** (`5-entry-points.mermaid.md`)

## References

- Cloudflare Pages Documentation: https://developers.cloudflare.com/pages/
- Next.js Deployment: https://nextjs.org/docs/deployment
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- ACX093.md - Strategic Rebuild Specification
- Makefile - Build orchestration
- wrangler.toml - Cloudflare configuration
