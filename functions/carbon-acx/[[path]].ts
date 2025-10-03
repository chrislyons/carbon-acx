const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://boot.industries",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const CONTENT_TYPE_BY_SUFFIX: Record<string, string> = {
  ".json": "application/json",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

interface BasePathInfo {
  /** Base path without trailing slash (e.g. "/carbon-acx" or "") */
  prefix: string;
  /** Base path with trailing slash (e.g. "/carbon-acx/" or "/") */
  withTrailingSlash: string;
}

function normaliseBasePath(raw: string | undefined): BasePathInfo {
  let base = (raw && raw.trim()) || "/";
  if (!base.startsWith("/")) {
    base = `/${base}`;
  }
  if (!base.endsWith("/")) {
    base = `${base}/`;
  }
  if (base === "//") {
    base = "/";
  }
  const prefix = base === "/" ? "" : base.slice(0, -1);
  return { prefix, withTrailingSlash: base };
}

function stripBasePath(pathname: string, base: BasePathInfo): string {
  if (!base.prefix) {
    return pathname;
  }
  if (pathname === base.prefix) {
    return "/";
  }
  if (pathname.startsWith(`${base.prefix}/`)) {
    return pathname.slice(base.prefix.length);
  }
  return pathname;
}

function sanitiseArtifactKey(raw: string): string {
  const cleaned = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  return cleaned.join("/");
}

function resolveContentType(path: string): string | null {
  const dot = path.lastIndexOf(".");
  if (dot === -1) {
    return null;
  }
  const suffix = path.slice(dot).toLowerCase();
  return CONTENT_TYPE_BY_SUFFIX[suffix] ?? null;
}

function applyArtifactHeaders(
  response: Response,
  artifactKey: string,
  options: { includeDiagHeader: boolean },
  contentTypeOverride?: string | null,
): Response {
  const headers = new Headers(response.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  if (contentTypeOverride) {
    headers.set("content-type", contentTypeOverride);
  }
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  if (options.includeDiagHeader) {
    headers.set("X-Diag-Artifact-Path", artifactKey);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createJsonResponse(
  payload: unknown,
  status: number,
  artifactKey: string,
  includeDiagHeader: boolean,
): Response {
  const headers = new Headers({ "content-type": "application/json" });
  headers.set("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  if (includeDiagHeader) {
    headers.set("X-Diag-Artifact-Path", artifactKey);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

async function handleArtifactRequest(
  ctx: Parameters<PagesFunction>[0],
  base: BasePathInfo,
  origin: string | undefined,
): Promise<Response> {
  const { request } = ctx;
  const url = new URL(request.url);
  const artifactPrefix = `${base.withTrailingSlash}artifacts/`;
  const artifactPath = url.pathname.slice(artifactPrefix.length);
  const sanitizedKey = sanitiseArtifactKey(artifactPath);
  const artifactKey = sanitizedKey ? `artifacts/${sanitizedKey}` : "artifacts";
  const includeDiagHeader = !origin;
  const desiredContentType = resolveContentType(sanitizedKey);

  const staticResponse = await ctx.next();
  if (staticResponse && staticResponse.status !== 404) {
    const contentType = staticResponse.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) {
      return applyArtifactHeaders(staticResponse, artifactKey, { includeDiagHeader }, desiredContentType);
    }
  }

  if (origin) {
    const trimmedOrigin = origin.replace(/\/$/, "");
    const upstreamUrl = `${trimmedOrigin}/artifacts/${sanitizedKey}${url.search}`;
    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
    });
    const upstreamResponse = await fetch(upstreamRequest);
    if (upstreamResponse.ok) {
      return applyArtifactHeaders(
        upstreamResponse,
        artifactKey,
        { includeDiagHeader },
        desiredContentType,
      );
    }
    const snippet = await upstreamResponse.text();
    return createJsonResponse(
      {
        error: "upstream_error",
        path: artifactKey,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        snippet: snippet.slice(0, 200),
      },
      upstreamResponse.status || 502,
      artifactKey,
      includeDiagHeader,
    );
  }

  return createJsonResponse({ error: "not_found", path: artifactKey }, 404, artifactKey, includeDiagHeader);
}

export const onRequest: PagesFunction<{
  CARBON_ACX_ORIGIN: string | undefined;
  PUBLIC_BASE_PATH: string | undefined;
}> = async (ctx) => {
  const { request, env } = ctx;
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD, OPTIONS" },
    });
  }

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const base = normaliseBasePath(env.PUBLIC_BASE_PATH);
  const url = new URL(request.url);

  if (url.pathname.startsWith(`${base.withTrailingSlash}artifacts/`)) {
    return handleArtifactRequest(ctx, base, env.CARBON_ACX_ORIGIN);
  }

  const suffix = stripBasePath(url.pathname, base) + (url.search || "");
  const origin = env.CARBON_ACX_ORIGIN?.replace(/\/$/, "");

  if (origin) {
    const target = origin + (suffix || "/");
    const init: RequestInit = {
      method,
      headers: request.headers,
    };
    const resp = await fetch(new Request(target, init));
    const out = new Response(resp.body, resp);
    out.headers.set(
      "Cache-Control",
      out.headers.get("Cache-Control") || "public, max-age=86400, s-maxage=86400",
    );
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      out.headers.set(key, value);
    }
    return out;
  }

  const nextResponse = await ctx.next();
  const headers = nextResponse.headers;

  if (url.pathname.startsWith(`${base.withTrailingSlash}artifacts/`)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return nextResponse;
};
