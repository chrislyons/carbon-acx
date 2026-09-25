import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "./[[path]].ts";

type Env = { CARBON_ACX_ORIGIN?: string; PUBLIC_BASE_PATH?: string };

interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
}

let lastUpstream: CapturedRequest | null = null;

function mockFetch(
  status = 200,
  body = "artifact-bytes",
  headers: Record<string, string> = {},
): void {
  lastUpstream = null;
  (globalThis as { fetch: unknown }).fetch = async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input.toString());
    lastUpstream = {
      url: request.url,
      method: request.method,
      headers: request.headers,
    };
    return new Response(body, { status, headers });
  };
}

function mockFetchFailure(): void {
  lastUpstream = null;
  (globalThis as { fetch: unknown }).fetch = async () => {
    throw new Error("network down");
  };
}

function makeContext(
  path: string,
  env: Env,
  staticResponse: Response,
  options: { method?: string; headers?: Record<string, string> } = {},
): Parameters<typeof onRequest>[0] {
  const request = new Request(`https://pages.test${path}`, {
    method: options.method ?? "GET",
    headers: options.headers ?? {},
  });
  return {
    request,
    env,
    params: { path: path.replace(/^\/[^/]+/, "") },
    next: async () => staticResponse,
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as Parameters<typeof onRequest>[0];
}

const notFoundStatic = () => new Response("not found", { status: 404 });

function assertLegacySurface(response: Response): void {
  assert.equal(response.headers.get("x-acx-legacy-surface"), "carbon-acx");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-methods"), "GET,HEAD,OPTIONS");
  assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(
    response.headers.get("strict-transport-security"),
    "max-age=31536000; includeSubDomains",
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /default-src 'self'; script-src 'self' 'unsafe-inline'; .*frame-ancestors 'none'; form-action 'self'/,
  );
}

test("the mount prefix is fixed and strips /carbon-acx regardless of environment", async () => {
  mockFetch();
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test", PUBLIC_BASE_PATH: "/" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(lastUpstream?.url, "https://upstream.test/methodology");
  assertLegacySurface(response);
});

test("path segments are sanitised and credentials are stripped before proxying", async () => {
  mockFetch(200, "page");
  const ctx = makeContext(
    "/carbon-acx/references//file.txt",
    { CARBON_ACX_ORIGIN: "https://upstream.test/", PUBLIC_BASE_PATH: "/carbon-acx" },
    notFoundStatic(),
    {
      headers: {
        accept: "text/html",
        cookie: "session=secret",
        authorization: "Bearer x",
      },
    },
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(lastUpstream?.url, "https://upstream.test/references/file.txt");
  assert.equal(lastUpstream?.headers.get("cookie"), null);
  assert.equal(lastUpstream?.headers.get("authorization"), null);
  assert.equal(lastUpstream?.headers.get("accept"), "text/html");
});

test("query strings are preserved through the proxy", async () => {
  mockFetch(200, "page");
  const ctx = makeContext(
    "/carbon-acx/view?id=abc",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(lastUpstream?.url, "https://upstream.test/view?id=abc");
});

test("non-https origins fall back to the static bundle", async () => {
  let nextCalled = false;
  const request = new Request("https://pages.test/carbon-acx/methodology");
  const ctx = {
    request,
    env: { CARBON_ACX_ORIGIN: "http://insecure.test" } as Env,
    params: {},
    next: async () => {
      nextCalled = true;
      return new Response("static", { status: 200 });
    },
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as Parameters<typeof onRequest>[0];

  const response = await onRequest(ctx);

  assert.equal(nextCalled, true);
  assert.equal(await response.text(), "static");
  assertLegacySurface(response);
});

test("the legacy artifact namespace is rejected so root /artifacts/* stays sole authority", async () => {
  mockFetch();
  for (const path of ["/carbon-acx/artifacts", "/carbon-acx/artifacts/manifest.json"]) {
    let nextCalled = false;
    const ctx = {
      request: new Request(`https://pages.test${path}`),
      env: { CARBON_ACX_ORIGIN: "https://artifacts.test" } as Env,
      params: {},
      next: async () => {
        nextCalled = true;
        return notFoundStatic();
      },
      waitUntil: () => undefined,
      passThroughOnException: () => undefined,
    } as unknown as Parameters<typeof onRequest>[0];

    const response = await onRequest(ctx);

    assert.equal(response.status, 410, path);
    assert.equal(nextCalled, false, path);
    assert.equal(lastUpstream, null, path);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload.error, "not_found", path);
    assert.equal(payload.path, path, path);
    assertLegacySurface(response);
  }
});

test("encoded spellings of the artifact namespace are rejected too", async () => {
  mockFetch();
  const ctx = makeContext(
    "/carbon-acx/%61rtifacts/manifest.json",
    { CARBON_ACX_ORIGIN: "https://artifacts.test" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 410);
  assert.equal(lastUpstream, null);
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.error, "not_found");
  assert.equal(payload.path, "/carbon-acx/artifacts/manifest.json");
  assertLegacySurface(response);
});

test("encoded traversal and malformed encoding are rejected before routing", async () => {
  mockFetch();
  const cases: Array<{ path: string; status: number }> = [
    { path: "/carbon-acx/foo%2f..%2fbar", status: 400 },
    { path: "/carbon-acx/foo%5c..%5cbar", status: 400 },
    { path: "/carbon-acx/%5c..%5cartifacts", status: 400 },
    { path: "/carbon-acx/%252e%252e/secret", status: 400 },
    { path: "/carbon-acx/%zz", status: 400 },
  ];

  for (const { path, status } of cases) {
    const ctx = makeContext(
      path,
      { CARBON_ACX_ORIGIN: "https://upstream.test" },
      notFoundStatic(),
    );

    const response = await onRequest(ctx);

    assert.equal(response.status, status, path);
    assert.equal(lastUpstream, null, path);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload.error, "bad_request", path);
    assertLegacySurface(response);
  }
});

test("upstream Set-Cookie headers are stripped from proxied responses", async () => {
  mockFetch(200, "page", { "set-cookie": "session=secret; Path=/", "content-type": "text/html" });
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  assertLegacySurface(response);
});

test("upstream failures keep the structured error shape", async () => {
  mockFetch(503, "downstream unavailable");
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.error, "upstream_error");
  assert.equal(payload.path, "/carbon-acx/methodology");
  assert.match(String(payload.snippet), /downstream unavailable/);
});

test("network failures return a structured 502", async () => {
  mockFetchFailure();
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 502);
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.error, "upstream_error");
  assert.equal(payload.path, "/carbon-acx/methodology");
});

test("unsupported methods are rejected with an Allow header on the legacy surface", async () => {
  mockFetch();
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
    { method: "POST" },
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD, OPTIONS");
  assert.equal(lastUpstream, null);
  assertLegacySurface(response);
});

test("OPTIONS returns the aligned preflight contract", async () => {
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test" },
    notFoundStatic(),
    { method: "OPTIONS" },
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 204);
  assertLegacySurface(response);
});