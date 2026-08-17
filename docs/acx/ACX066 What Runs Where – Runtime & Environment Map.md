---
related:
  - ACX
---

# What runs where

| Environment | Runtime | Artifact source |
|-------------|---------|-----------------|
| Local development | Dash development server (`make app`) | Reads the complete `dist/artifacts/` collection by default, or `ACX_ARTIFACT_DIR` when set. |
| Continuous integration | Audit-aware, non-interactive Make pipeline | Runs `data-audit`, derives into a temporary sibling, validates manifests, and atomically promotes `dist/artifacts/`; `build-web` publishes `dist/site`. |
| Production | Static client on Cloudflare Pages | Serves `dist/site/index.html` and the packaged `/artifacts/` collection with browser-side SHA-256 verification. |

All environments consume the same hash-bound payloads produced by `python -m
calc.derive` and the web generator. The current collection is selected by
`dist/artifacts/latest-build.json`; `dist/artifacts/manifest.json` records its
build hash and relative figure/manifest paths. The derived dataset export is
stored under `dist/artifacts/calc/outputs/`, while figure payloads, references,
and collection manifests live under their corresponding top-level directories.
`ACX_DATA_BACKEND` selects the CSV or SQLite derivation backend; it does not
change the public artifact contract.
