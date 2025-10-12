# Carbon ACX Site (Legacy)

**Legacy static web interface for Carbon ACX**

This is the original static React interface for Carbon ACX. It is being gradually superseded by the modern `apps/carbon-acx-web/` application but remains in active maintenance for specific features and backwards compatibility.

---

## Status: Legacy / Maintenance Mode

⚠️ **This interface is in maintenance mode.**

- **New features** should target `apps/carbon-acx-web/` (the modern web app)
- **This interface receives** security patches and critical bug fixes only
- **Migration timeline** is gradual; some unique features remain here temporarily

---

## Purpose

This static site provides:

- **Public-facing carbon disclosures** with interactive visualizations
- **WebGPU-powered local chat** using `@mlc-ai/web-llm` for in-browser AI assistance
- **Backwards compatibility** for existing deployments and external integrations
- **Reference implementation** of the original manifest-first architecture

---

## When to Use This vs Other Interfaces

### Use `site/` (this interface) for:
- **WebGPU local chat** - Currently only available in this interface
- **Legacy compatibility** - If you need the original interface structure
- **Maintenance work** - Bug fixes and security patches

### Use `apps/carbon-acx-web/` (modern) for:
- **New feature development** - All new work should target the modern app
- **Production deployments** - The primary public interface going forward
- **Modern React patterns** - React 18, TypeScript strict mode, better tooling

### Use `app/` (Dash) for:
- **Analyst workflows** - Internal data analysis and demonstrations
- **Python-based visualization** - When you need server-side computation

---

## Technology Stack

### Core Framework
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite 5** - Build tool and dev server

### UI & Styling
- **Tailwind CSS** - Utility-first styling
- **PostCSS** - CSS processing

### Unique Features
- **@mlc-ai/web-llm** - Local language model inference via WebGPU
- **Web Worker** - Background processing for LLM operations

### Data Fetching
- Reads from packaged artifacts (manifest-first approach)
- Static JSON files for figures and references

### Testing
- 25 test files covering visualizations and data handling
- Component tests for legacy UI patterns

---

## Project Structure

```
site/
├── src/                    # Source code
│   ├── App.tsx            # Main application component
│   ├── routes/            # Route components
│   ├── lib/               # Utilities and helpers
│   │   └── chat/          # WebGPU chat implementation
│   └── main.tsx           # Application entry point
├── public/                # Static assets
│   ├── artifacts/         # Data artifacts and manifests
│   ├── models/            # WebGPU model storage
│   └── schemas/           # JSON schemas
├── __tests__/             # Test files (25 tests)
├── scripts/               # Build and utility scripts
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Package manifest
```

---

## Development Workflow

### Initial Setup

From the repository root:

```bash
# Install site dependencies (via Makefile)
make site_install
```

Or directly:

```bash
cd site
npm install
```

### Development Server

From repository root:

```bash
make site_dev
```

Or from this directory:

```bash
npm run dev -- --host 0.0.0.0
```

The dev server starts at `http://localhost:5173` with hot module replacement.

### Building for Production

From repository root:

```bash
make site
```

Or from this directory:

```bash
npm run build
```

Output directory: `dist/` (copied to `dist/site/` by root Makefile)

---

## WebGPU Local Chat

### Requirements

1. **Browser:** Chromium-based with WebGPU support
   - Chrome 123+ or Edge
   - WebGPU must be enabled

2. **Model Download:** Download a compact LLM into `public/models/`

```bash
pnpm dlx @mlc-ai/web-llm download qwen2.5-1.5b-instruct-q4f16_1 -o site/public/models/
```

### Using the Chat Interface

1. Start the dev server: `npm run dev -- --host 0.0.0.0`
2. Navigate to `/chat` in your browser
3. Wait for model to warm up (GPU initialization)
4. All inference runs locally - no data leaves your browser

### Architecture

- **LocalLLMWorker.ts** - Web Worker for background inference
- **LocalLLMAdapter.ts** - React integration and state management
- **@mlc-ai/web-llm** - WebGPU-accelerated model runtime

See `public/models/README.md` for model management details.

---

## Data & Artifacts

This interface consumes immutable artifacts from the derivation pipeline:

### Artifact Loading

