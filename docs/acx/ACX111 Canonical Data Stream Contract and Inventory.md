---
related:
  - ACX107
  - ACX108
  - ACX109
---

# ACX111 Canonical Data Stream Contract and Inventory

**Status:** Implemented

**Date:** 2026-08-25

**Implementation branch:** `audit/data-stream-layer`

## Decision

`data/dataflow_manifest.csv` is the canonical registry for repository data streams. Each declared source has one stable `stream_id`, a versioned schema identifier, ordered fields, transport, cadence, retention, timestamp policy, null policy, provenance classification, source references, derivation inputs, and publication surfaces.

The generated public release now exposes the same registry as the versioned `acx.stream-catalog/1-0-0` authority at `/data/stream-catalog.json`. Its SHA-256 is bound by `/data/release.json`; the Methodology page links to it.

## Ownership

- **Canonical sources and dataflow registry:** Carbon ACX repository maintainers.
- **Source decisions and retrieval ledger:** the reviewer recorded in `data/source_decisions.csv`, backed by the immutable workflow run in `refs/sources_manifest.csv`.
- **Derived artifacts:** `calc.derive` and the Dash artifact consumer.
- **Public authorities:** `scripts/generate_web_calculator_data.py`; static Next.js imports and public release auditors are the consumers.
- **Review gate:** repository changes remain subject to the human-review policy in `AGENTS.md`.

## Contract rules

| Concern | Canonical rule | Enforcement |
| --- | --- | --- |
| Stream identity | `acx.<lowercase-hyphenated-name>` | Manifest parser rejects invalid or duplicate IDs. |
| Schema version | `acx.<name>/<major>-<minor>-<patch>` | Manifest parser rejects malformed values; public authorities validate their expected version and stream ID. |
| Field order | CSV headers exactly equal the ordered `provenance_columns` declaration. | `make data-audit` fails closed on reordered, added, or removed fields. |
| Nulls | Empty CSV cells represent null; `NULL`, `N/A`, and `NA` are invalid data sentinels. | `make data-audit` rejects noncanonical literals. Public JSON emits `null`, never a numeric zero for unavailable evidence. |
| Time | Generated authority `generatedAt` uses RFC 3339 UTC with the explicit `+00:00` offset. Source streams declare `none`, `iso-date`, or `rfc3339-utc`. | Generator rejects non-UTC generated timestamps; validation requires generated metadata. |
| Units | Activity and factor units use `data/units.csv`; resolved calculator values are `g CO₂e` per declared unit. | Pydantic source models reject unknown units; generator rejects mismatched activity/factor units. |
| Errors | Invalid source, provenance, schema, source ledger, OWID snapshot, or authority contracts stop publication. | Audit and generation are fail-closed; authority writes use staged replacement and rollback. |

## Canonical source streams

All canonical source rows are repository-retained (`git-history`). `release-gated` means an intentional repository release is the trigger; `manual-snapshot` is a deliberate pinned external refresh.

