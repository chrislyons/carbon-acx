# ACX117 CI Workflow Repair and Main Green Verification

**Status:** In progress
**Date:** 2026-09-28
**Repository:** `carbon-acx`

## Findings

The latest `CI` run on `main` (`04ac917`) failed in two independent jobs [1]:

- `tests` failed at the Pages Function containment test step. CI passed the quoted literal `functions/**/*.test.ts` to Node 20.19.4, which reports that it cannot find that path. The repository currently has one Pages Function test file, so the workflow now passes its exact path.
- `e2e` failed before setup because the pinned `actions/download-artifact` commit did not exist. The configured v4.3.0 pin omitted one `b`; the official tag resolves to `d3f86a106a0bac45b974a628896c90dbdf5c8093` [2].

## Changes

- Replaced the unsupported quoted test glob with the explicit Pages Function test path in `.github/workflows/ci.yml`.
- Corrected the `actions/download-artifact@v4.3.0` SHA to the official tag commit.

## Verification

- The old quoted glob command fails under Node 20.19.4 with “Could not find” for `functions/**/*.test.ts`; the corrected Pages Function command passes all 12 tests locally.
- `yamllint -c .yamllint.yml .github/workflows` passes.
- `make package` passes, including Pages bundle validation: 47 indexed files, 25 verified hashes, 8 figure artifacts, and 8 reference artifacts.
- `pnpm test:e2e` passes 494 tests with 4 skips across the configured browser projects.
- Confirmed the corrected action SHA against the official `v4.3.0` Git ref [2].
- Main-branch CI verification after the workflow changes: pending.

## References

[1] Carbon ACX, “CI,” GitHub Actions run 36130718873, Sep. 25, 2026. [Online]. Available: https://github.com/chrislyons/carbon-acx/actions/runs/36130718873. [Accessed: Sep. 28, 2026].

[2] actions/download-artifact, “Git ref for v4.3.0,” GitHub API. [Online]. Available: https://api.github.com/repos/actions/download-artifact/git/ref/tags/v4.3.0. [Accessed: Sep. 28, 2026].
