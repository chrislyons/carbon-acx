# Reference acquisition runbook

This directory contains all of the artifacts that back the reference library.  The
workflow is split into discovery, fetching, normalization, and auditing.

## Directory layout

- `raw/` – Git LFS-backed binaries downloaded from the canonical source URLs.
- `normalized/` – Markdown bodies extracted from the raw binaries when the licence
  allows redistribution.
- `sources_manifest.csv` – Append-only ledger. Each row represents one
  `source_id` and records where the file came from, how it was fetched, what was
  stored, and the hashes that allow verification.
- `ALLOW_MISSING.txt` – Temporary skip list for sources that are known but not
  yet captured in the manifest.
- `source_id_overrides.json` – Mapping that pins or renames discovered IDs when
  the automatic heuristics are not sufficient.

## How to fetch references

Run the manual GitHub workflow **Fetch references** (`.github/workflows/fetch_references.yml`).
Provide optional filters such as `only_ids` or a domain allow list if you are
collecting a subset of references. The workflow will run the following steps:

1. `make refs-check`
2. `make refs-fetch`
3. `make refs-normalize` (unless disabled)
4. `make refs-audit`

Alternatively, the same commands can be run locally:

```bash
make refs-check
make refs-fetch
make refs-normalize
make refs-audit
```

All network access is restricted to the manual workflow or local executions.
CI jobs **must not** fetch remote content.

## Licence policy

When the licence is clearly permissive (for example CC-BY, government open data,
or other public domain releases), the full content may be stored and normalized
into Markdown. When the licence is unknown, paywalled, or explicitly
restrictive, keep the raw file for provenance but normalize to a short stub that
contains a summary and a link back to the canonical source.

The `license_note` column in `sources_manifest.csv` should use one of the
controlled values documented in `calc/refs_fetch.py`. Update the manifest entry
manually if the automated heuristics do not capture the correct licence.

## Overrides

If the automatically generated `source_id` is not appropriate, or if multiple
files need to be merged under one ID, add an entry to
`source_id_overrides.json`. The file supports two maps:

- `ids` – remap discovered IDs (such as legacy names) to new IDs.
- `urls` – pin a particular URL or DOI to a specific `source_id`.

## Skipping difficult sources

If a citation cannot be fetched yet (for example, a private dataset or a broken
link), list the `source_id` in `ALLOW_MISSING.txt`. The audit step will treat
these IDs as temporarily satisfied. Remove the entry once the manifest has a
corresponding row.
