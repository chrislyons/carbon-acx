# **ACX010 Testing & Validation Plan (Canada Pilot, v1.1)**

**Purpose**

Establish a **comprehensive testing and validation framework** for carbon-acx. This ensures data integrity, correctness of schema and calculations, reproducibility of outputs, strict adherence to IEEE citation policy, and high reliability of deployments. Testing spans unit, integration, data, visual artifacts, and regression checks, all enforced in CI/CD (ACX008).

***

## **1. Principles**

- **Fail fast**: invalid data or schema violations must break builds before deployment.
- **Null-first**: blanks remain blanks; no silent coercion to zero.
- **IEEE strictness**: every [n] shown must resolve to a line in sources.csv.
- **Determinism**: identical inputs produce identical outputs; any diff must be explained by data or schema change.
- **Dual backend parity**: CSV and DB/DuckDB backends (future) must produce byte-equivalent outputs.

***

## **2. Test Categories**

### **2.1 Schema Validation**

- **Files covered**: activities.csv, emission_factors.csv, profiles.csv, activity_schedule.csv, grid_intensity.csv, sources.csv, units.csv.
- **Checks**:
    - Header exactness (field names must match schema).
    - Mandatory fields populated (IDs, units, regions).
    - Unit validation: all default_unit and EF unit must exist in units.csv.
    - Region codes restricted to ISO-3166-2 + CA fallback.
    - Scope boundaries restricted to literals (WTT+TTW, cradle-to-grave, Electricity LCA, gate-to-gate).
- **Implementation**: Pydantic validators (schema.py) + pytest test_schema.py.

### **2.2 Emission Factor Logic**

- **Checks**:
    - Mutual exclusion: either value_g_per_unit OR grid-indexed EF; never both.
    - If grid-indexed, is_grid_indexed=True and electricity_kwh_per_unit > 0.
    - Uncertainty: if bounds given, low ≤ mean ≤ high.
    - Vintage ≤ current year.
- **Implementation**: pytest test_schema.py::test_emission_factors.

### **2.3 Grid Intensity Precedence**

- **Checks**:
    - Resolution order: region_override > mix_region > profile_default > CA.
    - For every schedule row, effective region resolves to a valid grid intensity.
    - Profiles spanning multiple provinces must document grid_strategy.
- **Implementation**: pytest test_grid_index.py.

### **2.4 Schedule Rules**

- **Checks**:
    - Cannot specify both freq_per_day and freq_per_week.
    - Allow both null (inert placeholders).
    - office_days_only is boolean with default False.
- **Implementation**: pytest test_schema.py::test_schedule_rules.

### **2.5 Citation & Source Integrity**

- **Checks**:
    - Every source_id in CSVs resolves to sources.csv.
    - sources.csv rows must contain IEEE string, URL, year ≤ current year.
    - Every [n] in figure slices (figures/*.json) maps to line in references/*.txt.
- **Implementation**: pytest test_citations.py.

### **2.6 Figure Slice Integrity**

- **Checks**:
    - Totals equal sum of parts (within rounding tolerance).
    - Low/high ranges preserved (not lost in slice).
    - No dangling [n].
- **Implementation**: pytest test_figures.py.

### **2.7 Golden Artifacts (Regression)**

- **Mechanism**: store small reference outputs (calc/outputs/test_export_view.json) in tests/fixtures/.
- **Checks**: new builds must match golden outputs unless intentional changes are documented in PR.
- **Purpose**: detect unintentional drift in calculation logic.

### **2.8 Integration Tests**

- **Checks**:
    - Run make build end-to-end with Ontario pilot data; verify successful outputs.
    - CI uploads artifacts and ensures manifest.json contains all required keys (regions, vintages, sources).
- **Implementation**: pytest test_integration.py.

### **2.9 Dual Backend Parity (Future)**

- **When DB backend is added** (ACX016):
    - Run builds with ACX_DATA_BACKEND=csv and duckdb.
    - Diff export_view.json outputs → must be identical.
- **Implementation**: pytest test_backend_parity.py.

***

## **3. CI/CD Enforcement**

- **GitHub Actions** (ACX008):
    - Linting (ruff, black).
    - Unit + integration tests.
    - Artifact build.
    - Reference integrity check.
- **Branch protection**:
    - /data/*.csv cannot merge unless make validate && make build passes.
    - /calc/schema.py changes require CODEOWNER review.
- **Preview builds**: every PR generates artifacts for human review.

***

## **4. Developer Workflow**

1. **Edit data** → run make validate.
2. **Run build** → make build.
3. **Check app** → make app to visually confirm.
4. **Run full test suite** → pytest -q.
5. **Golden artifact check** → if regression diff, update fixture only if change is intentional.
6. **Open PR** → CI runs all tests + builds Preview on Cloudflare Pages.

***

## **5. Quality Gates**

- **Unit coverage ≥ 80%** for schema & calc modules.
- **No lint errors**; ruff + black enforced.
- **All tests must pass**; no allowed failures.
- **Artifact integrity check**: export must contain references, no null key fields.

***

## **6. Risks & Mitigations**

- **Schema drift**: mitigated by golden artifacts + strict tests.
- **Citation mismatch**: mitigated by automated [n] → IEEE reference checks.
- **Human error in CSV edits**: mitigated by CI rejection of malformed or non-null-first rows.
- **Backend divergence**: mitigated by parity tests once DB backend is implemented.

***

## **7. Deliverables**

- tests/test_schema.py — schema & EF validation.
- tests/test_grid_index.py — region precedence.
- tests/test_citations.py — sources & IEEE mapping.
- tests/test_figures.py — figure integrity.
- tests/test_integration.py — end-to-end build checks.
- tests/test_backend_parity.py — future DB/CSV parity.
- tests/fixtures/*.json — golden outputs.
- docs/ACX010_TEST_PLAN.md — this document.

***

## **8. References**

[1] Greenhouse Gas Protocol, “Technical Guidance for Calculating Scope 1 and 2 Emissions,” 2015. Available: https://ghgprotocol.org/

[2] Intergovernmental Panel on Climate Change (IPCC), “Climate Change 2021: The Physical Science Basis—AR6 WG1 Contribution,” 2021. Available: https://www.ipcc.ch/report/ar6/wg1/

[3] IEEE, “IEEE Citation Guidelines,” 2024. Available: https://ieee-dataport.org/citation-guidelines

[4] Python Software Foundation, “pytest Documentation,” 2025. Available: https://docs.pytest.org/

[5] GitHub, “About Protected Branches,” 2025. Available: https://docs.github.com/repositories/configuring-branches-and-merges/managing-protected-branches