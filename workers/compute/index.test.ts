import assert from 'node:assert/strict';
import test from 'node:test';

import worker from './index.ts';

const unavailable = {
  error: 'unavailable',
  message: 'Compute data is unavailable because its provenance has not been verified.',
};

async function fetchWorker(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://worker.test${path}`, init));
}

test('compute returns the exact unavailable contract for malformed POST payloads', async () => {
  const response = await fetchWorker('/api/compute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not-json',
  });

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('x-acx-compute-authority'), 'unavailable');
  assert.equal(await response.text(), JSON.stringify(unavailable));
});

test('compute is unavailable regardless of method or payload', async () => {
  const response = await fetchWorker('/api/compute', {
    method: 'GET',
    body: undefined,
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), unavailable);
});

test('OPTIONS retains the generic CORS response', async () => {
  const response = await fetchWorker('/api/compute', { method: 'OPTIONS' });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'content-type');
  assert.equal(response.headers.get('x-acx-compute-authority'), 'unavailable');
});

test('health reports unavailable compute data', async () => {
  const response = await fetchWorker('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, compute: 'unavailable' });
});

test('health rejects non-GET methods', async () => {
  const response = await fetchWorker('/api/health', { method: 'POST' });

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'method not allowed' });
});

test('compute stays unavailable for every non-OPTIONS method', async () => {
  for (const method of ['PUT', 'DELETE', 'PATCH'] as const) {
    const response = await fetchWorker('/api/compute', { method });

    assert.equal(response.status, 503, method);
    assert.equal(await response.text(), JSON.stringify(unavailable), method);
  }
});

test('compute subpaths are not implemented', async () => {
  const response = await fetchWorker('/api/compute/v1/run');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'endpoint not implemented' });
});

test('unknown paths are not found', async () => {
  const response = await fetchWorker('/api/unknown');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not found' });
});

test('the legacy /carbon-acx prefix is not a worker alias', async () => {
  for (const path of ['/carbon-acx/api/health', '/carbon-acx/api/compute']) {
    const response = await fetchWorker(path);

    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'not found' }, path);
  }
});

test('the worker does not serve the canonical root artifact surface', async () => {
  const response = await fetchWorker('/artifacts/manifest.json');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not found' });
});

test('security headers and non-authority marker ride on every response', async () => {
  const compute = await fetchWorker('/api/compute');
  assert.equal(compute.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(compute.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(compute.headers.get('x-acx-compute-authority'), 'unavailable');

  const health = await fetchWorker('/api/health');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(health.headers.get('x-acx-compute-authority'), 'unavailable');

  const notFound = await fetchWorker('/api/unknown');
  assert.equal(notFound.headers.get('x-acx-compute-authority'), 'unavailable');

  const preflight = await fetchWorker('/api/compute', { method: 'OPTIONS' });
  assert.equal(preflight.headers.get('cache-control'), 'no-store');
  assert.equal(preflight.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(preflight.headers.get('x-acx-compute-authority'), 'unavailable');
});