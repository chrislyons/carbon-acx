# **ACX040 View Manifest Specification (Provenance & Fidelity Contracts)**

**Version:** v1.0
**Date:** 2025-10-04
**Depends on:** ACX003 (Schema Architecture), ACX007 (Visualization & UX), ACX008 (Deployment), ACX009 (User Comms), ACX018 (Cross-layer Integration)
**Scope:** Defines the machine-readable manifest that binds every exported chart/table to its exact inputs, transformations, schema hash, citation set, and build metadata. Guarantees **determinism**, **traceability**, and **like-for-like comparability** across layers.

***

## 1) Purpose

- Make every visualization **rebuildable and auditable** from canonical CSVs.
- Lock **IEEE reference mappings** ([n] ↔ sources) per figure.
- Encode **layer_id**, **scope/vintage**, **uncertainty semantics**, and **hashes** so identical inputs → byte-identical outputs.
- Provide a **reverse-trace** contract (`trace_keys`) to retrieve upstream rows.

***

## 2) File locations & naming

```javascript
dist/
  artifacts/
    manifest.json                         # Collection index (all figures)
    figures/
      stacked.<sha8>.json
      bubble.<sha8>.json
      sankey.<sha8>.json
    references/
      stacked_refs.<sha8>.txt
      bubble_refs.<sha8>.txt
      sankey_refs.<sha8>.txt
    manifests/
      stacked.<sha8>.manifest.json         # One per figure (this spec)
      bubble.<sha8>.manifest.json
      sankey.<sha8>.manifest.json

```

- `<sha8>` is the first 8 hex chars of the **figure payload** SHA-256.
- `manifest.json` (collection index) summarizes all available figure manifests for the build.

***

## 3) Manifest JSON schema (authoritative)

Top-level type: **FigureManifest v1**.

