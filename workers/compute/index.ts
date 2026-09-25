/**
 * Fail-closed compute Worker.
 *
 * This surface is intentionally non-authoritative and is NOT a production
 * compute API:
 * - It serves only the `/api/*` namespace. It deliberately does not accept a
 *   `/carbon-acx/*` alias (that prefix belongs to the legacy compatibility
 *   Pages Function) and it does not serve `/artifacts/*` (that belongs to the
 *   canonical packaged static bundle).
 * - `/api/compute` always returns the HTTP 503 `unavailable` contract until
 *   live edge computation provenance is verified against the canonical Python
 *   contract (`calc/service.py` / `calc/compute_cli.py`).
 * - Every response carries `X-ACX-Compute-Authority: unavailable` so no caller
 *   can mistake it for an authoritative data source.
 */

const JSON_TYPE = 'application/json; charset=utf-8';
const ALLOWED_ORIGIN = '*';
const AUTHORITY_HEADER = 'X-ACX-Compute-Authority';
const AUTHORITY_VALUE = 'unavailable';
const UNAVAILABLE_PAYLOAD = {
  error: 'unavailable',
  message: 'Compute data is unavailable because its provenance has not been verified.',
};

/**
 * CORS/security headers aligned with the canonical bundle contract
 * (`Access-Control-Allow-Origin: *`, nosniff, strict-origin-when-cross-origin).
 * `POST` is allowed here because the compute contract is POST-shaped; the
 * static artifact surface stays `GET, HEAD, OPTIONS`.
 */
function withEdgeHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', ALLOWED_ORIGIN);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set(AUTHORITY_HEADER, AUTHORITY_VALUE);
  return new Response(response.body, { status: response.status, headers });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', JSON_TYPE);
  headers.set('cache-control', 'no-store');
  return withEdgeHeaders(new Response(JSON.stringify(body), { ...init, headers }));
}

function jsonError(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withEdgeHeaders(
        new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } }),
      );
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      if (request.method !== 'GET') {
        return jsonError(405, 'method not allowed');
      }
      return jsonResponse({ ok: true, compute: 'unavailable' });
    }

    if (pathname === '/api/compute') {
      return jsonResponse(UNAVAILABLE_PAYLOAD, { status: 503 });
    }

    if (pathname.startsWith('/api/compute/')) {
      return jsonError(404, 'endpoint not implemented');
    }

    return jsonError(404, 'not found');
  },
};