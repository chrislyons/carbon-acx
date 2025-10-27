# ACX002 Database & Performance Optimizations (Claude)

**Context**

This note captures Claude’s suggestions for strengthening the carbon accounting schema (ACX001). It assesses optimizations across database design, performance, and validation, and flags what should be adopted, adapted, or deferred. The baseline remains a CSV-in/CSV-out pipeline; suggestions that assume an RDBMS are evaluated in that light.

***

## 1. Proposed Optimizations (Claude)

1. **Normalization & IDs**

- Use stable surrogate keys (integers or UUIDs) for activities, emission factors, sources.
- Avoid text slugs as primary keys in relational contexts.

2. **Referential Integrity**

- Enforce foreign key constraints: activity_schedule → activities, emission_factors → activities, grid_intensity → sources.

3. **Enumerations & Constraints**

- Strongly type enumerated fields (scope boundaries, units, regions).
- Add explicit domain tables (scope_boundary, region, unit).

4. **Versioning / Provenance**

- Add `version` and `updated_at` columns to all tables.
- Record provenance for factors (calculation method, source, update cycle).

5. **Performance / Indexes**

- Index high-volume joins (activity_id, profile_id, source_id).
- Add compound indexes for schedule lookups (profile_id + activity_id).

6. **Audit / Logging**

- Maintain `audit_log` table for changes to emission factors.
- Log all inserts/updates with user + timestamp.

7. **Schema Evolution**

- Add `schema_version` table for compatibility across releases.

***

## 2. Applicability to CSV-Pipeline

Because we are not using a database (CSV in, CSV out only), many of Claude’s recommendations must be reinterpreted:

- **Normalization**: we can keep text IDs (`activity_id`, `ef_id`) as canonical slugs. Surrogate keys are not necessary in flat files.
- **Referential Integrity**: we enforce via Pydantic validators, not database constraints.
- **Enumerations**: implemented as Literals/Enums in `schema.py`. No need for separate domain tables.
- **Versioning/Provenance**: we can add `vintage_year`, `method_notes`, `source_id` columns (already present). Global `schema_version` can be captured in metadata exports, not a table.
- **Indexes**: irrelevant in CSV. Performance tuning left to pandas/Plotly transforms.
- **Audit/Logging**: out of scope for flat-file pipeline. Git history suffices for provenance.
- **Schema Evolution**: tracked in ACX00n documents and Git tags.

***

## 3. Adopt vs. Adapt vs. Defer

- **Adopt**

- Enumerations (scope_boundary, regions, units) via Pydantic validators.
- Referential checks implemented in schema models.
- Provenance fields already included (vintage_year, source_id).

- **Adapt**

- Schema versioning → handled via metadata in export files.
- Indexes → ignored; rely on efficient CSV parsing.
- Audit logs → replaced by Git history.

- **Defer**

- Surrogate IDs and relational normalization.
- Dedicated schema_version table.
- Full audit_log table.

***

## 4. Summary

Claude’s suggestions are useful as a checklist for robustness, but many are not directly applicable in a CSV-first design.

Our approach is to implement the spirit of his recommendations (validation, provenance, enumeration) in Pydantic models and Git version control, while skipping features that only make sense in a stateful database.

***