# ACX114 Responsive Information Architecture Superseding Decisions

**Status:** Active implementation decision record  
**Date:** 2026-08-30  
**Scope:** Carbon ACX public web application (`apps/carbon-acx-web/`)

## Decision

ACX114 supersedes the following user-interface decisions from ACX112 and ACX113 only:

1. Four independently sticky header/footer bars.
2. A mobile disclosure Menu control for primary navigation.
3. Global Home arrow-key hotkeys for changing the estimate.
4. A frozen `<=1023px` responsive band.
5. Bounded reading-route prose scrollers and equal-height reading cards.

The six public routes remain `/`, `/calculator`, `/explore`, `/learn`, `/methodology`, and `/evidence`, with `/evidence/[id]` as the manifest detail path. ACX112 and ACX113 remain historical records; their data, arithmetic, and provenance decisions are not superseded by this UI decision.

## Responsive contract

Carbon ACX uses one semantic DOM order at every width. Below `60rem`, the header and route bar stay in normal flow. Primary navigation is a labelled, horizontally scrollable rail below `48rem`; its six links remain ordinary links with visible labels and icons. At `48rem` and `60rem`, intermediate compositions use intrinsic grids rather than a compatibility freeze. Calculator and Explore split at `60rem`; Explore adds its detail column at `72rem`. Content caps at `120rem`. Reading routes use natural document height at every width and do not put prose in nested scroll regions.

The supported interaction baseline is native HTML links, buttons, forms, tables, definition lists, disclosures, and scrolling. Pointer drag on the Home chart is an enhancement only; the labelled numeric input is the complete fallback. `ResizeObserver`, pointer capture, WebGL, and lazy visualization chunks are feature-detected and have functional non-enhanced paths.

## Theme contract

The valid saved values `carbon-acx-theme=light|dark` take precedence over the system color preference. When no valid saved value exists, the initial theme follows `prefers-color-scheme`. Toggling the theme writes the saved override. Light and dark themes set `color-scheme` explicitly. Higher contrast, forced colours, reduced motion, native controls, selected/current states, unavailable hatch/text, and SVG labels remain represented by semantic tokens and text rather than hue alone.

## Browser floor and verification labels

The support target is the current and previous major Chrome/Edge, Firefox, Safari, and iOS Safari as of implementation. Automated browser projects are Playwright Chromium, Firefox, and WebKit; Playwright WebKit is not represented as Safari. Actual desktop Safari and the listed iOS simulator runtimes are separate verification surfaces. Untested browser/device combinations remain untested.

The implementation records executable checks for responsive boundaries (`767/768`, `959/960`, and `1151/1152` CSS px), zero document overflow, 44px controls, route/current-state semantics, theme precedence, focus visibility, reflow, text spacing, forced colours, reduced motion, Home input fallback, Calculator worksheet transitions, Atlas selection reconciliation, reading-route natural scroll, artifact links, and lazy flow loading. Measured values and exact browser/runtime versions are appended after the implementation and verification pass; no screenshot or browser claim is promoted without observed evidence.

## Rationale

A single governed route registry eliminates label and current-state drift. A normal-flow compact shell keeps navigation discoverable without hiding the primary task. Intrinsic grids improve scan density without shrinking type or controls. Natural reading scroll preserves source order, keyboard access, and reflow. Generated authorities remain the sole source for displayed counts, factors, statuses, and source usage.

## References

[1] World Wide Web Consortium, “Web Content Accessibility Guidelines (WCAG) 2.2,” Dec. 2024. [Online]. Available: https://www.w3.org/TR/WCAG22/

[2] World Wide Web Consortium Web Accessibility Initiative, “Understanding Success Criterion 1.4.10: Reflow.” [Online]. Available: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html

[3] World Wide Web Consortium Web Accessibility Initiative, “Understanding Success Criterion 1.4.12: Text Spacing.” [Online]. Available: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

[4] Mozilla Developer Network, “CSS container queries.” [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries

[5] Mozilla Developer Network, “`<dialog>`: The Dialog element.” [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog

## Implementation evidence (2026-08-30)

The decision is implemented on `feat/frontend-information-density`. The implementation is split across four working checkpoints: `ee2e1e0`, `48aa595`, `899fa3d`, and `4ff3b0d`; the final integration commit follows this evidence update.

- **Data and static release:** the reproducible static build passed with `ACX_GENERATED_AT=2026-08-28T04:46:56+00:00` and `ACX_AUDIT_DATE=2026-08-28`. The dataflow audit reported 23 datasets and 1,285 claims; the manifest audit reported 108 rows; the package contained 47 artifacts; and the Next export rendered 14 pages.
- **Web code gates:** TypeScript typecheck and ESLint passed. Vitest passed 47 tests across 9 files. Repository validation passed 157 Python tests, 4 optional skips, asset validation, documentation lint, dataflow audit, and manifest audit.
- **Browser matrix:** the final Playwright run passed 458 tests with 4 intentional skips across Chromium, Firefox, and Playwright WebKit. The observed engines were Chromium 141.0.7390.37, Firefox 142.0.1, and WebKit 26.0. WebKit is recorded as WebKit, not Safari.
- **Responsive harness:** the static viewport check passed 120 route/viewport pairs spanning nine base viewports and six breakpoint boundaries. Every pair reported `hScroll=false`. Wide workspace ratios were 1.05–1.08 at 1280×720 through 1920×1080; reading routes retain natural document flow.
- **Performance harness:** under the scripted Chromium network/CPU profile, three-sample medians were Home LCP 1,480 ms / CLS 0.00043, Calculator LCP 1,428 ms / CLS 0.03396 / max interaction 32 ms, and Explore LCP 1,532 ms / CLS 0 / max interaction 32 ms. The optional flow loaded only after disclosure and no initial d3-sankey request was observed.
- **Bundle report:** shared first-load JavaScript remained 102 kB; route first-load values were Calculator 161 kB, Explore 158 kB, and 3D 154 kB. The Explore route is 1 kB above the ACX109 157 kB value, Calculator is 1 kB above its 160 kB value, and 3D is 3 kB above its 151 kB value because the worksheet/evidence and accessible 3D fallback/detail contracts are now route-owned. The small exceptions are recorded rather than hidden; Sankey and WebGL remain deferred, while the primary Atlas map and selected-record detail stay server-rendered to protect first interaction and LCP.
- **Apple surface boundary:** `safaridriver` is available as Safari 26.5 (21624.2.5.11.4), and iOS simulator runtimes 18.2, 18.4, and 26.4 are installed. Actual Safari and iOS simulator interaction were not run in this pass; physical Edge, physical iOS Safari, and prior browser majors remain unverified.
- **Visual capture:** the final capture harness produced 144 screens across nine viewports and light/dark themes, covering the public routes and discovered manifest detail.

The implementation evidence intentionally distinguishes automated browser engines from product-browser verification. That distinction is part of the support contract, not a claim that Playwright WebKit is Safari.
