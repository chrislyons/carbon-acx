# Deploying to Cloudflare Pages

The Carbon ACX static client is designed to run on Cloudflare Pages and to be
served from the `/carbon-acx` path by the main Carbonplan site.

## Build the static site

1. Install dependencies if you have not already done so:
   ```bash
   make install
   ```
2. Produce fresh derived data artifacts and the static site bundle:
   ```bash
   make package
   ```

This command runs the standard data build, packages distributable artefacts,
and emits the static site to `dist/site/`. The directory contains:

- `index.html` – the single-page application shell.
- `200.html` – a copy of `index.html` used by Cloudflare Pages for SPA
  fallback routing.
- asset files (CSS, fonts, JavaScript) required by the client.
- an `artifacts/` folder that mirrors the packaged outputs, allowing the
  production deployment to serve JSON/CSV downloads relative to
  `/carbon-acx/artifacts/*`.
- a `_headers` file that configures Cloudflare Pages caching (`index.html`
  served with `Cache-Control: no-cache`, immutable caching for
  `/artifacts/*`).
- a `_redirects` file that forces `/carbon-acx` to `/carbon-acx/`.

All asset links are written as relative paths, so the bundle can be mounted at
`/carbon-acx` without additional rewrites.

## Deploy

Upload the contents of `dist/site/` to a Cloudflare Pages project. The main
Carbonplan site proxies requests under `/carbon-acx/*` to this bundle, so the
relative asset paths must remain intact. If you add new artifact files to the
build, confirm that they appear under `dist/site/artifacts/` before deploying.
