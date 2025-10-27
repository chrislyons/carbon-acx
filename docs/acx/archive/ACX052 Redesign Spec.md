# ACX052 Redesign Specification

## Shell Layout

- **Left (Omni Browser):** Layers ▸ Activities ▸ Figures ▸ Scenarios ▸ References (virtualized tree + scoped search).
- **Center (Visualizer Surface):** Primary canvas; **Focus Mode**; optional **secondary dock**.
- **Right (Context Rail):** Tabs — References ▸ Scenario ▸ Compare ▸ Chat ▸ Logs.
- **Header:** Scale/time controls, global search, ⌘K palette, density slider (S/M/D).
- **Footer:** KPI strip (single line) + manifest hash + refs count.

## Behaviors

- Resizable split panes (drag; keyboard: Alt+Arrows; dbl‑click reset).
- Hover‑expand legends; autoslim plot margins in Focus Mode.
- URL deep links for all pane state: `?layer=&activity=&figure=&scenario=&compare=&view=`.
- Command palette actions: open/focus/toggle/navigate.

## Responsive Strategy

- Ranges: XS 0–359, S 360–479, M 480–767, L 768–1023, XL 1024–1439, 2XL 1440–1919, 3XL ≥1920.
- At L+: viz ≥60% width with rails open; at M/L rails collapse to drawers.

## Visual Grammar (Tokens)

- 8px grid; density tokens 4/8/12; type scale (xs/s/m/l/xl/2xl).
- WCAG AA color tokens; Plotly “dense” theme (tight margins, compact legends).

## Component Tree (target paths)

- `site/src/routes/(app)/shell.tsx` — grid + splits; `useShellLayout()` (persist sizes).
- `site/src/components/OmniBrowser.tsx` — virtualized tree + search + kb nav.
- `site/src/components/VisualizerSurface.tsx` — host, Focus Mode, dock, theme.
- `site/src/components/ContextRail.tsx` — tabs: Refs/Scenario/Compare/Chat/Logs.
- `site/src/components/CommandPalette.tsx` — ⌘K actions.
- `site/src/theme/tokens.ts` — spacing/typography/colors/chart tokens.
- `site/src/hooks/useDeepLink.ts` — pane ↔ URL binding (SSR‑safe).

## Acceptance Gates

- **Density:** ≥1440px displays Omni + Viz + Context without vertical scroll for ≤20 items; header ≤64px; KPI strip visible.
- **Viz:** ≥60% width at L+; Focus Mode full width; interactions <200ms.
- **Discoverability:** From `/`, every layer/activity/figure reachable in ≤2 clicks or via ⌘K.
- **Provenance:** References/Manifest one click; deterministic [n] order.
- **A11y:** Full keyboard traversal, pane resize, WCAG 2.2 AA contrasts.
- **Performance:** Route JS <250KB gz at first meaningful route (excl. Plotly); TTI <2.5s; CLS <0.1.