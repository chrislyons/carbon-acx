# Route integrations

## `/carbon-acx/*`

Requests under `/carbon-acx` are served by a Cloudflare Pages function that only allows
`GET`, `HEAD`, and `OPTIONS`. Other methods receive a `405 Method Not Allowed` response.

When the `CARBON_ACX_ORIGIN` environment variable is set, the function rewrites the
subpath while preserving query parameters and forwards the request upstream. Leaving the
variable unset serves the static bundle published under `dist/site/` directly from
Cloudflare Pages.

### Caching

* The `_headers` file generated during packaging ensures `index.html` is served with
  `Cache-Control: no-cache` while `/artifacts/*` responses are immutable (`public,
  max-age=31536000, immutable`).
* Static artefacts are copied into `dist/site/artifacts/`, so requests to
  `/carbon-acx/artifacts/*` resolve without hitting the compute worker.

### Deep linking and SPA behaviour

Deep links such as `/carbon-acx/demo` and `/carbon-acx/view?id=abc` are forwarded without
modification. The Carbon ACX static project serves its SPA fallback (200.html) directly,
so pages are resolved by the upstream application without additional routing logic in this
project.

### Data fetches

Requests for JSON or CSV artefacts are served directly from the static bundle, inheriting
the immutable caching headers from `_headers`. CORS headers are not required because the
client is served from the same origin and path prefix.
