# Carbon ACX Wireframes v0.0.4

**Generated:** November 2025
**Reflects:** Next.js 15 rebuild (ACX093) + 3D Universe integration (ACX084/ACX094)

## Overview

This directory contains comprehensive Mermaid wireframes documenting the current architecture of Carbon ACX. Each topic has two files:

1. **`.mermaid.md`** - Pure Mermaid diagram (paste into mermaid.live)
2. **`.notes.md`** - Extended documentation and architectural insights

## Files

| File | Purpose |
|------|---------|
| `1-repo-structure.mermaid.md` | Complete directory tree visualization |
| `1-repo-structure.notes.md` | Directory purposes, code organization, where to find things |
| `2-architecture-overview.mermaid.md` | 6-layer system architecture |
| `2-architecture-overview.notes.md` | Layer details, design patterns, tech stack |
| `3-component-map.mermaid.md` | React component hierarchy (Next.js App Router) |
| `3-component-map.notes.md` | Component APIs, responsibilities, boundaries |
| `4-data-flow.mermaid.md` | Sequence diagram: CSV → Python → Artifacts → UI |
| `4-data-flow.notes.md` | Data transformations, state management, API flows |
| `5-entry-points.mermaid.md` | All ways to interact with codebase |
| `5-entry-points.notes.md` | Build commands, dev workflow, API endpoints |
| `6-deployment-infrastructure.mermaid.md` | CI/CD pipeline and Cloudflare Pages |
| `6-deployment-infrastructure.notes.md` | Deployment process, monitoring, rollback procedures |

## Quick Start

### View Diagrams

**Option 1: mermaid.live (Recommended)**
1. Go to https://mermaid.live
2. Copy contents of `*.mermaid.md` file
3. Paste into editor
4. Diagram renders automatically

**Option 2: VS Code Extension**
1. Install "Markdown Preview Mermaid Support" extension
2. Open `*.mermaid.md` file
3. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
4. Diagram renders in preview pane

**Option 3: GitHub (Native Support)**
- GitHub renders Mermaid diagrams in markdown files automatically
- View any `*.mermaid.md` file directly on GitHub

### Read Documentation

**Standalone:** Read `*.notes.md` files in any markdown viewer

**Paired with Diagrams:** Best experience is diagram + notes side-by-side

## What's New in v0.0.4

### Architecture Changes

1. **Next.js 15 Migration** (ACX093)
   - Migrated from Vite + React 18 to Next.js 15 + React 19
   - App Router (Server Components + Client Components)
   - API routes replace standalone backend

2. **3D Universe Integration** (ACX084, ACX094)
   - DataUniverse component (Three.js + React Three Fiber)
   - Lazy loading for SSR safety
   - Orbital motion animations
   - Camera choreography

3. **Manifest Architecture** (ACX093 Phase 4)
   - Content-addressed artifacts with SHA256 hashes
   - Provenance tracking from source to figure
   - Server-side manifest loading (no client fetch needed)

### Deployment Updates

- **Cloudflare Pages:** Auto-deploy from GitHub
- **Preview URLs:** Per-branch deployments
- **SSR Support:** Server Components on Cloudflare Workers

## Architecture Layers

### 1. Data Layer
- **Location:** `data/*.csv`
- **Purpose:** Canonical source of truth
- **Contents:** Activities, emission factors, grid intensity, sources

### 2. Derivation Layer
- **Location:** `calc/` (Python)
- **Purpose:** Transform CSV → manifests with byte hashes
- **Key Files:** `derive.py`, `schema.py`, `figures.py`

### 3. Artifacts Layer
- **Location:** `dist/artifacts/<hash>/`
- **Purpose:** Immutable, content-addressed outputs
- **Contents:** Manifests, figures, references

### 4. Frontend Layer
- **Location:** `apps/carbon-acx-web/` (Next.js 15)
- **Purpose:** User-facing web application
- **Tech Stack:** React 19, TypeScript, Tailwind CSS, Three.js

### 5. Edge Layer
- **Platform:** Cloudflare Pages + Workers
- **Purpose:** Global CDN and serverless functions
- **Features:** SSR, API routes, automatic SSL

## Key Technologies

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 15.0.3 |
| | React | 19.0.0 |
| | TypeScript | 5.7.2 |
| | Tailwind CSS | 4.0.0 |
| **3D Graphics** | Three.js | 0.168.0 |
| | React Three Fiber | 8.17.10 |
| | React Three Drei | 9.114.3 |
| **State** | TanStack Query | 5.90.5 |
| | Zustand | 4.5.4 |
| **Backend** | Python | 3.11+ |
| | Pandas | 2.2+ |
| | Pydantic | 2.6+ |
| **Build** | pnpm | 10.5.2 |
| | Poetry | Latest |
| | Make | GNU Make |
| **Deploy** | Cloudflare Pages | - |

## Common Workflows

### Data Update
```bash
vim data/activities.csv     # Edit CSV
make build                  # Regenerate artifacts
make test                   # Validate
git commit & push           # Deploy
```

