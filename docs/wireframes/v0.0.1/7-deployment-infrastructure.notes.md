# Deployment Infrastructure - Detailed Notes

## Overview

Carbon ACX uses a **serverless edge architecture** powered by Cloudflare. The static web application is hosted on Cloudflare Pages with automatic deployments from GitHub. API endpoints run on Cloudflare Workers. All deployments are global (200+ edge locations).

**Key characteristics**:
- **Zero backend servers**: Fully static + edge functions
- **Git-based deployments**: Push to main = automatic production deploy
- **Preview deployments**: Every PR gets unique preview URL
- **Global CDN**: Sub-100ms latency worldwide
- **Cost**: ~$0/month (within free tier)

## Deployment Targets

### 1. Cloudflare Pages (Primary)

**URL**: `carbon-acx.pages.dev` (production)

**Purpose**: Static web application hosting

**What gets deployed**: `apps/carbon-acx-web/dist/` (Vite build output)

**Deployment trigger**: GitHub integration (automatic on push to main)

**Build configuration** (in Cloudflare dashboard):
```bash
# Build command
pnpm run build:web

# Output directory
apps/carbon-acx-web/dist

# Environment variables
NODE_VERSION=20.19.4
PNPM_VERSION=10.5.2
```

**Why Cloudflare Pages?**
- **Free tier**: Unlimited bandwidth, 500 builds/month
- **Speed**: Deployed to 200+ edge locations
- **Atomic deploys**: All-or-nothing (no partial deploys)
- **Instant rollbacks**: One-click revert to previous deploy
- **Preview branches**: Automatic preview URLs for PRs

**Deployment process**:
1. Push to `main` branch
2. Cloudflare webhook triggers build
3. Run `pnpm run build:web` in cloud builder
4. Upload output to edge network
5. Update DNS/routing (zero downtime)
6. Old version remains accessible via unique URL

**Build time**: ~3-5 minutes (includes dependency install, data pipeline, Vite build)

### 2. Cloudflare Workers (API)

**URL**: `carbon-acx-compute.workers.dev` (subdomain)

**Purpose**: Edge compute API endpoints

**What gets deployed**: `workers/compute/index.ts` (TypeScript compiled to JavaScript)

**Deployment trigger**: Manual via `wrangler deploy`

**Configuration**: `wrangler.toml`
```toml
name = "carbon-acx-compute"
main = "workers/compute/index.ts"
compatibility_date = "2024-05-01"

[vars]
ACX_DATASET_VERSION = "dev"

[dev]
port = 8787
```

**Endpoints**:
- `/api/compute`: On-demand emission calculations
- `/api/health`: Health check (uptime monitoring)

**Why Cloudflare Workers?**
- **Edge runtime**: Runs in same data centers as Pages
- **Instant cold starts**: ~0ms (V8 isolates, not containers)
- **Free tier**: 100,000 requests/day
- **TypeScript support**: Native via Wrangler

**Deployment process**:
```bash
wrangler deploy
# Uploads compiled JS to Cloudflare
# Routing updates propagate globally in ~30 seconds
```

**Development**: `wrangler dev` (local server on port 8787)

### 3. Cloudflare Pages Functions (Edge Middleware)

**Location**: `functions/carbon-acx/[[path]].ts`

**Purpose**: Serverless functions for Pages (artifact proxy)

**Route**: Catch-all (`[[path]].ts` matches all routes)

**Use case**: Proxy access to `dist/artifacts/` with immutable caching

**Why use Pages Functions?**
- **Automatic deployment**: Ships with Pages deploy (no separate step)
- **Same edge network**: Co-located with static assets
- **Zero config**: Just drop files in `functions/` directory

**Example function**:
```typescript
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Proxy artifact requests
  if (url.pathname.startsWith('/artifacts/')) {
    const artifactPath = url.pathname.replace('/artifacts/', '');
    const artifact = await fetch(`https://carbon-acx.pages.dev/dist/artifacts/${artifactPath}`);

    return new Response(artifact.body, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': artifact.headers.get('Content-Type'),
      },
    });
  }

  return context.next();
}
```

**Caching strategy**: Artifacts are content-addressable (hashed), safe to cache forever.

## GitHub Actions CI/CD Pipeline

### Workflow File

**Location**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` branch
- Pull request targeting `main`

