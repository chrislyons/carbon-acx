# Reference Retrieval Runbook

This directory contains metadata and configuration for the Carbon ACX reference
retrieval pipeline. The actual binary assets (PDF, HTML, etc.) are **never**
committed to the repository. They are downloaded only within the GitHub Actions
workflow and uploaded as artifacts.

## Files

- `sources_manifest.csv` – ledger describing every discovered source. The
  `stored_as` column always points to the expected location in `refs/raw/`, but
  the referenced file is ephemeral and ignored by Git.
- `ALLOW_MISSING.txt` – newline-delimited `source_id` values that are temporarily
  exempt from manifest coverage checks.
- `source_id_overrides.json` – optional mapping for assigning canonical
  `source_id` values to tricky URLs or documents.

## Workflows

1. Run `poetry run python -m calc.refs_fetch --mode check` locally to verify
   discovery coverage.
2. Trigger `Fetch References (manual)` workflow when new sources are added or
   stale. The workflow downloads binaries, updates the manifest, and uploads the
   binaries as artifacts.
3. (Optional) Run `poetry run python -m calc.refs_normalize` locally to generate
   Markdown extracts for offline previewing.
4. Run `poetry run python -m calc.refs_audit` before committing to ensure all
   references are recorded and hashes match.

> **Remember:** Only CSV/JSON/Markdown metadata are checked in. The `refs/raw/`
> and `refs/normalized/` directories are ignored to enforce an artifact-only
> workflow.