```javascript
{
  "$schema": "https://carbon-acx.specs/v1/figure-manifest.schema.json",
  "type": "object",
  "required": [
    "manifest_version",
    "figure",
    "build",
    "dataset",
    "contracts",
    "inputs",
    "transforms",
    "outputs",
    "references",
    "trace_keys"
  ],
  "properties": {
    "manifest_version": { "type": "string", "pattern": "^1\\.0$" },

    "figure": {
      "type": "object",
      "required": ["id", "type", "layer_id", "title"],
      "properties": {
        "id":        { "type": "string" },                  // e.g., "stacked.7fc3a9d1"
        "type":      { "type": "string", "enum": ["stacked","bubble","sankey","table","heatmap"] },
        "layer_id":  { "type": "string" },                  // professional | light_industrial | heavy_industrial | online
        "title":     { "type": "string" },
        "notes":     { "type": "string" }
      }
    },

    "build": {
      "type": "object",
      "required": ["generated_at","build_id","schema_hash","code_hash","tooling"],
      "properties": {
        "generated_at": { "type": "string", "format": "date-time" },
        "build_id":     { "type": "string" },               // e.g., git sha + short ts
        "schema_hash":  { "type": "string" },               // SHA-256 of /data schema headers + validators
        "code_hash":    { "type": "string" },               // SHA-256 of calc pipeline (derive + slicers)
        "tooling": {
          "type": "object",
          "properties": {
            "python": { "type": "string" },                 // 3.11.x
            "packages": { "type": "array", "items": { "type": "string" } } // pinned versions
          }
        }
      }
    },

    "dataset": {
      "type": "object",
      "required": ["reference_year","scope_policy","gwp_horizon","region_policy"],
      "properties": {
        "reference_year": { "type": "integer" },           // e.g., 2025
        "scope_policy":   { "type": "string" },            // e.g., "WTT+TTW | cradle-to-grave | Electricity LCA"
        "gwp_horizon":    { "type": "string" },            // "GWP100 (AR6)"
        "region_policy":  { "type": "string" },            // "override>mix>profile_default>CA"
        "vintage_rules":  { "type": "string" }             // how multi-year factors were aligned
      }
    },

    "contracts": {
      "type": "object",
      "required": ["ingest","validate","derive","visualize"],
      "properties": {
        "ingest":   { "type": "string" },                  // contract id/version
        "validate": { "type": "string" },                  // schema/enum checks applied
        "derive":   { "type": "string" },                  // calculation contract id
        "visualize":{ "type": "string" }                   // figure slicer contract id
      }
    },

    "inputs": {
      "type": "object",
      "required": ["tables","rows","sources"],
      "properties": {
        "tables": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path","sha256","row_count"],
            "properties": {
              "path":      { "type": "string" },           // e.g., data/emission_factors.csv
              "sha256":    { "type": "string" },
              "row_count": { "type": "integer" }
            }
          }
        },
        "rows": {
          "type": "object",
          "properties": {
            "activities":        { "type": "integer" },
            "emission_factors":  { "type": "integer" },
            "profiles":          { "type": "integer" },
            "activity_schedule": { "type": "integer" },
            "grid_intensity":    { "type": "integer" },
            "sources":           { "type": "integer" },
            "units":             { "type": "integer" }
          }
        },
        "sources": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["source_id","citation","url"],
            "properties": {
              "source_id": { "type": "string" },
              "citation":  { "type": "string" },           // IEEE string
              "url":       { "type": "string" }
            }
          }
        }
      }
    },

    "transforms": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name","version","params","sha256_before","sha256_after"],
        "properties": {
          "name":          { "type": "string" },           // e.g., "derive.annualize"
          "version":       { "type": "string" },
          "params":        { "type": "object" },           // e.g., days_per_year, office_day_weight
          "sha256_before": { "type": "string" },           // content hash of prior stage slice
          "sha256_after":  { "type": "string" }
        }
      }
    },

    "outputs": {
      "type": "object",
      "required": ["figure_path","figure_sha256","download_csv","download_refs","numeric_invariance"],
      "properties": {
        "figure_path":       { "type": "string" },         // dist/artifacts/figures/stacked.<sha8>.json
        "figure_sha256":     { "type": "string" },
        "download_csv":      { "type": "string" },
        "download_refs":     { "type": "string" },
        "numeric_invariance": {
          "type": "object",
          "required": ["pre_agg_sum","post_agg_sum","tolerance_pct","passed"],
          "properties": {
            "pre_agg_sum":   { "type": "number" },         // g or kg, as declared
            "post_agg_sum":  { "type": "number" },
            "tolerance_pct": { "type": "number" },         // default 0.01
            "passed":        { "type": "boolean" }
          }
        }
      }
    },

    "references": {
      "type": "object",
      "required": ["order","index_map"],
      "properties": {
        "order": {
          "type": "array",                                 // [SRC.X, SRC.Y, ...] in the exact [n] order
          "items": { "type": "string" }
        },
        "index_map": {
          "type": "object",                                // { "SRC.X": 1, "SRC.Y": 2 }
          "additionalProperties": { "type": "integer" }
        }
      }
    },

    "trace_keys": {
      "type": "object",
      "required": ["figure_id","upstream_keys"],
      "properties": {
        "figure_id": { "type": "string" },
        "upstream_keys": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["table","key_fields"],
            "properties": {
              "table":      { "type": "string" },          // e.g., "emission_factors"
              "key_fields": { "type": "array", "items": { "type": "string" } } // e.g., ["ef_id","activity_id","profile_id"]
            }
          }
        }
      }
    }
  }
}

```

***

## 4) Minimal example (stacked bar)