**Jobs**: 3 jobs in sequence

### Job 1: lint-yaml

**Purpose**: Validate GitHub Actions workflow syntax

**Steps**:
1. Checkout repository
2. Run `yamllint` on `.github/workflows/`

**Why lint workflows?**
- Catch syntax errors before they break CI
- Enforce consistent formatting
- Validate YAML structure

**Config**: `.yamllint.yml`

### Job 2: build-static

**Purpose**: Build data artifacts and web application

**Dependencies**: Requires `lint-yaml` to pass

**Steps**:

1. **Checkout repository**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Setup Node.js**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20.19.4'
   ```

3. **Setup pnpm**
   ```yaml
   - uses: pnpm/action-setup@v4
     with:
       version: 10.5.2
       run_install: false
   ```

4. **Install workspace dependencies**
   ```yaml
   - run: pnpm install --frozen-lockfile -w
   ```

5. **Install web workspace dependencies**
   ```yaml
   - run: pnpm --filter carbon-acx-web install --frozen-lockfile
   ```

6. **Setup Python**
   ```yaml
   - uses: actions/setup-python@v5
     with:
       python-version: "3.11"
   ```

7. **Install Poetry**
   ```yaml
   - uses: abatilo/actions-poetry@v3
     with:
       poetry-version: "1.8.3"
   ```

8. **Install validator dependencies**
   ```yaml
   - run: pip install -r tools/validator/requirements.txt
   ```

9. **Install Python dependencies**
   ```yaml
   - run: poetry install --no-interaction --no-root --extras "db"
   ```

10. **Build artifacts (CSV backend)**
    ```yaml
    - env:
        ACX_GENERATED_AT: "1970-01-01T00:00:00+00:00"  # Deterministic builds
        ACX_DATA_BACKEND: "csv"
        ACX_OUTPUT_ROOT: "dist/artifacts"
        ACX040_HASHED: "1"
        PYTHONPATH: "."
      run: |
        pnpm --dir site install --frozen-lockfile --prod=false
        make build
        make verify_manifests
        make validate-manifests
        make validate-diff-fixtures
        make build-static
    ```

11. **Upload data artifacts**
    ```yaml
    - uses: actions/upload-artifact@v4
      with:
        name: dist-artifacts
        path: dist/artifacts
    ```

12. **Upload static site bundle**
    ```yaml
    - uses: actions/upload-artifact@v4
      with:
        name: dist-site
        path: dist/site
    ```

**Why deterministic builds?**
- `ACX_GENERATED_AT: "1970-01-01T00:00:00+00:00"` ensures same timestamp every build
- Enables reproducible builds (same input → same output)
- Hash verification succeeds (no spurious diffs)

**Build outputs**:
- `dist/artifacts/`: Content-addressed emission data
- `dist/site/`: Legacy static site

### Job 3: tests

**Purpose**: Run test suites and quality checks

**Dependencies**: Requires `build-static` to pass

**Steps**:

1. **Guard binary files**
   ```yaml
   - run: |
       for forbidden in refs/raw refs/normalized; do
         if git ls-files --error-unmatch "${forbidden}/*" >/dev/null 2>&1; then
           echo "::error::Binary/normalized files under refs/* must not be committed."
           exit 1
         fi
       done
   ```

   **Purpose**: Prevent binary files in `refs/` (text-only directory)

2. **Guard large files**
   ```yaml
   - run: |
       LARGE=$(git ls-files refs | while read -r path; do
         if [ -f "$path" ] && [ "$(wc -c < "$path")" -gt 65536 ]; then
           echo "$path"
         fi
       done)
       if [ -n "$LARGE" ]; then
         echo "::error::Large files detected under refs/: $LARGE"
         exit 1
       fi
   ```

   **Purpose**: Fail if files > 64KB in `refs/` (keep repository lean)

3. **Install dependencies** (same as build-static)

4. **Run site tests**
   ```yaml
   - working-directory: site
     run: pnpm test
   ```

   Runs Vitest unit tests for legacy static site.

5. **Run Python tests**
   ```yaml
   - run: poetry run pytest -q
   ```

   Runs pytest for data pipeline validation.

**Test coverage** (current):
- Python: ~60% (calc/, schema validation)
- TypeScript (site): ~40% (utility functions)
- TypeScript (web app): ~10% (needs expansion)

**Future improvements**:
- E2E tests (Playwright)
- Visual regression tests
- Accessibility tests (axe-core)

## Preview Deployments

### Automatic PR Previews

**Trigger**: Every push to a pull request branch

**URL format**: `https://pr-{number}.carbon-acx.pages.dev`

