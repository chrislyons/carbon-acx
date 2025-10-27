# Scenario comparison

The scenario comparison view surfaces the difference between a baseline and comparison scenario at both the activity and category level.

## Category aggregation

Category summaries are produced by grouping each changed, added, or removed activity by a chosen basis key and summing the signed emission deltas.

- **Basis keys** – Supported values are `activity.category` (default) and `layer_id`. Activity metadata from the catalog is used to resolve each key.
- **Ordering** – Buckets are sorted by descending absolute delta, with lexical ordering as a tie-breaker to keep provenance deterministic.
- **Rounding** – All totals and deltas are rounded to four decimal places before presentation. Percentage deltas are computed against the rounded baseline total. When the rounded baseline total is zero and the comparison total is non-zero, the percentage delta resolves to positive infinity.
- **Null handling** – Baseline or comparison totals that are missing remain null-first and are not coerced to zero during aggregation.

These rules ensure that category-level stacks mirror the underlying row-level scenario diff within a tolerance of `1e-6`.
