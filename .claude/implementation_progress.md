# Implementation Progress

## 2026-08-17 — D3-adjacent visualization skills port

- Ported the Whitebox Hermes data-science visualization skills to Cloudkicker at `~/.hermes/skills/data-science/`.
- Added `d3-visualization` with four references covering rendering foundations, React/Svelte integration, interaction and motion, and layouts/spatial visualization.
- Added `visualization-techniques` with five references covering distributions, relationships/time, composition/flow, matrix/hierarchy, and multivariate caveats.
- Confirmed the 11 local files match their Whitebox source SHA-256 hashes.
- Confirmed Whitebox `~/.omp/agent/skills/` contains no D3-adjacent data-science skill files; no `.omp` port was applicable.

### Next steps

- Use `d3-visualization` after chart selection, or load `visualization-techniques` first when the analytic encoding is undecided.

## 2026-08-21 — ACX109 production-grade hardening sprint

Branch `feat/acx109-prod-grade-sprint` (from main@3cb9753). Full findings, decisions, and measurements in `docs/acx/ACX109 Production Grade Hardening Sprint.md`.

- Manifest gate repointed at `tools/validator/schemas/` and made fail-closed; dead `site/` workspace member and CODEOWNERS entry removed.
- `DEFAULT_GENERATED_AT` defined for reproducible local builds; `_resolve_generated_at` contract tested.
- AI-scenario generator validation tightened: closed modality/unit vocabularies, token-basis compatibility, positive-or-disclosed media params, non-negative energy/carbon, workload-profile requirement; `derived-grid` removed as an impossible capability.
- `calc.derive.export_view` now prints excluded/null-emission counts to stderr.
- Worker compute route: additive security headers (`nosniff`, referrer-policy), OPTIONS no-store; contract bytes unchanged; 10 node:test cases.
- Pages Function proxy: suffix sanitization, upstream header allowlist, https-only origin; 4 new tests.
- `prepare_pages_bundle` emits baseline security headers + CSP for all routes.
- CI: web lint step, e2e job, weekly schedule; release workflow gated on validate/build with Poetry 1.8.3.
- Calculator: exact-match AI scenario resolver, ScenarioPane UI (published joins total, estimate evidence-only, unavailable explained), DataState chip vocabulary, pre-paint theme bootstrap (fixes flaky backslash-toggle race), lazy d3-sankey chunk, font preload.
- Dead config removed: `NEXT_PUBLIC_ENABLE_*`, app `vercel.json`, tracked `.vercel/` output, root `vercel-build`.

### Next steps

- Owner decision required: Pages deploy wiring divergence (`make package → dist/site` vs `pages_build_output_dir`) — see ACX109 deployment notes.
