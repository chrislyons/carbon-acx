# Reference Retrieval Runbook

This directory contains tooling and data that support the Carbon ACX reference
library. The workflow is intentionally split across three entry points so that
network access is only required when a maintainer explicitly opts in to fetch or
normalize new material.

## Directory layout

- `raw/` – Git LFS pointers to source binaries (PDF, HTML, spreadsheets, etc.).
- `normalized/` – Markdown extractions suitable for display when licensing
  permits redistribution of the full text.
- `sources_manifest.csv` – Append-only ledger that tracks provenance and
  processing status for each `source_id` discovered in `calc/references/`.
- `ALLOW_MISSING.txt` – Temporary skip list for citations that cannot yet be
  retrieved or audited.
- `source_id_overrides.json` – Manual overrides for source identifiers when the
  automatic heuristics need help.

## Typical workflow

1. Review and, if necessary, update `source_id_overrides.json` with any manual
   mappings.
2. Run `make refs-check` locally to confirm discovery and manifest coverage.
3. Execute the "Fetch References (manual)" GitHub workflow, or run
   `make refs-fetch` locally. Both options will download allowed sources into
   `refs/raw/` and update the manifest.
4. When licensing permits redistribution, run `make refs-normalize` to extract
   Markdown into `refs/normalized/` and update manifest metadata.
5. Finish with `make refs-audit` to validate checksums, file sizes, and coverage.

## License policy

The fetcher assigns a coarse `license_note` for each entry. When the license is
unknown or restrictive, the normalizer will only create a short Markdown stub
that points readers back to the canonical source. Public-domain and
open-government documents may have their full text extracted.

## Source ID overrides

Automatic discovery attempts to derive stable `source_id` values from the files
in `calc/references/`. When that fails or when a merge/rename is required,
record the desired mapping in `source_id_overrides.json`.

Example structure:

```json
{
  "by_url": {
    "https://example.org/reference": "SRC.EXAMPLE.2024"
  },
  "rename": {
    "SRC.OLD.ID": "SRC.NEW.ID"
  }
}
```

## Temporary skips

If a citation cannot yet be retrieved, add its `source_id` to
`ALLOW_MISSING.txt`. This file is treated as a stop-gap; entries should be
removed as soon as the source becomes available.