```
public/artifacts/
├── layers.json          # Layer catalogue (synced from data/layers.csv)
├── figures/*.json       # Plotly visualization data
├── references/*.txt     # IEEE-format citations
└── manifest.json        # Dataset metadata and provenance
```

### Syncing Layer Catalogue

The layer catalogue is synced from CSV to JSON via:

```bash
# From repository root
make build
```

This runs `scripts/sync_layers_json.py` to update `public/artifacts/layers.json`.

---

## Environment Variables

### PUBLIC_BASE_PATH

For subdirectory deployments, set base path in `.env`:

```bash
PUBLIC_BASE_PATH=/carbon-acx/
```

This is consumed by `vite.config.ts` to configure asset paths.

---

## Testing

### Running Tests

```bash
npm test
```

### Test Coverage

- **25 test files** covering legacy interface components
- Tests focus on data handling and visualization rendering
- Component tests for route-level functionality

---

## Deployment

This site is deployed as part of the root packaging process:

```bash
# From repository root
make package
```

This:
1. Builds the site to `site/dist/`
2. Copies to `dist/site/`
3. Includes artifacts, headers, and redirects
4. Prepares for Cloudflare Pages deployment

See root `README.md` deployment section for details.

---

## Migration Notes

### Features Being Migrated

The following are being moved to `apps/carbon-acx-web/`:
- Core data exploration interface
- Visualization components
- Routing and navigation

### Features Remaining Here (Temporary)

- **WebGPU local chat** - Unique to this interface
- **Legacy route compatibility** - Some URLs still point here

### Migration Timeline

No fixed timeline. Migration happens gradually as features are rebuilt with improved architecture in the modern app.

---

## Maintenance Guidelines

### What Gets Fixed Here

✅ **Security vulnerabilities** - Dependency updates for CVEs
✅ **Critical bugs** - Data loading failures, broken visualizations
✅ **Browser compatibility** - Fixes for supported browsers

### What Should Target New App

❌ **New features** - Build in `apps/carbon-acx-web/`
❌ **Major refactors** - Don't invest in legacy architecture
❌ **UI redesigns** - Focus effort on modern app

### Code Review Standards

- Maintain existing patterns (don't introduce new patterns)
- Prefer minimal, surgical changes
- Document any technical debt introduced
- Include regression tests for bug fixes

---

## Differences from Modern App

| Aspect | Legacy Site | Modern App |
|--------|------------|------------|
| **Status** | Maintenance mode | Active development |
| **TypeScript** | Less strict | Strict mode enabled |
| **Components** | Custom patterns | Radix UI primitives |
| **Testing** | 25 tests | 2 tests (expanding) |
| **Build** | Vite 5 | Vite 5 (newer config) |
| **Unique Features** | WebGPU chat | None yet |
| **Architecture** | Original patterns | Modern React patterns |

---

## Troubleshooting

### WebGPU Not Available

Check browser compatibility:
- Chrome/Edge 123+
- WebGPU flag enabled in chrome://flags

### Model Download Fails

```bash
# Ensure you're in the repository root
pnpm dlx @mlc-ai/web-llm download qwen2.5-1.5b-instruct-q4f16_1 -o site/public/models/
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Artifacts Not Loading

Ensure build artifacts exist:
```bash
# From repository root
make build
```

This populates `dist/artifacts/` which the site reads from.

---

## References

- **Modern app:** `../apps/carbon-acx-web/README.md` - Next-generation interface
- **Root README:** `../README.md` - Repository overview
- **Dash app:** `../app/` - Analyst dashboard
- **Claude Code docs:** `../CLAUDE.md` - AI assistant context
- **Contributing:** `../CONTRIBUTING.md` - PR guidelines

---

## Questions or Issues?

For questions about:
- **This legacy interface** - Check this README and code comments
- **Migration plans** - Discuss with Carbon ACX Core Team
- **New features** - Target `apps/carbon-acx-web/` instead
- **WebGPU chat** - See `src/lib/chat/` and `public/models/README.md`

---

**Status:** Maintenance mode (legacy interface)
**Successor:** `apps/carbon-acx-web/` (modern web app)
**Maintainer:** Carbon ACX Core Team
**Last Updated:** 2025-10-12
