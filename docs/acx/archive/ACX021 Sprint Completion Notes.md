### Summary

- The new figures pipeline now materializes IEEE-referenced metadata, stacked/bubble/sankey slices, and manifest entries directly from `calc/derive.py`, driven by the reusable citation loader and slicers in `calc/citations.py` and `calc/figures.py`; the checked-in example artifacts show layered outputs and numbered references as expected.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=98 path=calc/citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/citations.py#L1-L98"}  

:codex-file-citation[codex-file-citation]{line_range_start=46 line_range_end=343 path=calc/figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/figures.py#L46-L343"}  

:codex-file-citation[codex-file-citation]{line_range_start=380 line_range_end=572 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L380-L572"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=50 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L1-L50"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=calc/outputs/references/stacked_refs.txt git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/references/stacked_refs.txt#L1-L4"}  

- The Dash application now consumes the prebuilt artifacts, offering layer-aware controls and Plotly visualizations that surface reference hints in the hover UI via the new component modules.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=264 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L1-L264"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=111 path=app/components/stacked.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/stacked.py#L1-L111"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=126 path=app/components/bubble.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/bubble.py#L1-L126"}  

- ACX010 coverage landed: tests exercise citation plumbing, figure slices, backend parity, metadata resolution, and provincial seeding, guarding the new behavior and fixtures.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=80 path=tests/test_figures_dynamic_citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures_dynamic_citations.py#L1-L80"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=57 path=tests/test_backend_parity.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_backend_parity.py#L1-L57"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=63 path=tests/test_metadata_profile_resolution.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_metadata_profile_resolution.py#L1-L63"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=70 path=tests/test_regions_present.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_regions_present.py#L1-L70"}  

:codex-file-citation[codex-file-citation]{line_range_start=66 line_range_end=95 path=tests/test_figures_slices.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures_slices.py#L66-L95"}  

- Build and release automation is in place through the expanded Makefile, CI workflow, and packaging scripts that prepare both artifacts and the static site target for Pages deployment.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=53 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L1-L53"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=95 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L1-L95"}  

- Cross-layer infrastructure propagates `layer_id` through schema, data, and exports, while online services, industrial stubs, and provincial grid data are seeded with sourced rows and validated by the new tests.  

:codex-file-citation[codex-file-citation]{line_range_start=56 line_range_end=203 path=calc/schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/schema.py#L56-L203"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=22 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L1-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=16 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L1-L16"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=19 path=data/grid_intensity.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/grid_intensity.csv#L1-L19"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L1-L8"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=70 path=tests/test_regions_present.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_regions_present.py#L1-L70"}  

- Governance artifacts (CODEOWNERS, PR template, maintenance calendar) enforce review coverage and highlight the seeding protocol in every change.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=12 path=.github/CODEOWNERS git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/CODEOWNERS#L1-L12"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=22 path=.github/pull_request_template.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/pull_request_template.md#L1-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L26"}  

### Gap

- The checked-in `dist/` bundle still contains placeholder outputs with empty references, missing `layer_id` columns, and blank manifest metadata, so the packaged artifacts do not reflect the new pipeline or data coverage.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=9 path=dist/artifacts/manifest.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/manifest.json#L1-L9"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=21 path=dist/artifacts/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/figures/stacked.json#L1-L21"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=28 path=dist/artifacts/export_view.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.json#L1-L28"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=7 path=dist/artifacts/export_view.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.csv#L1-L7"}  

:codex-terminal-citation[codex-terminal-citation]{line_range_start=1 line_range_end=5 terminal_chunk_id=06f3c2}  

:::task-stub{title="Refresh dist/ artifacts with current layered outputs"}

1. Run `make build` (optionally per backend) so `calc/derive` regenerates `calc/outputs` with layered figures, references, and the populated manifest using the latest data and code paths.  

:codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=29 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L20-L29"}  

:codex-file-citation[codex-file-citation]{line_range_start=380 line_range_end=572 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L380-L572"}  

2. Package the regenerated outputs via `make package` and rebuild the static site (`make site` or `make dist/site/index.html`) so `dist/artifacts` and `dist/site` pick up the new JSON/CSV/TXT content and manifest summary.  

:codex-file-citation[codex-file-citation]{line_range_start=24 line_range_end=34 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L24-L34"}  

3. Commit the updated files under `dist/` (figures, references, manifest, CSV) to replace the placeholder artifacts with the real layered data and IEEE references.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=21 path=dist/artifacts/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/figures/stacked.json#L1-L21"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=7 path=dist/artifacts/export_view.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.csv#L1-L7"}  

:::

### Testing

- ⚠️ Not run (QA review only)