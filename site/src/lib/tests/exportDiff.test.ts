import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import nacl from 'tweetnacl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSignedDiff,
  safeWriteExport,
  stableStringify,
  type ScenarioManifest,
  type SignedDiff
} from '../exportDiff';
import type { ScenarioDiff } from '../scenarioCompare';

describe('stableStringify', () => {
  it('produces deterministic output with sorted keys and limited precision', () => {
    const sample = {
      zeta: 1.2,
      alpha: {
        nested: 2.34567,
        array: [
          { label: 'first', value: 3.98765 },
          { label: 'second', value: 3.98761 }
        ]
      },
      beta: [1, null, undefined, 2.30001]
    };

    const reordered = {
      beta: [1, undefined, null, 2.30001],
      alpha: {
        array: [
          { label: 'first', value: 3.98765 },
          { label: 'second', value: 3.98761 }
        ],
        nested: 2.34567
      },
      zeta: 1.2
    };

    const first = stableStringify(sample);
    const second = stableStringify(reordered);

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(first).toContain('3.9876');
    expect(first).not.toContain('3.98765');
    expect(first).not.toContain('2.3000');
  });
});

describe('buildSignedDiff', () => {
  const diff: ScenarioDiff = {
    changed: [
      {
        activity_id: 'ACT.ONE',
        delta: 2.123456,
        total_base: 10.789,
        total_compare: 12.91234
      }
    ]
  };

  const baseManifest: ScenarioManifest = {
    scenario_hash: 'baselinehash',
    manifest_hash: 'manifest-base',
    sources: ['SRC.ONE', 'SRC.TWO']
  };

  const compareManifest: ScenarioManifest = {
    scenario_hash: 'comparehash',
    manifest_hash: 'manifest-compare',
    sources: ['SRC.TWO', 'SRC.THREE']
  };

  it('includes required fields and deterministic numeric precision', () => {
    const payload = buildSignedDiff(diff, { baseManifest, compareManifest });

    expect(payload.spec_version).toBe('1.0');
    expect(payload.created_at).toMatch(/Z$/);
    expect(payload.base_hash).toBe('baselinehash');
    expect(payload.compare_hash).toBe('comparehash');
    expect(payload.manifest_hashes).toEqual({ base: 'manifest-base', compare: 'manifest-compare' });
    expect(payload.sources_union).toEqual(['SRC.ONE', 'SRC.TWO', 'SRC.THREE']);

    const json = stableStringify(payload);
    expect(json).toContain('2.1235');
    expect(json).toContain('12.9123');
  });

  it('signs payloads with ed25519 keys', () => {
    const keyPair = nacl.sign.keyPair();
    const secretKey = Uint8Array.from(keyPair.secretKey);
    const baseline = buildSignedDiff(diff, { baseManifest, compareManifest });
    const { signer: _unsignedSigner, signature: _unsignedSignature, ...payloadToSign } = baseline;
    const preflightMessage = Uint8Array.from(Buffer.from(stableStringify(payloadToSign), 'utf8'));
    expect(() => nacl.sign.detached(preflightMessage, secretKey)).not.toThrow();
    const signed = buildSignedDiff(diff, {
      baseManifest,
      compareManifest,
      key: secretKey,
      keyId: 'test-key'
    });

    expect(signed.signer).toEqual({ algo: 'ed25519', key_id: 'test-key' });
    expect(typeof signed.signature).toBe('string');

    const { signature, signer: _signer, ...unsigned } = signed as SignedDiff & { signature: string };
    const message = Uint8Array.from(Buffer.from(stableStringify(unsigned), 'utf8'));
    const signatureBytes = Uint8Array.from(Buffer.from(signature, 'base64'));
    const publicKey = Uint8Array.from(keyPair.publicKey);

    expect(nacl.sign.detached.verify(message, signatureBytes, publicKey)).toBe(true);
  });
});

describe('safeWriteExport', () => {
  let tempDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'export-diff-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes data within the exports directory', async () => {
    await safeWriteExport('diff.json', '{"ok":1}');
    const outputPath = path.join(tempDir, 'site', 'public', 'exports', 'diff.json');
    const written = await readFile(outputPath, 'utf8');
    expect(written).toBe('{"ok":1}');
  });

  it('rejects invalid filenames and traversal attempts', async () => {
    await expect(safeWriteExport('../diff.json', '{}')).rejects.toThrow();
    await expect(safeWriteExport('diff/evil.json', '{}')).rejects.toThrow();
  });
});
