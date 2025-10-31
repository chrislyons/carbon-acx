%% Carbon ACX Repository Structure
%% Complete directory tree showing all major components and their purposes

graph TB
    subgraph "Root Configuration"
        ROOT["📁 carbon-acx<br/>(Repository Root)"]
        ROOT --> PYPROJECT["pyproject.toml<br/>Python dependencies (Poetry)<br/>Black, Ruff, pytest config"]
        ROOT --> PACKAGE["package.json<br/>pnpm workspace root<br/>Type generation scripts"]
        ROOT --> PNPM["pnpm-workspace.yaml<br/>Workspace definitions:<br/>apps/*, site/"]
        ROOT --> MAKEFILE["Makefile<br/>Build automation:<br/>build, validate, package, app"]
        ROOT --> WRANGLER["wrangler.toml<br/>Cloudflare Worker config<br/>Bindings, routes, env vars"]
        ROOT --> CLAUDE["CLAUDE.md<br/>AI assistant context<br/>Architecture docs v2.1"]
        ROOT --> AGENTS["AGENTS.md<br/>AI review gates<br/>Safety policies"]
    end

    subgraph "Data Layer (Source of Truth)"
        ROOT --> DATA["📁 data/<br/>Canonical CSV inputs"]
        DATA --> ACTIVITIES["activities.csv<br/>All tracked activities<br/>with emission factors"]
        DATA --> LAYERS["layers.csv<br/>Layer definitions<br/>types and metadata"]
        DATA --> FACTORS["emission_factors.csv<br/>Peer-reviewed factors<br/>with sources"]
        DATA --> SCHEDULES["schedules.csv<br/>Temporal patterns"]
        DATA --> GRID["grid_intensity.csv<br/>Regional intensity data"]
        DATA --> ICONS["icons.csv<br/>UI icon mappings"]
    end

    subgraph "Derivation Engine (Python)"
        ROOT --> CALC["📁 calc/<br/>Pydantic schemas + validation"]
        CALC --> DERIVE["derive.py<br/>Main pipeline entry<br/>Validates, computes, exports"]
        CALC --> SCHEMAS["schemas.py<br/>Pydantic models<br/>Type validation"]
        CALC --> DATASTORE["datastore/<br/>CSV + SQLite backends<br/>Abstraction layer"]
        CALC --> FIGURES["figures/<br/>Chart generation<br/>Plotly builders"]
        CALC --> MANIFEST["manifest/<br/>Immutable artifacts<br/>Byte hashes, versions"]
        CALC --> OUTPUTS["outputs/<br/>Generated artifacts<br/>manifests, charts, CSVs"]
    end

    subgraph "Modern Web Application (Primary UI)"
        ROOT --> APPS["📁 apps/<br/>pnpm workspace packages"]
        APPS --> WEB["📁 carbon-acx-web/<br/>React 18 + TypeScript"]
        WEB --> WEBSRC["src/<br/>Application source"]
        WEBSRC --> COMPONENTS["components/<br/>UI components"]
        COMPONENTS --> SYSTEM["system/<br/>Button, Input, Dialog"]
        COMPONENTS --> VIZ["viz/<br/>DataUniverse (3D)<br/>TimelineViz, ComparisonOverlay"]
        COMPONENTS --> DOMAIN["domain/<br/>CitationPanel, ActivityManagement<br/>MethodologyModal, EmissionCalculator"]
        WEBSRC --> PAGES["pages/<br/>Route components"]
        PAGES --> WELCOME["WelcomePage.tsx"]
        PAGES --> CALCULATOR["CalculatorPage.tsx<br/>Baseline establishment"]
        PAGES --> EXPLORE["ExplorePage.tsx<br/>3D Universe + charts"]
        PAGES --> INSIGHTS["InsightsPage.tsx<br/>3D + sidebar view"]
        WEBSRC --> HOOKS["hooks/<br/>useAppStore (Zustand)<br/>React hooks"]
        WEBSRC --> STYLES["styles/<br/>Design tokens (CSS)<br/>Tailwind config"]
        WEB --> WEBPUBLIC["public/<br/>Static assets"]
        WEB --> WEBCONFIG["vite.config.ts<br/>vitest.config.ts<br/>playwright.config.ts"]
    end

    subgraph "Analyst Dashboard (Python Dash)"
        ROOT --> APP["📁 app/<br/>Dash application"]
        APP --> APPPY["app.py<br/>Dash layouts + callbacks<br/>Agency breakdowns"]
        APP --> APPCOMP["components/<br/>Dash components<br/>Reference drawers"]
    end

    subgraph "Legacy Static Site"
        ROOT --> SITE["📁 site/<br/>Vite 5 + React (legacy)"]
        SITE --> SITESRC["src/<br/>Marketing/investor UI"]
        SITE --> SITECHAT["src/lib/chat/<br/>WebGPU local LLM<br/>@mlc-ai/web-llm"]
        SITE --> SITECONFIG["package.json<br/>vite.config.ts"]
    end

    subgraph "Edge Delivery (Cloudflare)"
        ROOT --> FUNCTIONS["📁 functions/<br/>Pages Functions"]
        FUNCTIONS --> PATHFN["carbon-acx/[[path]].ts<br/>Artifact proxy<br/>Immutable caching"]

        ROOT --> WORKERS["📁 workers/<br/>Edge Workers"]
        WORKERS --> COMPUTE["compute/index.ts<br/>/api/compute endpoint<br/>/api/health endpoint"]
    end

    subgraph "Automation & Scripts"
        ROOT --> SCRIPTS["📁 scripts/<br/>Maintenance utilities"]
        SCRIPTS --> PREPARE["prepare_pages_bundle.py<br/>Package for deployment<br/>Headers + redirects"]
        SCRIPTS --> CATALOG["sync_layer_catalog.py<br/>Update layer metadata"]
        SCRIPTS --> COVERAGE["audit_coverage.py<br/>Reference integrity"]
    end

    subgraph "Documentation"
        ROOT --> DOCS["📁 docs/<br/>Architecture + guides"]
        DOCS --> ACX["acx/<br/>Sprint documentation"]
        ACX --> ACX084["ACX084.md<br/>3D Universe Sprint<br/>Complete implementation"]
        ACX --> ACX080["ACX080.md<br/>Phase 1 rebuild<br/>(superseded)"]
        DOCS --> WHAT["WHAT_RUNS_WHERE.md<br/>Environment expectations"]
        DOCS --> TESTING["TESTING_NOTES.md<br/>QA guidelines"]

        ROOT --> WIREFRAMES["📁 wireframes/<br/>Mermaid diagrams<br/>Architecture visualization"]
    end

    subgraph "Claude Code Integration"
        ROOT --> CLAUDE_DIR["📁 .claude/<br/>AI assistant config"]
        CLAUDE_DIR --> SKILLS["skills/<br/>Task-specific skills"]
        SKILLS --> PROJECT_SKILLS["project/<br/>acx.code.assistant<br/>acx.ux.evaluator<br/>carbon.data.qa"]
        SKILLS --> SHARED_SKILLS["shared/<br/>schema.linter<br/>dependency.audit<br/>git.* helpers"]
        CLAUDE_DIR --> AGENTS_DIR["agents/<br/>Deep work agents"]
        AGENTS_DIR --> AGENT_FILES["acx-ux-auditor<br/>carbon-citation-checker<br/>carbon-manifest-validator"]
    end

    subgraph "Build Outputs (Generated)"
        ROOT --> DIST["📁 dist/<br/>Build artifacts"]
        DIST --> ARTIFACTS["artifacts/&lt;hash&gt;/<br/>Immutable manifests<br/>Hashed figures"]
        DIST --> SITE_DIST["site/<br/>Packaged for Pages<br/>_headers, _redirects"]
        DIST --> WEB_DIST["(web build output)<br/>Vite production build"]
    end

    subgraph "Testing"
        ROOT --> TESTS["📁 tests/<br/>pytest test suite"]
        TESTS --> UNIT["test_*.py<br/>Unit tests<br/>Validation tests"]

        WEB --> WEBTESTS["tests/<br/>Playwright E2E tests"]
    end

    style ROOT fill:#e1f5ff
    style WEB fill:#d4f1d4
    style DATA fill:#fff3cd
    style CALC fill:#f8d7da
    style FUNCTIONS fill:#d1ecf1
    style WORKERS fill:#d1ecf1
    style CLAUDE_DIR fill:#e7d4f5
