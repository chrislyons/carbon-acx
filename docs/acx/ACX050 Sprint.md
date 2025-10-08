**ACX-CDX-072**

***

Title: app(compare+cache): Scenario Compare + Session Cache (deterministic, offline, no binaries)

Intent

- Provide deterministic, reproducible comparison between two computed scenarios produced by local chat.
- Persist prior chat sessions + scenario manifests to IndexedDB (offline), with bounded size and explicit eviction.
- Zero network calls; no binary/model files committed.

Constraints

- Deterministic JSON: keys sorted; floats rounded to 4 dp; stable hashing (sha256 of canonical string).
- Null-first: never coerce missing numeric fields to 0; propagate nulls until explicitly derived.
- Privacy: all storage local (IndexedDB); no external requests; respect COOP/COEP headers already set.
- Security: no path traversal writes; exports (if any during dev) constrained to in-memory blob download.
- CI: install pnpm before any pnpm step.

Repo Layout (expected)

- site/src/lib/         # TS utilities
- site/src/state/       # Zustand stores
- site/src/components/  # React components
- site/public/_headers  # COOP/COEP + models cache headers
- dist/artifacts/       # figure manifests (ACX040)

Do

1) Compare Engine (pure, deterministic)

- Add: site/src/lib/scenarioCompare.ts

  export interface ScenarioManifest {

    hash: string;                    // canonical sha256 (8-char short shown in UI)

    activities: Array<{

      activity_id: string;

      label?: string | null;

      quantity?: number | null;      // FU-normalized, null-first

      unit?: string | null;

      total_kgco2e?: number | null;  // null-first until computed

      category?: string | null;

      layer_id?: string | null;

      source_id?: string | null;     // first ref for row if applicable

    }>;

    emission_factors: Array<{

      activity_id: string;

      region?: string | null;

      vintage_year?: number | null;

      scope_boundary?: string | null;

      source_id?: string | null;

    }>;

    refs_ordered: string[];          // [n] order from provenance

  }

  export interface ScenarioDiff {

    base_hash: string;

    compare_hash: string;

    added: string[];     // activity_id[]

    removed: string[];   // activity_id[]

    changed: Array<{

      activity_id: string;

      from: number;      // kgCO2e, 4 dp

      to: number;        // kgCO2e, 4 dp

      delta: number;     // to - from, 4 dp

      delta_pct: number | 'INF' | 'NaN';

    }>;

    sources_union: string[]; // deterministic union of refs_ordered

  }

  export function canonicalNumber(n: unknown): number | null;   // rounds to 4 dp, returns null if null/NaN/undefined

  export function stableStringify(obj: unknown): string;        // sorted keys; \n newline; no trailing spaces

  export function shortHash(hexSha256: string): string;         // first 8 chars

  export function diffScenarios(a: ScenarioManifest, b: ScenarioManifest): ScenarioDiff;

- Rules:

- Compare by `activity_id`. If either `from` or `to` is null → treat row as changed but compute only where numeric present; `delta_pct`:

    - if from==0 and to>0 → "INF"
    - if from==0 and to==0 or any null → "NaN"
    - else round((to-from)/from*100, 4)
- `sources_union`: first keep order of `a.refs_ordered`, append unique from `b.refs_ordered`.

2. Comparison UI

- Add: site/src/components/ScenarioCompare.tsx

- Two selectors bound to available scenario manifests (from cache + current session).
- Two-column diff table (activity label | from | to | Δ | Δ%).
- Plotly stacked delta bar (`layout.barmode="relative"`, dense margins).
- Summary card: net Δ kg and % vs base; count of added/removed.
- Deep-linking: read/write `?base=<hash>&compare=<hash>&view=activity|category` (category view arrives in ACX-CDX-073; default to activity).
- No network requests; rely on local stores + in-memory manifests.

3. Scenario Cache (IndexedDB)

- Add: site/src/lib/sessionStore.ts

  export interface StoredSession {

    id: string;               // ulid

    created_at: string;       // ISO8601 Z

    chat_history: Array<{ role: 'user'|'assistant'; content: string }>;

    manifests: Record<string, ScenarioManifest>; // key=hash

    active_manifest_hash?: string | null;

    version: 1;

    bytes_estimate: number;   // precomputed upper-bound for eviction

  }

  export const SESSION_LIMIT = 10;

  export const BYTES_LIMIT = 50 * 1024 * 1024; // 50 MB

  export async function saveSession(s: StoredSession): Promise<void>;

  export async function loadLatest(): Promise<StoredSession | null>;

  export async function listSessions(): Promise<Array<{id:string, created_at:string, size:number}>>;

  export async function clearAll(): Promise<void>;

- Use `idb-keyval` or minimal IndexedDB wrapper; no Service Worker required.
- Eviction: when saving, purge LRU sessions until both limits satisfied.