| Stream ID | Source of truth | Schema | Transport / cadence | Primary consumers |
| --- | --- | --- | --- | --- |
| `acx.activities` | `data/activities.csv` | `acx.activities/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.activity-functional-units` | `data/activity_fu_map.csv` | `acx.activity-functional-units/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.activity-schedule` | `data/activity_schedule.csv` | `acx.activity-schedule/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.ai-scenarios` | `data/ai_scenarios.csv` | `acx.ai-scenarios/1-0-0` | CSV / release-gated | catalog, AI scenario resolver |
| `acx.assets` | `data/assets.csv` | `acx.assets/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.benchmarks` | `data/benchmarks.csv` | `acx.benchmarks/1-0-0` | CSV / release-gated | calculator, catalog |
| `acx.carbon-pricing` | `data/carbon_pricing.csv` | `acx.carbon-pricing/1-0-0` | CSV / release-gated | catalog |
| `acx.dependencies` | `data/dependencies.csv` | `acx.dependencies/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.emission-factors` | `data/emission_factors.csv` | `acx.emission-factors/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.entities` | `data/entities.csv` | `acx.entities/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.equity-benchmarks` | `data/equity_benchmarks.csv` | `acx.equity-benchmarks/1-0-0` | CSV / release-gated | catalog |
| `acx.feedback-loops` | `data/feedback_loops.csv` | `acx.feedback-loops/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.functional-units` | `data/functional_units.csv` | `acx.functional-units/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.grid-intensity` | `data/grid_intensity.csv` | `acx.grid-intensity/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.icons` | `data/icons.csv` | `acx.icons/1-0-0` | CSV / release-gated | catalog |
| `acx.layers` | `data/layers.csv` | `acx.layers/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.operations` | `data/operations.csv` | `acx.operations/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.owid-source` | `data/owid/manifest.json` plus pinned raw snapshot | `acx.owid-source/1-0-0` | JSON / manual-snapshot | OWID context, source registry |
| `acx.profiles` | `data/profiles.csv` | `acx.profiles/1-0-0` | CSV / release-gated | derivation, calculator, catalog |
| `acx.sectors` | `data/sectors.csv` | `acx.sectors/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.sites` | `data/sites.csv` | `acx.sites/1-0-0` | CSV / release-gated | derivation, catalog |
| `acx.sources` | `data/sources.csv` | `acx.sources/1-0-0` | CSV / release-gated | source registry, calculator, catalog |
| `acx.units` | `data/units.csv` | `acx.units/1-0-0` | CSV / release-gated | source-model validation, derivation, calculator, catalog |

### Governance and external inputs

| Stream | Source of truth | Validation / lifecycle |
| --- | --- | --- |
| Dataflow registry | `data/dataflow_manifest.csv` | Owns source contracts above; changes are release-gated and audited. |
| Source-decision ledger | `data/source_decisions.csv` | Every active source-record pair needs a decision, evidence digest, reviewer, timezone-aware review timestamp, and recognized affected surface. |
| Retrieval ledger | `refs/sources_manifest.csv` | Every active source needs URL, status, MIME type, size, SHA-256, fetch timestamp, workflow run URL, immutable artifact name, and annual review date. |
| Pinned OWID bytes | `data/owid/annual-co2-emissions-per-country.csv` and `.metadata.json` | No network during build. Manifest digests, metric identity, country selection, unit, accounting basis, and sorted finite points are verified. |

## Lineage and published authorities

```text
canonical CSV / OWID snapshot / governance ledgers
        |
        +--> make data-audit
        |      validates metadata, ordered headers, nulls, provenance, decisions, and ledger bindings
        |
        +--> calc.schema + CsvStore / DuckDbStore --> calc.derive --> dist/artifacts/ --> Dash + package
        |
        +--> scripts/generate_web_calculator_data.py
                  |
                  +--> src/generated/{calculator,catalog,sources,stream-catalog,owid-context,release-data}.json
                  +--> public/data/{calculator,catalog,sources,stream-catalog,owid-context,release}.json
                                  |
                                  +--> static Next.js imports, public auditors, Methodology link
```

| Public authority | Schema | Source / trigger | Consumer | Failure behavior |
| --- | --- | --- | --- | --- |
| `calculator-data.json` | `acx.web-calculator/1-6-0` | curated activities, factors, grid, benchmarks, sources; generation | calculator and methodology | factor/source/unit failure aborts publication |
| `catalog-data.json` | `acx.web-catalog/1-0-0` | complete activity catalog and AI scenarios; generation | Explore and Learn routes | unresolved factors remain explicit `null`/unavailable; invalid scenario aborts generation |
| `sources.json` | `acx.web-sources/1-1-0` | active source registry + retrieval/decision bindings; generation | source evidence consumers | incomplete ledger binding aborts applicable publication |
| `stream-catalog.json` | `acx.stream-catalog/1-0-0` | `dataflow_manifest.csv`; generation | release auditors and Methodology link | invalid manifest metadata aborts generation |
| `owid-context.json` | `acx.owid-context/1-1-0` | pinned OWID snapshot; generation | methodology context card | absent complete snapshot emits explicit unavailable context; partial or invalid snapshot aborts |
| `release.json` | `acx.public-release/1-1-0` | public authority bytes and all declared source inputs; generation | publication audit and public verification | hash or contract mismatch aborts atomic commit |

