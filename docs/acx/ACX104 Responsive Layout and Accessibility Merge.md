# ACX104 — Responsive Layout and Accessibility Merge

**Status:** Review complete; PR #258 remains open pending repository CI repair  
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

The branch was not merged because its repository CI checks are red for pre-existing infrastructure and documentation failures unrelated to this change:

- `build-static` runs `scripts/bootstrap.sh --check-only` with Python 3.12.3, while the script requires Python 3.11.
- `citations` fails on the existing banned `fastapi` term in `docs/acx/ACX102 Recovery Merge and Calculator Provenance Hardening.md`; PR #258 does not modify that file.

Cloudflare Pages deployment and `lint-yaml` passed. Do not bypass these required checks; repair the base CI failures, re-run the checks, then merge PR #258.

## Operations

- The public app remains a static Next.js export for Cloudflare Pages; no bindings, Workers configuration, data schemas, or generated data changed.
- Responsive verification viewports are 320 × 800, 390 × 844, 768 × 1024, and 1280 × 800.
- `apps/carbon-acx-web/README.md` is the operational reference for local web-app development and verification.
