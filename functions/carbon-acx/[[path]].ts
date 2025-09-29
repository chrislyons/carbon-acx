export const onRequestGet: PagesFunction = async (ctx) => {
  const upstream = ctx.env.CARBON_ACX_PAGES_HOST; // e.g., https://carbon-acx-pages.pages.dev
  if (!upstream) return new Response("Missing CARBON_ACX_PAGES_HOST", { status: 500 });

  const reqUrl = new URL(ctx.request.url);
  const subpath = reqUrl.pathname.replace(/^\/carbon-acx/, "") || "/";
  const target = new URL(subpath + reqUrl.search, upstream);

  const res = await fetch(target.toString(), {
    headers: {
      "accept": ctx.request.headers.get("accept") || "*/*",
      "user-agent": ctx.request.headers.get("user-agent") || "",
      "cf-connecting-ip": ctx.request.headers.get("cf-connecting-ip") || "",
    },
    cf: {
      cacheEverything: false,
      cacheTtlByStatus: { "200-299": 86400, "404": 60, "500-599": 0 },
    },
  });

  const path = target.pathname || "";
  const isHashed = /\.[a-f0-9]{8,}\.(js|css|json|csv|png|jpg|svg|woff2?)$/i.test(path);

  const headers = new Headers(res.headers);
  headers.set("X-Carbon-ACX-Proxy", "pages-function");
  if (isHashed) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "public, max-age=86400");
  }
  if (/\.(json|csv)$/i.test(path)) {
    headers.set("Access-Control-Allow-Origin", "https://boot.industries");
    headers.set("Vary", "Origin");
  }

  return new Response(res.body, { status: res.status, headers });
};
