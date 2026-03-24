# `workers/compute` Status

This Worker is an experimental compute surface.

It remains in the repository for parity work and Cloudflare runtime exploration, but it is not the canonical Carbon ACX machine-facing contract for the current recovery milestone.

## Current policy

- Source-of-truth compute lives in `calc/service.py` via `compute_profile`.
- The canonical programmatic interface is the Python CLI in `calc/compute_cli.py`.
- The public web product should rely on packaged artifacts and the stable read-only Next.js routes.
- Any expansion of this Worker should wait until its responses are parity-tested against the Python contract.

## Practical guidance

- Use this Worker only for local experiments and parity checks.
- Do not treat `/api/compute` as authoritative in docs or release notes.
- Prefer improving the Python contract and artifact pipeline before adding Worker features.
