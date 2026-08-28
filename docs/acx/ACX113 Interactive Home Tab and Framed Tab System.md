# ACX113 Interactive Home Tab & Framed Tab System — Session Log

Date: 2026-08-27/28 · Branch: `feat/landscape-viewport-density` · Scope: `apps/carbon-acx-web/`

This doc logs everything after ACX112: the home-tab overhaul, the site-wide callout/unit normalization, the framing system, and the infrastructure bugs found and fixed along the way.

## 1. Framed tab system (site-wide)

Every non-home tab is now framed by four uniform 54px bars (`--bar-h`):

```
site topbar        0–73    (sticky top, --header-h 4.5rem + 1px border)
tab headerbar     73–127   (sticky; title + live status meta)
content            127–611  (panels scroll internally)
tab footerbar     611–665  (sticky; per-tab actions/status)
site footerbar    666–720  (sticky bottom)
```

- `TabHeader` / `TabFooter` components (`src/components/layout/`). Headerbar: title (page h1) + live meta. Footerbar: per-tab utility content.
- Heights are shrink-proof (`flex: 0 0 auto` + `min-height` + `overflow: hidden`) — flex columns can no longer compress them.
- Home is intentionally unframed (it is the invitation): its root carries `home-page` and its chart absorbs viewport slack instead.
- Footer nav trimmed to external links only (Methodology/Evidence live in the header). Site footer/header unbound from `page-shell` (full-width bars, 1rem edge padding).

## 2. Methodology/Evidence split