```javascript
{
  "manifest_version": "1.0",
  "figure": {
    "id": "stacked.7fc3a9d1",
    "type": "stacked",
    "layer_id": "professional",
    "title": "Annual Composition — Toronto Pro (2025)"
  },
  "build": {
    "generated_at": "2025-10-04T21:05:02Z",
    "build_id": "bld_20251004_7d2e1a9",
    "schema_hash": "sha256:5c5e...d1",
    "code_hash": "sha256:8aa0...44",
    "tooling": { "python": "3.11.6", "packages": ["pydantic==2.9.0","pandas==2.2.2"] }
  },
  "dataset": {
    "reference_year": 2025,
    "scope_policy": "WTT+TTW; Electricity operational",
    "gwp_horizon": "GWP100 (AR6)",
    "region_policy": "override>mix>profile_default>CA"
  },
  "contracts": {
    "ingest": "acx.ingest.v1",
    "validate": "acx.validate.v1",
    "derive": "acx.derive.v1.annualize",
    "visualize": "acx.figure.v1.stacked"
  },
  "inputs": {
    "tables": [
      {"path":"data/activities.csv","sha256":"sha256:a1...","row_count":120},
      {"path":"data/emission_factors.csv","sha256":"sha256:b2...","row_count":340},
      {"path":"data/sources.csv","sha256":"sha256:c3...","row_count":78}
    ],
    "rows": { "activities":120, "emission_factors":340, "sources":78 },
    "sources": [
      {"source_id":"SRC.IPCC.AR6.2021","citation":"[1] ...","url":"https://..."},
      {"source_id":"SRC.IESO.2025","citation":"[2] ...","url":"https://..."}
    ]
  },
  "transforms": [
    {
      "name": "derive.annualize",
      "version": "1.1.0",
      "params": {"days_per_year":365,"office_day_weight":0.43},
      "sha256_before": "sha256:0f...",
      "sha256_after":  "sha256:27..."
    },
    {
      "name": "slice.stacked",
      "version": "1.0.0",
      "params": {"layer_id":"professional","unit":"kg_CO2e_year"},
      "sha256_before": "sha256:27...",
      "sha256_after":  "sha256:7fc3a9d1..."
    }
  ],
  "outputs": {
    "figure_path": "artifacts/figures/stacked.7fc3a9d1.json",
    "figure_sha256": "sha256:7fc3a9d1...",
    "download_csv": "artifacts/figures/stacked.7fc3a9d1.csv",
    "download_refs": "artifacts/references/stacked_refs.7fc3a9d1.txt",
    "numeric_invariance": { "pre_agg_sum": 2412.6, "post_agg_sum": 2412.6, "tolerance_pct": 0.01, "passed": true }
  },
  "references": {
    "order": ["SRC.IPCC.AR6.2021","SRC.IESO.2025"],
    "index_map": { "SRC.IPCC.AR6.2021": 1, "SRC.IESO.2025": 2 }
  },
  "trace_keys": {
    "figure_id": "stacked.7fc3a9d1",
    "upstream_keys": [
      {"table":"emission_factors","key_fields":["ef_id","activity_id","region","vintage_year"]},
      {"table":"activity_schedule","key_fields":["profile_id","activity_id"]}
    ]
  }
}

```

***

## 5) Determinism rules

- **Hash scope**
    - `schema_hash`: SHA-256 over the concatenation of CSV headers (ordered), enum lists, and validator code signatures.
    - `code_hash`: SHA-256 over `calc/derive.py`, `calc/figures.py`, and any referenced slicers (normalized whitespace).
    - **Figure hash** `<sha8>`: SHA-256 over the canonical, minified **JSON figure payload** (excluding non-deterministic fields like timestamps).
- **Invariance check**
    - Every figure must record `numeric_invariance` comparing pre-aggregation export sum vs post-slice sum in the displayed unit.
    - Default tolerance: **0.01%**; failure → CI red.

***

## 6) Reverse-trace contract

- Frontend may call `/trace/{figure_id}`.
- Server returns:
    - the **manifest** (verbatim), and
    - a compact list of **row keys** (from `trace_keys.upstream_keys`) that produced the visible series.
- A separate endpoint `/trace/rows` accepts `{ table, key_fields }` to return exact rows (CSV or JSON).

***

## 7) Integration into the build

### 7.1 Pipeline hooks

- After `derive` completes and before writing a figure slice:
    1. Compute `schema_hash`, `code_hash`.
    2. Compute invariance metrics.
    3. Resolve **reference order** from the *actual* series included in the figure.
    4. Emit `manifests/<figure>.<sha8>.manifest.json`.
