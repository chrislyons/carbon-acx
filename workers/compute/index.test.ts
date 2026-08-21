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

test('carbon-acx prefix is normalised', async () => {
  const response = await fetchWorker('/carbon-acx/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, compute: 'unavailable' });
});

test('security headers ride on every response', async () => {
  const unavailableResponse = await fetchWorker('/api/compute');
  assert.equal(unavailableResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(unavailableResponse.headers.get('referrer-policy'), 'no-referrer');

  const health = await fetchWorker('/api/health');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('referrer-policy'), 'no-referrer');

  const preflight = await fetchWorker('/api/compute', { method: 'OPTIONS' });
  assert.equal(preflight.headers.get('cache-control'), 'no-store');
  assert.equal(preflight.headers.get('x-content-type-options'), 'nosniff');
});
