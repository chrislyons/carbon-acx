# ACX041 View Provenance Module v1.2

The ACX041 module introduces a manifest-driven verification workflow for every figure published by Carbon ACX. Each manifest records the dataset inputs, figure payload hash, reference hash, and promptware lineage so downstream clients can detect tampering or unexpected mutations before displaying the chart.

## Manifest structure

* `schema_version` – currently `1.2.0` to reflect the ACX041 contract.
* `figure_id` and `figure_type` – derived from the output JSON stem and figure metadata.
* `created_at` – the same timestamp injected into figure metadata via `ACX_GENERATED_AT`.
* `generator` – identifies the manifest emitter (`carbon-acx.calc.manifest v1.2.0`).
* `inputs` – includes the dataset hash, figure payload hash, reference hash, and the source CSV list hashed for the dataset digest.
* `render` – captures lightweight UI context such as layer, region, and viewport hints. Unknown fields remain `null` for explicitness.
* `citations` – aligns reference keys with their IEEE-formatted strings and individual digests.
* `provenance` – covers git commit, build environment, and optional Promptware/agent identifiers provided via environment variables (`ACX_PROMPT_JOB_ID`, `ACX_AGENT_MODEL`, `ACX_PROMPT_HASH`, `ACX_EXECUTOR`).
* `hash` – SHA-256 digest of the concatenated dataset, figure, and reference hashes.

See `calc/manifest.py` for the reference implementation.

## Generation flow

1. `python -m calc.derive` writes figure JSON and `*_refs.txt` files under `calc/outputs/`.
2. The derivation pipeline calls `calc.manifest.generate_all(out_dir)` which:
   * hashes the authoritative CSV inputs in a deterministic order,
   * computes figure and reference digests,
   * assembles the manifest payload, and
   * saves `calc/outputs/manifests/<figure>.json`.
3. Packaged builds and the Cloudflare Pages bundle include the manifests automatically via existing packaging scripts.

## Verification guidelines

* Clients should fetch `artifacts/manifests/<figure>.json` adjacent to the figure payload before rendering downloads or export controls.
* Re-compute `sha256(figure_data_hash + references_hash)` locally and compare with the manifest `hash` to confirm integrity.
* If verification fails, present a watermark, disable CSV/reference downloads, and surface a warning pill.
* Provide a subtle “Verified” indicator when checks succeed to reinforce provenance.

## Promptware lineage

To keep human/agent collaboration auditable, embed the following environment variables in CI or scripted runs:

| Variable | Purpose |
| --- | --- |
| `ACX_PROMPT_JOB_ID` | Identifier for the Promptware orchestration job (if applicable). |
| `ACX_AGENT_MODEL` | Name of the model or agent executing the run. |
| `ACX_PROMPT_HASH` | Content hash of the governing prompt or instruction set. |
| `ACX_EXECUTOR` | Free-form executor identifier (e.g. engineer initials or automation label). |

Unset variables are recorded as empty strings, keeping the manifest schema stable for manual and automated builds.

## Testing expectations

* `tests/test_manifest_integrity.py` exercises the manifest generator end-to-end and recomputes the hash chain.
* `tests/test_legacy_backcompat.py` documents the intentional skip for legacy fixtures that predate ACX041 manifests.

## Future work

1. Sign manifests with a repository-trusted GPG key and publish a `/verify/<hash>` endpoint.
2. Extend the static client with offline manifest caches for deterministic demos.
3. Provide a governance dashboard summarising promptware lineage (commit, prompt hash, agent model).
