const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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
    return out;
  }

  return next();
};
