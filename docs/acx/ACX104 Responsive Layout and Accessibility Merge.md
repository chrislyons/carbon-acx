# ACX104 — Responsive Layout and Accessibility Merge

**Status:** CI gate repair submitted; PR #258 awaits rerun of required checks  
**Scope:** PR #258 — responsive public-web layouts and accessibility coverage

## Delivered

- Replaced the narrow-header link wrap with a labelled, keyboard-operable five-link menu disclosure at widths of 700px or less.
- Preserved desktop navigation above that breakpoint and retained theme control at every viewport.
- Consolidated responsive layout rules for the calculator, Activity Atlas, evidence layouts, and tables; compact controls retain 44px minimum targets.
- Made horizontally scrollable 2D-contribution and comparison tables focusable and labelled.
- Retained the reduced-motion contract: the 3D route uses its full 2D result table instead of WebGL when reduced motion is requested, and global transitions and animations are reduced.
- Added end-to-end checks for mobile disclosure behavior, mobile route overflow, the 390 × 844 calculator-to-Atlas flow, and serious/critical Axe violations at the default and 390 × 844 viewports.

## Validation

Run from `apps/carbon-acx-web/`:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

The review ran all five commands successfully: 21 unit tests and 37 Playwright tests passed, and the static export generated 14 pages. Browser review at 390 × 844 confirmed the closed and open menu states, five navigational links, and a document width equal to the 390px viewport.

## Merge gate

The following repository-gate defects were repaired and require CI confirmation:

- `build-static` and `tests` now select Python 3.11 and Poetry 1.8.3 before `scripts/bootstrap.sh --check-only`, matching the script's pinned toolchain requirements.
- ACX102 now uses framework-neutral language outside its explicit historical-document exception, so the documentation linter can scan the full active corpus.

Cloudflare Pages deployment and `lint-yaml` passed before the repair. Do not bypass required checks; merge PR #258 only after the rerun is green.

## Operations

- The public app remains a static Next.js export for Cloudflare Pages; no bindings, Workers configuration, data schemas, or generated data changed.
- Responsive verification viewports are 320 × 800, 390 × 844, 768 × 1024, and 1280 × 800.
- `apps/carbon-acx-web/README.md` is the operational reference for local web-app development and verification.
