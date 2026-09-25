# Reference Retrieval Runbook

This directory contains metadata and configuration for the Carbon ACX reference
retrieval pipeline. The actual binary assets (PDF, HTML, etc.) are **never**
committed to the repository. They are downloaded only within the GitHub Actions
workflow and uploaded as artifacts.

## Files

- `sources_manifest.csv` – the sole retrieval ledger. Every active source must
  have a 2xx response, byte metadata, `verification_run_url`, and
  `raw_artifact_name`; raw and normalized files remain artifact-only.

## Evidence retention and verification policy

Raw evidence stays external to Git. The repository commits only metadata:

- `data/sources.csv` – the canonical registry (IDs, URLs, licences, review dates).
- `refs/sources_manifest.csv` – the retrieval ledger binding each source to the
  immutable bytes that were fetched.

The binding is content-addressed. Each ledger row records the raw `sha256`, its
`filesize_bytes`, the `stored_as` path the bytes occupied when fetched
(`refs/raw/<source_id><ext>`), the `final_url`, an immutable
`verification_run_url` (the Actions run), and the `raw_artifact_name` that holds
the bytes. Verification recomputes the digest over whatever bytes are present:
matching bytes pass, tampered or missing bytes fail. No binary is ever trusted
without its digest, and none is committed.

The ordinary release gate is **metadata-only and offline**:

```bash
poetry run python -m calc.refs_audit --metadata-only --as-of YYYY-MM-DD
```

It validates ledger structure, URLs, statuses, review dates, and attestation
fields, and deliberately does not touch the network or claim to hash bytes that
are not present.

### Scheduled full verification (obtaining the bytes)

A full audit materialises the artifacts named by `raw_artifact_name` into an
evidence root whose layout mirrors `stored_as`, then passes that root explicitly:

```bash
# 1. Download the immutable artifact for the ledger's run.
mkdir -p evidence/refs/raw
gh run download <run-id> --name refs-raw-<run-id> --dir evidence/refs/raw
# 2. Hash and size every recorded raw (and normalized) byte.
poetry run python -m calc.refs_audit --as-of YYYY-MM-DD --evidence-root evidence
```

Relative `stored_as` paths resolve against `--evidence-root`; absolute paths are
used as-is. Without `--evidence-root`, a full audit keeps the historical
fail-closed behaviour and resolves `stored_as` against the repository root,
reporting every missing raw file as an error. Artifacts are retained for 30 days
by the retrieval workflow, so a scheduled audit must run inside that window (or
re-fetch) rather than assume the bytes are permanent.

## Source review freshness

`calc.refs_audit` also renders an offline overdue/upcoming review report from the
canonical registry. It performs no I/O beyond reading `data/sources.csv`, so it
never makes the metadata-only gate depend on network access:

```bash
poetry run python -m calc.refs_audit --as-of YYYY-MM-DD --freshness --horizon-days 90
```

The report is informational (exit 0). Add `--gate` to make overdue reviews fail
the command explicitly; the default release gate remains metadata-only.

## Workflows

1. Run `poetry run python -m calc.refs_fetch --mode check` locally to verify
   active-source coverage.
2. Trigger `Fetch References (manual)` when new sources are added or stale. The
   workflow downloads binaries, records its immutable run URL and raw artifact
   name, updates the ledger, and uploads the binaries as artifacts.
3. (Optional) Run `poetry run python -m calc.refs_normalize` locally to generate
   Markdown extracts for offline previewing.
4. Run `poetry run python -m calc.refs_audit --as-of YYYY-MM-DD` before
   committing to validate metadata and, where artifacts are present, hashes.

> **Remember:** Only CSV/JSON/Markdown metadata are checked in. The `refs/raw/`
> and `refs/normalized/` directories are ignored to enforce an artifact-only
> workflow.