The `src/generated/` and `public/data/` copies are deliberately byte-identical transports, not independent sources: static TypeScript imports require the first location and public/auditor fetches require the second. The release manifest binds their hashes.

Derived artifact figures retain both hashed and stable path forms because artifact manifests and Dash fallback loading have distinct path contracts. They were not consolidated without a separately reviewed consumer migration.

## Normalization and migration

- Removed the retired `segment` → `sector` loader and dataframe aliases (`calc/dal/aliases.py`) and the alias-acceptance test path. Canonical source headers and figures now accept only `sector` terminology where that dimension is emitted.
- Changed source Pydantic models from silently ignoring unknown fields to `extra="forbid"`; added the canonical `sector_id`, layer UI metadata, and other previously ignored declared fields so valid existing CSVs remain accepted.
- Assigned separate public schemas to calculator and catalog authorities. The prior shared calculator schema hid the catalog-only AI-scenario envelope and made contract drift possible.
- Added `streamId` and canonical `generatedAt` metadata to every generated web authority, including the nested AI-scenario stream; authority validation verifies both.
- Added `acx.stream-catalog/1-0-0`; it is the only new stream. It exposes already-authoritative contract metadata and no speculative or new domain measurements.

## Adding or changing a stream

1. Add or update the canonical source file under `data/`.
2. Add one `dataflow_manifest.csv` row with an `acx.*` stream ID, schema version, exact field-order/provenance declaration, transport, cadence, retention, timestamp policy, null policy, dependencies, and publication surfaces.
3. Add or update source registrations, retrieval-ledger rows, and source-decision rows for externally supported values.
4. Update the producer and every consumer in the declared publication surfaces. Bump the affected public schema version for a public contract change.
5. Add deterministic tests for source validation, ordering, metadata, invalid input, and the complete producer-to-consumer path.
6. Run `ACX_AUDIT_DATE=YYYY-MM-DD make data-audit`, targeted tests, web type-check/lint/test, and the required build. Regenerate authorities with an explicit `ACX_GENERATED_AT` when byte-stable review is required.

## Verification

| Command | Observed result |
| --- | --- |
| `ACX_AUDIT_DATE=2026-08-25 make data-audit` | Passed: 23 datasets, 1,285 claims, and 108 metadata-only retrieval-ledger rows. |
| `PYTHONPATH=. poetry run pytest tests/test_web_calculator_data.py` | Passed: 30 tests. |
| `pnpm --filter carbon-acx-web typecheck` | Passed. |
| `pnpm --filter carbon-acx-web lint && pnpm --filter carbon-acx-web test` | Passed: 37 Vitest tests. |
| Timestamped `make build` and `make build-web` | Passed: eight derived figure manifests validated; publication audit passed; static Next build rendered 14 pages. |
| `ACX_AUDIT_DATE=2026-08-25 make validate` | Passed: 157 pytest tests, 4 optional skips, and one Kaleido deprecation warning. |
| `env -u CI pnpm --filter carbon-acx-web test:e2e -- redesigned-primary-flow.spec.ts` | Passed: 23 Playwright tests against the controlled local dev surface. |
| Browser smoke | Methodology visibly rendered the stream-catalog link; public endpoint returned its schema, ID, UTC timestamp, and 23 ordered contracts. |

## Remaining risks and external dependencies

- OWID context freshness depends on an intentional maintainer-run `scripts/fetch_owid_context.py` snapshot update. Builds remain offline by design.
- Retrieval-ledger metadata is verified in CI metadata-only mode when raw external artifacts are unavailable locally; external bytes are not committed.
- Hashed/stable derived-artifact path duplication remains until its Dash and artifact-manifest consumers can be migrated together.
