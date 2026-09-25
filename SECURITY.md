# Security Policy

Carbon ACX is an offline-first, build-time data product: the deployable output is a static
Pages bundle produced by `make package`, with no live database or product-authority runtime.
The legacy `/carbon-acx/*` Function is the sole exception: when
`CARBON_ACX_ORIGIN` is explicitly configured to an HTTPS origin, it acts as a
compatibility reverse proxy and must be reviewed as a runtime egress boundary.
This policy covers the repository, its build/derivation pipeline, and the generated bundle.

## Supported versions

The project is pre-1.0. Only the most recent release line is supported:

| Version | Supported |
| --- | --- |
| Latest tagged release on the `v0.1.x` line | Yes |
| `main` branch tip | Yes (fixes land here first) |
| Any earlier tag, snapshot, or fork | No |

Security fixes ship as a new patch release on the supported line; older tags are not patched.
Because the product is build-time only, remediation is to upgrade to the fixed release and
re-run `make package` rather than to patch a deployed instance in place.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository:

- <https://github.com/chrislyons/carbon-acx/security/advisories/new>


A useful report includes:

- Affected component and version/commit (for example `calc/derive`, `tools/validator`,
  `scripts/package_artifacts.py`, a workflow, or a released bundle tag).
- Reproduction steps that work offline from a clean checkout: the exact command
  (`make ...`) or input file, and the observed versus expected result.
- Impact assessment: what an attacker gains, and which invariant is broken (for example an
  immutable manifest being rewritten, a fail-closed "unavailable" path becoming fail-open,
  or source-attribution being dropped).
- Whether the issue is already public or known upstream.

## Response expectations

| Stage | Target |
| --- | --- |
| Acknowledgement of the report | 3 business days |
| Initial triage, severity, and scope decision | 7 business days |
| Critical / high severity fix released | 30 days from triage |
| Moderate severity fix released | 90 days from triage |
| Low severity | Next scheduled release |
| Status updates while a report is open | At least every 14 days |

We follow coordinated disclosure and will credit reporters in the release notes unless
anonymity is requested. We aim to publish a fix (and, where relevant, a GitHub Security
Advisory) within the timelines above; if a fix will take longer, we will tell you before
the deadline rather than let it lapse silently.

## In scope

- Derivation, DAL, and validation code (`calc/`, `tools/`, `scripts/`) and the data
  import/export paths, including typed error handling and fail-closed unavailable semantics.
- Artifact and manifest integrity: hashing, packaging (`scripts/package_artifacts.py`,
  `scripts/prepare_pages_bundle.py`), and the `dist/site` Pages bundle contract.
- Build, release, and audit automation under `.github/workflows/` and `scripts/` CI helpers,
  including dependency scanning and release asset publication.
- Supply-chain issues in this repository's own dependencies and pinned toolchain.

## Out of scope

- Accuracy or licensing of third-party source data; report those to the data publisher.
- Vulnerabilities in upstream dependencies with no exploitable path through this project's
  build or bundle; please report them upstream (our audits still track them).
- Denial of service or findings that require write access to a maintainer account,
  self-hosted runner compromise, or other pre-existing privileged access.
- Reports that require the recipient to accept a modified checkout, tampered lockfile, or
  unverified raw evidence outside the repository.
