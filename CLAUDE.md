# Carbon ACX — Development Guide

**Inherits:** `~/dev/CLAUDE.md` (workspace) + `~/.claude/CLAUDE.md` (global)

Open reference stack for trustworthy carbon accounting with manifest-first architecture, byte hashes, and provenance tracking.

---

## Critical Context Budget Rules

**BEFORE large refactors:**
1. Run `/context` to check token usage
2. Archive docs >90 days old: `bash ~/dev/scripts/archive-old-docs.sh carbon-acx ACX`
3. Enter Plan Mode (Shift+Tab twice) for analysis tasks

**Doc reading priority:** PREFIX files (ACX084, ACX080, INDEX.md) → feature.md → other docs

**90-day archive policy:** Automated via workspace script, keeps active docs focused

---

## File Boundaries

### Never Read
- **Build artifacts:** `dist/`, `build/`, `artifacts/`, `.vite/`, `dist-ssr/`
- **Dependencies:** `node_modules/`, `.venv/`, `__pycache__/`
- **Data:** `data/raw/*.sqlite`, `data/cache/`
- **Archives:** `docs/acx/archive/`
- **Test coverage:** `coverage/`, `.nyc_output/`
- **Temp files:** `*.swp`, `*.swo`, `.DS_Store`, `*.log`

### Read First
- `CLAUDE.md`, `README.md`, `AGENTS.md`
- `docs/acx/ACX084.md` (3D Universe architecture — current)
- `docs/acx/ACX080.md` (rebuild strategy)
- `docs/acx/INDEX.md` (active doc catalog)

### Read On Demand
- `docs/acx/ACX075-ACX090` series (feature-specific)
- `docs/WHAT_RUNS_WHERE.md`, `docs/TESTING_NOTES.md`
- Archived docs (only if explicitly relevant)

---

## Architecture Quick Reference

**4 Layers:**
1. **Data:** `data/` — Canonical CSVs (activities, emission factors, grid intensity)
2. **Derivation:** `calc/derive.py` — Python 3.11+, Poetry, Pydantic schemas
3. **UI:** `apps/carbon-acx-web/` — React 18, Vite, Tailwind, Radix UI, Three.js
4. **Edge:** `functions/`, `workers/` — Cloudflare Pages/Workers

**Tech Stack:**
- Python: 3.11+, Poetry, pandas, pydantic, pytest
- JS/TS: Node 20.19.4, pnpm 10.5.2, Vite 5, React 18, Zustand, TanStack Query
- 3D: Three.js ^0.180, React Three Fiber ^9.4, Drei ^10.7
- Deploy: Cloudflare Pages/Workers

**Commands:** See `docs/repo-commands.html` (click-to-copy full reference)

---

## Workflow Systems

### Build Pipeline
1. Update data CSVs in `data/`
2. Run `make build` (invokes `calc/derive.py`)
3. Validate manifests: `pytest tests/`
4. Check artifacts in `dist/artifacts/<hash>/`

### 3D Universe Development (Feature Branch: `feature/3d-universe`)
1. **SSR Safety:** Lazy-load DataUniverse with `React.lazy()` + `Suspense`
2. **Design Tokens:** Use CSS custom properties (`--font-size-lg`, `--carbon-moderate`)
3. **State:** Single Zustand store (`useAppStore`), no XState
4. **Navigation:** React Router only (removed journey machine complexity)
5. **Components:** Primitives → Viz (DataUniverse, ECharts) → Domain → Pages

### Quality Checks
1. Python: `make validate` (Ruff, Black, pytest)
2. JS/TS: `pnpm typecheck`, `pnpm test`
3. Before commit: Check .claudeignore for new build artifacts

---

## Custom Agents

Carbon ACX uses **workspace-level agents** for common operations and **repo-level agents** for domain-specific tasks:

**Workspace agents** (in `~/dev/.claude/agents/`):
- `workspace-git-agent` - Git/GitHub automation, commits, PRs
- `workspace-citation-validator` - Citation coverage and IEEE compliance
- `workspace-deployment-orchestrator` - Cloudflare Workers/Pages deployment

**Repo-level agents** (in `.claude/agents/`):
- `carbon-quality-auditor` - UX auditing + manifest validation
- `carbon-data-manager` - Dataset rebuilding + intensity matrix export

See `~/dev/.claude/reports/agent-efficiency.md` for consolidation history.

---

## Cross-Repo Awareness

**carbon-acx ↔ hotbox:** Data pipeline integration (narrative compiler uses emissions data)
**carbon-acx ↔ undone:** Historical data analysis for carbon trends (thesis research)

**When to use `--add-dir`:**
- Changes to data schemas that affect hotbox narrative beats
- Shared TypeScript types or Python schemas
- Cross-repo documentation updates

**Check before architectural changes:**
- `~/dev/hotbox/docs/hbx/` PREFIX files (beat pack structure)
- `~/dev/undone/docs/` PREFIX files (historical analysis)

---

## Examples

### Example 1: Add New Emission Factor
```bash
# 1. Update data source
vim data/emission_factors.csv

# 2. Run derivation
make build

# 3. Test
pytest tests/test_emission_factors.py

# 4. Document in ACX[NEXT]
# Find next number: ls -1 docs/acx/ | grep -E '^ACX[0-9]{3}' | sort | tail -1
```

### Example 2: 3D Component with Design Tokens
```typescript
// ✅ Correct: Use CSS custom properties
<div className="text-[var(--font-size-lg)] text-[var(--carbon-moderate)]">

// ❌ Wrong: Hardcoded values
<div className="text-lg text-blue-500">
```

### Example 3: Lazy-Load Three.js for SSR Safety
```typescript
const DataUniverse = React.lazy(() =>
  import('../viz/DataUniverse').then(m => ({ default: m.DataUniverse }))
);

<React.Suspense fallback={<div>Loading 3D...</div>}>
  <DataUniverse totalEmissions={total} activities={activities} />
</React.Suspense>
```

---

**Version:** 3.0 (ClaudeLog compliance from Sprint 8.2)
**Last Updated:** 2025-10-31
