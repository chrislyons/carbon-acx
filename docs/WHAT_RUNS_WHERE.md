# What runs where

| Environment | Runtime | Artifact source |
|-------------|---------|-----------------|
| Local development | Dash development server (`make app`) | Reads `build/<backend>/calc/outputs` after `make build` populates figures, manifest, and references. |
| Continuous integration | Non-interactive build pipeline | Publishes the derived bundle to `dist/artifacts` and the static site to `dist/site`. |
| Production | Static client on Cloudflare Pages | Serves `dist/site/index.html` which embeds Plotly JSON from `calc/outputs/figures/*.json` and IEEE reference text from `calc/outputs/references/*_refs.txt`. |

All environments consume the same immutable payloads produced by `python -m calc.derive` and copied into the `calc/outputs` subtree. Review the generated `calc/outputs/manifest.json` for timestamps and scope.
