# Carbon ACX Mermaid Diagram Documentation

**Generated**: 2025-10-27
**Architecture Version**: 3D Universe (v2.1)
**Branch**: `feature/3d-universe`

## Overview

This directory contains comprehensive Mermaid diagram documentation for the Carbon ACX codebase. Each topic includes:
- **`.mermaid.md`**: Pure Mermaid diagram (validated on mermaid.live)
- **`.notes.md`**: Detailed architectural explanations, patterns, and guidance

## Diagrams

### 1. Repository Structure ✅

**Files**: `repo-structure.mermaid.md`, `repo-structure.notes.md`

**Coverage**: Directory layout, file organization, Python packages, web apps, infrastructure code, configuration files.

**Use this when**: Understanding codebase organization, finding where to add new files, learning monorepo structure.

### 2. Architecture Overview ✅

**Files**: `architecture-overview.mermaid.md`, `architecture-overview.notes.md`

**Coverage**: High-level system architecture, data layer, derivation engine, user interfaces (Dash, Web, 3D Universe), edge delivery, monitoring.

**Use this when**: Onboarding new developers, explaining system design, understanding data flow at 10,000ft view.

### 3. Component Map 🆕

**Files**: `component-map.mermaid.md`, `component-map.notes.md`

**Coverage**: Component tiers (Primitives → Visualizations → Domain → Pages), DataUniverse 3D module, 2D overlays, state management (Zustand, TanStack Query), hooks, utilities, design tokens.

**Use this when**: Understanding component hierarchy, finding where to add new components, learning state management patterns, using DataUniverse.

**Key Sections**:
- Tier 1: Radix UI primitives (Button, Dialog, Tooltip)
- Tier 2: Visualizations (DataUniverse 3D, ECharts 2D)
- Tier 3: Domain (CitationPanel, MethodologyModal, ActivityManagement)
- Tier 4: Pages (WelcomePage, CalculatorPage, ExplorePage, InsightsPage)
- State: Zustand store (single source of truth)
- SSR Safety: Lazy loading pattern for Three.js

### 4. Data Flow 🆕

**Files**: `data-flow.mermaid.md`, `data-flow.notes.md`

**Coverage**: User journey flows (Welcome → Calculator → Explore → Insights), data derivation pipeline (CSV → artifacts), state updates (Zustand + TanStack Query), 3D rendering loop (Three.js useFrame), activity CRUD, artifact loading.

**Use this when**: Debugging data flow issues, understanding how user actions propagate, learning rendering loop, tracing artifact loading.

**Key Flows**:
- User Journey: Landing → Calculator → 2D results → 3D reveal → Explore → Insights
- Derivation Pipeline: CSV → Validation → Computation → Manifest → Hash → Artifacts
- State Management: User action → Store action → State update → Persist → Re-render
- 3D Rendering: Mount → Scene setup → useFrame loop → Orbital calc → Mesh update → Render
- CRUD Operations: Add/Edit/Delete activity → Update store → Recalculate total → Update 3D

### 5. Entry Points 🆕

**Files**: `entry-points.mermaid.md`, `entry-points.notes.md`

**Coverage**: Web app entry (main.tsx → CanvasApp → Router), Dash app (app.py), CLI commands (make build, python -m calc.derive), Worker API (/api/compute, /api/health), Pages Function (artifact proxy), dev servers.

**Use this when**: Understanding application initialization, adding new routes/commands, deploying to production, running dev servers.

**Key Entry Points**:
- Web App: `index.html` → `main.tsx` → `CanvasApp.tsx` → React Router → Pages
- Dash App: `make app` → `app/app.py` → Flask server (localhost:8050)
- CLI: `make build` → `calc/derive.py` → Artifacts
- Worker: `workers/index.ts` → `/api/compute` (edge compute)
- Pages Function: `functions/carbon-acx/[[path]].ts` → Artifact proxy
- Dev Servers: `pnpm dev` (5173), `wrangler dev` (8787)

### 6. Deployment Infrastructure 🆕

**Files**: `deployment-infrastructure.mermaid.md`, `deployment-infrastructure.notes.md`

**Coverage**: Build process (make build → make package), GitHub Actions CI/CD, Cloudflare Pages deployment, Worker deployment, Pages Functions, CDN caching, SSR safety, monitoring.

**Use this when**: Deploying to production, understanding build pipeline, optimizing caching, troubleshooting SSR errors, monitoring performance.

**Key Processes**:
- Local Build: `make build` → Derivation → Hash → Artifacts
- Web Build: `pnpm build:web` → Vite → Bundle → dist/
- Package: Copy artifacts + web → dist/site/ → Add _headers, _redirects
- CI/CD: GitHub Actions → Lint → Test → Build → Deploy to Pages
- Pages Deployment: Upload → Extract → Build Functions → Deploy to edge
- Worker Deployment: `wrangler deploy` → Bundle → Upload → Activate
- Caching: Browser → Edge (Tier 1) → Edge (Tier 2) → Origin
- SSR Safety: React.lazy() + Suspense for Three.js