**Example**: PR #42 → `https://pr-42.carbon-acx.pages.dev`

**Workflow**:
1. Developer opens PR
2. Cloudflare webhook detects PR
3. Run build (same as production)
4. Deploy to unique subdomain
5. Post comment in PR with preview link
6. Every subsequent push updates preview

**Benefits**:
- **Visual review**: Reviewers see changes live
- **Cross-browser testing**: Share link with QA team
- **Client demos**: Show work-in-progress to stakeholders
- **Isolation**: Previews don't affect production

**Limitations**:
- Preview URLs are public (no authentication)
- Previews persist for 30 days after PR merge
- Build minutes count against quota (500/month free)

**Best practices**:
- Test preview before requesting review
- Document testing steps in PR description
- Share preview link with non-technical reviewers

### Preview Environment Variables

Same as production, but:
- `ACX_DATASET_VERSION = "preview-{pr-number}"`
- Separate analytics tracking (don't pollute production metrics)

## Environment Variables

### CI/CD Variables (GitHub Actions)

**Defined in**: `.github/workflows/ci.yml`

```yaml
env:
  ACX_GENERATED_AT: "1970-01-01T00:00:00+00:00"  # Deterministic timestamp
  ACX_DATA_BACKEND: "csv"                         # CSV vs. SQLite backend
  ACX_OUTPUT_ROOT: "dist/artifacts"               # Output directory
  ACX040_HASHED: "1"                              # Enable content hashing
  PYTHONPATH: "."                                 # Python import resolution
```

**Purpose**:
- `ACX_GENERATED_AT`: Ensures reproducible builds (same hash every time)
- `ACX_DATA_BACKEND`: Switches between CSV and SQLite data sources
- `ACX_OUTPUT_ROOT`: Where to write generated manifests
- `ACX040_HASHED`: Enable content-addressable artifact naming
- `PYTHONPATH`: Allow `import calc.derive` without package install

### Cloudflare Pages Variables

**Defined in**: Cloudflare dashboard (Settings → Environment Variables)

**Build variables**:
- `NODE_VERSION = "20.19.4"`
- `PNPM_VERSION = "10.5.2"`
- `BUILD_COMMAND = "pnpm run build:web"`
- `OUTPUT_DIRECTORY = "apps/carbon-acx-web/dist"`

**Runtime variables** (accessible in Pages Functions):
- `ENVIRONMENT = "production"` or `"preview"`
- `CF_PAGES_COMMIT_SHA`: Git commit hash
- `CF_PAGES_BRANCH`: Git branch name
- `CF_PAGES_URL`: Deployment URL

**Example usage in function**:
```typescript
export async function onRequest(context) {
  const env = context.env.ENVIRONMENT; // "production" or "preview"
  const commit = context.env.CF_PAGES_COMMIT_SHA;

  return new Response(`Environment: ${env}, Commit: ${commit}`);
}
```

### Cloudflare Workers Variables

**Defined in**: `wrangler.toml`

```toml
[vars]
ACX_DATASET_VERSION = "dev"
```

**Accessible in Worker code**:
```typescript
export default {
  async fetch(request, env) {
    const version = env.ACX_DATASET_VERSION; // "dev"
    return new Response(`Dataset version: ${version}`);
  },
};
```

**Why not use .env file?**
- Workers run in V8 isolates (no filesystem)
- Environment variables must be defined in `wrangler.toml` or dashboard
- Secrets use separate mechanism (Wrangler secrets)

**Adding secrets** (not used currently):
```bash
wrangler secret put API_KEY
# Prompts for value, stores encrypted in Cloudflare
```

## Build Outputs

### dist/ Directory Structure

**Location**: `/dist/` (repository root)

**Generated by**: `make build` (Python derivation pipeline)

**Contents**:
```
dist/
├── artifacts/
│   ├── <hash>/
│   │   ├── manifest.json
│   │   ├── emission_factors.json
│   │   └── activities.json
│   └── latest/  (symlink to latest hash)
├── references/
│   ├── <dataset-id>/
│   │   ├── reference-1.pdf
│   │   └── reference-2.pdf
│   └── index.json
└── site/
    ├── index.html
    ├── assets/
    └── manifest.json
```

**Artifact structure**:
- Content-addressable: `dist/artifacts/<sha256-hash>/`
- Immutable: Once written, never changed
- Deterministic: Same input data → same hash
- Versioned: `manifest.json` includes schema version

**Why content-addressable?**
- **Integrity**: Hash proves data hasn't been tampered with
- **Caching**: Safe to cache forever (hash changes if content changes)
- **Rollback**: Previous versions remain accessible by hash
- **Audit trail**: Git history + artifact hashes = complete provenance

**Manifest format** (`manifest.json`):
```json
{
  "version": "1.0",
  "generatedAt": "1970-01-01T00:00:00+00:00",
  "backend": "csv",
  "figures": {
    "totalEmissionFactors": 99,
    "totalActivities": 107,
    "totalSectors": 8
  },
  "files": {
    "emission_factors.json": {
      "hash": "sha256:abcdef...",
      "size": 15234
    },
    "activities.json": {
      "hash": "sha256:123456...",
      "size": 8192
    }
  }
}
```

### apps/carbon-acx-web/dist/ Directory

**Generated by**: `pnpm build` (Vite build)

**Contents**:
```
apps/carbon-acx-web/dist/
├── index.html                  (Entry HTML, no hash)
├── assets/
│   ├── index-a3b4c5d6.js       (Main bundle)
│   ├── vendor-1234abcd.js      (React, Zustand, XState)
│   ├── index-f7e8d9c0.css      (Compiled styles)
│   ├── OnboardingScene-9a8b7c.js  (Code-split scene)
│   ├── BaselineScene-6d5e4f.js
│   ├── ExploreScene-3c2b1a.js
│   ├── InsightScene-0f9e8d.js
│   └── *.woff2                 (Font files)
└── manifest.json               (Vite build manifest)
```

**Asset naming**:
- HTML files: No hash (always serve latest)
- JS/CSS: Hash in filename (`index-{hash}.js`)
- Fonts/images: Hash in filename

**Code splitting strategy**:
- **Vendor chunk**: React, ReactDOM, Zustand, XState, React Router (~120KB gzipped)
- **Scene chunks**: Each scene lazy-loaded (~20-40KB each)
- **Main chunk**: App shell, routing logic (~30KB gzipped)

**Why code splitting?**
- **Faster initial load**: Only download what's needed for current scene
- **Better caching**: Vendor chunk rarely changes (cache across deploys)
- **Smaller bundles**: 120KB initial vs. 250KB monolithic

**Build size** (typical):
- Total uncompressed: ~850KB
- Total gzipped: ~280KB
- Initial load: ~180KB (gzipped)
- Per-scene overhead: ~25KB (gzipped)

## Caching Strategy

### Static Assets (Cloudflare Pages)

**HTML files** (`index.html`):
```http
Cache-Control: public, max-age=0, must-revalidate
```
**Why?** Always fetch latest (routes might change)

**Hashed assets** (`*.{hash}.js`, `*.{hash}.css`):
```http
Cache-Control: public, max-age=31536000, immutable
```
**Why?** Hash in filename = content never changes = cache forever

**Fonts** (`*.woff2`):
```http
Cache-Control: public, max-age=31536000, immutable
```
**Why?** Fonts rarely change, safe to cache long-term

### Artifacts (Content-Addressable)

**Artifacts** (`dist/artifacts/{hash}/*`):
```http
Cache-Control: public, max-age=31536000, immutable
```
**Why?** Content-addressable = immutable = cache forever

**Artifact index** (`dist/artifacts/latest`):
```http
Cache-Control: public, max-age=300
```
**Why?** Points to latest hash, needs periodic refresh (5 minutes)

### API Responses (Cloudflare Workers)

**Computation results** (`/api/compute`):
```http
Cache-Control: private, max-age=60
```
**Why?** User-specific data, short cache (1 minute)

**Health checks** (`/api/health`):
```http
Cache-Control: public, max-age=30
```
**Why?** Public data, frequent checks (30 seconds)

### CDN Caching (Cloudflare)

**Edge caching**: Automatic for static assets

**Cache purge**: Automatic on new deploy (Pages)

**Cache analytics**: Available in Cloudflare dashboard

**Cache hit rate**: Typically 95%+ for static assets

## Edge Delivery Network

### Cloudflare CDN

**PoPs (Points of Presence)**: 200+ globally

**Regions**: Americas, Europe, Asia, Oceania, Africa

**Routing**: Anycast (traffic automatically routed to nearest PoP)

**Latency** (typical):
- US West Coast: ~10ms
- US East Coast: ~15ms
- Europe: ~20ms
- Asia: ~30ms
- Australia: ~50ms

**Performance optimizations**:
1. **HTTP/2**: Multiplexed connections, header compression
2. **Brotli compression**: ~20% smaller than gzip
3. **Early Hints**: Browser starts downloading assets before HTML parsed
4. **TLS 1.3**: Faster handshakes (0-RTT resumption)

### Compression

**Brotli** (preferred):
- Enabled for all text assets (HTML, CSS, JS, JSON)
- Compression level: 6 (balance between size and CPU)
- Typical savings: 20-25% vs. gzip

**Gzip** (fallback):
- Used if browser doesn't support Brotli
- Compression level: 6
- Typical savings: 60-70% vs. uncompressed

**Pre-compression** (Vite):
```typescript
compression({ threshold: 1024, algorithm: 'gzip' }),
compression({ threshold: 1024, algorithm: 'brotliCompress', ext: '.br' }),
```

Pre-compresses files > 1KB during build (faster than on-the-fly compression).

## Deployment Workflows

### Production Deployment

**Trigger**: Push to `main` branch

**Process**:
1. Developer merges PR to `main`
2. GitHub webhook triggers Cloudflare Pages build
3. Cloudflare clones repository
4. Runs `pnpm run build:web`
5. Uploads `apps/carbon-acx-web/dist/` to edge network
6. Updates routing (atomic cutover)
7. Old version remains accessible via unique URL

**Rollback**:
1. Go to Cloudflare Pages dashboard
2. Find previous deployment
3. Click "Rollback to this deployment"
4. Instant cutover (no rebuild)

**Downtime**: Zero (atomic deploys)

**Deploy time**: ~3-5 minutes

### Worker Deployment

**Trigger**: Manual `wrangler deploy`

**Process**:
1. Developer runs `wrangler deploy`
2. Wrangler compiles TypeScript to JavaScript
3. Bundles dependencies
4. Uploads to Cloudflare Workers
5. Routing updates propagate globally

**Rollback**:
```bash
wrangler rollback
```

**Downtime**: Zero (instant cutover)

**Deploy time**: ~30 seconds

### Staging Environment

**Status**: Not currently implemented

**Future**: Create `staging` branch
- Auto-deploy to `staging.carbon-acx.pages.dev`
- Full QA testing before production merge

## Monitoring & Observability

### Available Metrics (Cloudflare Dashboard)

**Pages**:
- Requests per second
- Bandwidth usage
- Error rate (4xx, 5xx)
- Deploy history
- Build logs

**Workers**:
- Requests per second
- CPU time (ms)
- Error rate
- Success rate

**Analytics retention**: 30 days (free tier)

### Missing (Future Improvements)

**Application monitoring**:
- User session tracking
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- Custom metrics (Zustand state size, journey completion)

**Alerting**:
- Slack/email alerts on high error rate
- Budget alerts (if approaching quota)
- Uptime monitoring (external)

## Security

### HTTPS

**Enforcement**: Automatic (Cloudflare)

**Certificate**: Auto-renewed Let's Encrypt

**TLS version**: Minimum 1.2, prefer 1.3

**HSTS**: Enabled (force HTTPS)

### Content Security Policy

**Status**: Not currently implemented

**Future**: Add CSP headers via Pages Functions
```typescript
export async function onRequest(context) {
  const response = await context.next();
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  return response;
}
```

### Secrets Management

**Current**: No secrets (static app, no API keys)

**Future**: If adding third-party APIs:
- Use Wrangler secrets (`wrangler secret put`)
- Store in Cloudflare (encrypted at rest)
- Accessible in Workers via `env.SECRET_NAME`

## Cost

### Current Usage (Free Tier)

**Cloudflare Pages**:
- Builds: ~50/month (limit: 500)
- Bandwidth: ~10GB/month (limit: unlimited)
- Requests: ~100,000/month (limit: unlimited)
- Cost: **$0/month**

**Cloudflare Workers**:
- Requests: ~5,000/month (limit: 100,000)
- CPU time: ~10ms/request (limit: 10ms average)
- Cost: **$0/month**

**Total infrastructure cost**: **$0/month**

### Scaling Projections

**10,000 users/month**:
- Pages bandwidth: ~50GB
- Worker requests: ~500,000
- Cost: Still **$0/month** (within free tier)

**100,000 users/month**:
- Pages bandwidth: ~500GB
- Worker requests: ~5,000,000
- Cost: **~$5/month** (Workers Paid plan: $5 + $0.50/million requests)

**1,000,000 users/month**:
- Pages bandwidth: ~5TB
- Worker requests: ~50,000,000
- Cost: **~$30/month** (Workers Paid + bandwidth overages)

**Why so cheap?**
- Static assets cached at edge (no origin requests)
- Workers run on V8 isolates (faster than containers)
- Cloudflare's network (not AWS/GCP markup)

## Troubleshooting

### Build Failures

**Symptom**: GitHub Actions CI fails

**Common causes**:
1. **Dependency mismatch**: `pnpm install` fails
   - Fix: Update `pnpm-lock.yaml`, commit
2. **TypeScript errors**: Build fails at compile step
   - Fix: Run `pnpm build` locally, fix errors
3. **Python errors**: Derivation pipeline fails
   - Fix: Run `make build` locally, check CSV data
4. **Test failures**: `pytest` or `pnpm test` fails
   - Fix: Run tests locally, fix broken code

**Debugging**:
1. Check GitHub Actions logs (click failed job)
2. Reproduce locally (same commands as CI)
3. Fix issue
4. Push fix (CI re-runs automatically)

### Deployment Failures

**Symptom**: Cloudflare Pages build fails

**Common causes**:
1. **Build command error**: `pnpm run build:web` fails
   - Fix: Same as CI build failures
2. **Timeout**: Build takes > 20 minutes
   - Fix: Optimize build (remove unnecessary steps)
3. **OOM**: Node process runs out of memory
   - Fix: Reduce bundle size, split builds

**Debugging**:
1. Check Cloudflare Pages dashboard (Deployments → View logs)
2. Reproduce locally (`pnpm build`)
3. Fix issue
4. Retry deployment (automatic on next push)

### Runtime Errors

**Symptom**: App loads but crashes

**Common causes**:
1. **Zustand hydration error**: localStorage data corrupt
   - Fix: Clear localStorage, reload
2. **XState error**: Invalid state transition
   - Fix: Check machine definition, validate events
3. **React error**: Component render error
   - Fix: Check error boundary logs, fix component

**Debugging**:
1. Check browser console (F12 → Console)
2. Check error boundary fallback UI
3. Reproduce locally (same environment)
4. Fix issue, deploy

## Related Diagrams

- See `entry-points.mermaid.md` for build process details
- See `architecture-overview.mermaid.md` for system context
- See `repo-structure.mermaid.md` for file organization
