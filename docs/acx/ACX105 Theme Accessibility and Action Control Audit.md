# ACX105 — Theme Accessibility and Action Control Audit

**Status:** Complete on `main` — 2026-08-04  
**Scope:** Public web light and dark themes; action-control readability, target size, and layout

## Findings and repair

The calculator used browser-default rendering for buttons carrying the `text-link` class. In dark theme, those controls could receive a light native control background while retaining the dark-theme link color, reducing legibility and visually separating related actions.

The shared stylesheet now gives `button.text-link` an explicit transparent surface, theme-aware border and foreground, 44px minimum height, and hover state. Calculator evidence and removal controls are grouped in a wrapping action row. Activity-picker actions align consistently across cards. These changes preserve the editorial field-notebook visual system while making the interactive state legible in both themes.

## Accessibility contract

The end-to-end accessibility suite now:

- scans `/`, `/calculator`, `/explore`, `/explore/3d`, `/learn`, and `/methodology` in light and dark themes at default and 390 × 844 viewports;
- waits for the intentional theme transition before inspecting final rendered colors;
- rejects serious and critical Axe findings;
- scans all visible header and main-region action controls on every audited route in both themes to enforce 44px minimum targets; and
- verifies calculator category, text-link, and worksheet actions are at least 44px tall and that evidence/removal actions never overlap at desktop or mobile widths.

## Validation

Run from `apps/carbon-acx-web/`:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright test tests/e2e/accessibility.spec.ts
pnpm build
```

Completed audit results:

- Typecheck and lint passed.
- Unit suite passed: 21 tests.
- The themed accessibility suite passed: 41 tests.
- Production build completed and statically exported 14 pages.
- Browser review confirmed light and dark calculator action controls use their theme surface, retain readable foregrounds, have 44px heights, and fit without horizontal overflow at 1440px.
