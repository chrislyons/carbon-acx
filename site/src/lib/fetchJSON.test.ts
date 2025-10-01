import { describe, expect, it, vi, afterEach } from 'vitest';

import { fetchJSON, FetchJSONError } from './fetchJSON';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchJSON', () => {
  it('parses valid JSON payloads', async () => {
    const payload = { hello: 'world' };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const result = await fetchJSON<typeof payload>('https://example.test/data.json');
    expect(result).toEqual(payload);
  });

  it('throws when the response is HTML masquerading as JSON', async () => {
    const htmlBody = '<!doctype html><html><body>Not Found</body></html>';
    const response = new Response(htmlBody, {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(
      fetchJSON('https://example.test/layers.json').catch((error) => {
        expect(error).toBeInstanceOf(FetchJSONError);
        const diag = (error as FetchJSONError).diag;
        expect(diag.status).toBe(200);
        expect(diag.bodySnippet).toContain('<!doctype html>');
        throw error;
      })
    ).rejects.toBeInstanceOf(FetchJSONError);
  });

  it('captures JSON error bodies on non-OK responses', async () => {
    const body = JSON.stringify({ error: 'not_found' });
    const response = new Response(body, {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(
      fetchJSON('https://example.test/missing.json').catch((error) => {
        expect(error).toBeInstanceOf(FetchJSONError);
        const diag = (error as FetchJSONError).diag;
        expect(diag.status).toBe(404);
        expect(diag.bodySnippet).toContain('"error"');
        expect(diag.bodySnippet).toContain('not_found');
        throw error;
      })
    ).rejects.toBeInstanceOf(FetchJSONError);
  });
});
