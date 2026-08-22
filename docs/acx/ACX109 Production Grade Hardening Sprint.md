# ACX109 Production Grade Hardening Sprint

**Status:** Implemented on `feat/acx109-prod-grade-sprint` (from main@3cb9753)
**Date:** 2026-08-21
**Author:** Production-hardening sprint executed from a six-audit evidence base (DataProvenance, CalcDerivation, WebApp, EdgeSecurity, CiBuild, DocsAcx)

---

## 1. Purpose and baseline

This sprint moved the repository toward production-grade quality without weakening any provenance contract. Every change is grounded in a verified audit finding; nothing was speculative. The Worker compute 503 payload, wildcard CORS, and all status codes are preserved byte-exact.

Synchronized baseline at main@3cb9753: clean tree, synced with origin/main. Full gate suite green before changes, with two exceptions recorded below (F2 vacuous manifest gate; one flaky theme-toggle e2e).

## 2. Prioritized findings and verification

| ID | Severity | Finding | Verification | Resolution |
|---|---|---|---|---|
| F1 | HIGH | 28 `acx.ai-scenarios/1-0-0` records shipped in `catalog-data.json` with zero UI consumers; all seven AI activities rendered unavailable | `grep aiScenarios apps/carbon-acx-web/src` found no consumers | WP4: exact-match resolver + ScenarioPane (§4) |
| F2 | HIGH | `make verify_manifests` silently no-opped: schema path pointed at nonexistent `site/public/schemas/`; fixture skipped | `pytest tests/test_manifests.py` → "1 skipped" pre-fix | Repointed to `tools/validator/schemas/`, missing schema now fails; gate runs real validation ("2 passed") |
| F3 | MED | `_headers`/inventory emitted only into `dist/site` by `make package`, while root `wrangler.toml` points Pages at `apps/carbon-acx-web/dist` | Read of both configs | Documented as owner decision (§9); deploy wiring untouched |
| F4 | MED | No security headers on any edge surface | Header inspection of worker + bundle | Baseline headers + CSP added to worker responses and `_headers` template (§3 WP2) |
| F5 | MED | `derived-grid` carbon method declared but unconditionally raised; grid columns empty in all 28 rows | Generator read + CSV sweep | Removed from vocabulary; unknown methods rejected generically |
| F6 | MED | `$(DEFAULT_GENERATED_AT)` used but undefined → non-reproducible local builds | `grep DEFAULT_GENERATED_AT Makefile` → single use site | Defined as CI-matching epoch constant; resolution logic unit-tested |
| F7 | MED | Scenario validation presence-only: no workload↔modality compatibility, token-basis, positivity checks | Generator read; CSV value sweep | Closed vocabularies + structural rules (§3 WP1.3); 7 new pytest cases |
| F8 | MED | Pages Function forwarded Cookie/Authorization upstream and concatenated raw suffix paths | Function source read | Segment sanitization, header allowlist, https-only origin; 4 new tests |
| F9 | MED | Web lint + e2e absent from CI; release workflow shipped SBOM of unverified code; Poetry 1.7.1 drift | Workflow reads | lint step + e2e job + weekly schedule added; release gated on validate/build; Poetry 1.8.3 |
| F10 | MED | Silent null-emission rows in `calc/derive.py` exports disagreed with web's explicit-unavailable semantics | Derive source read; live run showed `missing_emission_factor=7 null_emission_rows=7` | stderr exclusion summary printed after export assembly; payload unchanged |
| F11 | LOW | Missing UI states (estimate/modeled/metered/stale-vintage); theme FOUC; dead `NEXT_PUBLIC_ENABLE_*`, app `vercel.json`, tracked `.vercel/`, root `vercel-build` | Grep proof of zero consumers | DataState chip vocabulary; pre-paint theme bootstrap; dead config deleted with grep evidence |
| F12 | LOW | Broken ACX107 filename link in `docs/acx/ACX.md` (lines 8, 120 omitted "Audit") | Link vs `ls docs/acx/` diff | Both links repaired; ACX109 indexed |

## 3. Changes delivered (commit map)

