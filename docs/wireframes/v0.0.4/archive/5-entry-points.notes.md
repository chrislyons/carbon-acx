# Entry Points Notes

**Version:** v0.0.4 (November 2025)
**Purpose:** Document all ways to interact with the Carbon ACX codebase

## Overview

Carbon ACX has multiple entry points for different use cases:

1. **Build & Development** - Makefile targets for common operations
2. **Python Commands** - Direct Python module invocation
3. **Next.js Commands** - Frontend development and build
4. **Web Routes** - User-facing pages and APIs
5. **Git Workflow** - Version control interactions
6. **Deployment** - Cloudflare Pages deployment
7. **Configuration** - Settings and environment files

## 1. Build & Development Entry Points

### Makefile Commands

**Location:** `/Makefile` (176 lines)

**Purpose:** Single source of truth for build operations

#### `make install`

**Command:**
```bash
make install
```

**What it does:**
1. Runs `poetry install --with dev` (Python dependencies)
2. Runs `pnpm install` (Node.js dependencies)
3. Sets up development environment

**When to use:**
- After cloning repository
- After pulling changes that modify dependencies
- When `pyproject.toml` or `package.json` changes

**Output:**
```
✓ Python dependencies installed via Poetry
✓ Node.js dependencies installed via pnpm
✓ Ready for development
```

#### `make build`

**Command:**
```bash
make build
```

**What it does:**
1. Runs `poetry run python -m calc.derive`
2. Loads CSV files from `data/`
3. Validates schemas with Pydantic
4. Calculates emissions
5. Generates figures and manifests
6. Writes outputs to `dist/artifacts/<hash>/`

**When to use:**
- After editing CSV files in `data/`
- Before committing data changes
- To regenerate artifacts

**Output:**
```
Loading activities from data/activities.csv...
Loading emission factors from data/emission_factors.csv...
Validating schemas...
Calculating emissions...
Generating figures...
Creating manifests...
✓ Artifacts generated in dist/artifacts/a1b2c3d4/
```

#### `make validate`

**Command:**
```bash
make validate
```

**What it does:**
1. Runs `ruff check calc/` (Python linter)
2. Runs `black --check calc/` (Python formatter check)
3. Reports style violations

**When to use:**
- Before committing Python code
- As part of pre-commit hook
- In CI pipeline

**Output:**
```
Ruff: No errors found
Black: All files would be left unchanged
✓ Validation passed
```

#### `make test`

**Command:**
```bash
make test
```

**What it does:**
1. Runs `pytest tests/` (Python test suite)
2. Validates emission factor logic
3. Checks manifest integrity
4. Tests schema validation

**When to use:**
- After modifying calculation logic
- Before committing code changes
- As part of CI pipeline

**Output:**
```
============================= test session starts ==============================
tests/test_emission_factors.py ....                                      [ 50%]
tests/test_manifests.py ....                                              [100%]

============================== 10 passed in 2.34s ===============================
```

#### `make build-web`

**Command:**
```bash
make build-web
```

**What it does:**
1. Runs `pnpm --filter carbon-acx-web run build`
2. Compiles TypeScript to JavaScript
3. Bundles components with Webpack/Turbopack
4. Generates static pages (SSG)
5. Creates `.next/` directory

**When to use:**
- Before deployment
- To test production build locally
- As part of CI pipeline

**Output:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          87 kB
├ ○ /calculator                          4.2 kB         92 kB
├ ○ /explore                             2.1 kB         89 kB
└ ○ /manifests                           3.4 kB         91 kB

