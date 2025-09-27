# What runs where

The carbon-acx stack splits interactive development from the production client:

- **Dash development UI** – `make app` runs `python -m app.app`, which expects
  a derived artifact tree at `build/<backend>/calc/outputs`. Dash reads the
  Plotly payloads from `calc/outputs/figures/` and resolves references via the
  `_refs.txt` files in `calc/outputs/references/`.
- **Static client (Cloudflare Pages)** – `make site` renders
  `build/site/index.html` using the same artifacts. Continuous integration copies
  the derived files into `dist/artifacts/calc/outputs` before publishing
  `dist/site/index.html` for deployment. Cloudflare serves that static bundle as
  the public ACX009 client.

The artifact directory contains the following key assets:

| Path | Purpose |
| --- | --- |
| `calc/outputs/export_view.csv` | Tabular emission results consumed by the figures. |
| `calc/outputs/export_view.json` | Combined metadata and records for API-free reuse. |
| `calc/outputs/figures/stacked.json` | Pre-rendered Plotly payload for the stacked area chart. |
| `calc/outputs/figures/bubble.json` | Bubble chart payload shared across Dash and the static site. |
| `calc/outputs/figures/sankey.json` | Sankey flow payload including layer annotations. |
| `calc/outputs/manifest.json` | Summary metadata displayed in the static sidebar. |
| `calc/outputs/references/*_refs.txt` | IEEE-formatted sources mirrored in the UI. |

Refer to `calc/derive.py` for the full list of generated files and metadata
fields.
