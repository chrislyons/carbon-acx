# ACX041 View Provenance Module — Worklog

This changelog tracks local progress toward implementing the ACX041 View Provenance module.

## 2025-10-06
- Documented schema v1.2 migration replacing segment terminology with sector, retaining manifest compatibility and alias reads.

## 2024-05-20
- Initialized changelog with placeholder entry outlining pending workstreams for ACX041 manifest implementation.
- Documented outstanding tasks spanning manifest generation, CI enforcement, frontend verification, governance updates, and QA artifact collection.

## Next Steps
- Complete calc manifest generator and hash chain specification.
- Add comprehensive pytest coverage for manifest integrity and legacy fallbacks.
- Introduce frontend verification with UI states for verified/unverified figures.
- Update governance documentation and add manifest index build scripts.
- Produce QA, binding, and density reports alongside updated mocks.
## 2024-05-21
- Implemented `calc.manifest` generator producing ACX041-compliant manifests with dataset, figure, reference, and provenance hashes.
- Added hash helpers under `calc/utils/hashio.py` with newline normalisation to keep digests stable across platforms.
- Wired manifest generation into `calc.derive` so every build emits `calc/outputs/manifests/*.json`.
- Authored pytest coverage to verify hash-chain integrity, reference alignment, and regression skips for legacy fixtures.
- Documented the extension in `docs/ACX041_View_Provenance_Module_v1_2.md` and surfaced it in the README architecture extension index.

