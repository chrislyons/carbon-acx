# Carbon ACX public web

A static Next.js App Router site for Carbon ACX’s public carbon-literacy interface. It makes activity-level annual estimates legible as quantity × cited emission factor, and preserves the distinction between calculator activities and the wider evidence catalogue.

## Architecture

- **Next App Router static export** — no API routes or runtime data service.
- **Authoritative generated data** — `src/generated/calculator-data.json`, `catalog-data.json`, and the versioned `sources.json` envelope are produced from repository CSV authorities. The calculator/catalogue schema is `acx.web-calculator/1-4-0`; do not hand-edit generated files.
- **Public routes** — `/`, `/calculator`, `/explore`, `/explore/3d`, `/methodology`, `/manifests`, and `/manifests/[id]`. The methodology primer is at `/methodology#primer`.
- **Artifacts** — raw immutable artifacts remain available under `/artifacts/`; manifest pages verify fetched bytes against declared SHA-256 digests in the browser.
- **Publication policy** — only finite, unit-matched factors with a cited source URL, region, scope boundary, GWP horizon, and vintage can be published. Demonstrative or incomplete records are unavailable, never zero.

## Data generation

From the repository root:

```sh
python3 scripts/generate_web_calculator_data.py \
  --repo-root "$PWD" \
  --output-root "$PWD"
```

The generator builds all three authorities in memory, validates a staged sibling tree, and atomically replaces the tracked outputs with rollback on failure. `--repo-root` selects canonical CSV inputs; `--output-root` selects the repository-layout output root. Use `ACX_GENERATED_AT` to reproduce an output timestamp for deterministic comparisons. `sources.json` has the envelope `{"schemaVersion":"acx.web-sources/1-0-0","sources":[...]}`. A catalogue data gap remains `emissionFactor: null` with a reason; no numeric zero is substituted.

## Development and verification

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

From the repository root, `make build-static` packages the static site and artifacts into `dist/site/`.
