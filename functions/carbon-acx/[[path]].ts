const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://boot.industries",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

export const onRequest: PagesFunction<{
  CARBON_ACX_ORIGIN: string | undefined;
}> = async (ctx) => {
  const { request, env, next } = ctx;
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

  const reqUrl = new URL(request.url);

  const suffix = reqUrl.pathname.replace(/^\/carbon-acx/, "") + (reqUrl.search || "");

  const origin = (env.CARBON_ACX_ORIGIN || "").replace(/\/$/, "");

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

  const nextResponse = await next();
  const headers = nextResponse.headers;

  if (reqUrl.pathname.startsWith("/carbon-acx/artifacts/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }
  }

  return nextResponse;
};
