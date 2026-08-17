---
related:
  - ACX
  - ACX066
---

# ACX108 Dataflow Integrity and Provenance Release Audit

**Status:** Complete

**Date:** 2026-08-17

**Implementation branch:** `audit/dataflow-integrity`

## Purpose

Carbon ACX now treats provenance as a publication boundary. A numeric or factual
external claim is publishable only when its canonical record, registered source,
retrieval-ledger metadata, review date, and generated/public copies agree.
Incomplete records remain explicit `unavailable` records; they are never emitted
as zero or as an unverified value.

## Canonical dataflow

```text
data/*.csv + data/owid/*
        |
        v
 data/dataflow_manifest.csv
        |
        +--> tools/citations/scan_claims.py
        +--> calc.refs_audit / refs/sources_manifest.csv
        +--> data/source_decisions.csv
        |
        v
 calc.derive --------------------------+
        |                              |
        v                              v
 dist/artifacts/                 scripts/generate_web_calculator_data.py
        |                              |
        +--> package + Dash             +--> apps/carbon-acx-web/src/generated/
                                       +--> apps/carbon-acx-web/public/data/
```

`data/dataflow_manifest.csv` declares every canonical dataset, stable record key,
provenance fields, source fields, derivation inputs, and publication surfaces.
`data/source_decisions.csv` records the adjudication, evidence hash, replacement
hashes, reviewer, date, and affected outputs for each active record and source.

## Source and retrieval contracts

- `data/sources.csv` is the canonical citation registry. Active rows include a
  citation, URL, year, license or rights value, and an annual `review_due_at`.
- `refs/sources_manifest.csv` is the sole retrieval ledger. It records the
  verified URL/status/content type/size/hash/date predicate plus the immutable
  manual-workflow run URL and raw-artifact name.
- Raw and normalized retrieval evidence remains artifact-only; repository policy
  does not permit binary evidence commits. Pull-request CI validates ledger
  metadata and does not claim to rehash unavailable raw binaries.
- The pinned OWID context carries `sourceId: SRC.OWID.CO2.2025` and is checked
  against its committed raw CSV and metadata digests. Generation performs no
  network request.

## Publication and runtime behavior

- `ACX_AUDIT_DATE=YYYY-MM-DD make data-audit` runs the non-mutating inventory
  checker and metadata-only retrieval-ledger audit against one clock.
- `make build` audits first, derives into a temporary sibling, validates the
  collection manifests, and atomically promotes `dist/artifacts/` together with
  `latest-build.json`.
- `make build-web` regenerates calculator, catalogue, source, OWID-context, and
  release authorities. Generated web data and `public/data/` are byte-parity
  checked.
- `make package` builds `dist/site`, packages immutable artifacts, and emits the
  browser-verifiable artifact inventory and cache headers.
- The Dash app reads `dist/artifacts/` by default. `ACX_ARTIFACT_DIR` can point to
  another complete artifact collection.
- The public Worker does not publish unverified computation. Every non-OPTIONS
  `/api/compute` request returns HTTP 503 with the exact unavailable contract;
  `/api/health` reports `compute: "unavailable"`.

## Removed publication paths

Citation text is no longer read from the retired citation archives. Their
harvest/build helpers, bypass marker, demo source records, and staged demo data
were removed after registry-backed citation lookup and ledger checks were in
place. The active consumers are the canonical source registry, retrieval ledger,
derived manifests, and generated web authorities.

## Verification commands

```bash
ACX_AUDIT_DATE=2026-08-17 make validate
ACX_AUDIT_DATE=2026-08-17 make build
ACX_AUDIT_DATE=2026-08-17 make build-web
ACX_AUDIT_DATE=2026-08-17 make package
make verify_manifests validate-manifests validate-diff-fixtures
pnpm --filter carbon-acx-web test
pnpm --filter carbon-acx-web typecheck
node --import tsx --test workers/compute/index.test.ts
```

The release is accepted only after the source/public hash envelope, collection
manifests, selected-calculator evidence behavior, unavailable catalogue shape,
Worker response contract, and browser flows all pass.
