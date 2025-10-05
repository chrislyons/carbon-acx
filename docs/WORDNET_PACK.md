# English WordNet pack seeding

The `scripts.build_en` CLI packages Princeton WordNet 3.1 and the Open Multilingual WordNet
English lexicons into a distributable SQLite pack. The builder keeps the upstream downloads
in a cache directory (`dist/wordnet-cache/` by default), assembles the synsets and lemmas into
`dist/packs/english-wordnet.sqlite`, and records provenance in an adjacent JSON manifest.

```bash
PYTHONPATH=. poetry run python -m scripts.build_en \
  --data-dir dist/wordnet-cache \
  --output dist/packs/english-wordnet.sqlite \
  --signing-key path/to/ed25519.hex
```

Running the CLI performs the following steps:

1. Downloads the `omw-en31:1.4` and `omw-en:1.4` projects via the `wn` library, ensuring the
   cache also contains the compressed OMW lexicon payloads.
2. Verifies that every synset in the English 3.1 lexicon carries an Interlingual Index (ILI)
   reference before exporting.
3. Materialises a slim SQLite pack with `synsets`, `lemmas`, and `metadata` tables tailored
   for downstream lookups.
4. Generates a manifest containing dataset counts, source hashes (the compressed lexicon
   payloads are decompressed transparently when hashing), and an optional Ed25519 signature
   for the pack binary.

To refresh the embedded metadata used by the static site, copy the generated manifest into
`site/public/artifacts/english-pack.json` (or update its `hash_sha256` and `signature` fields)
after each seeding run. The development snapshot in this repository uses a deterministic
Ed25519 key purely for fixture purposes—replace it with production signing material when
publishing real datasets.

See `calc/pack/english.py` for the end-to-end build pipeline and `calc/pack/signing.py` for
helpers that load Ed25519 keys from hex/base64 files.