- `/methodology` — pure reading tab: six-question primer (always open, no `<details>`) + four policy cards in one row (stacks ≤700px).
- `/evidence` (renamed from `/manifests`, promoted to header tab #6) — verification hub: figure manifests, source registry, benchmarks table, OWID context, generated dataset metadata, offline release info. Two-column bounded grid, footerbar section anchors.
- Rationale: reading mode vs consult mode. Hotkeys auto-extended to `1`–`6`.

## 3. Interactive home tab

- Headline is now the answer: "One year of driving. 180.0 kg CO₂e." — then reworded to "Your annual commute." with the principal value `1,000 km · 180.0 kg CO₂e/yr` displayed once, below the chart (km and CO₂e together, as on the chart marker).
- Vehicle-class dropdown (Car / Toronto bus / Toronto subway) replaces the quantity input. All commuter classes plot as lines: solid = active, faint = others at the same annual quantity.
- The marker dot is draggable (pointer capture, 10 km steps, axis grows with the drag) with a `drag the marker · ← →` hint.
- Home-scoped hotkeys: `↑/↓` vehicle class, `←/→` slide the marker (`Shift` = ×4). Guarded against text-entry targets and the focused slider (no double-step).
- The chart measures its box with a `ResizeObserver` and derives its viewBox from the measurement — it fills whatever space the layout awards at any viewport, no letterboxing. Guarded against observer feedback loops (damping + a definite `grid-template-rows: minmax(0, 1fr)` / `min-height: 0` flex chain).
- Home joins `app-stage` (bounded viewport, no master scroll) via the `home-page` class; its top padding is home-only (`clamp(1.25rem, 3vh, 2.25rem)`), because a shared selector briefly leaked 22px of top padding onto Calculator/Explore.
- Modular registry in `page.tsx`: `HOME_PANELS = [{ id, title, lede, Component }]` — future interactive panels append here and the headline becomes the panel selector.

## 4. Chart dark mode + quality

- The chart previously letterboxed into a tiny centered stamp (fixed height clamp vs width-driven aspect). Now: wide native viewBox (960-wide family), width-driven sizing removed in favor of measured-box sizing.
- Dark mode readability: SVG text was filling black by default — explicit theme-aware fills (`--ink-muted` ticks/axis, `--ink` marker label) plus a `paint-order: stroke` halo on the marker label.
- Sankey render gate lowered 640→480px so the flow diagram survives narrower panel columns.

## 5. Callout + unit normalization (site-wide)

- Callout standard: **1.0rem / weight 500 mono** for equations (primer, factor records, learn arithmetic, calculator tally total). Tally hierarchy preserved (status line stepped to 0.74rem). Home hero value exempt.
- `src/lib/units.ts` → `abbreviateUnit()`: kilometres→km, passenger-kilometres→pkm, kilowatt-hours→kWh, square metre-years→m²·yr, cubic/square metres→m³/m², hours→h, years→yr, "per year"→"/yr". Applied at every render site (primer equation, learn arithmetic, factor records, quantity labels, ScenarioPane, Explore detail). Generated dataset JSON untouched (display-layer only).
- `/year` → `/yr` everywhere, including the home hero.

## 6. Infrastructure bugs found and fixed

1. **Tailwind v4 was never generating utilities.** The project runs `@tailwindcss/postcss` 4.1 but globals.css declared v3 `@tailwind` directives — silently ignored, so `flex`, `gap-*`, `mt-*`, `grid-cols-*`, `font-semibold`… were inert in every build. Fixed with CSS-first activation: `@import "tailwindcss/theme|utilities"` + `@theme` tokens; preflight deliberately not enabled (custom CSS owns element defaults). Legacy `max-w-*`/`py-*` classes had already been stripped from page roots, so activation caused no width regressions.
2. **Sticky bars could be flex-squashed** on content-heavy tabs (height without `flex: 0 0 auto`).
3. **Feedback loop**: measured chart viewBox fed back into an unbounded flex chain (missing `min-height: 0` / indefinite grid row) → infinite growth. Fixed with definite tracks and observer damping.
4. **22px top leak** onto Calculator/Explore from an unscoped home padding selector — home-only scoping via `home-page`.
5. **App-stage roots stopped filling the bounded viewport** after the scoping (lost `flex: 1 1 auto`) → 77px dead band above the sticky footer at tall viewports; also `.editorial-page`'s `5vw` block padding had to be zeroed for app-stage roots. All framed tabs verified: footerbar pinned 1px above the site footer at 998px-tall viewports.
6. Stale Next `.next/types` + packaged `dist/types` after the route rename — required full cache clears.

## 7. Verification

- Playwright: **107/107** (one obsolete invalid-input test retired with the removed input; nav/unit/marker assertions updated).
- Vitest 37/37; lint + typecheck clean.
- Harness ratios: `/` 1.05/1.00/1.00/1.00 @1280/1440/1600/1920; every framed tab fills its viewport exactly (scrollHeight = innerHeight at 998px-tall windows); band viewports within tolerance.
- Geometry assertions: bar heights 54px uniform, footerbar pinned 1px above site footer, panels flush 127–611 on every tab.
- Dark + light screenshots reviewed per tab (`dist/viewport-screens/`).

## 8. Known tradeoffs

- Home has no tab bars (it is the invitation); its frame is the site topbar/footer only.
- Evidence/Methodology bounded panels scroll internally by design; long lists never drive master scroll.
- Keyboard marker control on home uses the global arrow hotkeys (documented in-chart) rather than an in-SVG slider widget, keeping the SVG free of focusable descendants (Axe-clean).

## 9. Pre-merge review pass (8 parallel reviewers)

Findings adopted and fixed before merge:

- ImpactTrace: band-viewport ResizeObserver feedback loop killed (svg gets a definite CSS height ≤1023px; desktop already 100%); drag now clamps to a fixed 200,000 km ceiling (endpoint can no longer be dragged out from under itself); slider affordance moved to the pointer-capture hit target, decorative dot unclassed.
- Hotkey tests: first ArrowRight press is toPass-guarded so a press lost to hydration lag cannot strand the count; tests use the page-level hotkeys (documented in-chart) rather than focusing non-focusable SVG.
- units.ts: ` per year` runs before standalone `years`; every pattern token-bounded (`megakilowatt`, `kilometresque` pass through).
- Header: `aria-current` follows nested routes (`/evidence/[id]` keeps Evidence current).
- Calculator TabHeader total now includes the published scenario (`combinedTotal`), matching the result panel; empty state derived from the same condition.
- 3D TabFooter: honest empty-workbook status instead of claiming a 2D fallback that isn't mounted.
- Atlas: base layout single-column; the two/three-column region grid is ≥1024px only (protects the 701–1023px band).
- Band (≤700px): site footer and tab footerbar drop the fixed 54px clip in favor of auto-height + wrap — no clipped links at 320/390px.
- Scripts: path-traversal containment on all three static servers; try/finally resource cleanup; harness baseline is now check-or-update (`--update` to write, regressions exit 1); baseline regenerated for the `/evidence` route set (49 pairs).
- Home padding duplicate removed; stale `/manifests` comment fixed; dead slider focus CSS removed; unused `Disclosure` import dropped.

Declined (with rationale): DataState wrappers for benchmarks/sources empty states (generated contract is non-empty; SourceList already renders a data-state line); slider ARIA role on the SVG circle (re-triggers Axe nested-interactive; global hotkeys are the documented keyboard path).
