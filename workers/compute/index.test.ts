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
