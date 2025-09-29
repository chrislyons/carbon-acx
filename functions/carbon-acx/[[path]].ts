type Env = {
  CARBON_ACX_PAGES_HOST: string;
};

const HASHED_ASSET_PATTERN = /\.[a-f0-9]{8,}\.(js|css|json|csv|png|jpg|svg|woff2?)$/i;
const DATA_EXTENSION_PATTERN = /\.(json|csv)$/i;
const CACHE_TTL_BY_STATUS: Record<string, number> = {
  "200-299": 86400,
  "404": 60,
  "500-599": 0,
};

const ensureVaryIncludes = (headers: Headers, value: string) => {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }
  const parts = existing
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
    parts.push(value);
    headers.set("Vary", parts.join(", "));
  }
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const upstream = env.CARBON_ACX_PAGES_HOST; // e.g., https://carbon-acx-pages.pages.dev
  if (!upstream) {
    return new Response("Missing CARBON_ACX_PAGES_HOST", { status: 500 });
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const reqUrl = new URL(request.url);
  const subpath = reqUrl.pathname.replace(/^\/carbon-acx/, "") || "/";
  const target = new URL(subpath + reqUrl.search, upstream);

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete("host");
  if (!forwardedHeaders.has("accept")) {
    forwardedHeaders.set("accept", "*/*");
  }
  forwardedHeaders.set("x-forwarded-host", reqUrl.host);
  forwardedHeaders.set("x-forwarded-proto", reqUrl.protocol.replace(/:$/, ""));
  const connectingIp = request.headers.get("cf-connecting-ip");
  if (connectingIp) {
    forwardedHeaders.set("x-forwarded-for", connectingIp);
  }

  const upstreamRequest = new Request(target.toString(), {
    method,
    headers: forwardedHeaders,
  });

  const res = await fetch(upstreamRequest, {
    cf: {
      cacheEverything: false,
      cacheTtlByStatus: CACHE_TTL_BY_STATUS,
    },
  });

  const path = target.pathname || "";
  const isHashed = HASHED_ASSET_PATTERN.test(path);

  const headers = new Headers(res.headers);
  headers.set("X-Carbon-ACX-Proxy", "pages-function");
  if (isHashed) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "public, max-age=86400");
  }
  if (DATA_EXTENSION_PATTERN.test(path)) {
    headers.set("Access-Control-Allow-Origin", "https://boot.industries");
    ensureVaryIncludes(headers, "Origin");
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};
