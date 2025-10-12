# CLAUDE.md - Claude Code Context for Carbon ACX

## Purpose
This document provides context and guidance for Claude Code when working with the Carbon ACX repository. It complements the general AI assistant guidelines in AGENTS.md with Claude-specific information.

---

## Repository Overview

Carbon ACX is an open reference stack for trustworthy carbon accounting that transforms auditable CSV inputs into reproducible datasets and delivers disclosures through multiple interfaces (Dash, React, Cloudflare).

**Key principle:** Manifest-first architecture where every chart, catalogue, and disclosure includes byte hashes, schema versions, and provenance for downstream trust.

---

## Architecture Layers

### 1. Data Layer (`data/`)
- **Activities, emission factors, schedules, grid intensity** stored as canonical CSVs
- Source of truth for all carbon accounting calculations
- Schema evolution tracked through Git history
- Files: `activities.csv`, `layers.csv`, `icons.csv`, etc.

### 2. Derivation Engine (`calc/`)
- **Python 3.11+** with Pydantic schemas, Poetry for dependencies
- `calc/derive.py` is the main entry point (run via `make build`)
- Validates inputs, computes emissions, exports intensity matrices
- Generates immutable manifests with hashed figures in `dist/artifacts/<hash>/`
- **Pattern:** Keep validation, figure generation, references in same code path

### 3. User Interfaces

#### Dash Operations Client (`app/`)
- Analyst-focused Python Dash application
- Agency breakdowns, scenario toggles, provenance-aware references
- Reads from `calc/outputs` or `ACX_ARTIFACT_DIR`
- Launch with `make app`

#### Modern Web Application (`apps/carbon-acx-web/`)
- **Next-generation interface** built with React 18 + TypeScript
- Vite 5 build system, Tailwind CSS, Radix UI components
- Part of pnpm workspace monorepo structure
- Tests: Vitest (unit), Playwright (e2e)
- Run: `pnpm dev` from root or `npm run dev` in app directory

#### Static React Site (`site/`)
- Vite 5 + Tailwind CSS
- Mirrors Dash workflow for marketing/investor portals
- Reads same manifest catalogue as other interfaces
- WebGPU local chat feature (`@mlc-ai/web-llm`)
- Launch: `npm run dev -- --host 0.0.0.0` in `site/`

### 4. Edge Delivery

#### Cloudflare Pages Function (`functions/`)
- Proxies artifact access with immutable caching
- Sanitized paths, optional upstream origins
- File: `functions/carbon-acx/[[path]].ts`

#### Cloudflare Worker API (`workers/`)
- `/api/compute` and `/api/health` endpoints
- On-demand calculations with strict input validation
- Configuration: `wrangler.toml`
- Deploy: `wrangler dev` (local) or `wrangler deploy`

---

## Technology Stack

### Python
- **Version:** 3.11+
- **Package manager:** Poetry
- **Key libraries:** pandas, pydantic, plotly, dash, PyYAML, jinja2
- **Code style:** Black + Ruff (line length: 100)
- **Testing:** pytest with coverage

### JavaScript/TypeScript
- **Runtime:** Node.js 20.19.4
- **Package manager:** pnpm 10.5.2 (workspace monorepo)
- **Build tools:** Vite 5, TypeScript ~5.5.4
- **UI frameworks:** React 18, Tailwind CSS 3, Radix UI
- **Testing:** Vitest (unit), Playwright (e2e)

### Infrastructure
- **Cloudflare Workers** for edge compute and APIs
- **Cloudflare Pages** for static site hosting
- **Deployment:** `make package` creates deployment bundles

---

## Key Workflows

### Building the Dataset
```bash
make build                    # Full derivation pipeline
python -m calc.derive         # Direct invocation
make build-backend            # Use SQLite backend (ACX_DATA_BACKEND)
```

### Running User Interfaces
```bash
make app                      # Dash application
pnpm dev                      # Modern web app (apps/carbon-acx-web)
cd site && npm run dev        # Static React site
```

### Testing
```bash
make validate                 # Runs all checks (Ruff, Black, pytest, linters)
pytest tests/                 # Python tests
pnpm test                     # JavaScript tests in workspaces
```

### Packaging & Deployment
```bash
make package                  # Assembles dist/site with artifacts, headers, redirects
wrangler deploy               # Deploy Worker API
```

---

## File Organization Conventions

### Path References
When referencing code locations, use the pattern: `file_path:line_number`
- Example: "Error handling occurs in `calc/derive.py:712`"

### Important Directories
- `calc/` - Core derivation engine
- `app/` - Dash analytics interface
- `apps/` - Workspace applications (pnpm monorepo)
- `site/` - Static React interface
- `data/` - Source CSV files
- `scripts/` - Maintenance utilities
- `docs/` - Extended documentation
- `tests/` - Python test suite
- `dist/` - Build outputs and artifacts
- `functions/` - Cloudflare Pages functions
- `workers/` - Cloudflare Worker source

---

## Working with Claude Code

