export interface Env {
  ACX_COMPUTE_SERVICE_URL?: string;
  ACX_DATASET_VERSION?: string;
}

const JSON_TYPE = "application/json";
const CACHE_PREFIX = "https://cache.carbon-acx/api/compute/";

type OverrideMap = Record<string, number>;

interface ComputePayload {
  profile_id: string;
  overrides: OverrideMap;
}

let cachedDatasetVersion: string | null = null;

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": JSON_TYPE },
  });
}

function normaliseOverrides(value: unknown): OverrideMap {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("overrides must be an object");
  }
  const overrides: OverrideMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key || typeof key !== "string") {
      throw new TypeError("override keys must be non-empty strings");
    }
    if (raw == null) {
      continue;
    }
    if (typeof raw === "boolean") {
      throw new TypeError(`override value for ${key} cannot be a boolean`);
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new TypeError(`override value for ${key} must be a finite number`);
    }
    overrides[key] = num;
  }
  return overrides;
}

function normaliseRequest(payload: unknown): ComputePayload {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("request body must be a JSON object");
  }
  const profileId = (payload as Record<string, unknown>)["profile_id"];
  if (typeof profileId !== "string" || !profileId.trim()) {
    throw new TypeError("profile_id must be a non-empty string");
  }
  const overrides = normaliseOverrides((payload as Record<string, unknown>)["overrides"]);
  return { profile_id: profileId, overrides };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function buildCacheKey(
  profileId: string,
  overrides: OverrideMap,
  datasetVersion: string,
): Promise<Request> {
  const digestInput = stableStringify({ profileId, overrides, datasetVersion });
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(digestInput),
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const cacheUrl = new URL(CACHE_PREFIX + hash);
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function resolveBackendUrl(env: Env, suffix: string, search: string): string | null {
  const base = env.ACX_COMPUTE_SERVICE_URL;
  if (!base) {
    return null;
  }
  const trimmedBase = base.replace(/\/+$/, "");
  const normalisedSuffix = suffix ? `/${suffix.replace(/^\/+/, "")}` : "";
  const query = search ?? "";
  return `${trimmedBase}${normalisedSuffix}${query}`;
}

async function proxyBackend(
  target: string,
  payload: ComputePayload,
  accept: string,
): Promise<Response> {
  const backendRequest = new Request(target, {
    method: "POST",
    headers: {
      "content-type": JSON_TYPE,
      accept,
    },
    body: JSON.stringify(payload),
  });
  const response = await fetch(backendRequest);
  if (!response.ok) {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? JSON_TYPE },
    });
  }
  return response;
}

function cacheControlHeaders(): HeadersInit {
  return {
    "cache-control": "private, max-age=60",
    "content-type": JSON_TYPE,
  };
}

async function handleCompute(request: Request, env: Env, target: string): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "method not allowed");
  }

  let payload: ComputePayload;
  try {
    payload = normaliseRequest(await request.json());
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "invalid payload");
  }

  const cache = caches.default;
  const datasetHint = env.ACX_DATASET_VERSION ?? cachedDatasetVersion;
  if (datasetHint) {
    const cacheRequest = await buildCacheKey(payload.profile_id, payload.overrides, datasetHint);
    const cached = await cache.match(cacheRequest);
    if (cached) {
      return cached;
    }
  }

  const backendResponse = await proxyBackend(target, payload, JSON_TYPE);
  if (!backendResponse.ok) {
    return backendResponse;
  }

  const result = await backendResponse.json();
  const manifest = result?.manifest;
  const datasetVersion =
    typeof manifest?.dataset_version === "string" && manifest.dataset_version
      ? manifest.dataset_version
      : env.ACX_DATASET_VERSION ?? "unknown";

  cachedDatasetVersion = datasetVersion;

  const body = JSON.stringify(result);
  const response = new Response(body, {
    status: 200,
    headers: cacheControlHeaders(),
  });

  const cacheRequest = await buildCacheKey(payload.profile_id, payload.overrides, datasetVersion);
  await cache.put(cacheRequest, response.clone());

  return response;
}

async function handleExport(request: Request, target: string, url: URL): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "method not allowed");
  }

  let payload: ComputePayload;
  try {
    payload = normaliseRequest(await request.json());
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "invalid payload");
  }

  const format = url.searchParams.get("format")?.toLowerCase() ?? "csv";
  const acceptHeader =
    format === "csv"
      ? "text/csv"
      : format === "json"
        ? JSON_TYPE
        : format === "txt" || format === "text"
          ? "text/plain"
          : request.headers.get("accept") ?? "application/octet-stream";

  const backendResponse = await proxyBackend(target, payload, acceptHeader);
  if (!backendResponse.ok) {
    return backendResponse;
  }

  const headers = new Headers(backendResponse.headers);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "private, max-age=60");
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/compute")) {
      return errorResponse(404, "not found");
    }

    const remainder = url.pathname.slice("/api/compute".length);
    const trimmed = remainder.replace(/^\/+/, "").replace(/\/+$/, "");
    const suffix = trimmed ? trimmed : "";

    const target = resolveBackendUrl(env, suffix, url.search);
    if (!target) {
      return errorResponse(500, "ACX_COMPUTE_SERVICE_URL is not configured");
    }

    if (!suffix) {
      return handleCompute(request, env, target);
    }

    if (suffix === "export") {
      return handleExport(request, target, url);
    }

    return errorResponse(404, "not found");
  },
};