## Diagram Format

### .mermaid.md Files

- **Pure Mermaid**: Start directly with `%%` comments, NO ```mermaid fence
- **Multi-line Labels**: Use `<br/>` for line breaks (Node["Line 1<br/>Line 2"])
- **Subgraphs**: Organize related nodes
- **Emojis**: Visual categorization (📁 📊 🔧 🌐 ⚡ 💾)
- **Styling**: `classDef` for color-coding sections
- **Validation**: All diagrams tested on mermaid.live

### .notes.md Files

- **Overview**: High-level summary of diagram content
- **Key Decisions**: Architectural choices and rationale
- **Patterns**: Common development patterns
- **Technical Debt**: Known complexity areas
- **Where to Make Changes**: File paths and line numbers
- **Common Workflows**: Step-by-step procedures
- **Troubleshooting**: Symptoms, causes, solutions
- **Related Diagrams**: Cross-references

## Viewing Diagrams

### Option 1: Mermaid Live Editor (Recommended)

1. Copy `.mermaid.md` contents
2. Paste into https://mermaid.live
3. Diagram renders immediately
4. Export as PNG/SVG if needed

### Option 2: VS Code Extension

1. Install "Markdown Preview Mermaid Support"
2. Open `.mermaid.md` file
3. Use Markdown preview (Cmd+Shift+V)

### Option 3: GitHub (Built-in)

1. View `.mermaid.md` on GitHub
2. Diagrams render automatically in file view

## Using These Diagrams

### For Onboarding

**Recommended Order**:
1. **architecture-overview**: Understand system design
2. **repo-structure**: Learn codebase organization
3. **component-map**: Study component architecture
4. **data-flow**: Trace data movement
5. **entry-points**: Learn how to run/deploy
6. **deployment-infrastructure**: Understand production

### For Development

**Adding a Feature**:
1. **component-map.notes.md**: Find component tier for new feature
2. **data-flow.notes.md**: Plan data flow (state updates, API calls)
3. **entry-points.notes.md**: Add routes/commands if needed

**Debugging**:
1. **data-flow.notes.md**: Trace data flow from symptom to root cause
2. **component-map.notes.md**: Find component responsibilities
3. **deployment-infrastructure.notes.md**: Check caching/SSR issues

**Deploying**:
1. **deployment-infrastructure.notes.md**: Follow build → deploy process
2. **entry-points.notes.md**: Verify entry points work in production

### For Architecture Decisions

**Evaluating Changes**:
1. Check all `.notes.md` files for "Key Decisions" sections
2. Understand rationale before changing
3. Update diagrams after implementing changes

**Adding New Patterns**:
1. Document in relevant `.notes.md` ("Common Patterns" section)
2. Update `.mermaid.md` if visual representation needed
3. Add troubleshooting guidance

## Maintenance

### When to Update Diagrams

**Required Updates**:
- Major architecture changes (new tier, new state store)
- New entry points (routes, CLI commands, API endpoints)
- Deployment infrastructure changes (new CDN, build process)

**Optional Updates**:
- Minor component additions (if they follow existing patterns)
- Bug fixes (unless they expose design issues)

### How to Update

1. **Modify `.mermaid.md`**: Update diagram structure
2. **Validate**: Test on mermaid.live
3. **Update `.notes.md`**: Reflect changes in explanations
4. **Cross-reference**: Check related diagrams for consistency
5. **Commit**: Use descriptive message ("docs: Update component-map for XYZ")

## Architecture Version History

**v2.1 (Current - 2025-10-27)**: 3D Universe architecture
- Simplified state (Zustand only, no XState)
- React Router navigation (no CanvasZone, no StoryScene)
- DataUniverse 3D component (Three.js + React Three Fiber)
- 2D+3D hybrid (CitationPanel, MethodologyModal overlays)
- SSR safety (React.lazy + Suspense)

**v2.0 (Superseded - 2025-10-26)**: Phase 1 rebuild
- Canvas-first architecture (CanvasZone, StoryScene)
- XState journey machine (scene orchestration)
- Design token system (CSS custom properties)
- Apache ECharts 6.0 (2D charts only)

**v1.x (Legacy)**: Original architecture
- Direct Dash integration
- No state management (local component state)
- Plotly charts

## References

- **CLAUDE.md** (v2.1): Main development guide
- **ACX084.md**: 3D Universe Foundation Sprint documentation
- **apps/carbon-acx-web/README.md**: Web app architecture
- **Makefile**: Build automation reference
- **package.json**: Workspace configuration

## Questions or Issues?

- **Diagram Errors**: Validate on mermaid.live, check syntax
- **Missing Information**: Check `.notes.md` first, then source code
- **Outdated Content**: Check git history, compare with CLAUDE.md version
- **New Diagrams Needed**: File issue or PR with proposed structure

---

**Maintainer**: Carbon ACX Core Team
**Last Updated**: 2025-10-27
**Diagram Tool**: Mermaid.js (https://mermaid.js.org)
