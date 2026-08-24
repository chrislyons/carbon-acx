# ACX110 Narrative Calculator Implementation

**Date:** 2026-08-24  
**Branch:** `feat/narrative-calculator`  
**Status:** Implementation complete; human review pending

## Objective

Replace direct annual-quantity entry and permanently visible catalogues with a routine grammar that starts from familiar extent, cadence, and calendar terms. Preserve canonical factor identity, functional-unit correctness, publication provenance, multiple lines per activity class, explicit comparison opportunities, and evidence-only AI estimates/unavailable records.

## Delivered

### Authority and routine model

- Corrected `TRAN.SCHOOLRUN.CAR.KM`, `TRAN.SCHOOLRUN.BIKE.KM`, `TRAN.TTC.SUBWAY.KM`, and `TRAN.TTC.BUS.KM` to `pkm` in both canonical activity and factor CSVs.
- Regenerated calculator, catalogue, public-data, OWID, and release authorities through `pnpm run web:data`; factor values and source IDs remain unchanged.
- Added `apps/carbon-acx-web/src/lib/routines.ts` with typed recipes for commute, flight, weekly hours, weekly servings, billing volume, annual operation, annual purchases, replacement, and AI monthly events.
- Added version-2 base64url worksheet encoding/decoding with per-line sanitization under `carbon-acx-routine-workbook-v2`. Unknown identities, recipe/source mismatches, invalid field strings, estimates, and unavailable records are handled without contaminating published totals.
- Removed `encodeCalculatorInputs`, `decodeCalculatorInputs`, and the `carbon-acx-calculator-inputs` persistence path after migrating all in-repository callers.

### Calculator and evidence flow

- Added `RoutineWorksheet` and `RoutineLine` for progressive family → kind → identity selection, active drafts, compact committed lines, duplicate-source editing, cancellation, invalid-save focus recovery, and evidence focus restoration.
- Added explicit asymmetric commute support: one-leg outbound plus a distinct one-leg return line with carried distance/cadence values.
- Added `AiScenarioPicker` with provider/service grouping and exact model/use-case selection only for multi-scenario groups. `ScenarioEvidence` remains reusable for calculator and 3-D surfaces.
- Kept the full `ActivityShelf` behind a closed `Browse all activities` disclosure.
- Reworked the result panel into a compact total/category/benchmark summary. Comparison basis and full composition are deliberate disclosures; benchmark context never changes arithmetic.

### Normalized visualization and supporting routes

- Added `ImpactSummary` and `toImpactSummary` in `visualization.ts`; ranked and flow builders now consume normalized results rather than calculator evidence internals.
- Added routine-to-impact normalization so published AI results use their line keys and can coexist with activities without identity collapse. Estimate/unavailable scenarios remain notices only.
- Reworked the homepage `TraceEstimate` into the 8 × 2 × 5 × 48 worked commute composer with mode switching, one-passenger assumption, pkm derivation, factor evidence, and a complete routine deep link.
- Updated the methodology primer with user-authored terms, derived passenger-kilometres, the car assumption, and published-factor roles; updated Learn to one-card-at-a-time guided examples with focus management and a compact full list.
- Closed Atlas filters and table by default. `/explore/3d` reads the shared routine decoder and renders published activity and AI evidence through the appropriate detail component.
- Extended existing editorial CSS for routine states, touch targets, mobile source order, first-viewport summaries, disclosures, evidence states, and guided learning controls.

## Verification

| Check | Result |
| --- | --- |
| `pnpm run web:data` | Passed |
| `poetry run pytest tests/test_web_calculator_data.py tests/test_dataflow_manifest.py tests/test_fu_registry.py` | 39 passed |
| `pnpm --filter carbon-acx-web test` | 49 passed |
| `pnpm --filter carbon-acx-web lint` | Passed |
| `pnpm --filter carbon-acx-web typecheck` | Passed |
| `pnpm --filter carbon-acx-web build` | Passed; existing missing artifact-manifest warnings remain |
| `pnpm --filter carbon-acx-web test:e2e --workers=1` | 68 passed |
| Accessibility/touch-target browser checks | Passed in light/dark and default/390 × 844 viewports |
| Manual browser smoke | Verified wide/narrow home, calculator drafts/saves, different-return commutes, AI published/estimate/unavailable states, disclosures, Learn sequence, Atlas, and 3-D fallback |

## Review notes

- Generated authorities are intentionally included in the change; do not hand-edit them.
- The current production build and dev/e2e server still report pre-existing missing `dist/artifacts/manifests/*.manifest.json` files while continuing to complete successfully. This is unrelated to routine arithmetic or route rendering.
- Human review should focus on narrative copy, the compact first viewport at 390 × 844, AI provider grouping semantics, and the generated authority diff before merge.

## Next step

Commit the verified branch as the ACX110 implementation unit, then request human review.
