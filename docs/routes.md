# Route integrations

## `/carbon-acx/*`

Requests under `/carbon-acx` are proxied to the Carbon ACX Cloudflare Pages deployment.
The function rewrites the subpath while preserving any query parameters and forwards the
request to the upstream specified by the `CARBON_ACX_PAGES_HOST` environment variable.

### Caching

* Fingerprinted assets (e.g. `main.abcdef12.js`) are served with `Cache-Control: public, max-age=31536000, immutable`.
* Other responses, including HTML shell documents, use `Cache-Control: public, max-age=86400`.
* The upstream fetch uses Cloudflare cache settings with a one-day TTL for successful responses,
  a one-minute TTL for 404s, and no caching for 5xx.

### Deep linking and SPA behaviour

Deep links such as `/carbon-acx/demo` and `/carbon-acx/view?id=abc` are forwarded without
modification. The Carbon ACX static project serves its SPA fallback (200.html) directly,
so pages are resolved by the upstream application without additional routing logic in this
project.

### Data fetches

Requests for JSON or CSV assets include `Access-Control-Allow-Origin: https://boot.industries`
and `Vary: Origin`, allowing Carbon ACX pages to make same-origin XHR/fetch requests when
served under `/carbon-acx` on boot.industries.
