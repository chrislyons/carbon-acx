# ACX051 Audit Report — Carbon ACX Frontend

## A1) Layout & Navigation

- Fixed-width rails; no user-resize; wasted lateral space at ≥1440px.
- Nested flows (Sectors → Profiles → Activities) create hidden state and extra clicks.
- Scroll traps in side panels; header consumes >64px on compact widths.
- No keyboard resize; no double‑click reset; limited deep-linking.

**Impact:** Discoverability, speed, and density below target.

**Severity:** High

## A2) Information Architecture

- Layers/Activities/Figures not visible at once; references/provenance not one-click.
- Global search lacks action verbs (open, focus, compare) and entity scoping.

**Severity:** High

## A3) Visualizations

- Legends and margins steal space; hover latency >200ms on heavy plots.
- No “Focus Mode” for single‑viz workflow; secondary dock missing.

**Severity:** Medium‑High

## A4) State & Stores

- Store reads not selector-based → avoidable re‑renders.
- Pane state not URL-bound; refresh loses context; cache invalidation coarse.

**Severity:** Medium‑High

## A5) Performance

- Heavy viz libs eager‑loaded; route bundle >250KB gz at first route.
- No list virtualization in large trees; hydration waterfall on app route.

**Severity:** High

## A6) Accessibility (WCAG 2.2 AA)

- Missing skip links; inconsistent landmarks; tab order crosses panes unpredictably.
- No keyboard pane resize; insufficient focus outlines at high density.

**Severity:** High

## A7) Security / Infra

- Verify COOP/COEP headers for WebGPU isolation; ensure no node:* imports in client.
- Service worker/CSP not documented; path traversal checks for user-supplied URLs.

**Severity:** Medium

## Severity Table

|  Area  |  Severity  |  Rationale  |
| --- | --- | --- |
|  Layout/Nav  |  High  |  Non-resizable panes + nested flows block density goals  |
|  IA  |  High  |  Key entities undiscoverable in 2 clicks or ⌘K  |
|  Viz  |  Med‑High  |  Space lost to legends/margins; no focus  |
|  State  |  Med‑High  |  No selector reads; weak URL sync  |
|  Perf  |  High  |  Bundle + waterfalls; no virtualization  |
|  A11y  |  High  |  Missing skip, landmarks, resize  |
|  Sec/Infra  |  Medium  |  Headers/CSP/worker verification pending  |

## Recommendations (Summary)

- Add split-pane shell with keyboard resize + dbl‑click reset.
- Omni Browser (virtualized), Context Rail tabs; ⌘K palette.
- URL deep links for all pane state; selector-based store reads.
- Route-level code splitting; lazy‑load viz libs; list virtualization.
- A11y: skip links, landmarks, focus management, reduced‑motion.
- Headers: COOP/COEP; strict CSP; no node:* in client; service worker hardening.