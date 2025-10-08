#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import nacl from 'tweetnacl';

import { stableStringify, type SignedDiff } from '../site/src/lib/exportDiff';

function decodeKeyBase64(value: string): Uint8Array {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('DIFF_SIGN_KEY_BASE64 is empty');
  }
  const bytes = Buffer.from(trimmed, 'base64');
  if (bytes.length !== nacl.sign.secretKeyLength) {
    throw new Error(`Ed25519 signing key must be ${nacl.sign.secretKeyLength} bytes`);
  }
  return new Uint8Array(bytes);
}

async function main(): Promise<void> {
  const [inputPath, keyIdArg] = process.argv.slice(2);
  if (!inputPath) {
    console.error('Usage: sign-diff <diff.json> [key-id]');
    process.exit(1);
  }

  const keyBase64 = process.env.DIFF_SIGN_KEY_BASE64;
  if (typeof keyBase64 !== 'string') {
    throw new Error('Set DIFF_SIGN_KEY_BASE64 with an Ed25519 secret key (base64)');
  }

  const signingKey = decodeKeyBase64(keyBase64);
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const raw = await readFile(resolvedPath, 'utf8');

  const payload = JSON.parse(raw) as SignedDiff;
  const { signature: _existingSignature, signer: existingSigner, ...unsigned } = payload;

  const message = Uint8Array.from(Buffer.from(stableStringify(unsigned), 'utf8'));
  const signatureBytes = nacl.sign.detached(message, signingKey);
  const keyId = keyIdArg ?? existingSigner?.key_id ?? 'local';

  const signed: SignedDiff = {
    ...unsigned,
    signer: { algo: 'ed25519', key_id: keyId },
    signature: Buffer.from(signatureBytes).toString('base64')
  };

  await writeFile(resolvedPath, stableStringify(signed), 'utf8');
  console.log(`Signed diff written to ${resolvedPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
