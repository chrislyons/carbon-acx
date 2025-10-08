# 1. Executive Summary

- **Purpose & role:** `carbon-acx` is a “minimal scaffold for [a] carbon accounting demo,” combining a Dash front end with a data/derivation stack that turns curated CSV inputs into visual artifacts for emissions reporting.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=12 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L1-L12"}  

:codex-file-citation[codex-file-citation]{line_range_start=125 line_range_end=274 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L125-L274"}  

- **Maturity & release status:** The project is pre-production: key datasets still contain placeholders (“Pending validation…”, “EF placeholder”), and shipped artifacts in `dist/` and `calc/outputs/` reflect demo values rather than governed releases.  

:codex-file-citation[codex-file-citation]{line_range_start=3 line_range_end=29 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L3-L29"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=50 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L1-L50"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=28 path=dist/artifacts/export_view.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.json#L1-L28"}  

- **Risks, opportunities & health rating:** Overall health is **Amber (medium risk)**. Strengths include typed, modular calculation code and an extensive pytest suite. Major risks stem from placeholder data, committed build artifacts that can drift from source data, and unpinned dependency declarations in `pyproject.toml`. Opportunities include formalizing CI, tightening dependency governance, and enriching operational documentation.  

:codex-file-citation[codex-file-citation]{line_range_start=115 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L115-L573"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=139 path=tests/test_integration.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_integration.py#L1-L139"}  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=16 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L8-L16"}  

# 2. Repository Structure

- **Core layout:**  

  • `app/` hosts the Dash UI and component helpers that load precomputed figures and render bubble, stacked-bar, and Sankey charts.  

  :codex-file-citation[codex-file-citation]{line_range_start=125 line_range_end=274 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L125-L274"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=126 path=app/components/bubble.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/bubble.py#L1-L126"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=111 path=app/components/stacked.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/stacked.py#L1-L111"}  

  • `calc/` is the computational engine: schema definitions, DALs, derivation pipeline, figure slicing, and citation handling.  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=243 path=calc/schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/schema.py#L1-L243"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=135 path=calc/dal.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/dal.py#L1-L135"}  

  :codex-file-citation[codex-file-citation]{line_range_start=29 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L29-L573"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=343 path=calc/figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/figures.py#L1-L343"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=98 path=calc/citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/citations.py#L1-L98"}  

  • `data/` bundles CSV reference tables (activities, emission factors, schedules, grid intensity, profiles, sources, units).  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=29 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L1-L29"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L1-L8"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=7 path=data/activity_schedule.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activity_schedule.csv#L1-L7"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=16 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L1-L16"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=19 path=data/grid_intensity.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/grid_intensity.csv#L1-L19"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=23 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L23"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=17 path=data/units.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/units.csv#L1-L17"}  

  • `docs/` documents maintenance cadences and methodological notes for the online layer.  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L26"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=62 path=docs/ONLINE_METHOD_NOTES.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/ONLINE_METHOD_NOTES.md#L1-L62"}  

  • `scripts/` packages artifacts and builds a static site mirroring the Dash layout.  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=70 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L1-L70"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=218 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L1-L218"}  

  • `tests/` delivers comprehensive pytest coverage of schemas, derivations, backends, and figures (plus a golden JSON fixture).  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=166 path=tests/test_calc.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_calc.py#L1-L166"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=57 path=tests/test_backend_parity.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_backend_parity.py#L1-L57"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=54 path=tests/fixtures/export_view.golden.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/fixtures/export_view.golden.json#L1-L54"}  

  • `dist/` contains prebuilt demo artifacts; `calc/outputs/` mirrors them as default Dash inputs.  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=9 path=dist/artifacts/manifest.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/manifest.json#L1-L9"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=7 path=dist/artifacts/export_view.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.csv#L1-L7"}  

  :codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=50 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L1-L50"}  

- **Entry points & adapters:**  

  • Web UI: `app.app:main()` instantiates the Dash server; `scripts/build_site:main()` renders static HTML for Cloudflare Pages.  

  :codex-file-citation[codex-file-citation]{line_range_start=125 line_range_end=274 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L125-L274"}  

  :codex-file-citation[codex-file-citation]{line_range_start=117 line_range_end=218 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L117-L218"}  

  • Derivation CLI: `python -m calc.derive` drives ingestion, aggregation, artifact generation, and manifest production, picking a backend via `calc.dal.choose_backend()`.  

  :codex-file-citation[codex-file-citation]{line_range_start=380 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L380-L573"}  

  :codex-file-citation[codex-file-citation]{line_range_start=129 line_range_end=135 path=calc/dal.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/dal.py#L129-L135"}  

  • Artifact packaging: `scripts.package_artifacts:main()` copies generated JSON/CSV/TXT bundles for distribution.  

  :codex-file-citation[codex-file-citation]{line_range_start=18 line_range_end=67 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L18-L67"}  

- **Redundant/obsolete assets:** Committed outputs under `calc/outputs/` and `dist/` show demo timestamps (e.g., `generated_at` 1970-01-01 or 2025 snapshots) and empty metadata arrays, signalling they are sample payloads rather than reproducible builds; consider removing or regenerating them per release to avoid drift.  

:codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=50 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L31-L50"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=9 path=dist/artifacts/manifest.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/manifest.json#L1-L9"}  

# 3. Codebase Quality

- **Consistency & readability:** The codebase is extensively type-annotated, follows helper-centric structure (e.g., `_load_figure_payload`, `_collect_layers`), and keeps reusable logic in shared helpers such as `app/components/_helpers.py` and `calc/derive.py`’s normalization utilities.  

:codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=122 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L31-L122"}  

:codex-file-citation[codex-file-citation]{line_range_start=51 line_range_end=140 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L51-L140"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=75 path=app/components/_helpers.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/components/_helpers.py#L1-L75"}  

- **Modularity:** Data ingestion, schema validation, calculation, and presentation are split cleanly across modules. Example: `calc.api.get_aggregates` orchestrates CSV loads and emission computations, while `calc.figures.slice_*` convert DataFrames into chart-friendly payloads.  

:codex-file-citation[codex-file-citation]{line_range_start=31 line_range_end=200 path=calc/api.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/api.py#L31-L200"}  

:codex-file-citation[codex-file-citation]{line_range_start=124 line_range_end=328 path=calc/figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/figures.py#L124-L328"}  

- **Technical debt & anti-patterns:** Demo CSVs contain placeholders (“Awaiting validation…”) and partial emission factors, requiring completion before production use.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=27 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L27"}  

:codex-file-citation[codex-file-citation]{line_range_start=2 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L2-L8"}  

  Long functions like `calc.derive.export_view` (spanning reading, computing, file I/O, metadata assembly) could be decomposed further for clarity and testing granularity.  

:codex-file-citation[codex-file-citation]{line_range_start=380 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L380-L573"}  

- **Best-practice alignment:** Pydantic models enforce schema constraints (units registry, scope boundaries, mutual exclusivity of schedule frequencies), and test suites assert validation behaviour, showing strong data governance discipline.  

:codex-file-citation[codex-file-citation]{line_range_start=84 line_range_end=208 path=calc/schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/schema.py#L84-L208"}  

:codex-file-citation[codex-file-citation]{line_range_start=9 line_range_end=124 path=tests/test_schema.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_schema.py#L9-L124"}  

# 4. Dependencies & Environment

- **Build & runtime tooling:** Poetry governs packaging; the project targets Python ≥3.11, with lint/test convenience targets in the Makefile.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=29 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L1-L29"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=45 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L1-L45"}  

- **Direct dependency declarations:** `pyproject.toml` lists core libraries with wildcard pins (`pandas`, `pydantic`, `plotly`, `dash`, `pyyaml`, `jinja2`, optional `duckdb`), implying reliance on the lockfile for reproducibility.  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=16 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L8-L16"}  

- **Pinned packages (main + transitive) from `poetry.lock`:**

|  Package  |  Version  |  Group(s)  |  Citation  |
| --- | --- | --- | --- |
|  annotated-types  |  0.7.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=3 line\_range\_end=13 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L3-L13"}  |
|  black  |  25.1.0  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=15 line\_range\_end=58 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L15-L58"}  |
|  blinker  |  1.9.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=60 line\_range\_end=70 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L60-L70"}  |
|  certifi  |  2025.8.3  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=72 line\_range\_end=82 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L72-L82"}  |
|  charset-normalizer  |  3.4.3  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=84 line\_range\_end=171 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L84-L171"}  |
|  click  |  8.2.1  |  main/dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=173 line\_range\_end=183 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L173-L183"}  |
|  colorama  |  0.4.6  |  main/dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=188 line\_range\_end=200 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L188-L200"}  |
|  coverage  |  7.10.2  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=201 line\_range\_end=301 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L201-L301"}  |
|  dash  |  3.2.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=303 line\_range\_end=360 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L303-L360"}  |
|  duckdb  |  1.4.0  |  optional (extra `db`)  |  :codex-file-citation[codex-file-citation]{line\_range\_start=334 line\_range\_end=377 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L334-L377"}  |
|  flask  |  3.1.1  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=379 line\_range\_end=402 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L379-L402"}  |
|  idna  |  3.10  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=404 line\_range\_end=416 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L404-L416"}  |
|  importlib-metadata  |  8.7.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=418 line\_range\_end=440 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L418-L440"}  |
|  iniconfig  |  2.1.0  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=442 line\_range\_end=452 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L442-L452"}  |
|  itsdangerous  |  2.2.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=454 line\_range\_end=464 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L454-L464"}  |
|  jinja2  |  3.1.6  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=466 line\_range\_end=478 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L466-L478"}  |
|  markupsafe  |  3.0.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=485 line\_range\_end=547 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L485-L547"}  |
|  mypy-extensions  |  1.1.0  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=556 line\_range\_end=560 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L556-L560"}  |
|  narwhals  |  2.0.1  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=568 line\_range\_end=570 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L568-L570"}  |
|  nest-asyncio  |  1.6.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=592 line\_range\_end=594 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L592-L594"}  |
|  numpy  |  2.3.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=604 line\_range\_end=686 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L604-L686"}  |
|  packaging  |  25.0  |  main/dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=688 line\_range\_end=698 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L688-L698"}  |
|  pandas  |  2.3.1  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=700 line\_range\_end=720 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L700-L720"}  |
|  pathspec  |  0.12.1  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=786 line\_range\_end=792 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L786-L792"}  |
|  platformdirs  |  4.3.8  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=798 line\_range\_end=804 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L798-L804"}  |
|  plotly  |  6.2.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=816 line\_range\_end=834 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L816-L834"}  |
|  pluggy  |  1.6.0  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=840 line\_range\_end=846 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L840-L846"}  |
|  pydantic  |  2.11.7  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=856 line\_range\_end=861 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L856-L861"}  |
|  pydantic-core  |  2.33.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=878 line\_range\_end=883 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L878-L883"}  |
|  pygments  |  2.19.2  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=989 line\_range\_end=993 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L989-L993"}  |
|  pytest  |  8.4.1  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1004 line\_range\_end=1012 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1004-L1012"}  |
|  pytest-cov  |  6.2.1  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1026 line\_range\_end=1032 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1026-L1032"}  |
|  python-dateutil  |  2.9.0.post0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1046 line\_range\_end=1052 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1046-L1052"}  |
|  pytz  |  2025.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1061 line\_range\_end=1066 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1061-L1066"}  |
|  pyyaml  |  6.0.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1073 line\_range\_end=1076 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1073-L1076"}  |
|  requests  |  2.32.4  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1136 line\_range\_end=1144 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1136-L1144"}  |
|  retrying  |  1.4.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1158 line\_range\_end=1162 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1158-L1162"}  |
|  ruff  |  0.12.8  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1170 line\_range\_end=1174 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1170-L1174"}  |
|  setuptools  |  80.9.0  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1198 line\_range\_end=1203 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1198-L1203"}  |
|  six  |  1.17.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1219 line\_range\_end=1223 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1219-L1223"}  |
|  typing-extensions  |  4.14.1  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1231 line\_range\_end=1236 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1231-L1236"}  |
|  typing-inspection  |  0.4.1  |  dev  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1243 line\_range\_end=1247 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1243-L1247"}  |
|  tzdata  |  2025.2  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1258 line\_range\_end=1262 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1258-L1262"}  |
|  urllib3  |  2.5.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1270 line\_range\_end=1274 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1270-L1274"}  |
|  werkzeug  |  3.1.3  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1288 line\_range\_end=1293 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1288-L1293"}  |
|  zipp  |  3.23.0  |  main  |  :codex-file-citation[codex-file-citation]{line\_range\_start=1306 line\_range\_end=1310 path=poetry.lock git\_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L1306-L1310"}  |

*(All dependencies above are deduplicated; no additional packages appear after zipp in the lockfile.)*

- **Observations:** Because `pyproject.toml` leaves versions unconstrained, teams must rely on `poetry.lock` to ensure deterministic environments; consider tightening specifiers or automating lockfile refresh and SBOM generation for supply-chain transparency.  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=16 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L8-L16"}  

# 5. Testing & Validation

- **Framework & breadth:** Pytest drives validation across schemas, derivations, figures, data parity, dynamic citations, and backend parity (CSV vs DuckDB). Tests assert CSV loading, emission calculations, metadata correctness, and manifest contents.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=16 path=tests/test_dal.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_dal.py#L1-L16"}  

:codex-file-citation[codex-file-citation]{line_range_start=59 line_range_end=166 path=tests/test_calc.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_calc.py#L59-L166"}  

:codex-file-citation[codex-file-citation]{line_range_start=10 line_range_end=57 path=tests/test_backend_parity.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_backend_parity.py#L10-L57"}  

:codex-file-citation[codex-file-citation]{line_range_start=42 line_range_end=67 path=tests/test_figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures.py#L42-L67"}  

:codex-file-citation[codex-file-citation]{line_range_start=56 line_range_end=80 path=tests/test_figures_dynamic_citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures_dynamic_citations.py#L56-L80"}  

- **Coverage insights:** Scenarios include golden-file comparisons (`tests/fixtures/export_view.golden.json`), provincial grid matrix completeness, online activity scaling with grid intensity, and citation hygiene, suggesting broad coverage of the data pipeline and referential integrity.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=54 path=tests/fixtures/export_view.golden.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/fixtures/export_view.golden.json#L1-L54"}  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=46 path=tests/test_vintage_matrix.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_vintage_matrix.py#L5-L46"}  

:codex-file-citation[codex-file-citation]{line_range_start=35 line_range_end=70 path=tests/test_online_grid_index_scaling.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_online_grid_index_scaling.py#L35-L70"}  

:codex-file-citation[codex-file-citation]{line_range_start=7 line_range_end=23 path=tests/test_citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_citations.py#L7-L23"}  

- **Gaps:** There are no automated UI regression tests for the Dash layout or static site generator, leaving visual regressions to manual verification.  

:codex-file-citation[codex-file-citation]{line_range_start=140 line_range_end=264 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L140-L264"}  

:codex-file-citation[codex-file-citation]{line_range_start=117 line_range_end=218 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L117-L218"}  

- **Execution status:** ⚠️ Tests were **not executed** during this read-only audit; rely on existing `make test`/pytest workflows when running locally.  

:codex-file-citation[codex-file-citation]{line_range_start=17 line_range_end=24 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L17-L24"}  

# 6. Documentation & Onboarding

- **Current state:** The README is succinct—install, validate, build, run—but lacks architecture diagrams, data provenance summaries, or deployment steps.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=12 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L1-L12"}  

- **Extended docs:** `docs/ONLINE_METHOD_NOTES.md` captures methodological detail for online-layer assumptions, and `docs/MAINTENANCE_CALENDAR.md` defines quarterly/annual maintenance cadences and domain owners.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=62 path=docs/ONLINE_METHOD_NOTES.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/ONLINE_METHOD_NOTES.md#L1-L62"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L26"}  

- **Gaps:** There is no newcomer guide explaining how `calc/derive` consumes CSVs, how to refresh data, or how to operate the Dash/static site—knowledge remains implicit in code and tests.

# 7. Data & Pipeline Assets

- **Datasets:** Activity, emission factor, schedule, profile, grid intensity, source, and unit CSVs provide the raw inputs. Each file includes metadata columns, with units referenced by a canonical registry to enforce validation rules.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=29 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L1-L29"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L1-L8"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=7 path=data/activity_schedule.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activity_schedule.csv#L1-L7"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=16 path=data/profiles.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/profiles.csv#L1-L16"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=19 path=data/grid_intensity.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/grid_intensity.csv#L1-L19"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=23 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L23"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=17 path=data/units.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/units.csv#L1-L17"}  

- **Placeholders:** Many records still contain TODO notes (e.g., pending EF validation, awaiting intensity confirmation), so downstream calculations may be incomplete without manual curation.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=27 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L27"}  

:codex-file-citation[codex-file-citation]{line_range_start=2 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L2-L8"}  

- **Derivation pipeline:** `calc.derive.export_view` loads CSVs via the chosen backend, quantizes/normalizes outputs, aggregates emissions per profile, and writes JSON/CSV artifacts plus per-figure references; environment variables control output root and timestamps for reproducibility.  

:codex-file-citation[codex-file-citation]{line_range_start=115 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L115-L573"}  

- **Manifest & figures:** Generated figure JSON includes citation keys, references, layer ordering, and per-layer data slices consumed by Dash/static site renderers.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=45 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L1-L45"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=calc/outputs/references/export_view_refs.txt git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/references/export_view_refs.txt#L1-L4"}  

:codex-file-citation[codex-file-citation]{line_range_start=51 line_range_end=187 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L51-L187"}  

- **Provenance tracking:** Sources CSV encodes IEEE citations and licensing for each external dataset, enabling automated reference lists and compliance reporting.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=23 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L23"}  

:codex-file-citation[codex-file-citation]{line_range_start=30 line_range_end=86 path=calc/citations.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/citations.py#L30-L86"}  

# 8. Security & Compliance

- **Secrets & config:** The repo contains no obvious secrets; configuration relies on environment variables (`ACX_OUTPUT_ROOT`, `ACX_GENERATED_AT`, `ACX_DATA_BACKEND`) to control data backend and output directories, reducing hard-coded paths.  

:codex-file-citation[codex-file-citation]{line_range_start=29 line_range_end=140 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L29-L140"}  

:codex-file-citation[codex-file-citation]{line_range_start=22 line_range_end=135 path=calc/dal.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/dal.py#L22-L135"}  

- **Dependency posture:** The stack pulls in web-facing frameworks (`flask`, `dash`, `plotly`, `requests`); consistent lockfile maintenance is essential to track CVEs. No SBOM or automated vulnerability scanning is present in-repo.

- **Licensing:** Project is MIT-licensed, and data sources document licensing terms (e.g., Government of Canada open data) within `data/sources.csv`.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=20 path=LICENSE git_url="https://github.com/chrislyons/carbon-acx/blob/main/LICENSE#L1-L20"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=23 path=data/sources.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/sources.csv#L1-L23"}  

- **Secure defaults:** Scripts remove previous outputs before regeneration and limit artifact copying to JSON/CSV/TXT, reducing accidental inclusion of binary or sensitive files.  

:codex-file-citation[codex-file-citation]{line_range_start=94 line_range_end=139 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L94-L139"}  

:codex-file-citation[codex-file-citation]{line_range_start=12 line_range_end=43 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L12-L43"}  

# 9. Project Health & Roadmap

- **Open work signals:** CSV notes and schema migration script (`scripts/migrate_to_v1_1.py`) indicate ongoing transitions toward a v1.1 data model; numerous activities and emission factors remain placeholders awaiting validated intensities.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=27 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L27"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=200 path=scripts/migrate_to_v1_1.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/migrate_to_v1_1.py#L1-L200"}  

- **Momentum areas:** Extensive automated tests covering data integrity (regions, vintages, grid scaling) show active investment in the calculation pipeline.  

:codex-file-citation[codex-file-citation]{line_range_start=7 line_range_end=70 path=tests/test_regions_present.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_regions_present.py#L7-L70"}  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=46 path=tests/test_vintage_matrix.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_vintage_matrix.py#L5-L46"}  

:codex-file-citation[codex-file-citation]{line_range_start=35 line_range_end=70 path=tests/test_online_grid_index_scaling.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_online_grid_index_scaling.py#L35-L70"}  

- **Neglected areas:** Documentation/onboarding and UI regression automation lag behind backend rigor. Committed artifacts in `dist/` have stale metadata, suggesting packaging automation is not part of routine workflows.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=9 path=dist/artifacts/manifest.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/manifest.json#L1-L9"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=28 path=dist/artifacts/export_view.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.json#L1-L28"}  

# 10. Recommendations

1. **Clean up and automate artifact publishing (Release/CI owners per maintenance calendar).** Committed outputs in `dist/` and `calc/outputs/` should be regenerated as part of release automation—or removed from version control—to prevent divergence between code and shipped data.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=45 path=calc/outputs/figures/stacked.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/outputs/figures/stacked.json#L1-L45"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=28 path=dist/artifacts/export_view.json git_url="https://github.com/chrislyons/carbon-acx/blob/main/dist/artifacts/export_view.json#L1-L28"}  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=13 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L8-L13"}  

:::task-stub{title="Automate artifact regeneration and remove stale outputs"}

1. Delete committed demo outputs under `calc/outputs/` and `dist/` from the repo; add corresponding paths to `.gitignore`.  
2. Extend the release pipeline (see `Makefile` targets `build`, `package`, `site`) to regenerate artifacts via `poetry run python -m calc.derive`, `scripts.package_artifacts`, and `scripts.build_site` during CI.  
3. Upload generated bundles as build artifacts or releases instead of storing them in git, ensuring `dist/` remains a build output directory.  

:codex-file-citation[codex-file-citation]{line_range_start=20 line_range_end=35 path=Makefile git_url="https://github.com/chrislyons/carbon-acx/blob/main/Makefile#L20-L35"}  

:codex-file-citation[codex-file-citation]{line_range_start=18 line_range_end=67 path=scripts/package_artifacts.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/package_artifacts.py#L18-L67"}  

:codex-file-citation[codex-file-citation]{line_range_start=117 line_range_end=218 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L117-L218"}  

:::

2. **Tighten dependency governance (Platform/DevTools owners).** Replace wildcard specs in `pyproject.toml` with semantically pinned ranges, document update cadence, and add automated vulnerability scanning or SBOM generation.  

:codex-file-citation[codex-file-citation]{line_range_start=8 line_range_end=16 path=pyproject.toml git_url="https://github.com/chrislyons/carbon-acx/blob/main/pyproject.toml#L8-L16"}  

:codex-file-citation[codex-file-citation]{line_range_start=3 line_range_end=1310 path=poetry.lock git_url="https://github.com/chrislyons/carbon-acx/blob/main/poetry.lock#L3-L1310"}  

:::task-stub{title="Pin direct dependencies and add supply-chain checks"}

1. Update `pyproject.toml` to specify compatible version ranges for direct dependencies (`pandas`, `pydantic`, `dash`, etc.), aligning with the versions currently locked in `poetry.lock`.  
2. Introduce a CI job that runs `poetry lock --check` and a vulnerability scanner (e.g., `poetry export` + `pip-audit`) to detect outdated packages.  
3. Generate and store an SBOM (CycloneDX via `poetry-plugin-cyclonedx`) alongside releases for downstream compliance.  

:::

3. **Enhance onboarding documentation (Docs owners).** Expand the README (and/or add CONTRIBUTING/architecture docs) describing the data pipeline, how to refresh datasets, run Dash/static site builds, and interpret maintenance responsibilities.  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=12 path=README.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/README.md#L1-L12"}  

:codex-file-citation[codex-file-citation]{line_range_start=380 line_range_end=573 path=calc/derive.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/calc/derive.py#L380-L573"}  

:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=26 path=docs/MAINTENANCE_CALENDAR.md git_url="https://github.com/chrislyons/carbon-acx/blob/main/docs/MAINTENANCE_CALENDAR.md#L1-L26"}  

:::task-stub{title="Document architecture and contributor workflow"}

1. Update `README.md` to include an architecture overview diagram of `app/` vs `calc/` vs `data/`.  
2. Add sections covering environment setup (`poetry install`), data refresh steps (`calc/derive`, CSV editing guidelines), and deployment (Dash vs static site).  
3. Create a `CONTRIBUTING.md` referencing maintenance cadences and domain owners, linking to `docs/ONLINE_METHOD_NOTES.md` for methodological context.  

:::

4. **Complete placeholder data and emission factors (Data & Schema owners).** Resolve rows marked with pending notes in `data/activities.csv`, `data/emission_factors.csv`, and schedules to ensure derived outputs reflect validated assumptions.  

:codex-file-citation[codex-file-citation]{line_range_start=5 line_range_end=27 path=data/activities.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activities.csv#L5-L27"}  

:codex-file-citation[codex-file-citation]{line_range_start=2 line_range_end=8 path=data/emission_factors.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/emission_factors.csv#L2-L8"}  

:codex-file-citation[codex-file-citation]{line_range_start=2 line_range_end=7 path=data/activity_schedule.csv git_url="https://github.com/chrislyons/carbon-acx/blob/main/data/activity_schedule.csv#L2-L7"}  

:::task-stub{title="Replace placeholder activity and emission-factor values"}

1. Audit each placeholder row in `data/activities.csv`, `data/emission_factors.csv`, and `data/activity_schedule.csv` to confirm required intensity data and units.  
2. Source validated emission factors and usage frequencies, updating `data/sources.csv` with citations/licensing for any new references.  
3. Re-run `calc/derive` to regenerate artifacts, updating tests/golden files (`tests/fixtures/export_view.golden.json`) as needed.  

:::

5. **Add automated UI/static-site smoke tests (App owners).** There is no regression safety net for Dash layouts or the static HTML builder; basic snapshot or accessibility checks would reduce manual QA burden.  

:codex-file-citation[codex-file-citation]{line_range_start=140 line_range_end=264 path=app/app.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/app/app.py#L140-L264"}  

:codex-file-citation[codex-file-citation]{line_range_start=117 line_range_end=218 path=scripts/build_site.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/scripts/build_site.py#L117-L218"}  

:codex-file-citation[codex-file-citation]{line_range_start=42 line_range_end=67 path=tests/test_figures.py git_url="https://github.com/chrislyons/carbon-acx/blob/main/tests/test_figures.py#L42-L67"}  

:::task-stub{title="Introduce smoke tests for Dash UI and static site"}

1. Create a pytest module (e.g., `tests/test_app_render.py`) that instantiates `app.create_app()` and asserts Dash layout structure (component IDs/classes) using Dash’s testing utilities.  
2. Add a test that runs `scripts.build_site.build_site` against fixture artifacts and validates generated HTML contains expected sections/headings (without requiring full Plotly rendering).  
3. Integrate these tests into the existing `make test` workflow to catch UI regressions automatically.  

:::