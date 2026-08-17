# Reference Retrieval Runbook

This directory contains metadata and configuration for the Carbon ACX reference
retrieval pipeline. The actual binary assets (PDF, HTML, etc.) are **never**
committed to the repository. They are downloaded only within the GitHub Actions
workflow and uploaded as artifacts.

## Files

- `sources_manifest.csv` – the sole retrieval ledger. Every active source must
  have a 2xx response, byte metadata, `verification_run_url`, and
  `raw_artifact_name`; raw and normalized files remain artifact-only.

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
