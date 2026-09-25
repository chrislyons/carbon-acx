/**
 * Legacy `/carbon-acx/*` Pages Function (compatibility proxy only).
 *
 * Routing contract (single source of truth):
 * - Canonical artifact delivery is the packaged static bundle at the root path
 *   `/artifacts/*`, described by the generated `_headers` file (immutable
 *   cache, `Access-Control-Allow-Origin: *`). This function does NOT serve
 *   artifacts and holds no artifact authority: the `/carbon-acx/artifacts/*`
 *   namespace is rejected with a structured 410, never proxied or
 *   static-served. Percent-encoded spellings are decoded first, so an encoded
 *   `/carbon-acx/%61rtifacts` cannot bypass the boundary.
 * - `/carbon-acx/*` is a legacy compatibility surface. When
 *   `CARBON_ACX_ORIGIN` (https only) is configured it is a reverse proxy;
 *   otherwise it is a transparent static passthrough.
 * - Encoded path traversal (`%2e%2e`, `%2f`) and malformed percent-encoding are
 *   rejected with a structured 400 before any routing decision.
 * - Every response carries `X-ACX-Legacy-Surface: carbon-acx` so the legacy
 *   surface can never be mistaken for, or silently become, the canonical
 *   root artifact authority.
 * - The mount prefix is fixed by this file's location and is never read from
 *   the environment, so routing cannot silently drift away from the file path.
 */

const LEGACY_BASE_PREFIX = "/carbon-acx";
const ALLOWED_METHODS: Record<string, true> = {
  GET: true,
  HEAD: true,
  OPTIONS: true,
};
const SURFACE_HEADER = "X-ACX-Legacy-Surface";
const SURFACE_NAME = "carbon-acx";

/**
 * Aligned with the canonical bundle contract in `scripts/prepare_pages_bundle.py`
 * (`Access-Control-Allow-Origin: *`, `GET, HEAD, OPTIONS`, `Content-Type`).
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Full packaged `_headers` global policy, applied to every legacy response. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; " +
    "frame-ancestors 'none'; form-action 'self'",
};

function withLegacySurfaceHeaders(headers: Headers): Headers {
  const out = new Headers(headers);
  out.delete("set-cookie");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    out.set(key, value);
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    out.set(key, value);
  }
  out.set(SURFACE_HEADER, SURFACE_NAME);
  return out;
}

/**
 * Preserves the structured error contract: proxy and routing failures return
 * JSON, never a bare status text, so callers can distinguish upstream failure
 * from the canonical artifact surface.
 */
function structuredError(status: number, payload: Record<string, unknown>): Response {
  const headers = withLegacySurfaceHeaders(new Headers({ "content-type": "application/json" }));
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}

function stripLegacyPrefix(pathname: string): string {
  if (pathname === LEGACY_BASE_PREFIX) {
    return "/";
  }
  if (pathname.startsWith(`${LEGACY_BASE_PREFIX}/`)) {
    return pathname.slice(LEGACY_BASE_PREFIX.length);
  }
  return pathname;
}

/**
 * Decodes the raw pathname and splits it into segments. Returns `null` for
 * malformed percent-encoding or any traversal segment, so the caller rejects
 * rather than silently rewriting.
 */
function decodePathSegments(pathname: string): string[] | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const normalised = decoded.replace(/\\/g, "/");
  const segments = normalised.split("/").map((segment) => segment.trim());
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      return null;
    }
    if (segment.includes("%") || /[\u0000-\u001f]/.test(segment)) {
      return null;
    }
  }
  return segments.filter((segment) => segment.length > 0);
}

const UPSTREAM_REQUEST_HEADERS = [
  "accept",
  "accept-encoding",
  "user-agent",
  "range",
] as const;

function pickUpstreamHeaders(headers: Headers): Headers {
  const forwarded = new Headers();
  for (const name of UPSTREAM_REQUEST_HEADERS) {
    const value = headers.get(name);
    if (value !== null) {
      forwarded.set(name, value);
    }
  }
  return forwarded;
}

function resolveUpstreamOrigin(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed || !trimmed.toLowerCase().startsWith("https://")) {
    return undefined;
  }
  return trimmed;
}

export const onRequest: PagesFunction<{
  CARBON_ACX_ORIGIN: string | undefined;
}> = async (ctx) => {
  const { request, env } = ctx;
  const method = request.method.toUpperCase();

  if (ALLOWED_METHODS[method] !== true) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: withLegacySurfaceHeaders(new Headers({ Allow: "GET, HEAD, OPTIONS" })),
    });
  }

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withLegacySurfaceHeaders(new Headers()),
    });
  }

  const url = new URL(request.url);
  const rawPath = stripLegacyPrefix(url.pathname);
  const segments = decodePathSegments(rawPath);

  if (segments === null) {
    return structuredError(400, {
      error: "bad_request",
      path: url.pathname,
      message: "Malformed or traversal path is not permitted.",
    });
  }

  const sanitisedPath = `/${segments.join("/")}`;
  const legacyPath = `${LEGACY_BASE_PREFIX}${sanitisedPath}`;

  if (sanitisedPath === "/artifacts" || sanitisedPath.startsWith("/artifacts/")) {
    return structuredError(410, {
      error: "not_found",
      path: legacyPath,
      message: "Artifacts are served only from the canonical /artifacts/ surface.",
    });
  }

  const origin = resolveUpstreamOrigin(env.CARBON_ACX_ORIGIN);

  if (origin) {
    const target = origin + sanitisedPath + (url.search || "");
    let upstream: Response;
    try {
      upstream = await fetch(
        new Request(target, { method, headers: pickUpstreamHeaders(request.headers) }),
      );
    } catch {
      return structuredError(502, {
        error: "upstream_error",
        path: legacyPath,
        status: 502,
        statusText: "Bad Gateway",
        snippet: "",
      });
    }

    if (!upstream.ok) {
      const snippet = (await upstream.text()).slice(0, 200);
      return structuredError(upstream.status || 502, {
        error: "upstream_error",
        path: legacyPath,
        status: upstream.status,
        statusText: upstream.statusText,
        snippet,
      });
    }

    const headers = withLegacySurfaceHeaders(upstream.headers);
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  const nextResponse = await ctx.next();
  return new Response(nextResponse.body, {
    status: nextResponse.status,
    statusText: nextResponse.statusText,
    headers: withLegacySurfaceHeaders(nextResponse.headers),
  });
};