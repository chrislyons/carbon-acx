# Sharing scenario diffs

The scenario comparison view can export the current diff as a deterministic JSON payload. The export happens entirely in the browser:

- The payload is constructed with sorted keys and numbers rounded to four decimal places, then serialised with a trailing newline.
- Downloads use a `Blob` and a temporary anchor element—no filesystem access and no Node.js APIs are required on the client.

By default exports are unsigned. To add a signature locally, use the optional helper:

1. Set `DIFF_SIGN_KEY_BASE64` (and optionally `DIFF_SIGN_KEY_ID`) in your shell to an Ed25519 secret key encoded in base64.
2. Run `tsx tools/sign-diff.ts <path-to-diff.json>` to produce a `*.signed.json` alongside the source file.

Keep signing keys out of the repository. CI remains unsigned and does not require any secrets to build or test.
