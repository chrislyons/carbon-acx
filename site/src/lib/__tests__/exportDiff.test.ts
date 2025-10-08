import { describe, expect, it, vi } from 'vitest';
import nacl from 'tweetnacl';

import {
  buildSignedDiff,
  downloadExport,
  stableStringify,
  type ScenarioManifest,
} from '../exportDiff';

const baseManifest: ScenarioManifest = {
  profile_id: 'baseline-profile',
  dataset_version: '2024.01',
  sources: ['SRC.ALPHA', 'SRC.BETA'],
  overrides: { 'ACT.ONE': 1 },
};

const compareManifest: ScenarioManifest = {
  profile_id: 'compare-profile',
  dataset_version: '2024.01',
  sources: ['SRC.BETA', 'SRC.GAMMA'],
  overrides: { 'ACT.TWO': 2 },
};

describe('stableStringify', () => {
  it('produces deterministic JSON regardless of object key order', () => {
    const variantA = {
      zeta: 1,
      alpha: {
        beta: 1.234567,
        gamma: [
          { delta: 3.33333, epsilon: 2 },
          { kappa: Number.POSITIVE_INFINITY },
        ],
        eta: null,
      },
      theta: 'value',
    };
    const variantB = {
      theta: 'value',
      alpha: {
        eta: null,
        gamma: [
          { epsilon: 2, delta: 3.33333 },
          { kappa: Number.POSITIVE_INFINITY },
        ],
        beta: 1.234567,
      },
      zeta: 1,
    };

    const outputA = stableStringify(variantA);
    const outputB = stableStringify(variantB);

    expect(outputA).toBe(outputB);
    expect(outputA.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(outputA) as { alpha: { beta: number } };
    expect(parsed.alpha.beta).toBeCloseTo(1.2346, 4);
  });
});

describe('buildSignedDiff', () => {
  const diff = { changed: null, added: null, removed: null };

  it('returns unsigned payload when no key provided', () => {
    const payload = buildSignedDiff(diff, { baseManifest, compareManifest });

    expect(payload.signature).toBeUndefined();
    expect(payload.signer).toBeUndefined();
    expect(payload.sources_union).toEqual(['SRC.ALPHA', 'SRC.BETA', 'SRC.GAMMA']);
  });

  it('adds signature information when key provided', () => {
    const keyPair = nacl.sign.keyPair();
    const payload = buildSignedDiff(diff, {
      baseManifest,
      compareManifest,
      key: keyPair.secretKey,
      keyId: 'test-key',
    });

    expect(payload.signer).toEqual({ algo: 'ed25519', key_id: 'test-key' });
    expect(typeof payload.signature).toBe('string');
    expect(payload.signature?.length).toBeGreaterThan(0);

    const unsignedPayload = { ...payload };
    delete unsignedPayload.signature;
    delete unsignedPayload.signer;
    const canonical = stableStringify(unsignedPayload);
    const message = Uint8Array.from(new TextEncoder().encode(canonical));
    const signatureBytes = Uint8Array.from(Buffer.from(payload.signature ?? '', 'base64'));
    const publicKey = Uint8Array.from(keyPair.publicKey);
    expect(
      nacl.sign.detached.verify(message, signatureBytes, publicKey),
    ).toBe(true);
  });
});

describe('downloadExport', () => {
  it('rejects unsafe filenames', async () => {
    await expect(downloadExport('../diff.json', '{}')).rejects.toThrow('Unsafe filename');
  });

  it('triggers a download for safe filenames', async () => {
    const urlMock = URL as unknown as { [key: string]: any };
    const originalCreate = urlMock.createObjectURL;
    const originalRevoke = urlMock.revokeObjectURL;
    urlMock.createObjectURL = vi.fn(() => 'blob:example');
    urlMock.revokeObjectURL = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click');
    clickSpy.mockImplementation(() => undefined);
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement');
    createSpy.mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    await downloadExport('valid.json', '{}');

    expect(urlMock.createObjectURL).toHaveBeenCalled();
    expect(urlMock.revokeObjectURL).toHaveBeenCalledWith('blob:example');
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    createSpy.mockRestore();
    urlMock.createObjectURL = originalCreate;
    urlMock.revokeObjectURL = originalRevoke;
  });
});
