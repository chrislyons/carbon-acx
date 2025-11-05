# Carbon ACX Web

**Next-generation web interface for Carbon ACX**

This is the modern, production-ready web application for Carbon ACX, built with React 18, TypeScript, and Vite 5. It replaces the legacy `site/` interface with improved performance, better developer experience, and a more maintainable architecture.

---

## Purpose

Carbon ACX Web is the primary web interface for exploring carbon accounting data, visualizations, and disclosures. It provides:

- **3D data visualization** using Three.js and React Three Fiber for immersive emissions exploration
- **Interactive data exploration** with agency breakdowns and layer catalogues
- **High-performance visualization** using Apache ECharts (2D charts) and Three.js (3D universe)
- **2D+3D hybrid architecture** with transparency overlays (citations, methodology, activity management)
- **Responsive design** with Tailwind CSS and Radix UI components
- **Type-safe development** with comprehensive TypeScript coverage
- **Production-ready builds** optimized for Cloudflare Pages deployment with SSR safety

---

## When to Use This vs Other Interfaces

### Use `apps/carbon-acx-web/` (this app) for:
- **Production deployments** - This is the primary public interface
- **New feature development** - All new UI features should target this app
- **Modern React development** - Leverages React 18 features and modern patterns
- **Type-safe workflows** - Full TypeScript with strict mode enabled

### Use `site/` (legacy) for:
- **Maintenance only** - Security patches and critical bug fixes
- **Backwards compatibility** - If you need the legacy interface structure
- **WebGPU chat features** - Local LLM chat is currently only in legacy site

### Use `app/` (Dash) for:
- **Analyst workflows** - Internal data analysis and walkthroughs
- **Python-based dashboards** - When you need Python-side computation
- **Quick prototyping** - Rapid iteration on data visualizations

---

## Technology Stack

### Core Framework
- **React 18.3** - UI framework with concurrent features
- **TypeScript ~5.5** - Type-safe development
- **Vite 5.4** - Fast build tool and dev server

### UI Components & Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives (Dialog, Tabs, Tooltip, ScrollArea)
- **class-variance-authority** - Variant-based component styling
- **Framer Motion 11** - Animation library

### 3D Visualization
- **Three.js ^0.180.0** - 3D graphics library
- **React Three Fiber ^9.4.0** - React renderer for Three.js
- **React Three Drei ^10.7.6** - Helper components (OrbitControls, Stars, Html)

### Data & State
- **Zustand 4.5.4** - Lightweight state management
- **TanStack Query 5.90.5** - Data fetching and server state
- **React Router 6.28** - Client-side routing
- **Apache ECharts 6.0** - High-performance 2D charting library

### Virtualization
- **@tanstack/react-virtual** - Efficient rendering of large lists

### Testing
- **Vitest** - Unit test runner
- **@testing-library/react** - Component testing utilities
- **Playwright** - End-to-end testing

### Build & Tooling
- **pnpm** - Fast, efficient package manager (workspace member)
- **vite-plugin-compression** - Gzip compression for production builds

---

## Project Structure

```
apps/carbon-acx-web/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── lib/               # Utilities and helpers
│   ├── routes/            # Route components
│   └── main.tsx           # Application entry point
├── public/                # Static assets
├── tests/                 # E2E tests (Playwright)
├── schema/                # TypeScript type generation
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── vitest.config.ts       # Vitest configuration
├── playwright.config.ts   # Playwright configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Package manifest
```

---

## Development Workflow

### Initial Setup

From the repository root:

```bash
# Install dependencies for all workspace packages
pnpm install

# Or install only for this app
pnpm --filter carbon-acx-web install
```

### Development Server

From repository root:

```bash
# Run dev server (recommended)
pnpm dev

# This is equivalent to:
pnpm --filter carbon-acx-web dev
```

Or from this directory:

```bash
npm run dev
```

The dev server will start at `http://localhost:5173` with hot module replacement enabled.

### Building for Production

From repository root:

```bash
pnpm build:web
```

Or from this directory:

```bash
npm run build
```

This will:
1. Type-check with TypeScript (no emit)
2. Build the application with Vite
3. Output to `dist/` directory
4. Generate compressed assets for production

### Preview Production Build

```bash
pnpm preview:web
# Or from this directory:
npm run preview
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:unit
```