### Read First, Then Edit
- Always read files before editing them
- Use Read tool for file inspection
- Use Edit tool for precise changes
- Use Glob/Grep for searching when location is uncertain

### Common Tasks

**Adding a new layer:**
1. Update `data/layers.csv` with new layer definition
2. Add emission factors to `data/emission_factors.csv`
3. Update activity mappings as needed
4. Run `make build` to regenerate artifacts
5. Update tests in `tests/` to cover new layer

**Modifying the derivation pipeline:**
1. Read `calc/derive.py` to understand current flow
2. Update Pydantic schemas in `calc/` if data structures change
3. Maintain manifest integrity and figure generation
4. Run `pytest tests/` to verify changes
5. Update documentation if API changes

**UI changes:**
1. For modern interface: work in `apps/carbon-acx-web/`
2. For legacy interface: work in `site/`
3. For analytics: work in `app/`
4. Follow existing component patterns
5. Run relevant tests (Vitest, Playwright, or manual Dash testing)

### Code Quality Standards
- Follow existing lint/format/test scripts
- Python: Black + Ruff with 100 character line length
- TypeScript: Follow project's tsconfig.json settings
- Prefer small, cohesive changes with clear rationale
- Include tests for non-trivial functionality
- Add docstrings/JSDoc for complex functions

---

## Security & Secrets

**Never expose:**
- API tokens or credentials in code
- Production data in prompts or commits
- Environment variables (use `.env` files, not committed)

**Storage locations:**
- Local dev: `.env` files (gitignored)
- GitHub CI: Repository Settings → Secrets
- Cloudflare Workers: `wrangler secret put <NAME>`

---

## Important Constraints

### Runtime Constraints
- Cloudflare Workers have edge runtime limitations (no Node.js APIs)
- Specify runtime constraints when modifying Worker code
- Include binding names for resources (KV, R2, D1, Queues)

### Repository Constraints
- **No binary files** in commits
- Avoid the contiguous token "F a s t A P I" in docs (hygiene check)
- Changes to `wrangler.toml`, `.github/workflows/`, `Makefile` are high-risk
- All AI-generated changes require human review
- Use `ai-generated` PR label and `Generated-by: claude-code` commit footer

### Dependency Management
- Propose dependency updates separately from feature work
- Justify new packages (license, size, maintenance status)
- Document lockfile update commands in PRs
- Python: `poetry add <package>`
- JavaScript: `pnpm add <package>` (workspace-aware)

---

## References to Other Documentation

- **README.md** - Comprehensive repository overview and getting started
- **AGENTS.md** - General AI assistant policies and review gates
- **CONTRIBUTING.md** - Pull request expectations and contribution guidelines
- **docs/WHAT_RUNS_WHERE.md** - Environment expectations and deployment guidance
- **docs/TESTING_NOTES.md** - QA expectations across environments
- **CHANGELOG_ACX041.md** - Dataset version history

---

## Monorepo Structure

This repository uses **pnpm workspaces** for JavaScript packages:

```
package.json              # Root workspace config
pnpm-workspace.yaml       # Workspace package definitions
apps/
  carbon-acx-web/         # Modern web application
    package.json
site/                     # Legacy static site (separate package)
  package.json
```

When working with JavaScript:
- Run commands from root: `pnpm --filter carbon-acx-web dev`
- Or within app directory: `cd apps/carbon-acx-web && npm run dev`
- Shared dependencies hoisted to root `node_modules/`

---

## Dataset Versioning

Current dataset version tracked in: `calc/outputs/sprint_status.txt`

When updating data:
- Maintain provenance through commit messages
- Update references and citations synchronously
- Re-run derivation pipeline to update manifests
- Verify integrity checks pass

---

## Quick Command Reference

```bash
# Setup
poetry install --with dev --no-root
make site_install
pnpm install

# Build & Validate
make build                  # Build dataset
make validate               # Run all quality checks
make test                   # Run test suite

# Development
make app                    # Launch Dash
pnpm dev                    # Launch modern web app
cd site && npm run dev      # Launch static site
wrangler dev                # Launch Worker API locally

# Packaging
make package                # Create deployment bundle
make catalog                # Maintain layer catalogs
make sbom                   # Generate software bill of materials
```

---

## Tips for Effective Assistance

1. **Start with context:** Read README.md and relevant source files first
2. **Follow patterns:** Match existing code style and architecture
3. **Test thoroughly:** Run appropriate test suites before completing tasks
4. **Document changes:** Update docs when modifying interfaces or data schemas
5. **Small iterations:** Prefer incremental changes over large refactors
6. **Verify references:** Ensure manifest integrity and figure lineage maintained
7. **Check environments:** Consider Dash, React, and Worker contexts for changes

---

## Last Updated

2025-10-12

---

## Questions or Clarifications?

When uncertain:
1. Reference README.md for architecture overview
2. Check AGENTS.md for policy questions
3. Read existing code patterns in the relevant directory
4. Ask the user for clarification on ambiguous requirements
5. Propose a plan before making significant structural changes