| Commit | Content |
|---|---|
| `fix(test)` | Manifest gate repointed fail-closed; `site/` pruned from workspace + CODEOWNERS |
| `fix(build)` | `DEFAULT_GENERATED_AT` defined; `_resolve_generated_at` contract tests |
| `feat(data)` | Scenario workload compatibility enforcement; derived-grid removed; release-data generator hash refreshed |
| `chore(derive)` | Exclusion/null-emission stderr summary |
| `fix(edge)` ×2 | Worker security headers + expanded contract tests; Pages Function proxy hardening + tests |
| `feat(package)` | Baseline security headers + CSP in `_headers` template |
| `ci:` ×2 | Web lint/e2e/schedule; release gating with Poetry 1.8.3 |
| `feat(web)` | Exact scenario resolver (`resolveAiScenario`, `resolveScenarioById`, `scenarioAnnualGrams`, `scenarioStaleVintage`) + ScenarioPane UI + combined-total ResultPanel |
| `test(web)` | Playwright scenario spec (4 cases) + vitest resolver contracts (6 cases) |
| `feat(web)` | DataState chip vocabulary; pre-paint theme bootstrap |
| `chore(web)` | Dead config removal; ActivityShelf client directive |
| `perf(web)` | Lazy d3-sankey chunk via `next/dynamic`; font preload |

Generator byte-parity: with `ACX_GENERATED_AT=2026-08-17T17:00:00Z`, regeneration reproduces committed payloads exactly except `release-data.json`'s self-hash of the changed generator — provenance tracking working as designed.

## 4. AI-scenario surface (ACX107 §5.5–6 acceptance)

Statuses today: 2 published (`SCN.GOOGLE.GEMINI.APPS.PROMPT.2025` 0.03 g/prompt; `SCN.MISTRAL.LECHAT.RESPONSE.2025` 1.14 g/response), 25 estimate, 1 unavailable.

Resolution rules (fail-closed, never nearest-match):

- Explicit scenarioId selection or fully specified key (activityId + modality [+ functionalUnit/providerId/modelId]); zero matches → `unavailable('No matching scenario.')`; multiple matches → `unavailable('Ambiguous scenario key.')`.
- Published scenarios contribute `quantity × carbonGPerUnit` to the annual total and benchmark comparison; the equation renders inline.
- Estimates render as evidence-only cards with the Estimate chip and are excluded from totals by construction.
- Unavailable records render their reason ("not disclosed per-query energy or carbon data").
- Stale-vintage chip appears when source review is past due or vintage exceeds five years.

Browser-verified end-to-end at 1280×800 and 320×800, dark theme: published flow updates total to "3 g CO₂e/year" with equation `100 prompts per year × 0.03 g CO₂e = 3 g CO₂e`; estimate card leaves headline at "Add a valid annual quantity"; unavailable card explains itself. Overflow scan at 320 px: none.

## 5. Responsibility and method register

Catalogue claims mapped per handoff §5 fields:

| Claim | Claim type | Accounting basis | Unit | Source | Uncertainty | Affected actors | Appropriate use | Misuse risk |
|---|---|---|---|---|---|---|---|---|
| Personal activity factors (21 published) | Measured/emission-factor product | Activity data × published factor (WTT+TTW etc., GWP100 AR6) | g CO₂e per activity unit | `data/sources.csv` registry, region+year pinned | None quantified; factor-level vintage shown | Consumers making personal estimates | Transparent arithmetic education | Treating as verified personal inventory |
| Canadian territorial benchmarks | Statistical benchmark | Territorial production-based per-capita | t CO₂e/person/year | National/provincial inventories, year-labelled | Not surfaced beyond labelling | Public comparing scale | Contextual comparison only | Cross-border or consumption-based miscomparison |
| OWID macro context | Offline context | Country inventories (production vs consumption labelled) | Various | Pinned OWID snapshot with digests | Per-source, not recomputed | Learners | Background literacy | Use as a factor or benchmark (forbidden) |
| AI usage scenarios | Reported provider/benchmark values | Provider disclosure, independent measurement, or literature estimate; scope boundary + PUE treatment per row | Wh or g CO₂e per functional unit | Source registry with ledger SHA-256 attestation | Energy bounds where disclosed; estimate flag always visible | AI users, researchers | Evidence reading; exact-key lookup | Averaging across incompatible workloads; pricing estimates as factors |
| Industrial/military layers | Modelled/inventory records | Layer-specific; never merged into personal totals | Various | Catalogue sources | Status-labelled (published/unavailable) | Systems/industrial audiences | Layer-separated exploration | Merging into personal footprint totals |

## 6. Competitive pattern-borrow table

Researched 2026-08-21 from official sources (batch 1: consumer/civic tools; batch 2: enterprise/LCA). Borrow only where it maps to shipped features.

