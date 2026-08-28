# ACX112 Landscape Viewport Optimization

Date: 2026-08-27 · Branch: `feat/landscape-viewport-density` · Scope: `apps/carbon-acx-web/`

## Problem

The public app was landscape-first by design, but 16:9 desktop viewports fragmented each route's narrative across a long vertical master scroll (measured ratios up to 5.87 at 1280×720), while a 9×16 portrait window accidentally showed whole narratives at once.

## Orientation principle (owner decision)

Mobile is portrait-first by default. The entire ≤1023px band — phones portrait *and* rotated, tablets portrait — keeps today's stacked flow byte-identical in behavior. The landscape density system applies only at ≥1024px.

## System (all in `src/app/globals.css`)

**Breakpoint contract** (documented in-file):
- ≤700px — mobile cascade; menu contract pinned by e2e at 320×800/390×844.
- 701–1023px — portrait band; no panel system, no hero compression.
- ≥1024px — landscape density system (app-stage, panels, tokens).
- ≥1200px — three-column Atlas; methodology bottom pair.
- (≥1024px, ≤820px height) — short-landscape typographic compression.
- ≥1680px — ultrawide app-shell widening.

**App-stage**: routes opt in with an `app-stage` root class (`/calculator`, `/explore`). `main:has(> .app-stage)` becomes a bounded flex column and the shell wrapper (`min-h-screen flex-col`) is capped to `100vh` only on those routes — reading routes keep natural flow. No `dvh` math; browsers without `:has()` degrade to master scroll.

**Panels**: `.panel` / `.panel__scroll` primitives. JSX contract: any scrollable region carries `data-panel-scroll` + `tabindex="0"` + `role="region"` + `aria-label` (pattern from the existing methodology/3D-table wrappers).

**Tokens**: `--hero-size` (vh-aware tiers), `--app-shell-max` (112.5rem, 118rem ≥1680px), `--gap-panel`, `--gap-section` (vh-aware so short viewports compress rhythm).

## Per-route changes

| Route | Mechanism | Ratio @1280×720 (before → after) |
|---|---|---|
| `/` | CSS-only: hero token, SVG height cap, jobs grid row merge, slim footer | 2.23 → 1.04 |
| `/calculator` | `calculator__columns` grid: shelf panel (vertical category rail + 2-up tiles) \| worksheet panel (basket/editors/result/scenario); sticky result re-anchored to panel; sankey gate 640→480px | 3.15 → 1.00 |
| `/explore` | `atlas__layout` grid: rail (modes+filters) \| matrix panel (records+table) \| detail panel; ≥1200px three-column | 4.32 → 1.00 |
| `/explore/3d` | none (regression-verify) | 1.00 → 1.00 |
| `/learn` | metadata 2-col, bounded description/source scrollers, hero-scale titles | 1.96 → 1.24 |
| `/methodology` | editorial grid: primer+policies left, provenance rail right (vh-bounded scroll), registry + OWID bottom pair; 3-col primer | 5.87 → 1.68 |
| `/manifests` | 2-col link-card grid | 2.07 → 1.00 |

No route regressed at any measured viewport; no horizontal overflow anywhere; band viewports (720×1280, 844×390, 768×1024) stayed within ±2% of the pre-change baseline.

## Contracts preserved

- Mobile menu disclosure (≤700px) — untouched, pinned by `redesigned-primary-flow.spec.ts`.
- Calculator DOM/source order at 320×800 (`.worksheet__body` children `['worksheet__editors','result-composition']`), all input ids/aria (`${activity.id}-quantity`, `evidence-trigger-*`, `role="alert"` errors, `aria-live`), scenario labels.
- Reduced-motion + canvas-probe 3D fallback with `2D representation in use` copy; 2D table always rendered.
- 44px touch-target rule on all record tiles, category buttons, mode buttons, action rows.
- Axe: serious/critical = 0 on 6 routes × light/dark × default/390×844. (Note: `role="region"` on a `<dl>` strips its list role and trips `dlitem` — regions wrap `<dl>`s, never sit on them.)

## Tooling

- `scripts/measure-viewport-fit.mjs` — Playwright harness against the fresh static export (never the dev server); 7 routes × 7 viewports, render-stability gated, records ratio/header/hScroll. Baseline: `scripts/viewport-fit-baseline.json`.
- `scripts/capture-viewport-screens.mjs` — screenshot matrix for visual review.
- `apps/carbon-acx-web/tests/e2e/landscape-density.spec.ts` — acceptance spec: ratio targets at 1280/1440/1600/1920 (1600 uses 1440 targets), no horizontal overflow, panel-scroll keyboard/naming contract, 44px targets at 1280×720. `playwright.config.ts` defaults unchanged.

## Verification (2026-08-27)

- Harness after each phase; final numbers in the table above; all acceptance targets met.
- `pnpm --filter carbon-acx-web lint` / `typecheck` / `test` — green (37 Vitest).
- Full Playwright suite — 108/108, including Axe both themes, touch targets, menu disclosure, reduced-motion 3D, artifact verification.
- Visual review — 56 screenshots (8 routes × 7 viewports) at `dist/viewport-screens/` during the working session.

## Known tradeoffs

- Wide references (OWID context, source registry, benchmark table) render inside vh-bounded inner scrolls at landscape: nothing hidden, but long content requires panel scrolling.
- Learn cards bound description/source/metadata heights (9.5vh caps) at short landscape; full text via panel scroll.
- Sankey flow renders only when its container is ≥480px wide; below that the ranked list remains the contribution view (previously 640px).
