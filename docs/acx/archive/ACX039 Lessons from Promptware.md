Here is the full document, written to Carbon ACX house standards.

***

# **ACX039 — Translation Architecture Lessons (Promptware Parallels)**

**Version:** v1.0
**Date:** 2025-10-04
**Derived from:** Comparative analysis of Promptware (open-source repo [https://github.com/Promptware-dev/promptware](https://github.com/Promptware-dev/promptware); site [https://promptware.dev](https://promptware.dev/))
**Author:** Boot Industries / Carbon ACX Project

***

## **Purpose**

Extract architectural and design lessons from **Promptware**—an open-source, cross-language code-translation framework—and reinterpret them for the **Carbon ACX** domain, where translation occurs not between programming languages but between **data layers, analytic models, and visual representations**.

Promptware demonstrates a rigorous approach to semantic equivalence across representations. Carbon ACX aims for the same fidelity between source datasets, derived metrics, and user-facing narratives. This document codifies what can be adapted and what must be ignored.

***

## **1. Context**

Promptware converts agent definitions (`.pw` files) into production-ready servers across Python, Go, Rust, Node, and C#. It maintains a **canonical intermediate representation** and ensures each generated runtime expresses identical intent.

Carbon ACX, by contrast, translates **heterogeneous carbon data** into a consistent analytic frame (activities → emission factors → profiles → visualizations). Where Promptware guarantees *code-path equivalence*, Carbon ACX must guarantee *semantic-data equivalence*—the same truth rendered through numeric, visual, and textual layers.

Both systems therefore share a structural concern: **translation without distortion**.

***

## **2. Core Analogy**

| Dimension | Promptware | Carbon ACX |
| --- | --- | --- |
| Canonical artifact | `.pw` agent spec | `/data/*.csv` + Pydantic schema |
| Translation target | Source-code generators | Derived CSV → JSON → Plotly artefacts |
| Equivalence contract | Language-agnostic semantics | Scope- and region-agnostic emissions |
| Reverse direction | Code → spec | Chart → source traceback |
| Validation surface | Type signatures, API tests | Schema validators, provenance checks |
| End-user focus | Developers | Data interpreters / public users |

***

## **3. Architectural Lessons**

### **3.1 Intermediate Representation Discipline**

Promptware’s `.pw` files are the single source of truth.
Carbon ACX should treat its validated CSV + schema combination as **the canonical translation layer**, not merely storage.

- Every downstream artefact—`export_view.json`, `stacked.json`, `bubble.json`, textual disclosures—must rebuild from the canonical schema, never from an intermediate dataset.
- Add a **“view manifest”** capturing: input files + schema hash + transformation steps + timestamp.
- This enables deterministic regeneration and auditable provenance.

### **3.2 Bidirectional Translation Mindset**

Promptware both compiles and de-compiles.
Carbon ACX should mirror this through **data lineage reversibility**:

- Forward: `raw → normalized → derived → visualized`.
- Reverse: from any visual element, reconstruct contributing rows and source IDs.

Embed lineage metadata directly in Plotly traces and hover tooltips (“From SRC.IPCC.AR6.2021 → EF.TRAN.TTC.SUBWAY.KM → Profile PRO.TO.24_39”).

### **3.3 Contract Boundaries**

Promptware enforces strict agent I/O contracts.
Carbon ACX should formalize equivalent **layer contracts**:

- **Data Ingestion → Validation**: enforce header, type, unit, and region conformance.
- **Validation → Derivation**: enforce scope boundary and vintage rules.
- **Derivation → Visualization**: enforce numeric range and uncertainty propagation.

Each contract failure halts the build; CI should report the exact boundary violated.

### **3.4 Extensible Adapters**

Promptware’s tool adapters isolate dependencies.
Carbon ACX can implement **source adapters** for recurring data families (ECCC, NRCan, IESO, StatCan).

Adapter outputs must always conform to the canonical schema, exposing metadata: `source_id`, `vintage_year`, `scope_boundary`, `license`.

### **3.5 Deterministic Builds and Versioning**

Promptware hashes `.pw` specs to verify generated parity.
Carbon ACX should record `schema_hash` and `build_id` within each derived artifact header:

```javascript
# schema_hash=sha256:abcd1234…
# generated_at=2025-10-04T21:00:00Z

```

Any identical inputs must yield byte-identical outputs. This underpins reproducibility and aligns with ACX017 Governance §4.

### **3.6 Error Transparency**

Promptware surfaces generation errors with full spec context.
Carbon ACX should mirror this: errors in factor resolution, unit mismatch, or null-violation should be emitted as structured diagnostics (`error.json`) consumable by CI and front-end debuggers.

***

## **4. Data Translation Implications**

1. **Canonical Schema as Semantic Anchor**
    - Schema defines meaning, not only format.
    - Version all numeric columns and enforce explicit uncertainty semantics (`low`, `mean`, `high`).
2. **Layer Awareness (ACX018 alignment)**
    - Every dataset and figure slice must carry `layer_id`.
    - Translation functions operate within one layer; cross-layer comparisons occur only through normalized units (e.g., kg CO₂e/year).
3. **Translation Fidelity Metrics**
    - Introduce a small validator comparing aggregated results before/after visualization to confirm numerical invariance.
    - Record discrepancies > 0.01 % as CI warnings.
4. **Reverse Trace API**
    - Provide a `/trace/{figure_id}` endpoint returning all upstream rows and sources, closing the audit loop for end users.
5. **Schema as Public Contract**
    - Publish `schema.json` with every release; downstream clients (dashboards, analysts) consume it rather than guessing column names.

***

## **5. Frontend and Component Lessons**

Promptware.dev’s visual excellence derives from disciplined componentization, not aesthetic excess. The same principles directly benefit Carbon ACX.

### **5.1 Component Modularity**

- Each visualization type (stacked, bubble, sankey, reference panel) is an independent React component with typed props.
- Containers (layout grids, tabs) orchestrate composition; logic never leaks across components.

### **5.2 Design Tokens and Theming**

- Centralize color, spacing, and typography tokens; enforce through Tailwind config or CSS variables.
- Support WCAG 2.1 contrast ratios ≥ 4.5 : 1.
- Apply consistent motion easings and durations (prefers-reduced-motion compliant).

### **5.3 Micro-interaction Hygiene**

- Use Framer Motion for fade/slide reveals triggered by intersection observers.
- Keep animation budget < 150 ms to avoid “dashboard lag.”
- Disable all non-essential transitions when `prefers-reduced-motion` is true.

### **5.4 Performance and Progressive Loading**

- Pre-render disclosure text; lazy-load Plotly bundles on visibility.
- Chunk heavy traces to avoid initial JS overhead.
- Maintain ≤ 1.5 s First Contentful Paint on mid-range laptops.

### **5.5 Content / Data Separation**

- All copy blocks (scope, uncertainty, references) reside in Markdown or JSON.
- Editors update language independently of code merges.
- Guarantees parity with ACX009 User Communication Plan §3–5.

### **5.6 Reference Manifest Binding**

- Each visualization auto-generates a References pane by joining visible `source_id`s with `sources.csv`.
- The [n] indices in hover labels must always align with the manifest order.

### **5.7 Accessibility and Governance**

- Run WCAG audit pre-deploy; CI fails if contrast or ARIA labels missing.
- Include schema and manifest metadata in `<meta data-schema>` tags for machine readers.

***

## **6. Translation Philosophy (Generalized)**

1. **One truth per dataset:** a single canonical schema drives all downstream views.
2. **Fidelity > convenience:** never modify derived data for aesthetic fit.
3. **Bidirectional traceability:** users can navigate from any number to its source.
4. **Contracts explicit, never implicit:** every transformation declares inputs and outputs.
5. **Composable presentation:** visuals are declarative renderings, not one-off scripts.
6. **Provenance is UX:** surfacing lineage increases trust and understanding.

***

## **7. Non-transferable Elements**

The following Promptware mechanisms do *not* map to Carbon ACX:

| Feature | Reason for Exclusion |
| --- | --- |
| Cross-language code generation | ACX users do not author code. |
| Reverse AST parsing | No relevance; ACX ingests datasets, not source code. |
| Developer CLI workflow | ACX pipelines run via CI/CD and web triggers. |
| Agent runtime abstractions | ACX runtime is static (visualization), not execution. |

***

## **8. Implementation Roadmap**

| Phase | Action | Linked Doc |
| --- | --- | --- |
| 1 | Define view manifest spec (JSON schema) | aligns with ACX018 §3.4 |
| 2 | Integrate schema hash and build ID in `derive.py` outputs | extends ACX010 Testing |
| 3 | Add reverse-trace endpoint (`/trace/{figure}`) | new feature 2025-Q4 |
| 4 | Formalize source adapters for ECCC and IESO feeds | extends ACX006 |
| 5 | Implement WCAG + Lighthouse CI checks in deploy workflow | extends ACX008 |
| 6 | Publish schema and manifest metadata to Cloudflare Pages headers | governance ACX017 |

***

## **9. Summary**

Promptware’s value lies not in its code generation but in its **discipline of translation fidelity**.
Carbon ACX can apply the same logic to data: one canonical source, bidirectional lineage, clear contracts, and reproducible builds.

Adopting these principles strengthens **trust, transparency, and maintainability**—the same goals articulated in ACX017 and ACX018—while preserving the visual clarity demanded by ACX009.

***

## **10. References**

[1] Promptware-dev, “Promptware Repository,” GitHub, 2025. Available: [https://github.com/Promptware-dev/promptware](https://github.com/Promptware-dev/promptware)
[2] Promptware, “Promptware Website,” 2025. Available: [https://promptware.dev](https://promptware.dev/)
[3] Boot Industries, “Carbon ACX Documentation Set,” 2025 (Across ACX000–ACX018).
[4] World Wide Web Consortium, “Web Content Accessibility Guidelines (WCAG) 2.1,” 2018. Available: [https://www.w3.org/TR/WCAG21/](https://www.w3.org/TR/WCAG21/)

***

Would you like me to draft the **view manifest spec** (mentioned in §8 Phase 1) next? It would define how each visualization binds to its inputs, sources, schema hash, and references—essentially a lightweight provenance layer bridging ACX003 and ACX018.