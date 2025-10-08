import nacl from 'tweetnacl';

import { hashManifest } from './hash';
import type { ScenarioDiff } from './scenarioCompare';

export interface ScenarioManifest {
  profile_id?: string;
  dataset_version?: string;
  scenario_hash?: string;
  manifest_hash?: string;
  overrides?: Record<string, number>;
  sources?: unknown;
  layers?: string[];
  layer_citation_keys?: Record<string, unknown>;
  layer_references?: Record<string, unknown>;
  [key: string]: unknown;
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

type SerializableValue =
  | null
  | boolean
  | number
  | string
  | SerializableValue[]
  | { [key: string]: SerializableValue };

function isSerializableRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'null';
  }
  const rounded = Math.round(value * 10_000) / 10_000;
  if (Object.is(rounded, -0)) {
    return '0';
  }
  let formatted = rounded.toFixed(4);
  formatted = formatted.replace(/(\.\d*?)0+$/, '$1');
  formatted = formatted.replace(/\.$/, '');
  if (formatted === '') {
    return '0';
  }
  return formatted;
}

function ensureSerializable(value: unknown): SerializableValue {
  if (value === null) {
    return null;
  }
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') {
    return value as SerializableValue;
  }
  if (valueType === 'number') {
    const formatted = normaliseNumber(value as number);
    return Number.isFinite(value as number) ? Number(formatted) : null;
  }
  if (valueType === 'bigint') {
    return Number(value as bigint);
  }
  if (valueType === 'object') {
    const maybeJSON = (value as { toJSON?: () => unknown }).toJSON;
    if (typeof maybeJSON === 'function') {
      return ensureSerializable(maybeJSON.call(value));
    }
    if (Array.isArray(value)) {
      return (value as unknown[]).map((item) => {
        if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') {
          return null;
        }
        return ensureSerializable(item);
      }) as SerializableValue;
    }
    if (isSerializableRecord(value)) {
      const next: Record<string, SerializableValue> = {};
      Object.keys(value)
        .sort()
        .forEach((key) => {
          const entry = (value as Record<string, unknown>)[key];
          if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol') {
            return;
          }
          next[key] = ensureSerializable(entry);
        });
      return next as SerializableValue;
    }
  }
  return null;
}

function serialise(value: SerializableValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return normaliseNumber(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => serialise(item as SerializableValue)).join(',')}]`;
  }
  const record = value as Record<string, SerializableValue>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serialise(record[key])}`);
  return `{${entries.join(',')}}`;
}

export function stableStringify(input: unknown): string {
  const serialisable = ensureSerializable(input);
  return `${serialise(serialisable)}\n`;
}

function extractSources(manifest: ScenarioManifest): string[] {
  const raw = manifest.sources;
  if (!Array.isArray(raw)) {
    return [];
  }
  const sources: string[] = [];
  raw.forEach((value) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      sources.push(value);
    }
  });
  return sources;
}

function mergeSources(base: ScenarioManifest, compare: ScenarioManifest): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  [extractSources(base), extractSources(compare)].forEach((list) => {
    list.forEach((entry) => {
      if (seen.has(entry)) {
        return;
      }
      seen.add(entry);
      ordered.push(entry);
    });
  });
  return ordered;
}

function resolveScenarioHash(manifest: ScenarioManifest): string {
  const candidateKeys = ['scenario_hash', 'hash'];
  for (const key of candidateKeys) {
    const value = manifest[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return hashManifest(manifest);
}

function resolveManifestHash(manifest: ScenarioManifest, fallback: string): string {
  const value = manifest.manifest_hash;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function encodeUtf8(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'utf8'));
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

export function buildSignedDiff(
  diff: ScenarioDiff,
  opts: {
    baseManifest: ScenarioManifest;
    compareManifest: ScenarioManifest;
    key?: Uint8Array;
    keyId?: string;
  }
): SignedDiff {
  const baseHash = resolveScenarioHash(opts.baseManifest);
  const compareHash = resolveScenarioHash(opts.compareManifest);
  const payload: SignedDiff = {
    spec_version: '1.0',
    created_at: new Date().toISOString(),
    base_hash: baseHash,
    compare_hash: compareHash,
    scenario_diff: diff,
    sources_union: mergeSources(opts.baseManifest, opts.compareManifest),
    manifest_hashes: {
      base: resolveManifestHash(opts.baseManifest, baseHash),
      compare: resolveManifestHash(opts.compareManifest, compareHash),
    },
  };

  if (opts.key) {
    if (!(opts.key instanceof Uint8Array)) {
      throw new TypeError('Signing key must be a Uint8Array');
    }
    if (opts.key.length !== 64) {
      throw new Error('Ed25519 signing key must be 64 bytes');
    }
    const signerPayload: SignedDiff = { ...payload };
    const signingText = stableStringify(signerPayload);
    const message = encodeUtf8(signingText);
    const keyBytes = Uint8Array.from(opts.key);
    const signatureBytes = nacl.sign.detached(message, keyBytes);
    payload.signer = { algo: 'ed25519', key_id: opts.keyId ?? 'local' };
    payload.signature = toBase64(signatureBytes);
  }

  return payload;
}

export async function safeWriteExport(filename: string, data: string): Promise<void> {
  if (!/^[a-z0-9._-]+$/.test(filename)) {
    throw new Error('Invalid export filename');
  }

  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('safeWriteExport is only available in Node environments');
  }

  const [{ mkdir, writeFile }, path] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ]);

  const baseDir = path.resolve(process.cwd(), 'site', 'public', 'exports');
  const targetPath = path.resolve(baseDir, filename);
  const relative = path.relative(baseDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Export path escapes public/exports directory');
  }

  await mkdir(baseDir, { recursive: true });
  await writeFile(targetPath, data, { encoding: 'utf8' });
}
