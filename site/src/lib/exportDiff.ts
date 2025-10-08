import nacl from 'tweetnacl';

import { hashManifest } from './hash';
import type { ScenarioDiff } from './scenarioCompare';
import type { ComputeResult } from '../state/profile';

export type ScenarioManifest = NonNullable<ComputeResult['manifest']>;

function roundNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const rounded = Math.round(value * 10_000) / 10_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function canonicalise(value: unknown): unknown {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return roundNumber(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalise(entry));
  }
  if (typeof value === 'object') {
    const record = value as { [key: string]: unknown };
    if (typeof (record as { toJSON?: unknown }).toJSON === 'function') {
      return canonicalise((record as { toJSON: () => unknown }).toJSON());
    }
    const next: { [key: string]: unknown } = {};
    Object.keys(record)
      .sort()
      .forEach((key) => {
        next[key] = canonicalise(record[key]);
      });
    return next;
  }
  return value;
}

export function stableStringify(obj: unknown): string {
  const canonical = canonicalise(obj);
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  throw new Error('Base64 encoding is not available in this environment.');
}

export interface SignedDiff {
  spec_version: '1.0';
  created_at: string;
  base_hash: string;
  compare_hash: string;
  scenario_diff: ScenarioDiff;
  sources_union: string[];
  manifest_hashes: { base: string; compare: string };
  signer?: { algo: 'ed25519'; key_id: string };
  signature?: string;
}

interface BuildSignedDiffOptions {
  baseManifest: ScenarioManifest;
  compareManifest: ScenarioManifest;
  key?: Uint8Array;
  keyId?: string;
}

export function buildSignedDiff(diff: ScenarioDiff, opts: BuildSignedDiffOptions): SignedDiff {
  const baseHash = hashManifest(opts.baseManifest);
  const compareHash = hashManifest(opts.compareManifest);
  const sourceSet = new Set<string>();
  const addSources = (manifest: ScenarioManifest) => {
    const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
    sources.forEach((source) => {
      if (typeof source === 'string' && source.trim().length > 0) {
        sourceSet.add(source);
      }
    });
  };
  addSources(opts.baseManifest);
  addSources(opts.compareManifest);
  const payload: SignedDiff = {
    spec_version: '1.0',
    created_at: new Date().toISOString(),
    base_hash: baseHash,
    compare_hash: compareHash,
    scenario_diff: diff,
    sources_union: Array.from(sourceSet).sort(),
    manifest_hashes: {
      base: baseHash,
      compare: compareHash,
    },
  };

  if (opts.key) {
    const unsigned = { ...payload } as SignedDiff;
    delete unsigned.signature;
    delete unsigned.signer;
    const serialised = stableStringify(unsigned);
    const message = Uint8Array.from(new TextEncoder().encode(serialised));
    const secretKey = Uint8Array.from(opts.key);
    const signature = nacl.sign.detached(message, secretKey);
    payload.signer = { algo: 'ed25519', key_id: opts.keyId ?? 'local' };
    payload.signature = encodeBase64(signature);
  }

  return payload;
}

const SAFE_FILENAME = /^[a-z0-9._-]+$/i;

export async function downloadExport(filename: string, data: string): Promise<void> {
  if (!SAFE_FILENAME.test(filename)) {
    throw new Error('Unsafe filename.');
  }
  if (typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
