# **ACX016 Data Access Layer (DAL) Design**

**Purpose**

This document defines the architecture and rationale for introducing a **Data Access Layer (DAL)** in the carbon-acx project. The DAL allows the system to remain CSV-first for the Toronto/Ontario pilot, while keeping the option to swap in a relational database (SQLite, DuckDB, Postgres) at a later stage without disrupting the rest of the pipeline.

***

## **1. Context**

- The project is currently **CSV-in / CSV-out** only (see ACX001, ACX003).
- Pydantic models in calc/schema.py enforce schema rules, null-first discipline, and validation logic.
- Calculators (calc/derive.py, calc/figures.py) consume lists of these models and emit CSV/JSON outputs.
- Codex Cloud has now introduced a **DAL abstraction**, isolating the data source (CSV or DB) from the calculator logic.

This ensures:

- **Auditability**: CSVs remain transparent and Git-diffable.
- **Modularity**: Backends can be swapped by configuration, not code changes.
- **Future-proofing**: If scale or performance demands arise, DB storage can be adopted cleanly.

***

## **2. Architecture**

### **2.1 Components**

- **Protocol**:
DataStore defines the required methods for any backend.
- **CsvStore** (default):
Wraps the existing CSV loaders. Reads from /data/, applies null-first conversions, and instantiates Pydantic models.
- **Backend Factory**:
choose_backend() selects the implementation based on ACX_DATA_BACKEND environment variable. Currently supports only "csv".
- **Future Stores (planned)**:
    - SqlStore (SQLite/Postgres)
    - DuckStore (DuckDB/Parquet)
    - PgStore (Postgres with full constraints)

***

### **2.2 DAL Protocol Definition**

```javascript
class DataStore(Protocol):
    def load_activities(self) -> Sequence[Activity]: ...
    def load_emission_factors(self) -> Sequence[EmissionFactor]: ...
    def load_profiles(self) -> Sequence[Profile]: ...
    def load_activity_schedule(self) -> Sequence[ActivitySchedule]: ...
    def load_grid_intensity(self) -> Sequence[GridIntensity]: ...
```

All return values are lists of validated Pydantic models.

***

### **2.3 CSV Store Implementation**

- Reads CSVs with pandas, coerces NaN → None (null-first).
- Validates via schema models.
- Errors raised if units, regions, or scopes fail checks.
- No business logic or transforms beyond loading.

***

### **2.4 Factory and Env Switch**

```javascript
def choose_backend() -> DataStore:
    backend = (os.getenv("ACX_DATA_BACKEND") or "csv").lower()
    if backend == "csv":
        return CsvStore()
    raise ValueError(f"Unsupported ACX_DATA_BACKEND={backend}")
```

- Default: csv.
- Override: ACX_DATA_BACKEND=sqlite (future).
- Exposed in Makefile for build/run targets.

***

## **3. Integration**

- **calc/derive.py**: refactored to call DAL (ds = choose_backend()) and resolve activities, emission factors, profiles, schedules, and grid intensities.
- **app/app.py**: imports DAL at startup; allows swapping backend for Dash preview.
- **Tests**: tests/test_dal.py validates CsvStore loads cleanly and returns sequences of schema models.
- **Makefile**: ACX_DATA_BACKEND is now configurable; defaults to csv.

***

## **4. Migration Path (DB-ready)**

The DAL design allows seamless migration if/when a DB is introduced:

1. **Schema DDL**: Define relational schema with the same fields as v1.1 CSVs.
    - Primary keys: activity_id, ef_id, profile_id, source_id, unit_code, region_code.
    - Foreign keys: enforce relations between schedules, activities, emission factors, etc.
    - CHECK constraints: EF XOR rule, uncertainty bounds, schedule exclusivity, scope boundaries.
2. **SqlStore Implementation**: Add a new DAL backend using SQLite/Postgres/DuckDB. Implement all five loaders.
3. **Importer**: Write a one-time ingestion script to populate DB tables from current CSVs.
4. **Dual-run Phase**: CI runs both backends (CSV and DB) and diffs outputs (export_view.csv/json) to ensure parity.
5. **Flip**: Switch default to DB only if performance, concurrency, or scaling requires it.

***

## **5. Risks & Mitigations**

- **Schema drift**: If DB schema and CSV diverge. → Mitigate with DDL file under version control (db/schema.sql).
- **Type differences**: CSV treats all values as strings until validated; DB enforces native types. → Keep Pydantic as source of truth for validation.
- **Contributor confusion**: Non-technical users may expect to keep editing CSVs. → Maintain CSVs as the authoritative source until/if DB is adopted.

***

## **6. Status**

- **DAL introduced**: ✅ (CsvStore implemented, tested, wired into derive/app).
- **DB backends**: ⏳ not yet implemented.
- **Dual-run CI**: ⏳ planned for DB stage.
- **Documentation**: ✅ this ACX016 codifies design.

***

## **7. Change Log**

- **New**: DAL abstraction (Codex PR).
- **Changed**: derive.py now backend-agnostic.
- **Unchanged**: Data model, schema validations, outputs, null-first discipline.

***

📄 **ACX016** is now the canonical documentation of the DAL. It ties directly to ACX001–ACX003 (schema foundations) and ensures that the system is CSV-first today but DB-ready tomorrow.

***

Do you want me to package this into docs/ACX016_DAL.md so it lives alongside ACX001–ACX003 in the repo?