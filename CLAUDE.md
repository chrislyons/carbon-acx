# Carbon ACX

Open reference stack for trustworthy carbon accounting with manifest-first architecture, byte hashes, and provenance tracking.

## Tech Stack

- **Python:** 3.11+, Poetry, pandas, pydantic, pytest
- **JS/TS:** Node 20.19.4, pnpm 10.5.2, Next.js 15, React 19, Tailwind CSS 4, Zustand, TanStack Query
- **3D:** Three.js ^0.168, React Three Fiber ^8.17, Drei ^9.114
- **Deploy:** Cloudflare Pages/Workers

## File Boundaries

### Never Read

- `dist/`, `build/`, `artifacts/`, `.vite/`, `dist-ssr/`
- `node_modules/`, `.venv/`, `__pycache__/`
- `data/raw/*.sqlite`, `data/cache/`
- `docs/acx/archive/`, `docs/wireframes/**/archive/`, `coverage/`, `.nyc_output/`

### Read First

- `CLAUDE.md`, `README.md`, `AGENTS.md`
- `docs/README.md` (documentation layout)
- `docs/acx/ACX.md` (active ACX catalog)
- `apps/carbon-acx-web/README.md` (active web app surface)

## Architecture

**4 Layers:**
1. **Data:** `data/` — Canonical CSVs for activities, factors, layers, and supporting tables
2. **Derivation:** `calc/derive.py` — Validation, derivation, manifest emission, and packaged outputs
3. **UI:** `apps/carbon-acx-web/` — Next.js 15 product surface; `app/` remains the analyst Dash surface
4. **Edge:** `functions/`, `workers/` — Cloudflare Pages/Workers delivery paths

**Commands:** See `docs/repo-commands.html`

## Build Pipeline

1. Update data CSVs in `data/`
2. Run `make build` (invokes `calc/derive.py`)
3. Validate manifests and regression coverage in `tests/`
4. Package or inspect artifacts in `dist/artifacts/<hash>/`

## Web App Development

1. Prefer the active Next.js app in `apps/carbon-acx-web/`
2. Keep the homepage and shared shell data-dense and utility-first
3. Use CSS custom properties and shared surface classes before adding one-off inline styling
4. Treat calculator, manifests, and explore routes as first-class entrypoints

## Quality Checks

1. Python: `make validate`
2. Web: `pnpm --filter carbon-acx-web typecheck`
3. Web: `pnpm --filter carbon-acx-web lint`
4. Web: `pnpm --filter carbon-acx-web test`
5. Web: `pnpm --filter carbon-acx-web build`

## Design Context

**Type:** Data product for carbon accounting, provenance, and exploration  
**Density:** Data-dense, compact, low-friction navigation  
**References:** Grafana, Carbon Design System (IBM), Bloomberg Terminal

**Spacing:** Tight section rhythm, compact cards, short route-to-action distance  
**Typography:** Clear hierarchy, restrained display usage, monospaced labels for technical metadata  
**Anti-Patterns:** Oversized marketing heroes, decorative sections that bury tools, ungrounded visual spectacle

## Custom Agents

**Repo-level agents** (in `.claude/agents/`):
- `carbon-quality-auditor` - UX auditing + manifest validation
- `carbon-data-manager` - Dataset rebuilding + intensity matrix export

## Cross-Repo Awareness

**carbon-acx ↔ hotbox:** Data pipeline integration (narrative compiler uses emissions data)  
**carbon-acx ↔ undone:** Historical data analysis for carbon trends (thesis research)

**When to use `--add-dir`:**
- Changes to data schemas that affect hotbox narrative beats
- Shared TypeScript types or Python schemas
- Cross-repo documentation updates

## Example Workflow

### Add New Emission Factor

```bash
# 1. Update data source
vim data/emission_factors.csv

# 2. Run derivation
make build

# 3. Test
pytest tests/test_emission_factors.py

# 4. Document in ACX[NEXT]
find docs/acx -maxdepth 1 -type f -name 'ACX[0-9]*.md' | sort
```

---

**Version:** 4.1 | **Last Updated:** 2026-03-25