Tests use Vitest with React Testing Library for component testing.

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e
```

Playwright tests are in the `tests/` directory and validate critical user flows.

### Current Test Coverage

⚠️ **Note:** Test coverage is currently limited (2 test files). Expanding test coverage is a priority for the next development sprint.

**Testing Goals:**
- Component unit tests for all major UI components
- Integration tests for data fetching and state management
- E2E tests for critical user paths (navigation, data exploration, visualization)

---

## Type Generation

The `schema/` directory contains TypeScript type generation utilities:

```bash
# Generate types from semantic model
pnpm schema:gen
```

This is run from the root package.json and generates TypeScript types for the Carbon ACX semantic data model.

---

## Architecture Notes

### 3D Universe Architecture

The application uses a **3D+2D hybrid architecture** (see `docs/acx/ACX084.md` for full details):

**3D Visualization (DataUniverse):**
- Central sphere representing total annual emissions
- Orbiting spheres for individual activities (size = log scale of emissions)
- Color-coded by emission level (green/amber/red)
- Camera choreography with intro animations and smooth transitions
- Hover effects with glow and enhanced labels
- SSR-safe with React.lazy() and Suspense

**2D Transparency Overlays:**
- CitationPanel - Emission factor sources and provenance
- MethodologyModal - Calculation methodology documentation
- ActivityManagement - Activity editing and management table
- All overlays use Radix UI Dialog for accessible modals

**Design Token System:**
- CSS custom properties for consistency (`--font-size-*`, `--carbon-*`, `--space-*`)
- Major Third typography scale (1.250 ratio)
- 4px base spacing system
- Semantic color tokens for carbon intensity levels

### State Management

**Zustand** for application state:
- Single store pattern (`useAppStore`)
- Activities, profile, emissions calculations
- Simple, predictable state updates
- No complex state machines

### Data Fetching Strategy

**TanStack Query** (formerly React Query) for server state:
- Automatic caching and revalidation
- Optimistic UI updates
- Built-in error retry logic
- Request deduplication

### Routing

**React Router 6** provides simple, direct navigation:
- No XState journey machine (simplified from Phase 1)
- Page-based structure: Welcome → Calculator → Explore → Insights
- Code-splitting at page level for optimal bundle sizes
- SSR-safe lazy loading for 3D components

### Component Patterns

Components follow these patterns:
- **Tier 1: Primitives** - Radix UI components (Button, Input, Dialog)
- **Tier 2: Visualizations** - DataUniverse (3D), ECharts wrappers (2D)
- **Tier 3: Domain** - CitationPanel, ActivityManagement, EmissionCalculator
- **Tier 4: Pages** - WelcomePage, CalculatorPage, ExplorePage, InsightsPage
- **Design tokens over hardcoding** - Always use CSS custom properties
- **Composition over inheritance** - Component reusability through composition
- **SSR safety** - React.lazy() for Three.js components

### Build Optimization

Vite provides:
- Lightning-fast HMR in development
- Optimized production builds with code splitting
- Automatic CSS code splitting
- Asset optimization and compression

---

## Configuration Files

### `vite.config.ts`
- React plugin configuration
- Build settings and optimization
- Dev server configuration
- Compression plugin setup

### `tsconfig.json`
- Strict TypeScript checking enabled
- Module resolution for imports
- Path aliases for clean imports

### `tailwind.config.ts`
- Custom theme configuration
- Plugin setup (for Radix UI integration)
- Content paths for purging unused CSS

### `playwright.config.ts`
- E2E test configuration
- Browser setup (Chromium, Firefox, WebKit)
- Test directory and reporting

---

## Deployment

This application is designed for deployment to **Cloudflare Pages**.

### Build Command
```bash
pnpm build:web
```

### Output Directory
```
dist/
```

The root Makefile target `make package` handles the full deployment preparation:
1. Builds this application
2. Packages artifacts from the derivation pipeline
3. Prepares Cloudflare Pages bundle with headers and redirects
4. Outputs to `dist/site/` for deployment

See the root `README.md` and `docs/deploy.md` for complete deployment instructions.

---

## Migration from Legacy Site

This application replaces `site/` as the primary web interface. Key improvements:

### Performance
- **Faster builds** - Vite vs older Vite version
- **Better HMR** - Sub-second hot reload
- **Optimized bundles** - Better code splitting and tree shaking

### Developer Experience
- **Stricter TypeScript** - Catch errors earlier
- **Better tooling** - Modern test runners and E2E setup
- **Cleaner architecture** - Improved component organization

### User Experience
- **Faster navigation** - Optimized routing
- **Better accessibility** - Radix UI primitives
- **Responsive design** - Mobile-first approach

### What's Not Yet Migrated
- **WebGPU chat features** - Local LLM chat remains in legacy site
- **Some legacy routes** - Gradual migration in progress

---

## Contributing

### Code Style
- **TypeScript** - Use strict mode, avoid `any`
- **Components** - Functional components with hooks
- **Styling** - Tailwind utilities, avoid inline styles
- **Imports** - Use path aliases for cleaner imports

### Testing Requirements
- **Unit tests** for new components (currently building coverage)
- **E2E tests** for new user flows
- **Type safety** - No TypeScript errors in CI

### PR Guidelines
See root `CONTRIBUTING.md` for general guidelines. For this app specifically:
1. Run `npm run build` to ensure no TypeScript errors
2. Run `npm run test:unit` to verify tests pass
3. Update tests for modified components
4. Follow existing component patterns and naming

---

## Troubleshooting

### Dev server won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### TypeScript errors in IDE
```bash
# Regenerate TypeScript cache
rm -rf node_modules/.vite
npm run build
```

### Build fails
```bash
# Check TypeScript compilation
npx tsc --noEmit
npx tsc --project tsconfig.node.json --noEmit
```

### Tests fail
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose
```

---

## References

- Root README: `../../README.md` - Repository overview
- Legacy site: `../../site/README.md` - Legacy interface documentation
- Dash app: `../../app/` - Analyst dashboard
- Claude Code docs: `../../CLAUDE.md` - AI assistant context
- Contributing: `../../CONTRIBUTING.md` - PR and contribution guidelines

---

## Questions or Issues?

- **Architecture questions** - See root `CLAUDE.md` for AI assistant context
- **Bug reports** - Check root `CONTRIBUTING.md` for issue guidelines
- **Deployment** - See `docs/deploy.md` in repository root
- **Testing** - See `docs/TESTING_NOTES.md` in repository root

---

**Status:** Active development (primary production interface)
**Current Branch:** `feature/3d-universe` (3D Universe Foundation Sprint complete)
**Maintainer:** Carbon ACX Core Team
**Last Updated:** 2025-10-27
