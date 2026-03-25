# Offline validation tools

The `tools/validator` module provides an offline CLI for checking ACX figure manifests and
scenario diff payloads. The validator intentionally avoids any network access so it can run in
restricted build environments.

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r tools/validator/requirements.txt
```

## Usage

```bash
python -m tools.validator.validate validate-manifest dist/artifacts/manifests/figures
python -m tools.validator.validate validate-diff tools/validator/fixtures/sample_diff.json --manifests dist/artifacts/manifests
python -m tools.validator.validate validate-diff payload.json --manifests dist/artifacts/manifests --pubkey BASE64_ENCODED_KEY
```

### Manifest validation

* Validates manifests against `schemas/figure-manifest.schema.json`.
* Verifies that `figure_sha256` (and the reference document hash) matches the on-disk files when
  present.
* Ensures `references.order` is a contiguous sequence starting at 1.
* Accepts a single file or recursively validates every `*.json` file in a directory.

### Diff validation

* Validates signed diff payloads using `schemas/signed-diff.schema.json`.
* Re-computes the union of `source_id` values from the referenced manifests and compares it with the
  `sources_union` array in the diff.
* Requires every numeric field in `scenario_diff` to be rounded to four decimal places.
* Verifies Ed25519 signatures when `--pubkey` is supplied alongside a payload that includes a
  `signer`/`signature` pair.
* Guards against directory traversal by refusing manifest directories outside the current working
  directory.

### Exit codes

| Code | Meaning |
| ---- | ------- |
| 0    | Validation succeeded |
| 2    | Schema validation failed |
| 3    | Integrity checks failed (hash mismatch, sources union mismatch, etc.) |
| 4    | Signature verification failed |
| 5    | IO or path resolution error |

## Continuous integration

To run the validators as part of the CI build, ensure Python dependencies are installed and invoke
the relevant `make` targets:

```bash
pip install -r tools/validator/requirements.txt
make validate-manifests
make validate-diff-fixtures
```

These commands can also be executed locally to validate build artifacts prior to publishing.
