import { computeFigures, getDatasetVersion, OverrideMap } from './runtime';

const JSON_TYPE = 'application/json; charset=utf-8';
const ALLOWED_ORIGIN = '*';

interface ComputeRequestPayload {
  profile_id: unknown;
  overrides: unknown;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', ALLOWED_ORIGIN);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
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

function normaliseOverrides(value: unknown): OverrideMap {
  if (value == null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('overrides must be a JSON object');
  }
  const overrides: OverrideMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new TypeError('override keys must be non-empty strings');
    }
    if (raw == null) {
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      throw new TypeError(`override value for ${key} must be numeric`);
    }
    overrides[key] = numeric;
  }
  return overrides;
}

function resolveRequestPayload(payload: ComputeRequestPayload): { profileId: string; overrides: OverrideMap } {
  const profileId = payload.profile_id;
  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    throw new TypeError('profile_id must be a non-empty string');
  }
  const overrides = normaliseOverrides(payload.overrides);
  return { profileId: profileId.trim(), overrides };
}

async function handleCompute(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError(405, 'method not allowed');
  }

  let payload: ComputeRequestPayload;
  try {
    payload = (await request.json()) as ComputeRequestPayload;
  } catch (error) {
    return jsonError(400, error instanceof Error ? error.message : 'invalid JSON payload');
  }

  let context;
  try {
    context = resolveRequestPayload(payload);
  } catch (error) {
    return jsonError(400, error instanceof Error ? error.message : 'invalid payload');
  }

  const result = computeFigures({ profileId: context.profileId, overrides: context.overrides });
  return jsonResponse(result, { status: 200 });
}

function handleHealth(): Response {
  return jsonResponse({ ok: true, dataset: getDatasetVersion() });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const pathname = normalisePath(url.pathname);

    if (pathname === '/api/health') {
      if (request.method !== 'GET') {
        return jsonError(405, 'method not allowed');
      }
      return handleHealth();
    }

    if (pathname === '/api/compute') {
      return handleCompute(request);
    }

    if (pathname.startsWith('/api/compute/')) {
      return jsonError(404, 'endpoint not implemented');
    }

    return jsonError(404, 'not found');
  },
};
