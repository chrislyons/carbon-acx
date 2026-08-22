# ACX110 Codebase Health and Modularization Pass

**Status:** In progress on `feat/acx110-health-pass` (from main@ffaad0e)
**Date:** 2026-08-22
**Author:** Full-pipeline architecture audit (four read-only scouts) followed by owner-approved restructuring across three disjoint implementation tracks.

---

## 1. Purpose and baseline

ACX109 hardened behavior at the edges. This sprint addresses what the audits showed underneath: a prototype-era structure that must become modular and efficient before scaling or deployment work continues. Owner directive: "make everything healthy and right for future scaling and deployment"; existing seams were treated as unproven until audited.

Baseline: main@ffaad0e, clean tree. Pinned-clock rebuild proof captured pre-change:

```
ACX_GENERATED_AT=2026-08-17T17:00:00Z make build   # green
47 artifact files sha256-manifested                # byte-parity reference
```

## 2. Audit findings (evidence base)

Four scout reports (CalcCore, PipelineScripts, UITrees, EdgeDeploy) established, with file:line citations preserved in the sprint PR description:

### Verified sound
- `calc/` has **no module-level import cycles**; leaf kernels (formulas, emissions, layers, stable serialization) are pure and heavily unit-tested.
- `apps/carbon-acx-web/` is cleanly architected (pure `lib/calculator.ts`, thin pages); the only deployed surface.
- Byte-parity harness is strong: golden `export_view.json` fixture (`tests/test_integration.py::test_export_view_matches_golden`), cross-backend byte parity (`test_backend_parity.py`, `test_parity.py`), web authority byte stability + atomic commit (`test_web_calculator_data.py:331,350,419`), validator gates (`make verify_manifests`, `validate-manifests`, `validate-diff-fixtures`).

### Structural defects
1. **`calc/derive.py` is simultaneously kernel library, composition root, and CLI** (1,944 lines). Two god orchestrators: `build_intensity_matrix` (:779) and `export_view` (:1184).
2. **Private-API coupling**: `service.py` imports six `derive._*` internals (:88, :480, :503, :514–515, :555–556, :577), blocking any safe split of derive.
3. **Latent `api↔derive` import cycle** on a knife-edge: top-level `derive.py:28` vs function-scoped `api.py:159`.
4. **Cross-pipeline duplication**: `scripts/generate_web_calculator_data.py` reimplements calc primitives wholesale (CSV loading, grid math, factor picking, sha256, timestamps) with zero calc imports; OWID snapshot contract duplicated line-for-line between `fetch_owid_context.py` and the generator (~150 lines).
5. **Divergent conventions carrying reproducibility risk**: `_resolve_generated_at` ×3 with incompatible microsecond handling (derive keeps them; figures/generator strip them); env-truthiness parsers ×3–4 with different semantics; sha256 ×5 with two normalization semantics; grid-lookup construction ×4.
6. **Silent backend inequivalence**: `SqlStore` returns `[]` for 7 of 13 DataStore tables (`dal_sql.py:166–185`); callers mask the gap with CSV fallbacks, so sqlite quietly yields different results than csv.

### Latent correctness divergence (documented, deferred)
Web vs analyst pipelines select emission factors differently: derive takes last-row-wins per activity; the generator applies region preference (CA-ON > CA > GLOBAL) then newest vintage. Same CSVs can yield different values web vs analyst export. Reconciling changes which factor wins for some activities — a data-release decision, not a refactor decision. **Owner deferred**; recorded here as the single known value-divergence between pipelines.

### Dead weight
7 orphaned scripts (`run_validations.py`, `generate_dataset_manifest.py`, `sync_layers_json.py`, `build_site.py` — kept alive only by its own tests, `audit_layers.py`, `build-cloudflare.sh` with stale absolute paths, `dev_diag.sh`), stale root docs (`IMPLEMENTATION_PLAN.md`, `SSR_FIX_STATUS.md` — zero live references), `.cloudflare-rebuild` marker.

### Dash analyst explorer (`app/`)
1,996-line `app/app.py` + 10 Plotly components; local-only via `make app`; zero deploy surface; not in CI; kept alive by tests. Its layer sankey/bubble/intensity views have no web equivalent.

## 3. Owner decisions (2026-08-22)

| Decision | Choice | Consequence |
|---|---|---|
| Dash explorer fate | **Freeze** | Keep `make app` working; mark unsupported in README; no further investment; deletion remains available later |
| Dead weight | **Archive in-repo** | Move to `refs/archive/acx110/` preserving path shape with banner comments; recoverable without git archaeology |
| Factor-selection divergence | **Document, defer fix** | Recorded above; reconciliation is a future data-release decision |
| SQL backend gap | **Implement missing tables** | SqlStore becomes genuinely equivalent to CSV; parity tests extended to prove it |

## 4. Implementation tracks

Three parallel tracks on strictly disjoint file domains:

| Track | Domain | Content |
|---|---|---|
| CalcCoreImpl | `calc/{derive→package,service,api,figures,manifest,utils}`, Makefile (one recipe) | derive.py → `calc/derive/` package along verified seams (formulas/emissions/layers/serialisation/orchestrators/cli); public API preserved via `__init__` re-exports; service migrated off `derive._*` privates; api↔derive cycle fixed; single `resolve_generated_at` (UTC ISO-8601, seconds precision), one truthiness helper, shared category normaliser; `make build-web` pins `ACX_GENERATED_AT` like `make build` |
| PipelineCleanup | `scripts/*`, `refs/archive/acx110/`, README | Shared OWID snapshot module (`scripts/_owid_snapshot.py`, mirroring the `_artifact_paths.py` convention) consumed by both scripts with byte-identical authorities; ten dead-weight files archived with banners; README freeze note for app/ |
| SqlParity | `calc/dal_sql.py`, its tests, `test_parity.py` coverage | Implement all 13 DataStore methods mirroring Csv/DuckDb row→model semantics; extend csv-vs-sqlite byte parity to previously gapped tables |

