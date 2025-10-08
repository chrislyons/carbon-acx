# Scenario diff exports

Scenario comparisons can be shared as deterministic JSON documents that capture
all of the information required to reproduce a diff offline. Each export follows
the `SignedDiff` schema:

```ts
interface SignedDiff {
  spec_version: '1.0';
  created_at: string;            // ISO 8601 timestamp ending in Z
  base_hash: string;             // hashed baseline scenario manifest
  compare_hash: string;          // hashed comparison scenario manifest
  scenario_diff: ScenarioDiff;   // output from scenarioCompare.ts
  sources_union: string[];       // ordered union of source identifiers
  manifest_hashes: {
    base: string;
    compare: string;
  };
  signer?: {
    algo: 'ed25519';
    key_id: string;
  };
  signature?: string;            // Base64 detached signature
}
```

The payload is serialised with `stableStringify` which guarantees:

- UTF-8 encoded output with a trailing `\n` newline.
- Canonically sorted object keys at every depth.
- Numeric values rounded to four decimal places with no unnecessary trailing
  zeros.
- `null` values for unsupported numbers (for example `Infinity` or `NaN`).

## Exporting from the UI

The Scenario Compare panel now includes an **Export diff JSON** button. Clicking
it will:

1. Assemble the payload via `buildSignedDiff`, combining the current diff and
   both scenario manifests.
2. Attempt to write the JSON to `site/public/exports/` when running the Vite
   development server. The file name is
   `scenario_diff_<base>_vs_<compare>.json`.
3. Fall back to generating a browser download (Blob) when the filesystem is not
   accessible, such as in production builds or previews.

`safeWriteExport` enforces safe filenames (`[a-z0-9._-]+`) and guards against
path traversal so that exports always live inside `site/public/exports/`.

## Optional signing

Offline verification is supported with optional Ed25519 signatures. When a
64-byte secret key is provided, `buildSignedDiff` signs the canonical
stringification of the payload (without the signature fields) and records both
the signer metadata and the Base64 detached signature.

A helper CLI is available for local use:

```bash
# Never run in CI — this expects a local secret key.
DIFF_SIGN_KEY_BASE64=... ts-node tools/sign-diff.ts path/to/diff.json KEY_ID
```

The script rewrites the JSON in place, adding the signer and signature fields.
It expects the unsigned JSON to already follow the deterministic format.

## Security notes

- Do not commit private keys to the repository.
- CI runs should export unsigned payloads; signing must happen only in trusted
  local environments.
- Because the output is deterministic, recipients can hash or verify diffs
  offline by re-running `stableStringify` on the parsed JSON.