- After all figures:
    - Emit `artifacts/manifest.json` (collection index: list of figure ids, paths, hashes, layer_id, reference_year).

### 7.2 CI gates (extend ACX008)

- **tests/test_manifests.py**:
    - JSON schema validation for each manifest.
    - `numeric_invariance.passed == true`.
    - `references.order` aligns with the refs file lines (1-indexed).
    - `figure_sha256` matches the actual file hash.

***

## 8) Frontend bindings (extend ACX007)

- Load figure → read sibling manifest (same `<sha8>`).
- Render References pane from `references.order` by joining with `inputs.sources`.
- Display **Disclosure block** using `dataset` and `contracts`.
- Provide a “View lineage” affordance → shows `inputs.tables`, `transforms` chain, and “Copy trace keys.”

***

## 9) Pydantic model (drop-in)

```javascript
# calc/manifest_model.py
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Dict, Any, Optional
from datetime import datetime

class BuildInfo(BaseModel):
    generated_at: datetime
    build_id: str
    schema_hash: str
    code_hash: str
    tooling: Dict[str, Any] = {}

class FigureInfo(BaseModel):
    id: str
    type: str
    layer_id: str
    title: str
    notes: Optional[str] = None

class DatasetInfo(BaseModel):
    reference_year: int
    scope_policy: str
    gwp_horizon: str
    region_policy: str
    vintage_rules: Optional[str] = None

class ContractInfo(BaseModel):
    ingest: str
    validate: str
    derive: str
    visualize: str

class InputTable(BaseModel):
    path: str
    sha256: str
    row_count: int

class SourceEntry(BaseModel):
    source_id: str
    citation: str
    url: Optional[str] = None

class Inputs(BaseModel):
    tables: List[InputTable]
    rows: Dict[str, int] = {}
    sources: List[SourceEntry]

class TransformStep(BaseModel):
    name: str
    version: str
    params: Dict[str, Any]
    sha256_before: str
    sha256_after: str

class NumericInvariance(BaseModel):
    pre_agg_sum: float
    post_agg_sum: float
    tolerance_pct: float = 0.01
    passed: bool

class Outputs(BaseModel):
    figure_path: str
    figure_sha256: str
    download_csv: str
    download_refs: str
    numeric_invariance: NumericInvariance

class References(BaseModel):
    order: List[str]
    index_map: Dict[str, int]

class TraceKey(BaseModel):
    table: str
    key_fields: List[str]

class TraceInfo(BaseModel):
    figure_id: str
    upstream_keys: List[TraceKey]

class FigureManifest(BaseModel):
    manifest_version: str = Field(pattern="^1\\.0$")
    figure: FigureInfo
    build: BuildInfo
    dataset: DatasetInfo
    contracts: ContractInfo
    inputs: Inputs
    transforms: List[TransformStep]
    outputs: Outputs
    references: References
    trace_keys: TraceInfo

```

***

## 10) Makefile additions (build & verify)

```javascript
# Build manifests alongside figures
manifests:
	PYTHONPATH=. poetry run python -m calc.figures_manifest

verify_manifests:
	PYTHONPATH=. poetry run pytest -q tests/test_manifests.py

```

***

## 11) Governance & versioning

- Bump `**manifest_version**` only for **backward-incompatible** changes.
- Keep older readers tolerant to unknown fields (ignore extras).
- Track the manifest schema URL (`$schema`) to enable external validation.

***

## 12) Risks & mitigations

- **Drift between refs and visible series** → CI gate verifies [n] numbering.
- **Hidden nondeterminism** (e.g., iteration order) → enforce stable sort keys before hashing.
- **Performance overhead** → hashing and invariance checks run on **slices**, not full dataframes; negligible at your current scale.

***

## 13) Deliverables

- `calc/manifest_model.py` (above).
- `calc/figures_manifest.py` (writer) and tests.
- `artifacts/manifests/*.manifest.json` per figure + `artifacts/manifest.json` (collection).
- CI test suite updates.

***