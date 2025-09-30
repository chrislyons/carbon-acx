import type { D1Database } from '@cloudflare/workers-types';
import { z } from 'zod';

import { computeFigures, getDatasetVersion, OverrideMap } from './runtime';

const JSON_TYPE = 'application/json; charset=utf-8';
const ALLOWED_ORIGIN = '*';

interface Env {
  DB?: D1Database;
  ACX_DATA_BACKEND?: string;
  ACX_DATASET_VERSION?: string;
  PUBLIC_BASE_PATH?: string;
}

interface ResolvedBackend {
  name: 'd1' | 'sqlite';
  binding: D1Database | null;
  source: 'binding' | 'file';
}

const ComputeRequestSchema = z.object({
  profile_id: z
    .string({ required_error: 'profile_id is required', invalid_type_error: 'profile_id must be a string' })
    .trim()
    .min(1, 'profile_id must be a non-empty string'),
  overrides: z
    .record(z.union([z.number(), z.string(), z.null()]), {
      invalid_type_error: 'overrides must be an object map'
    })
    .optional()
});

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

function normalisePath(pathname: string, basePath: string): string {
  if (!basePath || basePath === '/') {
    return pathname;
  }
  if (pathname === basePath) {
    return '/';
  }
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }
  return pathname;
}

function normaliseOverrides(value: Record<string, unknown> | undefined): OverrideMap {
  if (!value) {
    return {};
  }
  const overrides: OverrideMap = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new TypeError('override keys must be non-empty strings');
    }
    if (raw == null) {
      continue;
    }
    const numeric = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
    if (!Number.isFinite(numeric)) {
      throw new TypeError(`override value for ${key} must be numeric`);
    }
    overrides[key] = numeric;
  }
  return overrides;
}

function resolveBackend(env: Env): ResolvedBackend {
  const specified = env.ACX_DATA_BACKEND?.trim().toLowerCase();
  if (specified === 'd1') {
    if (!env.DB) {
      console.warn('ACX_DATA_BACKEND=d1 but DB binding is missing; falling back to local SQLite file');
      return { name: 'sqlite', binding: null, source: 'file' };
    }
    return { name: 'd1', binding: env.DB, source: 'binding' };
  }
  if (specified === 'sqlite') {
    return { name: 'sqlite', binding: env.DB ?? null, source: env.DB ? 'binding' : 'file' };
  }
  if (specified && specified.length > 0) {
    throw new Error(`Unsupported ACX_DATA_BACKEND value: ${specified}`);
  }
  if (env.DB) {
    return { name: 'd1', binding: env.DB, source: 'binding' };
  }
  console.warn('No ACX_DATA_BACKEND set and no D1 binding detected; defaulting to local SQLite');
  return { name: 'sqlite', binding: null, source: 'file' };
}

function resolveDatasetVersion(env: Env): string {
  const fromEnv = env.ACX_DATASET_VERSION?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return getDatasetVersion();
}

async function computeDatasetFingerprint(env: Env, backend: ResolvedBackend): Promise<string> {
  const encoder = new TextEncoder();
  const datasetVersion = resolveDatasetVersion(env);
  const source = backend.source === 'binding' ? backend.name : `${backend.name}-fs`;
  const digestInput = encoder.encode(`${datasetVersion}|${backend.name}|${source}`);
  const hash = await crypto.subtle.digest('SHA-256', digestInput);
  const hex = Array.from(new Uint8Array(hash))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex.slice(0, 32)}`;
}

async function resolveRequestPayload(request: Request): Promise<{ profileId: string; overrides: OverrideMap }> {
  let parsed;
  try {
    const payload = (await request.json()) as unknown;
    parsed = ComputeRequestSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? 'invalid payload';
      throw new TypeError(message);
    }
    throw new TypeError(error instanceof Error ? error.message : 'invalid JSON payload');
  }
  const overrides = normaliseOverrides(parsed.overrides);
  return { profileId: parsed.profile_id, overrides };
}

async function handleCompute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError(405, 'method not allowed');
  }

  let context;
  try {
    context = await resolveRequestPayload(request);
  } catch (error) {
    return jsonError(400, error instanceof Error ? error.message : 'invalid payload');
  }

  const backend = resolveBackend(env);
  const datasetVersion = resolveDatasetVersion(env);
  const datasetFingerprint = await computeDatasetFingerprint(env, backend);

  console.log(
    `[compute] backend=${backend.name} source=${backend.source} dataset=${datasetVersion} fingerprint=${datasetFingerprint}`
  );

  const result = computeFigures(
    { profileId: context.profileId, overrides: context.overrides },
    { datasetVersion, datasetFingerprint, backend: backend.name }
  );
  return jsonResponse(result, { status: 200 });
}

async function handleHealth(env: Env): Promise<Response> {
  try {
    const backend = resolveBackend(env);
    const datasetFingerprint = await computeDatasetFingerprint(env, backend);
    const datasetVersion = resolveDatasetVersion(env);
    console.log(
      `[health] ok backend=${backend.name} source=${backend.source} dataset=${datasetVersion} fingerprint=${datasetFingerprint}`
    );
    return jsonResponse({ ok: true, dataset: datasetFingerprint });
  } catch (error) {
    console.error('[health] failed', error);
    return jsonResponse({ ok: false, dataset: null, error: error instanceof Error ? error.message : 'unknown error' }, { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const basePath = (env.PUBLIC_BASE_PATH ?? '/').replace(/\/+/g, '/').replace(/\/+$|^$/, '');
    const resolvedBase = basePath.length > 0 ? (basePath.startsWith('/') ? basePath : `/${basePath}`) : '';
    const pathname = normalisePath(url.pathname, resolvedBase || '/');

    if (pathname === '/api/health') {
      if (request.method !== 'GET') {
        return jsonError(405, 'method not allowed');
      }
      return handleHealth(env);
    }

    if (pathname === '/api/compute') {
      return handleCompute(request, env);
    }

    if (pathname.startsWith('/api/compute/')) {
      return jsonError(404, 'endpoint not implemented');
    }

    return jsonError(404, 'not found');
  },
};
