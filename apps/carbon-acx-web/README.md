# Carbon ACX public web

A static Next.js App Router site for Carbon ACX’s public carbon-literacy interface. It makes activity-level annual estimates legible as quantity × cited emission factor, and preserves the distinction between calculator activities and the wider evidence catalogue.

## Architecture

- **Next App Router static export** — no API routes or runtime data service.
- **Authoritative generated data** — `src/generated/calculator-data.json`, `catalog-data.json`, `sources.json`, and `stream-catalog.json` are produced from repository authorities. Their schemas are `acx.web-calculator/1-6-0`, `acx.web-catalog/1-0-0`, `acx.web-sources/1-1-0`, and `acx.stream-catalog/1-0-0`; the catalog carries `acx.ai-scenarios/1-1-0` records. Do not hand-edit generated files.
- **Offline OWID context** — `src/generated/owid-context.json`, `release-data.json`, and `/public/data/` copies are generated from the pinned `data/owid/` snapshot. The context schema is `acx.owid-context/1-1-0`; the release schema is `acx.public-release/1-1-0`. It is labelled macro context only, never a factor or benchmark.
- **Public routes** — `/`, `/calculator`, `/explore`, `/explore/3d`, `/learn`, `/methodology`, `/evidence`, and `/evidence/[id]`. `/evidence/[id]` is the manifest detail path.
- **Artifacts** — raw immutable artifacts remain available under `/artifacts/`; manifest pages verify fetched bytes against declared SHA-256 digests in the browser.
- **Publication policy** — only finite, unit-matched factors with a cited source URL, region, scope boundary, GWP horizon, and vintage can be published. Demonstrative or incomplete records are Not available, never zero.
- **AI scenario layer** — the calculator resolves `acx.ai-scenarios/1-1-0` records by exact key (`resolveAiScenario`/`resolveScenarioById` in `src/lib/calculator.ts`). Published scenarios multiply into the annual total; estimates render as evidence-only cards excluded from totals (ACX107); Not available records explain themselves. Scenario cards use only the `Estimate` and `Stale vintage` data-state labels.
- **Responsive shell** — six icon-and-label navigation links are ordinary links at every width. The compact rail scrolls horizontally below `60rem`; Calculator and Explore use intrinsic data layouts at `60rem`, and Explore adds its detail column at `72rem`. Reading routes use natural document scroll.
- **Performance budget** — the ranked result HTML is the source of truth; the optional `d3-sankey` flow is loaded only after opening its disclosure when two positive activities fit the measured panel.

## Data generation

From the repository root, refresh the pinned snapshot only when the OWID source is intentionally updated:

```sh
python3 scripts/fetch_owid_context.py --output-dir data/owid
```

Then generate the offline authorities without network access:

```sh
python3 scripts/generate_web_calculator_data.py \
  --repo-root "$PWD" \
  --output-root "$PWD"
```

The generator builds calculator, catalogue, source, stream-catalog, OWID context, release, and public `/data/` bytes in memory,
validates a staged sibling tree, and atomically replaces the complete tracked output set with rollback on failure.
`--repo-root` selects canonical CSV and snapshot inputs; `--output-root` selects the repository-layout output root.
Use `ACX_GENERATED_AT` with an RFC 3339 UTC timestamp such as `2026-08-25T00:00:00+00:00` to reproduce output bytes.
`sources.json` has the envelope `{"schemaVersion":"acx.web-sources/1-1-0","streamId":"acx.web-sources","generatedAt":"…","sources":[...]}`.
`stream-catalog.json` exposes the versioned source contracts declared by `data/dataflow_manifest.csv`. A catalogue data gap remains `emissionFactor: null`
with a reason; no numeric zero is substituted. `build:web` stays offline after the snapshot is committed.

## Development and verification

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

The end-to-end suite covers six-route navigation in Chromium, Firefox, and WebKit, adaptive Browse/Worksheet and Browse/Record flows, light and dark theme accessibility scans, 44px action-control targets, route no-overflow checks, and manifest verification. Playwright WebKit is labelled as an automated engine, not Safari. For visual checks, use 320 × 800, 390 × 844, 768 × 1024, 1280 × 720, 1440 × 900, and 1920 × 1080 viewports.

From the repository root, `make build-static` packages the static site and artifacts into `dist/site/`.
