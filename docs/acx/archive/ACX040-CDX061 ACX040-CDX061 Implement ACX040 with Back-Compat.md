# ACX040-CDX061 Implement ACX040 with Back-Compat (dual-write, mapped layers, enriched schema)

**Branch:** `feat/acx040-view-manifest`
**Objective:** Land ACX040 manifests and hashed artefacts **without breaking** existing consumers. Use a **dual-write + discovery-fallback** rollout. Add minimal schema fields to support `trace_keys` and dataset metadata. Keep Ruff/mypy green.

***

## 0) Guardrails / Rollout Strategy

- Introduce build flag `ACX040_HASHED` (default `0`).
    - When `0`: write legacy static filenames **and** emit manifests for them (pilot mode).
    - When `1`: **dual-write** both hashed and static names; manifests point to hashed; collection index lists both.
    - Consumers read via index first, else fall back to static names.
- Keep this flag wired from `make ci_build_pages` and CI via env.

***

## 1) Derive pipeline (calc/derive.py & helpers)

- After producing each figure payload (stacked/bubble/sankey):
    1. **Minify deterministically** (stable key sort).
    2. Compute `sha256` → `<sha8>`.
    3. **Write both**:
        - Legacy: `dist/artifacts/figures/{stacked,bubble,sankey}.json` (+ refs `..._refs.txt`, CSV).
        - Hashed (gated by `ACX040_HASHED`): `dist/artifacts/figures/<name>.<sha8>.json` (+ `references/<name>_refs.<sha8>.txt`, CSV).
    4. Generate **per-figure manifest** at `dist/artifacts/manifests/<name>.<sha8>.manifest.json`.
    5. Update **collection index** `dist/artifacts/manifest.json` to include entries for both hashed and legacy artefacts (mark `preferred=true` on hashed when flag=1).
- Add `_stable_json_dumps(obj) -> str` and `_payload_hash(str) -> hex` utilities.

***

## 2) Packaging & path resolvers

- Update `scripts/_artifact_paths.py` and `scripts/package_artifacts.py`:
    - If `ACX040_HASHED=1` and `artifacts/manifest.json` exists → **resolve via index**.
    - Else → fall back to legacy static names.
    - Preserve current CLI signatures; only internal resolution changes.

***

## 3) Runtime consumers & tests

- **Dash app / site loaders** (`app/app.py`, `site/src/lib/api.ts`):
    - Try `artifacts/manifest.json` first to discover figure filenames; if missing, use static defaults.
    - Do **not** remove static paths yet.
- Extend tests:
    - `tests/test_calc.py`: asserts both static and hashed files exist when flag=1; hashed filenames match manifest; invariance passed.
    - `tests/test_prepare_pages_bundle.py`: bundle includes manifests and uses index for discovery.

***

## 4) Schema/model enrichment for trace_keys

- Add minimal fields to support manifests:
    - In `calc/schema.py` (or relevant model file): ensure `EmissionFactor` exposes `ef_id` (string), `gwp_horizon` (string), `vintage_year` (int?).
    - Plumb these through `calc/service.compute_profile(...)` so the manifest writer can reference them.
- **Do not** refactor table headers yet; simply carry these fields where already present in CSVs. If missing, set `NULL` and skip those trace keys.

***

## 5) Dataset/tooling metadata source

- Implement `_build_manifest_payload()` in `calc/figures_manifest.py`:
    - `reference_year`: read from current config (existing constant or CLI arg).
    - `scope_policy`, `region_policy`: derive from current calc settings (existing enums/notes).
    - `gwp_horizon`: from EF rows present in the slice; if mixed, set `"mixed (see refs)"`.
    - `tooling.packages`: capture pinned subset (`pydantic`, `pandas`, `plotly`, app version); avoid full `pip freeze`.
    - `numeric_invariance`: compute pre-aggregation sum vs post-slice sum (unit noted), tolerance 0.01%.

***

## 6) Layer identifier mapping

- Introduce `LayerId` enum with **canonical** values:
`professional`, `light_industrial`, `heavy_industrial`, `online`.
- Add a mapping dict:```javascript
LAYER_MAP = {
  "industrial_light": "light_industrial",
  "industrial_heavy": "heavy_industrial",
  "professional": "professional",
  "online": "online",
}

```
- Apply this mapping in the slicers and manifest writer so manifests are canonical, while legacy code can keep old spellings.

***

## 7) Manifest data model & Ruff compliance

- Add `calc/manifest_model.py` (Pydantic v2) as per ACX040 with these adjustments:
    - Use `str` for URLs (not `HttpUrl`) to avoid strict parsing issues; lint-safe.
    - No mutable defaults; use `Field(default_factory=dict/list)`.
    - Remove unused imports; pass `ruff` and `mypy` (if enabled).
- Add a JSON Schema copy under `site/public/schemas/figure-manifest.schema.json` for validation.

***

## 8) Tests for manifests

- New `tests/test_manifests.py`:
    - **Schema validation** of each `artifacts/manifests/*.manifest.json`.
    - `outputs.figure_sha256` equals hash of the pointed file.
    - `references.order` aligns 1:1 with lines in the corresponding `_refs` file.
    - `numeric_invariance.passed is True` and `tolerance_pct <= 0.01`.
    - `figure.id` matches `<name>.<sha8>` and `layer_id` is canonical via mapping.

***

## 9) CI wiring

- Update `.github/workflows/ci.yml`:
    - Set `ACX040_HASHED=1` for the build job.
    - After `make build`, run:
        - `make manifests` (or integrate into build step).
        - `make verify_manifests`.
    - Upload `dist/artifacts/**` as workflow artifacts for provenance.

***

## 10) Acceptance Criteria

- With `ACX040_HASHED=1`:
    - `dist/artifacts/figures/{stacked,bubble,sankey}.json` **and** hashed counterparts exist.
    - Per-figure manifests and `artifacts/manifest.json` exist; hashed entries marked `preferred: true`.
    - Dash/site load via index; if index missing, fall back to static.
    - `trace_keys` contain `ef_id` where available; `gwp_horizon` present or `"mixed (see refs)"`.
    - All tests and Ruff pass; CI green.

***

## 11) Commit plan

1. Core hashing + dual-write + per-figure manifest + collection index.
2. Path resolvers + packaging + discovery fallback.
3. Model enrichment + mapping + manifest payload builder.
4. Tests (calc, bundle, manifests) + CI updates.
5. Docs: add `ACX040` link in README and `docs/` index.

***

**Run:**
“Apply ACX040 with dual-write and manifest discovery. Modify derive, packaging, runtime loaders, schema exposure, and tests as above. Keep legacy static filenames working. Target branch `feat/acx040-view-manifest`.”