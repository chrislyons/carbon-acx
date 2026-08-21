/**
 * The Worker compute route is fail-closed until its provenance is verified.
 */

const JSON_TYPE = 'application/json; charset=utf-8';
const ALLOWED_ORIGIN = '*';
const UNAVAILABLE_PAYLOAD = {
  error: 'unavailable',
  message: 'Compute data is unavailable because its provenance has not been verified.',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', ALLOWED_ORIGIN);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', JSON_TYPE);
  headers.set('cache-control', 'no-store');
  return withCors(new Response(JSON.stringify(body), { ...init, headers }));
}

function jsonError(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}

function normalisePath(pathname: string): string {
  if (pathname.startsWith('/carbon-acx/')) {
    return pathname.slice('/carbon-acx'.length);
  }
  return pathname;
}


export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(
        new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } }),
      );
    }

    const url = new URL(request.url);
    const pathname = normalisePath(url.pathname);

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