### Frontend Development
```bash
cd apps/carbon-acx-web
pnpm dev                    # Start dev server (localhost:3000)
# ... edit components ...
pnpm typecheck              # Validate types
git commit & push           # Deploy preview
```

### Full CI Pipeline
```bash
make ci_build_pages         # Install + lint + test + build + package
```

## Component Hierarchy

```
Root Layout (Server Component)
├── QueryProvider (Client Component)
├── Header (Layout)
├── Footer (Layout)
└── Pages (App Router)
    ├── Home (/)
    ├── Calculator (/calculator)
    ├── Explore (/explore)
    │   └── 3D Universe (/explore/3d)
    │       └── DataUniverse (lazy-loaded)
    ├── Manifests (/manifests)
    │   └── Manifest Detail (/manifests/:id)
    └── Methodology (/methodology)
```

## Data Flow Summary

```
1. CSV Files (data/)
   ↓ (make build)
2. Python Pipeline (calc/derive.py)
   ↓ (validation + calculation)
3. Artifacts (dist/artifacts/)
   ↓ (Next.js build)
4. Server Components (lib/manifests.ts)
   ↓ (SSR/SSG)
5. React UI (pages + components)
   ↓ (user interaction)
6. 3D Visualization (DataUniverse)
```

## Deployment Flow

```
1. git push origin main
   ↓ (GitHub webhook)
2. Cloudflare Pages Build
   ↓ (make ci_build_pages)
3. Upload to CDN
   ↓ (global propagation)
4. Production Live
   (https://carbon-acx.pages.dev)
```

## API Endpoints

- `GET /` - Home page
- `GET /calculator` - Carbon footprint wizard
- `GET /explore` - Data exploration hub
- `GET /explore/3d` - 3D Universe visualization
- `GET /manifests` - List all manifests
- `GET /manifests/:id` - Manifest detail with provenance
- `GET /methodology` - Calculation methodology docs
- `GET /api/health` - Health check
- `GET /api/manifests` - List manifests (JSON)
- `GET /api/manifests/:id` - Get manifest (JSON)

## Build Commands

| Command | Purpose |
|---------|---------|
| `make install` | Install Python + Node.js dependencies |
| `make build` | Generate Python artifacts |
| `make validate` | Lint + format check |
| `make test` | Run test suite |
| `make build-web` | Build Next.js frontend |
| `make package` | Combine artifacts + web build |
| `make ci_build_pages` | Full CI pipeline |

## File Boundaries

### Never Read (Claude Code)
- `dist/` - Build outputs
- `node_modules/` - Dependencies
- `data/raw/*.sqlite` - Raw databases
- `docs/acx/archive/` - Archived docs
- `.next/` - Next.js build cache

### Read First
- `CLAUDE.md` - Development guide
- `README.md` - Project overview
- `docs/acx/ACX084.md` - 3D Universe architecture
- `docs/acx/ACX093.md` - Next.js rebuild strategy
- `docs/acx/INDEX.md` - Active doc catalog

## Version History

- **v0.0.1** - Initial Vite React implementation
- **v0.0.2** - Canvas-first architecture with XState
- **v0.0.3** - 3D Universe integration (ACX084)
- **v1.0.0** - Pre-Next.js rebuild snapshot
- **v0.0.4** (Current) - Next.js 15 rebuild + DataUniverse port

## Contributing

When making architectural changes:

1. **Update Wireframes:** Create new version directory (e.g., `v0.0.5/`)
2. **Document Changes:** Update relevant `.mermaid.md` and `.notes.md` files
3. **Update README:** Add version to history with key changes
4. **Reference Docs:** Create ACX doc (e.g., `ACX095.md`) for major changes

## Related Documentation

- **ACX084.md** - 3D Universe Foundation Sprint
- **ACX093.md** - Strategic Frontend Rebuild Specification
- **ACX094.md** - Phase 3 3D Visualization Implementation
- **CLAUDE.md** - Development guide (v3.0)
- **README.md** - Project overview

## Viewing Recommendations

**For Developers:**
1. Start with `1-repo-structure` (understand layout)
2. Read `2-architecture-overview` (understand layers)
3. Dive into `3-component-map` (understand components)
4. Reference `5-entry-points` (understand commands)

**For Stakeholders:**
1. Start with `2-architecture-overview` (high-level design)
2. Review `4-data-flow` (understand data pipeline)
3. Check `6-deployment-infrastructure` (understand hosting)

**For New Contributors:**
1. Read all `.notes.md` files sequentially
2. Keep diagrams open for reference
3. Follow "Common Workflows" section
4. Refer to `5-entry-points` for commands

## Maintenance

**Update Frequency:** After major architectural changes

**Triggers:**
- New major feature (e.g., authentication, database)
- Framework migration (e.g., Next.js 16)
- Deployment changes (e.g., switch to Vercel)
- Component restructuring (e.g., new design system)

**Process:**
1. Copy current version to archive (if needed)
2. Create new version directory
3. Update all diagrams + notes
4. Update this README
5. Create PR for review

---

**Generated By:** Claude Code (Anthropic)
**Generation Script:** `docs/guides/Mermaid + Docs Prompt.md`
**Last Updated:** 2025-11-11
