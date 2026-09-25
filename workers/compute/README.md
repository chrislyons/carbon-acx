# `workers/compute` status

This Worker is a **fail-closed, non-authoritative** edge surface. It is not a
production compute API and must not be described as one.

## Current policy

- This Worker serves only its own `/api/*` namespace. It deliberately does not
  accept a `/carbon-acx/*` alias and does not serve `/artifacts/*`.
- `/api/compute` always returns HTTP `503` with the exact `unavailable`
  contract; `/api/health` reports `{ "ok": true, "compute": "unavailable" }`.
- Every response carries `X-ACX-Compute-Authority: unavailable` plus aligned
  security headers (`X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`) and
  `Access-Control-Allow-Origin: *`.
- Source-of-truth compute lives in `calc/service.py` via `compute_profile`.
- The canonical programmatic interface is the Python CLI in `calc/compute_cli.py`.
- The public web product relies on the packaged static artifacts and the stable
  read-only routes, not on this Worker.

## Routing boundaries

The repository has exactly one authority per delivery surface:

| Path | Surface | Contract |
| --- | --- | --- |
| `/artifacts/*` | Packaged static bundle (`dist/site`, `_headers`) | Canonical, hash-verifiable artifacts with revalidation; the only artifact authority. |
| `/carbon-acx/artifacts/*` | Legacy compatibility Pages Function (`functions/carbon-acx/[[path]].ts`) | Rejected with a structured `410`; artifacts are never served from this prefix. |
| `/carbon-acx/*` (other) | Legacy compatibility Pages Function (`functions/carbon-acx/[[path]].ts`) | Reverse proxy to `CARBON_ACX_ORIGIN` when set, otherwise a static passthrough. Marks every response with `X-ACX-Legacy-Surface: carbon-acx`. |
| `/api/*` | This Worker | Fail-closed; unavailable by design. |

Because the three namespaces are disjoint, no surface can silently become an
alternate authority for another.

Path handling in the legacy function: the path is percent-decoded before any
routing decision. Malformed percent-encoding, encoded separators or backslashes,
double-encoded segments, and `.`/`..` traversal segments are rejected with a
structured `400` before proxying or static fallback. Encoded spellings of the
artifact namespace (for example `/carbon-acx/%61rtifacts`) decode and hit the
same `410` boundary. Every legacy response carries the full packaged `_headers`
security policy (`Content-Security-Policy`, `Strict-Transport-Security`,
`X-Frame-Options: DENY`, `Permissions-Policy`, nosniff, referrer policy), and
upstream `Set-Cookie` headers are stripped from proxied responses.

## Response contract (`/api/compute`)

- `503` for any non-`OPTIONS` method and any payload, including malformed JSON.
- `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`.
- Body: `{"error":"unavailable","message":"Compute data is unavailable because its provenance has not been verified."}`

## Practical guidance

- Use this Worker only for local experiments and parity checks.
- Do not treat `/api/compute` as authoritative in docs or release notes.
- Any expansion must first parity-test responses against the Python contract
  and then update `workers/compute/wrangler.toml` + this README together; until
  then the fail-closed `503` contract stands.
- Deploy this non-authoritative surface only with `pnpm --filter carbon-acx-web exec wrangler deploy --config ../../workers/compute/wrangler.toml`; it is separate from the Pages project.