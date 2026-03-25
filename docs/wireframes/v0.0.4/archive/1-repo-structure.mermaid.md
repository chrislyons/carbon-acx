%% Carbon ACX Repository Structure
%% Version: v0.0.4 (Nov 2025)
%% Reflects Next.js 15 rebuild (ACX093) and 3D Universe integration (ACX084/ACX094)

graph TB
    ROOT["/carbon-acx<br/>(Project Root)"]

    subgraph "Data Layer"
        DATA["data/<br/>Canonical CSV Files<br/>(activities, emission_factors,<br/>grid_intensity, etc.)"]
        DATA_STAGED["data/_staged/<br/>Staging Area<br/>for Data Updates"]
    end

    subgraph "Python Backend"
        CALC["calc/<br/>Derivation Engine<br/>(6,901 lines)"]
        CALC_DERIVE["calc/derive.py<br/>Main derivation<br/>(1,926 lines)"]
        CALC_SCHEMA["calc/schema.py<br/>Pydantic models<br/>(725 lines)"]
        CALC_FIGURES["calc/figures.py<br/>Figure generation<br/>(727 lines)"]
        CALC_MANIFEST["calc/figures_manifest.py<br/>Manifest bundling<br/>(183 lines)"]
        CALC_DAL["calc/dal/<br/>Data Access Layer<br/>(CSV, DuckDB, aliases)"]
        CALC_UTILS["calc/utils/<br/>hashio.py<br/>(SHA256 utilities)"]
    end

    subgraph "Frontend Applications"
        APPS["apps/"]
        WEB_PRIMARY["apps/carbon-acx-web/<br/>Next.js 15 Frontend<br/>(PRIMARY)"]
        WEB_LEGACY["apps/carbon-acx-web-legacy/<br/>Vite+React<br/>(being phased out)"]

        WEB_SRC["src/<br/>Application Source"]
        WEB_APP["src/app/<br/>Next.js App Router<br/>(pages, API routes)"]
        WEB_COMPONENTS["src/components/<br/>React Components<br/>(layout, viz, domain)"]
        WEB_LIB["src/lib/<br/>Server-side utilities<br/>(manifests.ts)"]
        WEB_TYPES["src/types/<br/>TypeScript definitions"]
    end

    subgraph "Build Outputs"
        DIST["dist/"]
        ARTIFACTS["dist/artifacts/<hash>/<br/>Content-addressed outputs"]
        MANIFESTS["manifests/<br/>Figure manifests<br/>(provenance + byte hashes)"]
        FIGURES["figures/<br/>Generated data<br/>(JSON emissions data)"]
        REFERENCES["references/<br/>Citation lineage"]
    end

    subgraph "Edge Functions"
        FUNCTIONS["functions/<br/>Cloudflare Pages<br/>Functions"]
        WORKERS["workers/<br/>Cloudflare Workers<br/>(future use)"]
    end

    subgraph "Documentation"
        DOCS["docs/"]
        ACX["docs/acx/<br/>ACX series docs<br/>(ACX000-ACX096)"]
        ACX_INDEX["docs/acx/INDEX.md<br/>Doc catalog"]
        ACX_084["docs/acx/ACX084.md<br/>3D Universe"]
        ACX_093["docs/acx/ACX093.md<br/>Next.js 15 rebuild"]
        WIREFRAMES["docs/wireframes/<br/>Mermaid diagrams<br/>(v0.0.1-v0.0.4)"]
        GUIDES["docs/guides/<br/>Developer guides"]
    end

    subgraph "Testing"
        TESTS["tests/<br/>Python test suite<br/>(pytest)"]
        WEB_TESTS["apps/carbon-acx-web/tests/<br/>Frontend tests<br/>(Vitest, Playwright)"]
    end

    subgraph "Configuration"
        MAKEFILE["Makefile<br/>Build orchestration<br/>(176 lines)"]
        PYPROJECT["pyproject.toml<br/>Python deps<br/>(Poetry)"]
        PKG_ROOT["package.json<br/>Monorepo root<br/>(pnpm workspace)"]
        PKG_WEB["apps/carbon-acx-web/<br/>package.json<br/>(Next.js deps)"]
        NEXT_CONFIG["apps/carbon-acx-web/<br/>next.config.ts<br/>(Next.js config)"]
        WRANGLER["apps/carbon-acx-web/<br/>wrangler.toml<br/>(Cloudflare config)"]
        CLAUDE_MD["CLAUDE.md<br/>Development guide<br/>(v3.0)"]
    end

    ROOT --> DATA
    ROOT --> CALC
    ROOT --> APPS
    ROOT --> DIST
    ROOT --> FUNCTIONS
    ROOT --> DOCS
    ROOT --> TESTS
    ROOT --> MAKEFILE
    ROOT --> PYPROJECT
    ROOT --> PKG_ROOT
    ROOT --> CLAUDE_MD

    DATA --> DATA_STAGED

    CALC --> CALC_DERIVE
    CALC --> CALC_SCHEMA
    CALC --> CALC_FIGURES
    CALC --> CALC_MANIFEST
    CALC --> CALC_DAL
    CALC --> CALC_UTILS

    APPS --> WEB_PRIMARY
    APPS --> WEB_LEGACY

    WEB_PRIMARY --> WEB_SRC
    WEB_PRIMARY --> PKG_WEB
    WEB_PRIMARY --> NEXT_CONFIG
    WEB_PRIMARY --> WRANGLER

    WEB_SRC --> WEB_APP
    WEB_SRC --> WEB_COMPONENTS
    WEB_SRC --> WEB_LIB
    WEB_SRC --> WEB_TYPES

    DIST --> ARTIFACTS
    ARTIFACTS --> MANIFESTS
    ARTIFACTS --> FIGURES
    ARTIFACTS --> REFERENCES

    DOCS --> ACX
    DOCS --> WIREFRAMES
    DOCS --> GUIDES

    ACX --> ACX_INDEX
    ACX --> ACX_084
    ACX --> ACX_093

    TESTS -.-> CALC
    WEB_TESTS -.-> WEB_PRIMARY

    style ROOT fill:#0a0e27,stroke:#60a5fa,stroke-width:3px,color:#fff
    style DATA fill:#10b981,stroke:#059669,color:#fff
    style CALC fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style WEB_PRIMARY fill:#f59e0b,stroke:#d97706,color:#fff
    style ARTIFACTS fill:#ef4444,stroke:#dc2626,color:#fff
    style DOCS fill:#3b82f6,stroke:#2563eb,color:#fff
