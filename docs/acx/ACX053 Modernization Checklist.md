# ACX051 Modernization Checklist

## Components & Styling

- Adopt shadcn/ui + Tailwind; replace ad‑hoc margins with tokens.
- lucide-react icons; standardized focus outlines; reduced‑motion variants.
- Centralize tokens in `site/src/theme/tokens.ts` (spacing/type/colors/chart).

## State & URL

- Selector-based store reads (Zustand `useStore(selector)`).
- `useDeepLink` for pane↔URL sync; SSR‑safe query extraction.
- Scenario cache gating; error boundaries around heavy panes.

## Performance

- Route-level code splitting; lazy‑load plot libs.
- Virtualize large lists/trees; memo expensive selectors.
- Preload critical fonts; defer non‑critical CSS/JS; avoid hydration waterfalls.

## Accessibility

- Skip links; landmarks; logical tab order; keyboard pane resize.
- Focus management on route/pane change; reduced‑motion fallbacks.
- axe smoke tests in CI; color contrast tokens AA.

## Testing

- Vitest/RTL: layout (resize/drawers/focus), discovery (filter + keyboard), viz (no label overlap).
- a11y smoke (axe); perf budgets (LCP ≤2.5s, CLS <0.1) via CI script.

## Security / Infra

- Headers: COOP/COEP, CSP (script-src 'self'), no node:* in client.
- Service worker for offline viz assets; safe path handling for manifests.

## Tooling

- Node & pnpm pins; ESLint strict; TS strict; Prettier config.
- Storybook optional for isolated component QA.