4. App Glue

- Add: site/src/state/compare.ts (Zustand)

- Holds selection state (`baseHash`, `compareHash`, `view`), derived `ScenarioDiff`, and URL sync.
- Integrate with Chat view:

- On scenario card, add “Compare…” action → opens ScenarioCompare with the card’s `hash` as `compare`, current as `base`.

5. Headers & CI hygiene

- Ensure site/public/_headers already includes:

  Cross-Origin-Opener-Policy: same-origin

  Cross-Origin-Embedder-Policy: require-corp

- In .github/workflows/ci.yml add before any pnpm step:

- name: Install pnpm

    run: npm install -g pnpm

Tests (Vitest + React Testing Library)

- site/src/lib/**tests**/scenarioCompare.core.test.ts

- stableStringify determinism across key order permutations.
- diffScenarios handles changed/added/removed; INF/NaN rules; sources_union ordering.
- 4 dp rounding; lexicographic sort where applicable.
- site/src/lib/**tests**/sessionStore.test.ts

- Save → loadLatest round-trip; LRU eviction at >SESSION_LIMIT and >BYTES_LIMIT.
- site/src/components/**tests**/ScenarioCompare.render.test.tsx

- Renders diff table and summary from fixtures; URL param hydration; no network calls (assert fetch not called).

Docs

- docs/compare.md

- Explain diff rules (null-first, 4 dp, INF/NaN), URL params, and cache behavior (limits, eviction, privacy).
- README

- Add one line under “Local Chat”: “Compare scenarios via /compare; data stored locally in IndexedDB; Clear in Settings.”

Makefile (add or extend)

- targets:

- compare:test → pnpm -C site test --filter "scenarioCompare*"
- cache:test → pnpm -C site test --filter "sessionStore*"

Acceptance

✅ Users can open /compare, select two scenario manifests (from cache or current), and see deterministic diffs (table + chart).

✅ IndexedDB persists last session; on reload, last compare selection hydrates from URL/cache.

✅ Tests pass; no external network calls; no binaries added.

✅ Deterministic serialization (4 dp, sorted keys); privacy + headers intact.

***

**ACX-CDX-073**

Title: app(compare): add category-level delta aggregation + UI toggle

Intent

- Aggregate scenario diffs by category/layer and render stacked delta bars with summary cards.
- Keep provenance deterministic and null-first.

Constraints

- No network calls; use existing in-repo data only.
- Deterministic order: sort keys lexicographically; 4 dp numeric formatting.
- Null-first: do not coerce blanks to zero.
- No added binaries; docs + code only.

Do

Lib

- site/src/lib/scenarioCompare.ts
- Add:

    export type CategoryKey = 'activity.category' | 'layer_id';

    export interface CategoryDelta { key: string; label: string; delta: number; delta_pct: number; total_base: number; total_compare: number; }

    export function aggregateByCategory(diff: ScenarioDiff, basis: CategoryKey, catalog: Catalog): CategoryDelta[] {

      // map each changed/added/removed activity to category via catalog

      // sum signed deltas; compute pct vs base (>0 guard; if base==0 and compare!=0 → pct=Infinity)

      // sort by absolute delta desc, then key asc

      // round to 4 dp

    }

- site/src/lib/catalog.ts
- Ensure accessors: getActivityById(id), getCategoryLabel(id), getLayerLabel(id).

UI

- site/src/components/ScenarioCompare.tsx
- Add toggle: “By activity” | “By category” (default: category).
- New stacked relative bar chart for category deltas (Plotly barmode="relative").
- Summary cards:
    - Net change (kg CO₂e, %)
    - Top ↑ category (name, Δ)
    - Top ↓ category (name, Δ)
- site/src/styles/dense.ts
- Slightly tighter margins for compare charts.

Routing/State

- Preserve compare selection in URL: ?base=<hash>&compare=<hash>&view=category|activity.

Tests (Vitest)

- site/src/lib/**tests**/scenarioCompare.aggregate.test.ts
- Fixture with 5 activities across 3 categories:
    - changed, added, removed cases.
- Assert:
    - deterministic order
    - sums match row-level diff within 1e-6
    - 4 dp rounding
- site/src/components/**tests**/ScenarioCompare.view.test.tsx
- Renders toggle; switches datasets; summary cards show expected values.

Docs

- docs/compare.md → add “Category aggregation” section (basis keys, rounding, ordering).

Acceptance

✅ Toggling “By category” shows correct stacked deltas + summary cards.

✅ Deterministic aggregation (order + 4 dp).

✅ Tests pass locally and in CI.

***

**ACX-CDX-074**

Title: compare(export): signed scenario diff export (deterministic JSON)

Intent

