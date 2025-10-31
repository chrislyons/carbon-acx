# What runs where

| Environment | Runtime | Artifact source |
|-------------|---------|-----------------|
| Local development | Dash development server (`make app`) | Reads `dist/artifacts/<backend>` or `calc/outputs` after `make build` populates figures, manifest, and references. |
| Continuous integration | Non-interactive build pipeline | Publishes the derived bundle to `dist/artifacts` and the static site to `dist/site`. |
| Production | Static client on Cloudflare Pages | Serves `dist/site/index.html` which embeds Plotly JSON from packaged artifacts and IEEE reference text. |

All environments consume the same immutable payloads produced by `python -m calc.derive`. The derivation pipeline outputs to `dist/artifacts/<backend>/` where `<backend>` is either `csv` or `sqlite` based on the `ACX_DATA_BACKEND` environment variable. Review the generated manifest files in `dist/artifacts/` for timestamps and scope.
