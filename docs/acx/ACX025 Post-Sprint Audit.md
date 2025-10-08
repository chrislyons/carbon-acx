## 1. Executive Summary

- **Purpose & role**: `carbon-acx` is a reference stack for normalising carbon accounting inputs into validated datasets, derived artifacts, and a Dash/static client for exploration, with clear separation between raw data, calculation logic, and delivery layers.  

:codex-file-citation[codex-file-citation]{line_range_start=3 line_range_end=118 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L3-L118"}  

- **Maturity & release status**: The project is tagged as version 0.1.0 and ships extensive contributor governance, but many activities and profiles remain placeholders awaiting validated factors, signalling an early-yet-structured phase.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L1-L26"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=22 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L1-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=19 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L1-L19"}  

- **High-level risks & opportunities**: Strong pipelines, schema validation, and CI automation underpin data trustworthiness, yet a Poetry toolchain mismatch in CI, placeholder industrial datasets, and untested API aggregation paths pose accuracy and operability risks. Overall health rating: **Amber (medium risk)** — stable foundations with targeted fixes required to harden releases.  

:codex-file-citation[codex-file-citation]{line_range_start=449 line_range_end=657 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L449-L657"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=92 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L1-L92"}  

:codex-file-citation[codex-file-citation]{line_range_start=13 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L13-L192"}  

## 2. Repository Structure

- **Top-level layout**: Source data (`data/`), modelling/derivation package (`calc/`), Dash client (`app/`), documentation (`docs/`), static-site spec (`site/`), automation scripts (`scripts/`), tooling (`tools/`), and tests (`tests/`) reflect the pipeline described in the README.  

:codex-file-citation[codex-file-citation]{line_range_start=10 line_range_end=118 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L10-L118"}  

- **Primary entry points & adapters**:
- `calc.derive.export_view` orchestrates data loading, emissions computation, artifact generation, and manifest hashing for reproducibility.  

  :codex-file-citation[codex-file-citation]{line_range_start=449 line_range_end=657 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L449-L657"}  

- `app/app.py` consumes the precomputed figures/references to render Dash layouts with layer filtering callbacks.  

  :codex-file-citation[codex-file-citation]{line_range_start=125 line_range_end=270 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L125-L270"}  

- `scripts/build_site.py` and `scripts/package_artifacts.py` adapt derived outputs into deployable static bundles and curated packages.  

  :codex-file-citation[codex-file-citation]{line_range_start=118 line_range_end=196 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L118-L196"}  

  :codex-file-citation[codex-file-citation]{line_range_start=14 line_range_end=76 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L14-L76"}  

- `tools/sbom.py` and `tools/check_readme_make_targets.py` provide compliance and documentation guardrails.  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=120 path=tools/sbom.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tools/sbom.py#L1-L120"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=66 path=tools/check_readme_make_targets.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tools/check_readme_make_targets.py#L1-L66"}  

- **Redundant/obsolete assets**: No dead code detected. The migration helper `scripts/migrate_to_v1_1.py` remains accessible through a Makefile target, preventing drift from legacy formats.  

:codex-file-citation[codex-file-citation]{line_range_start=13 line_range_end=59 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L13-L59"}  

## 3. Codebase Quality

- **Consistency & readability**: Core modules favour typed dataclasses, Pydantic models, and helper abstractions, yielding predictable behaviour across emissions computation, citation tracking, and figure slicing.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=243 path=calc/schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/schema.py#L1-L243"}  

:codex-file-citation[codex-file-citation]{line_range_start=13 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L13-L192"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=174 path=calc/figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/figures.py#L1-L174"}  

:codex-file-citation[codex-file-citation]{line_range_start=16 line_range_end=98 path=calc/citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/citations.py#L16-L98"}  

- **Technical debt & placeholders**: Industrial and some online activities intentionally carry placeholder notes pending vetted emission factors, and default profiles for heavy industry remain inactive—highlighting known data gaps to resolve before expansion.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=22 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=14 line_range_end=19 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L14-L19"}  

- **Best-practice alignment**: `calc/derive` safeguards artifact directories, enforces hashed builds, quantises numeric output, and persists IEEE-style references; Dash components centralise formatting utilities for reuse.  

:codex-file-citation[codex-file-citation]{line_range_start=30 line_range_end=172 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L30-L172"}  

:codex-file-citation[codex-file-citation]{line_range_start=591 line_range_end=655 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L591-L655"}  

:codex-file-citation[codex-file-citation]{line_range_start=9 line_range_end=75 path=app/components/_helpers.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/_helpers.py#L9-L75"}  

## 4. Dependencies & Environment

- **Direct dependencies (pinned)**: pandas 2.2.3, pydantic 2.11.7, plotly 5.24.1, dash 2.18.2, PyYAML 6.0.2, Jinja2 3.1.6, optional duckdb 1.4.0, with Python constrained to 3.11+.  

:codex-file-citation[codex-file-citation]{line_range_start=940 line_range_end=968 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L940-L968"}  

:codex-file-citation[codex-file-citation]{line_range_start=1179 line_range_end=1206 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1179-L1206"}  

:codex-file-citation[codex-file-citation]{line_range_start=1132 line_range_end=1145 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1132-L1145"}  

:codex-file-citation[codex-file-citation]{line_range_start=366 line_range_end=388 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L366-L388"}  

:codex-file-citation[codex-file-citation]{line_range_start=1411 line_range_end=1434 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1411-L1434"}  

:codex-file-citation[codex-file-citation]{line_range_start=591 line_range_end=604 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L591-L604"}  

:codex-file-citation[codex-file-citation]{line_range_start=448 line_range_end=472 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L448-L472"}  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=16 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L8-L16"}  

- **Transitive & dev dependencies**: The lockfile captures the broader stack—including annotated-types 0.7.0, black 24.10.0, flask 3.0.3, numpy 2.3.2, requests 2.32.4, pytest 8.4.1, ruff 0.4.10, pip-audit 2.9.0, and zipp 3.23.0—ensuring reproducible environments for runtime and tooling.  

:codex-terminal-citation[codex-terminal-citation]{line_range_start=1 line_range_end=72 terminal_chunk_id=12497a}  

- **Environment orchestration**: README documents prerequisites, install/lint/test/build targets, and backend switching; the Makefile encapsulates installation, validation, packaging, and SBOM generation flows, while tooling enforces README/Makefile parity.  

:codex-file-citation[codex-file-citation]{line_range_start=40 line_range_end=118 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L40-L118"}  

:codex-file-citation[codex-file-citation]{line_range_start=15 line_range_end=68 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L15-L68"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=66 path=tools/check_readme_make_targets.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tools/check_readme_make_targets.py#L1-L66"}  

- **Risks & hardening opportunities**: CI installs Poetry 1.7.1 even though the lockfile is generated by Poetry 2.2.1, risking lock incompatibility and undermining `poetry lock --check`. Aligning tool versions and documenting the required Poetry release would eliminate this fragility.  

:codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=34 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L20-L34"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1-L4"}  

- **Supply-chain posture**: SBOM generation (`make sbom`) and `pip-audit --strict` are built into CI, providing a foundation for dependency transparency and vulnerability scanning.  

:codex-file-citation[codex-file-citation]{line_range_start=67 line_range_end=68 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L67-L68"}  

:codex-file-citation[codex-file-citation]{line_range_start=41 line_range_end=66 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L41-L66"}  

## 5. Testing & Validation

- **Framework & scope**: Pytest underpins unit, integration, and pipeline tests, covering backend parity, artifact generation, static-site rendering, citation integrity, emissions math, and packaging flows.  

:codex-file-citation[codex-file-citation]{line_range_start=21 line_range_end=26 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L21-L26"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=57 path=tests/test_backend_parity.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_backend_parity.py#L1-L57"}  

:codex-file-citation[codex-file-citation]{line_range_start=34 line_range_end=93 path=tests/test_outputs.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_outputs.py#L34-L93"}  

:codex-file-citation[codex-file-citation]{line_range_start=11 line_range_end=28 path=tests/test_static_site_build.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_static_site_build.py#L11-L28"}  

:codex-file-citation[codex-file-citation]{line_range_start=9 line_range_end=49 path=tests/test_figures_dynamic_citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures_dynamic_citations.py#L9-L49"}  

- **Coverage observations**: Tests exercise data loading, derived figures, references, SBOM creation, and Dash layout wiring, indicating broad coverage of core behaviours. However, no tests currently target `calc.api.get_aggregates`, leaving config/profile resolution logic unverified.  

:codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L31-L192"}  

:codex-terminal-citation[codex-terminal-citation]{line_range_start=1 line_range_end=2 terminal_chunk_id=19326d}  

- **Automation & reliability**: `tests/conftest.py` enforces clean temporary artifact roots; CI runs lint, pytest, derivation/build/package steps, SBOM creation, and vulnerability scans on every push/PR.  

:codex-file-citation[codex-file-citation]{line_range_start=15 line_range_end=34 path=tests/conftest.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/conftest.py#L15-L34"}  

:codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=66 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L20-L66"}  

- **Coverage metrics**: No explicit coverage percentage is reported, but the diverse suite indicates moderate-to-high functional coverage with the noted API gap.  

## 6. Documentation & Onboarding

- **Developer guides**: README offers end-to-end workflow instructions, backend switching guidance, and strict artifact policies; CONTRIBUTING sets out seeding protocols and QA expectations.  

:codex-file-citation[codex-file-citation]{line_range_start=40 line_range_end=137 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L40-L137"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=86 path=CONTRIBUTING.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/CONTRIBUTING.md#L1-L86"}  

- **Operational references**: Maintenance calendar, online method notes, and “What runs where” documents outline refresh cadences, methodological assumptions, and deployment architecture, aiding stewards and reviewers.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=21 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L21"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=62 path=docs/ONLINE_METHOD_NOTES.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/ONLINE_METHOD_NOTES.md#L1-L62"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=28 path=docs/WHAT_RUNS_WHERE.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/WHAT_RUNS_WHERE.md#L1-L28"}  

- **Governance artefacts**: The PR template and CODEOWNERS emphasise source tracking, seeding rules, and single-owner review gates, reinforcing data governance.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=.github/pull_request_template.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/pull_request_template.md#L1-L26"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=12 path=.github/CODEOWNERS git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/CODEOWNERS#L1-L12"}  

- **End-user spec**: `site/index.md` captures production copy expectations and reference handling, ensuring alignment between generated outputs and hosted content.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=30 path=site/index.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/site/index.md#L1-L30"}  

- **Onboarding gaps**: Tooling requirements cite Poetry but not the exact version required to satisfy the modern lockfile, which should be clarified alongside the CI update.  

## 7. Data & Pipeline Assets

- **Source datasets**: CSV inputs cover activities, emission factors, profiles, schedules, grid intensities, and sources with licensing metadata; units are normalised via a registry for validation.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=22 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L1-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=13 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L1-L13"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=19 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L1-L19"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=18 path=data/grid_intensity.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/grid_intensity.csv#L1-L18"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=40 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L40"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=17 path=data/units.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/units.csv#L1-L17"}  

- **Schema enforcement**: Pydantic models validate units, emissions factor invariants, profile schedules, and grid metadata, with caching helpers for loader functions.  

:codex-file-citation[codex-file-citation]{line_range_start=15 line_range_end=243 path=calc/schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/schema.py#L15-L243"}  

- **Derivation pipeline**: `calc/derive` consolidates data from the datastore, computes emissions with quantised outputs, slices figures, writes CSV/JSON/references, and persists manifest metadata plus hashed build directories for reproducibility.  

:codex-file-citation[codex-file-citation]{line_range_start=30 line_range_end=655 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L30-L655"}  

- **Artifact packaging**: Build scripts resolve pointer files, reuse Dash figure builders for static HTML, and copy curated files while preventing source/destination overlap.  

:codex-file-citation[codex-file-citation]{line_range_start=6 line_range_end=70 path=scripts/_artifact_paths.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/_artifact_paths.py#L6-L70"}  

:codex-file-citation[codex-file-citation]{line_range_start=118 line_range_end=196 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L118-L196"}  

:codex-file-citation[codex-file-citation]{line_range_start=14 line_range_end=76 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L14-L76"}  

- **Data provenance & transparency**: Method notes tie calculations to `data/sources.csv`, and static site disclosure reiterates the precomputed, API-free delivery model.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=62 path=docs/ONLINE_METHOD_NOTES.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/ONLINE_METHOD_NOTES.md#L1-L62"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=30 path=site/index.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/site/index.md#L1-L30"}  

## 8. Security & Compliance

- **Secret management**: Repository data is static and documentation emphasises source transparency; no secrets or credentials were detected in configuration or data files (all references are published URLs).  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=40 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L40"}  

- **Output safety**: Derivation safeguards prevent directory cleanup outside hashed artifact roots unless explicitly permitted, reducing accidental destructive operations.  

:codex-file-citation[codex-file-citation]{line_range_start=106 line_range_end=138 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L106-L138"}  

- **Compliance tooling**: Automated SBOM generation and `pip-audit` run in CI, producing CycloneDX inventories and strict vulnerability checks; MIT licensing applies to the codebase.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=120 path=tools/sbom.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tools/sbom.py#L1-L120"}  

:codex-file-citation[codex-file-citation]{line_range_start=44 line_range_end=66 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L44-L66"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=16 path=LICENSE git_url="https://github.com/chrislyons/carbon-acx/blob/main/LICENSE#L1-L16"}  

- **Disclosure & privacy**: Static site guidance and README artifact policy ensure public bundles remain immutable and free from runtime data collection.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=30 path=site/index.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/site/index.md#L1-L30"}  

:codex-file-citation[codex-file-citation]{line_range_start=97 line_range_end=118 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L97-L118"}  

## 9. Project Health & Roadmap

- **Maintenance cadence**: Quarterly dependency audits and annual data refreshes are documented, supporting sustained data quality.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=21 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L21"}  

- **Known gaps**: Industrial layers, some online workloads, and profiles carry “awaiting data” notes, indicating pending seeding before activation.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=22 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L22"}  

:codex-file-citation[codex-file-citation]{line_range_start=14 line_range_end=19 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L14-L19"}  

- **Testing backlog**: The API aggregation pathway lacks regression tests, highlighting a reliability gap in the user-facing analytics API.  

:codex-file-citation[codex-file-citation]{line_range_start=126 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L126-L192"}  

:codex-terminal-citation[codex-terminal-citation]{line_range_start=1 line_range_end=2 terminal_chunk_id=19326d}  

- **Ownership concentration**: CODEOWNERS assigns all domains to a single maintainer (@chrislyons), signalling potential resource bottlenecks for reviews and updates.  

:codex-file-citation[codex-file-citation]{line_range_start=4 line_range_end=12 path=.github/CODEOWNERS git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/CODEOWNERS#L4-L12"}  

## 10. Recommendations

- **Prioritised actions**:
- Align CI tooling with the Poetry 2.x lockfile and document the supported version so dependency checks remain trustworthy (owner: platform/CI maintainers, `.github/workflows` CODEOWNER).  

  :codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=34 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L20-L34"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1-L4"}  

  :::task-stub{title="Synchronize Poetry tooling with lockfile format"}

1. Update `.github/workflows/ci.yml` to install Poetry `2.2.1` (or regenerate the lock file with Poetry `1.7.1` if downgrading) so `poetry lock --check` runs against the correct format.  

  :codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=34 path=.github/workflows/ci.yml git_url="https://github.com/chrislyons/carbon-acx/blob/main/.github/workflows/ci.yml#L20-L34"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1-L4"}  

2. Amend the “Requirements” section of `README.md` to call out the required Poetry version, keeping local developer environments aligned with CI expectations.  

  :codex-file-citation[codex-file-citation]{line_range_start=40 line_range_end=49 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L40-L49"}  

3. Re-run the CI pipeline to confirm dependency installation, locking, and packaging still succeed under the updated Poetry toolchain.  

  :::

- Add focused tests for `calc.api.get_aggregates` to validate profile resolution, source aggregation, and compatibility with default configuration (owner: data/model maintainers).  

  :codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L31-L192"}  

  :::task-stub{title="Cover calc.api aggregation logic with tests"}

1. Create a new pytest module (for example `tests/test_api_aggregates.py`) that seeds lightweight CSV fixtures or in-memory models mirroring `calc/api.py` inputs (activities, profiles, schedules, emission factors, grid intensities).  

  :codex-file-citation[codex-file-citation]{line_range_start=126 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L126-L192"}  

2. Exercise `get_aggregates` and `collect_activity_source_keys`, asserting resolved profile IDs, totals, and reference key ordering match expectations (including config overrides via a temporary YAML file).  

  :codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=192 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L31-L192"}  

3. Integrate the test into the suite and ensure `make test` / CI pipelines pass, demonstrating coverage of both fixed and grid-indexed emission factors.  

  :::