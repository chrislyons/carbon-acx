# Carbon ACX public web

A static Next.js App Router site for Carbon ACX’s public carbon-literacy interface. It makes activity-level annual estimates legible as quantity × cited emission factor, and preserves the distinction between calculator activities and the wider evidence catalogue.

## Architecture

- **Next App Router static export** — no API routes or runtime data service.
- **Authoritative generated data** — `src/generated/calculator-data.json`, `catalog-data.json`, and `sources.json` are produced from repository CSV authorities. Do not hand-edit them.
- **Public routes** — `/`, `/calculator`, `/explore`, `/explore/3d`, `/methodology`, `/manifests`, and `/manifests/[id]`.
- **Artifacts** — raw immutable artifacts remain available under `/artifacts/`; manifest pages verify fetched bytes against declared SHA-256 digests in the browser.
- **Publication policy** — only finite, unit-matched factors with a cited source, region, scope boundary, GWP horizon, and vintage can be published. Demonstrative factors are unavailable, never zero.

## Data generation

From the repository root:

```sh
poetry run python scripts/generate_web_calculator_data.py
```

This writes all three generated web authorities. Use `ACX_GENERATED_AT` to reproduce an output timestamp for deterministic comparisons.

## Development and verification

```sh
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

From the repository root, `make build-static` packages the static site and artifacts into `dist/site/`.