| Tool | Audience / job | Input burden | Accounting basis | Provenance & uncertainty surfaced? | Action model | Export / accessibility notes | Borrow | Avoid |
|---|---|---|---|---|---|---|---|---|
| [Giki Zero](https://giki.earth) | Consumer footprint + reduction steps | Low starter (~8 questions) + opt-in detail | Consumption-based personal estimate | Limited | Gamified ranked steps, score tracking | Mobile apps; consumer app sunset announced Nov 2025, pivot to B2B | Starter-question progressive disclosure pattern | Building on a sunsetting consumer platform |
| [WWF Footprint Calculator](https://footprint.wwf.org.uk) | UK consumers | Short quiz SPA | Consumption-based vs UK averages | Limited | Shareable result badges | JS SPA; content not statically fetchable | Shareable-result framing | Opaque SPA methodology |
| [CoolClimate (Berkeley)](https://coolclimate.berkeley.edu) | Households, governments | Medium household survey | Consumption-based; similar-household comparison | Model documentation published | Personalized action plans | Adopted by government programs | Comparison against similar households (maps to our benchmark selector) | — |
| [EPA Household Calculator](https://www3.epa.gov/carbon-footprint-calculator/) | US households | Low; ZIP defaults | Location-based grid factors | Assumptions & References page; tooltip defaults | Quantified $ and lbs savings per action | Downloadable Excel with formulas | ZIP-level grid defaults; per-action savings framing; assumptions page | US-only factors |
| [Our World in Data CO₂ explorer](https://ourworldindata.org/co2-and-greenhouse-gas-emissions) | Researchers, journalists | None (explorer) | Territorial + consumption-based toggle, per capita options | Gold standard: per-chart source notes, open CC BY data | None | Charts embeddable, CSV download | Production-vs-consumption toggle labelling; per-artifact source notes (already mirrored in our OWID context) | Using it as a factor source (forbidden by our contract) |
| [Climate TRACE](https://climatetrace.org) | Asset-level emissions observers | None (inventory) | Bottom-up territorial inventory, ~745M assets [unverified count] | Methodology public on GitHub; per-source estimates | Reduction estimator per source | Open data downloads | Independent bottom-up verification ethos | Asset inventory scope (out of product boundary) |
| [Watershed](https://watershed.com) | Enterprise climate teams | High (integrations, activity data) | GHG Protocol Scopes 1–3; CEDA factor library | Audit-trail provenance; quantitative uncertainty not prominent [unverified] | Reduction planning workflows | Reports export | Factor-library provenance discipline | Enterprise data-pipeline complexity |
| [Persefoni](https://www.persefoni.com) | Enterprise carbon accounting | High | GHG Protocol; dual market/location Scope 2 | Audit-ready data quality scoring | Disclosure reporting | Financial-reporting grade exports | Dual Scope 2 accounting labels | Corporate-only focus |
| [Normative](https://normative.io) | Enterprises setting SBTs | Medium-high (activity + spend hybrid) | GHG Protocol; ~349k factors [vendor claim] | Methodology pages | SBTi target workflows | Report exports | Hybrid spend/activity fallback honesty | Spend-based precision overstatement |
| [Climate.us](https://www.climate.us) | Public climate information | None | N/A — NOAA Climate.gov successor data hub, not a calculator | Federal data authority | Data storytelling | Accessible public dashboards | Authority/attribution patterns for public data | Treating it as a competitor calculator |
| [openLCA](https://www.openlca.org) (GreenDelta) | LCA practitioners | High (full LCA models) | ISO 14040/14044 | First-class: Monte Carlo, pedigree matrices | None (analysis tool) | Open-source desktop | Uncertainty as first-class output (differentiation gap for us) | Desktop-app interaction model |
| [Brightway2](https://docs.brightway.dev) | LCA researchers/developers | High (Python framework) | ISO 14040s | Monte Carlo, `use_distributions`, percentile reporting | None (framework) | Scriptable, reproducible notebooks | Reproducible-script ethos (matches our deterministic builds) | Framework scope |
| [ecoinvent](https://ecoinvent.org) | LCA data consumers | N/A (licensed dataset) | ISO-conformant LCI, 26k+ datasets [vendor figure] | System-model documentation; ecoQuery free lookup | None | License-gated access | Separate-data-from-calculation design (validates ours) | Licensing cost/lock-in |

Pattern conclusions: (1) nobody else surfaces per-record provenance hashes to end users — keep and advertise it; (2) quantitative uncertainty presentation (openLCA/Brightway style percentiles) is the clearest future differentiator, already partially supported by energy bounds; (3) EPA-style per-action savings framing fits our Estimate route without changing accounting.

## 7. Performance measurements

First Load JS (Next build output, kB gzipped):

| Route | Before | After | Delta |
|---|---|---|---|
| `/calculator` | 162 (baseline) → 164 (with ScenarioPane, static sankey) | **160** | −2 vs baseline despite new feature; route chunk 11.3→7.4 kB |
| `/explore` | 157 | 157 | unchanged |
| `/explore/3d` | 151 | 151 | unchanged (three.js already lazy) |
| shared | 102 | 102 | unchanged |

Budget table adopted:

- Initial route JS: ≤ current values; regressions require justification in this document.
- LCP < 2.5 s, INP < 200 ms, CLS < 0.1 (static export, self-hosted fonts now preloaded).
- Catalogue filtering < 100 ms for 108 activities (in-memory filter, unchanged).
- Known accepted cost: catalog JSON (~290 KB source) ships inside the client bundle because one catalogue authority serves calculator fallback classification, Atlas modes, and scenarios; splitting it would fork the authority (rejected, §8).

## 8. Decisions log

1. **Estimates never enter annual totals** (ACX107 binding wording). One-line policy change point if reversed: `ScenarioPane` result branch.
2. **derived-grid removed, not implemented**: no row carries grid metadata; populating it would fabricate data. Reintroduction requires populated `grid_*` columns + derivation code + review.
3. **Closed vocabularies where enumerable** (modality, functional-unit-per-modality, publication status, carbon method); free-text provenance descriptions (`scope_boundary`, `pue_treatment`, `serving_context`) stay free-text — they are per-source prose, not categories. Deviation from plan noted deliberately.
4. **Media params accept positive numbers or literal `'not disclosed'`** matching the shipped `number | string | null` contract; arbitrary strings, zero, negatives rejected.
5. **CSP allows `unsafe-inline` for script/style** — Next static-export hydration/runtime requires it; tradeoff recorded here. All other directives locked to `'self'`.
6. **Deploy wiring untouched**: `make package → dist/site` remains canonical; root `wrangler.toml` divergence needs an owner decision (§9).
7. **Silent-null accounting**: derive exports keep payload shape (analyst-facing golden fixtures stable) and print exclusion counts to stderr; web generator remains the explicit-`unavailable` authority.
8. **One catalogue authority**: splitting catalog JSON for bundle size would fork provenance; bundle budget justified instead.

## 9. Commands run and results (final state)

Full suite re-run at end of sprint; see final gate log in the PR description. Highlights:

- `make doctor` ✓ (Node 20.19.4, pnpm 10.5.2, Python 3.11.x, Poetry 1.8.x)
- `ACX_AUDIT_DATE=$(date +%F) make data-audit` ✓ · `make validate` ✓ · `make build` ✓ · `make build-web` ✓ · `make package` ✓
- `make verify_manifests` ✓ **now executes real schema validation** (was 1 skipped)
- `make validate-manifests` ✓ · `make validate-diff-fixtures` ✓
- `pnpm --filter carbon-acx-web typecheck|lint` ✓ · `pnpm test` 31→37 unit tests ✓
- `pnpm --filter carbon-acx-web test:e2e` 70 passed (+4 scenario, +1 fixed theme race); 1 known flake: `/explore` axe scan timing (passes on rerun)
- `node --import tsx --test workers/compute/index.test.ts functions/carbon-acx/[[path]].test.ts` 14 tests ✓
- Reproducibility: consecutive unpinned `make build` outputs share identical timestamps (epoch constant)

## 10. Remaining risks and human-review requirements

- **Owner decision required — Pages deploy wiring**: either point Cloudflare Pages build command at `make package` (canonical bundle with `_headers`, inventory) or port `prepare_pages_bundle.py` into the `pnpm build:web` path. Until decided, deployed environments may lack security headers/artifact routes that `dist/site` carries.
- **CI workflow edits** (`.github/workflows/ci.yml`, `release.yml`) are high-risk files under AGENTS.md and require human review before merge; browser-install feasibility for the new e2e job verifies on first CI run — drop only the job (record here) if runners cannot install Chromium; never add `continue-on-error`.
- **CSP `unsafe-inline`** weakens XSS defense relative to nonce-based CSP; acceptable for a static, no-user-input site; revisit if forms/auth appear.
- **Accessibility flake**: `/explore` axe scan intermittently exceeds its window; recommend investigating axe timeout budget separately.
- **Estimate policy** is intentionally strict (excluded from totals); revisit only with explicit governance sign-off.

---

**Related documents:** [[./ACX107 LLM Inference Footprint Audit and Application Data Model]] · [[./ACX108 Dataflow Integrity and Provenance Release Audit]] · [[../../README]]