Binding contracts across tracks:
- Public surface of `calc.derive` preserved 1:1 (all non-underscore symbols importable as before).
- Zero payload byte changes under pinned clock; post-change rebuild must match the 47-file baseline exactly (except tracks explicitly changing sqlite outputs *toward* CSV equivalence).
- Canonical generated-at repo-wide: UTC ISO-8601 seconds precision.
- No track touches deploy wiring (`wrangler.toml`, workflows) — ACX109 §10 owner decision remains open and gating.

## 5. Verification plan

Full gate suite after tracks land, compared against baseline:

1. `pytest tests/test_integration.py::test_export_view_matches_golden` — golden fixture
2. `pytest tests/test_backend_parity.py tests/test_parity.py` — cross-backend bytes
3. `pytest tests/test_web_calculator_data.py -k 'byte_identical or preserves_acx_authorities or rollback'`
4. `ACX_GENERATED_AT=2026-08-17T17:00:00Z make build` → tree-hash diff vs `/tmp/acx110_baseline.sha256` (must be empty)
5. `make validate` · `make verify_manifests` · `make validate-manifests` · `make validate-diff-fixtures`
6. `pnpm --filter carbon-acx-web typecheck lint test` (web untouched this sprint; regression check)
7. Publication audit (byte-parity of committed authorities)

## 5a. Verification results (final state, HEAD of `feat/acx110-health-pass`)

| Gate | Result |
|---|---|
| `make lint` (ruff + black + lint_docs) | clean |
| `make test` | 148 passed, 4 skipped (skips pre-existing) |
| Golden fixture `test_export_view_matches_golden` | pass |
| Cross-backend parity (`test_backend_parity`, `test_parity`) | pass — sqlite now exercises real rows for all previously gapped tables |
| Web authority bytes (`test_web_calculator_data -k 'byte_identical or …'`) + publication audit | pass (sole byte change: release-data generator self-hash, by-design provenance) |
| `make verify_manifests` / `validate-manifests` / `validate-diff-fixtures` | pass |
| Pinned rebuild (`ACX_GENERATED_AT=2026-08-17T17:00:00Z make build`) vs pre-refactor baseline | 45/47 files identical; only diffs are four *untracked* nested manifests embedding `provenance.commit_hash` of the moving HEAD. All tracked artifacts byte-identical to main@ffaad0e (verified by rebuilding baseline-era code in an isolated worktree). |
| Edge contract tests (worker + Pages Function) | 10 passed |
| Web typecheck / lint / vitest / Playwright e2e | clean · 37 unit · **75 e2e passed** |

Verification notes:

- Mid-sprint anomaly: working-tree figure references briefly shrank 45→5 entries. Investigated via isolated-worktree rebuild of the pre-refactor commit with identical pins — full 45-entry output reproduced; final pinned rebuild matches the baseline hash-for-hash. Debris from an intermediate run, overwritten by the canonical build; no code effect.
- `pyproject.toml` gained `[tool.pytest.ini_options] testpaths = ["tests"]` because archived tests under `refs/archive/acx110/` broke pytest collection. pyproject.toml is an AGENTS.md review-gate file — this two-line change needs human review.

## 5b. DB round-trip hardening (found during verification)

`make db_init → db_import → db_export` surfaced three drift classes against the authored CSV authorities; all fixed in `scripts/export_db_to_csv.py`:

1. CRLF row terminators → LF (`lineterminator="\n"`).
2. Row reordering → `ORDER BY <pk>` (and PK-index scan plans for bare `SELECT`) silently reordered rows vs authored sequence; now `ORDER BY rowid` = insertion order = authored order.
3. Float formatting → `format(v, ".15g")` turned `3600.0` into `3600`; now `repr(value)`, matching the authorities' float text.

Residual limitation: `activity_schedule`, `emission_factors`, `grid_intensity`, `layers` contain fields authored with redundant quotes (no commas inside); `csv.writer` minimal-quoting cannot reproduce that style. Content is byte-identical otherwise. A one-time cosmetic normalization of those four files would make the loop fully byte-faithful — deferred as an owner-approved data pass. Authorities were restored untouched after every probe.

## 6. Remaining risks and follow-ups (post-sprint backlog)

1. **Factor-selection reconciliation** — deliberate data-release decision; pick one rule (last-wins vs region-preference) with governance sign-off.
2. **Pages deploy wiring (ACX109 §10)** — still open; decides whether `dist/site` artifacts/_headers ship. Blocks CLOUDFLARE_PAGES_CONFIG.md rewrite.
3. **Compute surface** — `calc/service.py` compute contract is live-but-unshipped (worker 503 stub, test-only contract). Ship behind parity-tested route or delete.
4. **Loader consolidation** — the ~260-line duplicated load-with-CSV-fallback orchestration (service.py:316–449 / derive export) should collapse into one dataset loader once kernels are public; exception-swallowing fallback semantics need careful review.
5. **AGENTS.md hygiene** — still lists pruned `site/` under Core Code & Apps (governance file; needs human edit).
6. **Dash freeze review** — if `make app` sees no use by next quarterly review, delete tree + `dash`/`plotly`/`kaleido` deps.
7. **Column-contract scattering** — EXPORT_COLUMNS/INTENSITY_COLUMNS names duplicated as string literals inside figures.py; consider a shared constants module during loader consolidation.

---

**Related documents:** [[./ACX109 Production Grade Hardening Sprint]] · [[./ACX108 Dataflow Integrity and Provenance Release Audit]] · [[../../README]]
