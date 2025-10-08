# ACX051 Sprint Plan (ACX‑CDX‑076…081)

All prompts: **Constraints** — density-first, deterministic manifests, WCAG 2.2 AA, no binaries, no `node:*` in client. Node/pnpm pinned in CI. Budgets: **LCP ≤2.5s**, **CLS <0.1**.

***

## ACX‑CDX‑076 — Implement Split‑Pane Shell

**Intent:** Create grid shell with resizable left/right rails, dbl‑click reset, keyboard resize.

**Paths:** `site/src/routes/(app)/shell.tsx`, `site/src/hooks/useShellLayout.ts`, `site/src/theme/tokens.ts`.

**Do:**

1) Add `useShellLayout()` to persist sizes (localStorage + media defaults).

2) Build CSS grid: header / body / footer; body has three resizable panes.

3) Mouse drag + dbl‑click reset; keyboard Alt+Arrows resize 2% steps.

4) Footer KPI strip (single line); header ≤64px.

**Tests:**

- RTL: resize via keyboard/mouse; dbl‑click reset.
- Axe: no violations; focus order respects DOM landmarks.
- Perf: route bundle <250KB gz (excl. plot libs).

***

## ACX‑CDX‑077 — Omni Browser (Virtualized Tree + Search)

**Intent:** Discover all Layers/Activities/Figures from left rail; fast filter; kb nav.

**Paths:** `site/src/components/OmniBrowser.tsx`, `site/src/theme/tokens.ts`, `site/src/**/__tests__/OmniBrowser.test.tsx`.

**Do:**

1) Virtualized list/tree; arrow‑key nav; Enter opens; Shift+Enter focus in center.

2) Scoped search (Entities/Layers/Activities/Figures/Scenarios/Refs).

3) Show deterministic index [n]; badges for refs count; lazy children load.

**Tests:**

- RTL: filter + keyboard traversal; open/focus actions.
- Axe: names/roles on tree items; aria‑selected updates.
- Perf: list virtualization proven at 5k items.

***

## ACX‑CDX‑078 — Context Rail Tabs

**Intent:** Right rail tabs (References ▸ Scenario ▸ Compare ▸ Chat ▸ Logs) with URL binding.

**Paths:** `site/src/components/ContextRail.tsx`, `site/src/hooks/useDeepLink.ts`.

**Do:**

1) Implement tabs; each loads lazily; preserve scroll per tab.

2) Bind active tab + params to URL (`view=refs|scenario|compare|chat|logs`).

3) References shows manifest hash and refs list (deterministic order).

**Tests:**

- RTL: tab switching preserves scroll; URL reflects state.
- Axe: tab roles, aria‑controls, roving tabindex.

***

## ACX‑CDX‑079 — Visualizer Surface + Focus Mode

**Intent:** Primary canvas with Focus Mode and secondary dock.

**Paths:** `site/src/components/VisualizerSurface.tsx`, `site/src/theme/tokens.ts`.

**Do:**

1) Plot host wrapper; “dense” Plotly theme (tight margins, compact legends).

2) Focus Mode: max screen, auto‑tighten margins; Esc to exit.

3) Secondary dock toggle (right/left/bottom); persists in layout store.

**Tests:**

- RTL: focus toggle; dock placement persistence.
- Perf: interaction latency <200ms (synthetic test).

***

## ACX‑CDX‑080 — Command Palette + Deep Links

**Intent:** ⌘K palette for open/focus/navigate; deep links for all pane state.

**Paths:** `site/src/components/CommandPalette.tsx`, `site/src/hooks/useDeepLink.ts`.

**Do:**

1) Palette with actions: open layer/activity/figure, focus viz, toggle rails.

2) `useDeepLink`: serialize pane state to URL; SSR‑safe parsing.

3) From `/`, reach any entity in ≤2 actions (filter → open).

**Tests:**

- RTL: palette opens; actions mutate panes & URL.
- Perf: palette lazy‑loads under 30KB gz.

***

## ACX‑CDX‑081 — A11y, Perf & CI Hardening

**Intent:** Close acceptance gaps; enforce budgets in CI.

**Paths:** `site/.github/workflows/ci.yml`, `site/src/**`, `site/scripts/perf-check.mjs`.

**Do:**

1) Add skip links; landmarks; keyboard pane resize; reduced‑motion.

2) Add axe smoke suite; perf-check script (bundlesize, LCP/CLS via lab run).

3) Pin Node/pnpm; strict TS/ESLint; forbid `node:*` in client via lint rule.

**Tests:**

- Axe: zero critical violations; keyboard traversal across panes.
- Perf: LCP ≤2.5s, CLS <0.1 on app route in CI.