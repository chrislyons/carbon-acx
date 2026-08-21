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

function mockFetch(status = 200, body = "artifact-bytes"): void {
  lastUpstream = null;
  (globalThis as { fetch: unknown }).fetch = async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input.toString());
    lastUpstream = {
      url: request.url,
      method: request.method,
      headers: request.headers,
    };
    return new Response(body, { status });
  };
}

function makeContext(
  path: string,
  env: Env,
  staticResponse: Response,
  headers: Record<string, string> = {},
): Parameters<typeof onRequest>[0] {
  const request = new Request(`https://pages.test${path}`, { headers });
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

test("artifact keys are sanitised before upstream resolution", async () => {
  mockFetch();
  const ctx = makeContext(
    "/carbon-acx/artifacts/references//file.txt",
    { CARBON_ACX_ORIGIN: "https://artifacts.test", PUBLIC_BASE_PATH: "/carbon-acx" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(
    lastUpstream?.url,
    "https://artifacts.test/artifacts/references/file.txt",
  );
});

test("proxy suffixes are sanitised and forwarded without credentials", async () => {
  mockFetch(200, "page");
  const ctx = makeContext(
    "/carbon-acx/methodology",
    { CARBON_ACX_ORIGIN: "https://upstream.test/", PUBLIC_BASE_PATH: "/carbon-acx" },
    notFoundStatic(),
    { accept: "text/html", cookie: "session=secret", authorization: "Bearer x" },
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 200);
  assert.equal(lastUpstream?.url, "https://upstream.test/methodology");
  assert.equal(lastUpstream?.headers.get("cookie"), null);
  assert.equal(lastUpstream?.headers.get("authorization"), null);
  assert.equal(lastUpstream?.headers.get("accept"), "text/html");
});

test("non-https origins fall back to static assets", async () => {
  let nextCalled = false;
  const request = new Request("https://pages.test/carbon-acx/methodology");
  const ctx = {
    request,
    env: { CARBON_ACX_ORIGIN: "http://insecure.test", PUBLIC_BASE_PATH: "/carbon-acx" } as Env,
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
});

test("upstream failures keep the structured error shape", async () => {
  mockFetch(503, "downstream unavailable");
  const ctx = makeContext(
    "/carbon-acx/artifacts/data/calculator-data.json",
    { CARBON_ACX_ORIGIN: "https://artifacts.test", PUBLIC_BASE_PATH: "/carbon-acx" },
    notFoundStatic(),
  );

  const response = await onRequest(ctx);

  assert.equal(response.status, 503);
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.error, "upstream_error");
  assert.equal(payload.path, "artifacts/data/calculator-data.json");
  assert.match(String(payload.snippet), /downstream unavailable/);
});
