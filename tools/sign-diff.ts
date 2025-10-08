import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import nacl from 'tweetnacl';

import { stableStringify, type SignedDiff } from '../site/src/lib/exportDiff';

function exitWithMessage(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveSecretKey(): Uint8Array {
  const keyBase64 = process.env.DIFF_SIGN_KEY_BASE64;
  if (!keyBase64) {
    return exitWithMessage('DIFF_SIGN_KEY_BASE64 environment variable is required.');
  }
  const buffer = Buffer.from(keyBase64, 'base64');
  if (buffer.length !== nacl.sign.secretKeyLength) {
    return exitWithMessage(
      `DIFF_SIGN_KEY_BASE64 must decode to ${nacl.sign.secretKeyLength} bytes, received ${buffer.length}.`
    );
  }
  return new Uint8Array(buffer);
}

function loadDiff(path: string): SignedDiff {
  const contents = readFileSync(path, 'utf8');
  return JSON.parse(contents) as SignedDiff;
}

function stripSignature(diff: SignedDiff): SignedDiff {
  const copy: SignedDiff = { ...diff };
  delete copy.signature;
  delete copy.signer;
  return copy;
}

function writeSignedDiff(path: string, diff: SignedDiff): void {
  writeFileSync(path, stableStringify(diff), 'utf8');
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    exitWithMessage('Usage: tsx tools/sign-diff.ts <diff.json>');
  }
  const secretKey = resolveSecretKey();
  const keyId = process.env.DIFF_SIGN_KEY_ID ?? 'local';
  const diff = loadDiff(inputPath);
  const unsigned = stripSignature(diff);
  const canonical = stableStringify(unsigned);
  const message = new TextEncoder().encode(canonical);
  const signature = nacl.sign.detached(message, secretKey);
  const signed: SignedDiff = {
    ...unsigned,
    signer: { algo: 'ed25519', key_id: keyId },
    signature: Buffer.from(signature).toString('base64')
  };
  const directory = dirname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  const outputPath = join(directory, `${base}.signed.json`);
  writeSignedDiff(outputPath, signed);
  console.log(`Signed diff written to ${outputPath}`);
}

void main();