- Export a self-contained, deterministic diff payload that others can verify offline.
- Optional Ed25519 signing when a private key is supplied locally; CI must NOT require secrets.

Constraints

- No secrets in repo; do not add keys to CI.
- Deterministic JSON: UTF-8, sorted keys, no trailing zeros beyond 4 dp.
- No network calls; no binaries.
- Path-safe writes under site/public/exports/ (prevent traversal).

Do

Lib

- site/src/lib/exportDiff.ts
- add stableStringify(obj): canonical key sort, 4 dp numbers, \n newline.
- interface SignedDiff {

      spec_version: '1.0';

      created_at: string;  // ISO8601 Z

      base_hash: string;

      compare_hash: string;

      scenario_diff: ScenarioDiff;   // as produced by scenarioCompare.ts

      sources_union: string[];       // ordered union

      manifest_hashes: { base: string; compare: string };

      signer?: { algo: 'ed25519'; key_id: string };

      signature?: string;            // base64

    }

- export function buildSignedDiff(diff: ScenarioDiff, opts: { baseManifest: ScenarioManifest; compareManifest: ScenarioManifest; key?: Uint8Array; keyId?: string }): SignedDiff {

      // assemble; if opts.key present: sign stableStringify(payload without signature fields); attach signer/signature

    }

- export async function safeWriteExport(filename: string, data: string): Promise<void> {

      // ensure filename /^[a-z0-9._-]+$/; reject otherwise

      // ensure path join remains inside /public/exports/

    }

UI

- site/src/components/ScenarioCompare.tsx
- Add “Export diff JSON” button.
- On click: compute payload via buildSignedDiff(); write to /public/exports/scenario_diff_<base>_vs_<compare>.json (during dev) and offer blob download in production/preview without writing to repo.

Node helper (optional local)

- tools/sign-diff.ts
- CLI to sign an existing unsigned diff file with a local Ed25519 key (read from env var DIFF_SIGN_KEY_BASE64).
- Never runs in CI.

Tests (Vitest)

- site/src/lib/**tests**/exportDiff.test.ts
- stableStringify deterministic across call order.
- Signing round-trip verifies with tweetnacl.
- safeWriteExport rejects '../' and absolute paths.
- Payload fields present; numbers 4 dp.

Docs

- docs/share-diff.md
- File format, deterministic rules, optional signing workflow.
- Security note: keys never committed; CI exports unsigned.

CI

- No changes required; ensure tests run.

Acceptance

✅ “Export diff JSON” produces deterministic payload.

✅ Optional signing works locally; CI passes with unsigned export path disabled.

✅ Path traversal prevented.

***

**ACX-CDX-075**

Title: tools(validator): offline validator for manifests + diffs (+refs)

Intent

- Provide a CLI that validates figure manifests and shared diff JSON payloads entirely offline.

Constraints

- Python only (aligns with calc pipeline); no internet access.
- Deterministic outputs; clear non-zero exit codes.
- No binaries; tests with small fixtures.

Do

Layout

- tools/validator/
- **init**.py
- validate.py
- schemas/
    - figure-manifest.schema.json  (copy of site/public schema)
    - signed-diff.schema.json
- fixtures/
    - minimal manifest + diff examples for tests

CLI (Python 3.10+)

- tools/validator/validate.py
- Commands:
    - validate-manifest <path_or_dir>
    - JSON Schema validation; verify payload hash matches referenced file if present; check references.order aligns to [n] list if supplied.
    - validate-diff <diff.json> --manifests <dir>
    - JSON Schema validation; confirm base/compare hashes exist in <dir>; recompute union(source_id) deterministically; verify numbers are 4 dp; if signature present and --pubkey <base64> supplied → verify Ed25519 signature.
- Exit codes: 0 ok; 2 schema error; 3 integrity mismatch; 4 signature invalid; 5 IO/path error.
- Path safety: refuse traversal outside cwd when --manifests provided.

Makefile

- add targets:
- validate-manifests: python -m tools.validator.validate validate-manifest dist/artifacts/manifests
- validate-diff-fixtures: python -m tools.validator.validate validate-diff tools/validator/fixtures/sample_diff.json --manifests dist/artifacts/manifests

Tests (pytest)

- tests/test_validator.py
- manifest schema pass/fail cases
- diff schema + union ordering + 4 dp enforcement
- signature verification happy path + failure with wrong key
- path traversal rejection

Docs

- docs/validation.md
- CLI usage examples; exit code table; how to wire into CI locally if desired.

CI

- .github/workflows/ci.yml
- After build: run `make validate-manifests`
- Ensure Python available; `pip install -r tools/validator/requirements.txt` (pin jsonschema, pynacl)

Acceptance

✅ CLI validates real build outputs offline.

✅ Deterministic behavior; explicit exit codes.

✅ Tests green locally and in CI.