○  (Static)  prerendered as static content
✓ Compiled successfully
```

#### `make package`

**Command:**
```bash
make package
```

**What it does:**
1. Runs `make build` (Python artifacts)
2. Runs `make build-web` (Next.js build)
3. Combines artifacts + web build
4. Prepares `dist/site/` for deployment

**When to use:**
- Before manual deployment
- In CI pipeline
- To create deployment archive

#### `make ci_build_pages`

**Command:**
```bash
make ci_build_pages
```

**What it does:**
1. Runs `make install`
2. Runs `make lint` (Python + TypeScript)
3. Runs `make test`
4. Runs `make package`
5. Full CI pipeline in one command

**When to use:**
- Cloudflare Pages build command
- Local CI simulation
- Pre-deployment validation

**Environment Variables:**
- `CI=true` - Sets CI mode (affects error handling)

## 2. Python Entry Points

### Direct Module Invocation

#### `python -m calc.derive`

**Purpose:** Main derivation engine

**Command:**
```bash
python -m calc.derive
```

**Arguments:**
- None (uses default configuration)
- Reads from `data/*.csv`
- Writes to `dist/artifacts/`

**Use Cases:**
- Generate artifacts from CSV data
- Triggered by `make build`
- Direct invocation for debugging

**Example:**
```bash
# With verbose output
python -m calc.derive --verbose

# With specific data directory
python -m calc.derive --data-dir ./data-staging
```

#### `python -m calc.service`

**Purpose:** High-level API for programmatic use

**Command:**
```python
from calc.service import CarbonService

service = CarbonService(data_dir='data/')
figures = service.generate_figures()
manifests = service.verify_manifests()
```

**Use Cases:**
- Python scripts that need calculation logic
- Jupyter notebooks for analysis
- Integration tests

#### `python -m calc.make_catalog`

**Purpose:** Generate activity catalog

**Command:**
```bash
python -m calc.make_catalog
```

**Output:**
- `dist/catalog.json` - Searchable activity index
- Layer summaries
- Category aggregations

#### `pytest tests/`

**Purpose:** Run test suite

**Command:**
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_emission_factors.py

# Run with verbose output
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=calc
```

**Test Files:**
- `test_emission_factors.py` - Emission factor validation
- `test_manifests.py` - Manifest integrity checks
- `test_schema.py` - Pydantic model validation
- `test_calculations.py` - Emission calculation accuracy

## 3. Next.js Entry Points

### pnpm Commands

**Working Directory:** `apps/carbon-acx-web/`

#### `pnpm dev`

**Purpose:** Start development server

**Command:**
```bash
cd apps/carbon-acx-web
pnpm dev
```

**What it does:**
- Starts Next.js dev server on http://localhost:3000
- Hot module replacement (HMR)
- Fast refresh (React state preserved)
- Source maps for debugging

**Environment:**
- `NODE_ENV=development`
- TypeScript errors shown in browser
- React DevTools enabled

**Use Cases:**
- Local development
- Testing changes in real-time
- Debugging UI issues

#### `pnpm build`

**Purpose:** Production build

**Command:**
```bash
cd apps/carbon-acx-web
pnpm build
```

**What it does:**
1. TypeScript compilation (`tsc --noEmit`)
2. Bundle optimization (minification, tree shaking)
3. Static generation (SSG for static pages)
4. Server function compilation

**Output:**
- `.next/` directory with production build
- Bundle analysis (if enabled)
- Build warnings/errors

**When to use:**
- Before deployment
- To test production bundle
- As part of CI pipeline

#### `pnpm start`

**Purpose:** Start production server

**Command:**
```bash
cd apps/carbon-acx-web
pnpm build && pnpm start
```

**What it does:**
- Serves `.next/` directory
- Production optimizations enabled
- No HMR (static build)

**Port:** http://localhost:3000

**Use Cases:**
- Test production build locally
- Performance testing
- Pre-deployment validation

#### `pnpm test`

**Purpose:** Run Vitest tests

**Command:**
```bash
cd apps/carbon-acx-web
pnpm test
```

**What it does:**
- Runs unit tests for components
- Tests utility functions
- Component integration tests

**Test Files:**
- `tests/*.test.ts` - Unit tests
- `tests/*.test.tsx` - Component tests

**Current Status:** Minimal tests (infrastructure ready)

#### `pnpm typecheck`

**Purpose:** TypeScript validation

**Command:**
```bash
cd apps/carbon-acx-web
pnpm typecheck
```

**What it does:**
- Runs `tsc --noEmit`
- Checks type errors
- No output files (checking only)

**Use Cases:**
- Pre-commit validation
- CI pipeline
- IDE integration

#### `pnpm lint`

**Purpose:** ESLint check

**Command:**
```bash
cd apps/carbon-acx-web
pnpm lint
```

**What it does:**
- Runs ESLint on all `.ts`/`.tsx` files
- Reports style violations
- Can auto-fix some issues (`pnpm lint --fix`)

**Rules:** Next.js recommended + custom rules

## 4. Web Entry Points (User-Facing)

### Page Routes

**Base URL:** `https://carbon-acx.pages.dev` (production)
**Local:** `http://localhost:3000` (development)

#### `GET /`

**Route:** Home Page

**Purpose:** Landing page with navigation

**Features:**
- Project description
- 3-card navigation grid
- Links to main features

**Implementation:** Server Component (SSG)

**Response Time:** ~50ms

#### `GET /calculator`

**Route:** Carbon Calculator

**Purpose:** Interactive footprint wizard

**Features:**
- Activity selection (transportation, food, media)
- Real-time emission calculations
- Results display with comparisons
- 2D → 3D reveal button

**Implementation:** Mixed (Server + Client Components)

**Response Time:** ~100ms (initial load)

**Query Params:** None

#### `GET /explore`

**Route:** Explore Hub

**Purpose:** Launch 2D or 3D data exploration

**Features:**
- View mode selector (2D charts | 3D Universe)
- Activity count and total emissions
- Launch buttons for each mode

**Implementation:** Server Component

**Response Time:** ~80ms

#### `GET /explore/3d`

**Route:** 3D Universe Visualization

**Purpose:** Full 3D data exploration

**Features:**
- Full-screen DataUniverse component
- Activity selection sidebar
- Stats panel
- Back button to Explore hub

**Implementation:** Mixed (lazy-loaded 3D)

**Response Time:** ~100ms + 3D bundle load (~500ms)

#### `GET /manifests`

**Route:** Manifest List

**Purpose:** Browse all generated manifests

**Features:**
- Grid of manifest cards
- Figure IDs with links
- Generated dates and hash prefixes
- Search/filter (planned)

**Implementation:** Server Component (SSG or SSR)

**Data Source:** `lib/manifests.ts` → `dist/artifacts/manifest.json`

**Response Time:** ~60ms

#### `GET /manifests/:id`

**Route:** Manifest Detail

**Purpose:** Display full manifest with provenance

**Features:**
- Schema version display
- Full SHA256 hash (monospace)
- Citation list with source links
- References section
- "Verify Integrity" button

**Implementation:** Server Component (dynamic route)

**Data Source:** `lib/manifests.ts` → `dist/artifacts/manifests/:id-manifest.json`

**Response Time:** ~70ms

**Example:** `/manifests/TRAN.SCHOOLRUN.CAR.KM`

#### `GET /methodology`

**Route:** Methodology Documentation

**Purpose:** Explain calculation methods

**Features:**
- Activity-based formula
- Data sources (GHG Protocol, EPA, IPCC, DEFRA)
- Quality assurance process
- Limitations and assumptions
- Links to external standards

**Implementation:** Server Component (SSG)

**Response Time:** ~50ms

### API Routes

#### `GET /api/health`

**Purpose:** Health check endpoint

**Response:**
```json
{
  "status": "ok"
}
```

**Use Cases:**
- Monitoring (uptime checks)
- Cloudflare Pages health probe
- CI pipeline validation

**Response Time:** <10ms

#### `GET /api/manifests`

**Purpose:** List all manifests

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

**Caching:** `Cache-Control: max-age=3600, s-maxage=3600` (1 hour)

**Use Cases:**
- Client-side data fetching (TanStack Query)
- External integrations
- Programmatic access

**Response Time:** ~40ms

#### `GET /api/manifests/:id`

**Purpose:** Get single manifest detail

**Response:**
```json
{
  "schema_version": "1.0.0",
  "figure_id": "TRAN.SCHOOLRUN.CAR.KM",
  "figure_method": "activity-based",
  "generated_at": "2025-11-11T12:00:00Z",
  "hash_prefix": "a1b2c3d4",
  "figure_path": "figures/TRAN.SCHOOLRUN.CAR.KM-a1b2c3d4.json",
  "figure_sha256": "abc123...",
  "citation_keys": ["SRC.ECCC.NIR.2025"],
  "references": {...}
}
```

**Error Handling:**
```json
{
  "error": "Manifest not found",
  "status": 404
}
```

**Response Time:** ~50ms

## 5. Git Workflow Entry Points

### Repository Operations

#### `git clone`

**Command:**
```bash
git clone https://github.com/chrislyons/carbon-acx.git
cd carbon-acx
```

**Next Steps:**
```bash
make install  # Install dependencies
make build    # Generate artifacts
pnpm dev      # Start dev server
```

#### `git checkout -b feature/my-feature`

**Command:**
```bash
git checkout -b feature/my-feature
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

#### `git commit -m`

**Command:**
```bash
git add .
git commit -m "feat: add new emission factor source"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance

**Pre-Commit Hooks (if configured):**
- Lint check (Ruff, ESLint)
- Format check (Black, Prettier)
- Type check (TypeScript)

#### `git push origin`

**Command:**
```bash
git push origin feature/my-feature
```

**What happens:**
- Code pushed to GitHub
- Cloudflare Pages creates preview deployment
- CI pipeline runs (if configured)

#### GitHub Pull Request

**Process:**
1. Push branch to GitHub
2. Create PR from branch → `main`
3. CI checks run automatically
4. Code review
5. Merge to `main`
6. Auto-deploy to production

## 6. Deployment Entry Points

### Cloudflare Pages

#### Auto-Deploy on Push

**Trigger:** `git push origin main`

**What happens:**
1. Cloudflare detects push
2. Runs build command: `make ci_build_pages`
3. Deploys `.next/` directory
4. Updates production URL: `carbon-acx.pages.dev`

**Build Configuration:**
- Build command: `make ci_build_pages`
- Build output directory: `.next`
- Node version: 20.19.4

#### Preview Deployments

**Trigger:** Push to any branch except `main`

**What happens:**
1. Cloudflare creates preview URL: `https://<hash>.carbon-acx.pages.dev`
2. Unique URL per branch/commit
3. Full isolated environment

**Use Cases:**
- Test changes before merge
- Share with collaborators
- QA testing

#### `wrangler pages dev`

**Purpose:** Local Cloudflare Pages emulation

**Command:**
```bash
cd apps/carbon-acx-web
wrangler pages dev .next
```

**What it does:**
- Emulates Cloudflare Workers runtime
- Tests SSR behavior locally
- Validates Edge Function compatibility

**Port:** http://localhost:8788

#### `wrangler pages deploy`

**Purpose:** Manual deployment

**Command:**
```bash
cd apps/carbon-acx-web
pnpm build
wrangler pages deploy .next
```

**When to use:**
- Manual production deploy
- Rollback to previous version
- Testing deployment process

## 7. Configuration Entry Points

### Python Configuration

#### `pyproject.toml`

**Location:** `/pyproject.toml`

**Sections:**
- `[tool.poetry.dependencies]` - Python dependencies
- `[tool.poetry.dev-dependencies]` - Dev dependencies
- `[tool.ruff]` - Linter configuration
- `[tool.black]` - Formatter configuration
- `[tool.pytest]` - Test configuration

**Example:**
```toml
[tool.poetry.dependencies]
python = "^3.11"
pandas = "^2.2"
pydantic = "^2.6"

[tool.ruff]
line-length = 100
select = ["E", "F", "W"]

[tool.black]
line-length = 100
target-version = ['py311']
```

### Node.js Configuration

#### `package.json`

**Location:** `/package.json` (root) and `/apps/carbon-acx-web/package.json`

**Root `package.json`:**
```json
{
  "name": "carbon-acx",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "build": "pnpm --filter carbon-acx-web run build",
    "dev": "pnpm --filter carbon-acx-web run dev"
  }
}
```

**App `package.json`:**
```json
{
  "name": "carbon-acx-web",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "three": "^0.168.0"
  }
}
```

#### `next.config.ts`

**Location:** `/apps/carbon-acx-web/next.config.ts`

**Example:**
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,  // Temporary (R3F + React 19)
  },

  env: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_ENABLE_3D: 'true',
  },

  images: {
    unoptimized: process.env.CF_PAGES === '1',
  },
}
```

**Sections:**
- `reactStrictMode` - Enable strict mode
- `typescript` - TypeScript config overrides
- `env` - Environment variables
- `images` - Image optimization settings

#### `wrangler.toml`

**Location:** `/apps/carbon-acx-web/wrangler.toml`

**Example:**
```toml
name = "carbon-acx-web"
compatibility_date = "2025-01-01"
pages_build_output_dir = ".next"

[env.production]
routes = [
  { pattern = "carbon-acx.pages.dev", custom_domain = true }
]
```

**Sections:**
- `name` - Project name
- `compatibility_date` - Cloudflare runtime version
- `pages_build_output_dir` - Build output directory
- `env.production` - Production environment config

#### `CLAUDE.md`

**Location:** `/CLAUDE.md`

**Purpose:** Development guide for AI assistants

**Sections:**
- Critical context budget rules
- File boundaries (never read / read first)
- Architecture quick reference
- Workflow systems
- Custom agents
- Cross-repo awareness
- Examples

**Use Cases:**
- Onboard Claude Code assistant
- Document development patterns
- Define file read priorities

## Common Workflows

### Data Update Workflow

```bash
# 1. Edit CSV files
vim data/activities.csv
vim data/emission_factors.csv

# 2. Regenerate artifacts
make build

# 3. Run tests
make test

# 4. Commit changes
git add data/ dist/
git commit -m "feat: add new emission factors for CA-BC"
git push origin feature/new-ef
```

### Frontend Development Workflow

```bash
# 1. Start dev server
cd apps/carbon-acx-web
pnpm dev

# 2. Edit components
vim src/app/calculator/page.tsx

# 3. Test in browser
# Navigate to http://localhost:3000/calculator

# 4. Type check
pnpm typecheck

# 5. Commit
git add src/
git commit -m "feat: improve calculator UX"
git push
```

### Deployment Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit code ...

# 3. Test locally
make ci_build_pages

# 4. Push for preview
git push origin feature/my-feature
# Cloudflare creates preview URL

# 5. Create PR
# ... GitHub PR ...

# 6. Merge to main
# Auto-deploys to production
```

## Security Considerations

### API Endpoints

**Public Endpoints:**
- All routes under `/api/` are public
- No authentication required (read-only app)
- Rate limiting via Cloudflare (future)

**Input Validation:**
- Route params validated by Next.js
- No user-generated content
- No write operations

### Environment Variables

**Build-Time Variables:**
- `NEXT_PUBLIC_*` - Exposed to browser
- Regular vars - Server-side only

**Sensitive Data:**
- No API keys in codebase
- No database credentials (no database)
- All data from public CSV files

## Performance Monitoring

### Entry Points for Monitoring

**Health Check:**
```bash
curl https://carbon-acx.pages.dev/api/health
# { "status": "ok" }
```

**Web Vitals:**
- Lighthouse CI (planned)
- Cloudflare Analytics (enabled)
- Next.js Speed Insights (optional)

### Debugging Entry Points

**Browser DevTools:**
- React DevTools (development)
- Console logs (development)
- Network tab (inspect API calls)

**Server Logs:**
- Cloudflare Pages logs (dashboard)
- `console.log()` visible in function logs

## Related Diagrams

- **Repo Structure** (`1-repo-structure.mermaid.md`)
- **Architecture Overview** (`2-architecture-overview.mermaid.md`)
- **Component Map** (`3-component-map.mermaid.md`)
- **Data Flow** (`4-data-flow.mermaid.md`)
- **Deployment Infrastructure** (`6-deployment-infrastructure.mermaid.md`)

## References

- Makefile - Build orchestration
- pyproject.toml - Python dependencies
- package.json - Node.js dependencies
- next.config.ts - Next.js configuration
- wrangler.toml - Cloudflare configuration
- CLAUDE.md - Development guide
