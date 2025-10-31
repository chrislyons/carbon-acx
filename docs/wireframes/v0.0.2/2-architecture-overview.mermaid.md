%% Carbon ACX Architecture Overview
%% High-level system design showing all layers and their interactions

graph TB
    subgraph "Data Layer (Source of Truth)"
        CSV["📊 Canonical CSVs<br/>activities.csv<br/>emission_factors.csv<br/>layers.csv<br/>schedules.csv<br/>grid_intensity.csv"]
        GIT["🔄 Git History<br/>Schema evolution tracking<br/>Provenance via commits"]
    end

    subgraph "Derivation Engine (Python 3.11+)"
        PIPELINE["🔧 Derivation Pipeline<br/>python -m calc.derive<br/>Entry: calc/derive.py"]
        VALIDATE["✅ Validation<br/>Pydantic schemas<br/>Type checking<br/>Data integrity"]
        COMPUTE["⚙️ Emissions Computation<br/>Activity × Factor<br/>Temporal aggregation<br/>Layer composition"]
        EXPORT["📦 Export<br/>Manifests (JSON)<br/>Figures (Plotly)<br/>Intensity matrices (CSV)"]
        MANIFEST_GEN["🔐 Manifest Generation<br/>Byte hashes (SHA-256)<br/>Schema versions<br/>Provenance metadata"]
    end

    subgraph "Artifact Storage"
        IMMUTABLE["📁 dist/artifacts/&lt;hash&gt;/<br/>Immutable artifacts<br/>manifest.json<br/>figures/*.json<br/>intensity/*.csv"]
        LOCAL["📁 calc/outputs/<br/>Local development<br/>Latest build results"]
    end

    subgraph "User Interfaces"
        subgraph "Modern Web App (Primary)"
            WEBAPP["🌐 Carbon ACX Web<br/>React 18 + TypeScript<br/>Vite 5 build<br/>Port: 5173"]
            ROUTER["React Router 6<br/>Welcome → Calculator<br/>→ Explore → Insights"]
            STATE["State Management<br/>Zustand (app state)<br/>TanStack Query (server)"]
            UI_3D["3D Visualization<br/>DataUniverse component<br/>Three.js + R3F<br/>SSR-safe lazy loading"]
            UI_2D["2D Overlays<br/>CitationPanel<br/>MethodologyModal<br/>ActivityManagement<br/>Radix UI Dialogs"]
            UI_CHARTS["2D Charts<br/>Apache ECharts 6.0<br/>TimelineViz<br/>ComparisonOverlay"]
        end

        subgraph "Analyst Dashboard"
            DASH["📊 Dash Application<br/>Python Dash<br/>Port: 8050<br/>Analyst workflows"]
        end

        subgraph "Legacy Site"
            LEGACY["🗂️ Legacy React Site<br/>Vite 5<br/>Marketing/investor portals<br/>WebGPU local LLM chat"]
        end
    end

    subgraph "Edge Delivery (Cloudflare)"
        subgraph "Pages"
            PAGES_FN["🌍 Pages Function<br/>functions/carbon-acx/[[path]].ts<br/>Artifact proxy<br/>Immutable caching<br/>Cache-Control headers"]
            PAGES_HOST["Static Site Hosting<br/>dist/site/<br/>_headers, _redirects<br/>CDN distribution"]
        end

        subgraph "Workers"
            WORKER_API["⚡ Worker API<br/>workers/compute/index.ts<br/>/api/compute (POST)<br/>/api/health (GET)<br/>On-demand calculations"]
        end
    end

    subgraph "External Services"
        GH["GitHub<br/>Source control<br/>Actions CI/CD"]
        CF["Cloudflare<br/>Edge runtime<br/>Pages hosting<br/>Workers API"]
        BROWSER["🖥️ User Browsers<br/>Chrome 120+<br/>Safari 17+<br/>Firefox 120+<br/>WebGL 2.0 required"]
    end

    subgraph "Development Tools"
        POETRY["Poetry<br/>Python deps<br/>Black + Ruff linting"]
        PNPM["pnpm 10.5.2<br/>Workspace monorepo<br/>Fast installs"]
        VITE["Vite 5<br/>Dev server + bundler<br/>HMR, code-splitting"]
        WRANGLER["Wrangler<br/>Worker dev + deploy<br/>Local preview"]
    end

    subgraph "AI Assistant Integration"
        SKILLS["🤖 Claude Skills<br/>carbon.data.qa<br/>acx.code.assistant<br/>acx.ux.evaluator<br/>carbon.report.gen"]
        AGENTS["🔬 Claude Agents<br/>acx-ux-auditor<br/>carbon-citation-checker<br/>carbon-manifest-validator<br/>carbon-github-agent"]
        CONTEXT["📖 Claude Context<br/>CLAUDE.md (v2.1)<br/>AGENTS.md<br/>Architecture patterns<br/>Safety policies"]
    end

    %% Data Flow
    CSV --> PIPELINE
    GIT --> PIPELINE
    PIPELINE --> VALIDATE
    VALIDATE --> COMPUTE
    COMPUTE --> EXPORT
    EXPORT --> MANIFEST_GEN
    MANIFEST_GEN --> IMMUTABLE
    MANIFEST_GEN --> LOCAL

    %% UI Data Access
    IMMUTABLE --> WEBAPP
    IMMUTABLE --> DASH
    IMMUTABLE --> LEGACY
    LOCAL --> DASH

    %% UI Internal Flow
    WEBAPP --> ROUTER
    ROUTER --> STATE
    STATE --> UI_3D
    STATE --> UI_2D
    STATE --> UI_CHARTS

    %% Edge Delivery
    WEBAPP -->|"build"| PAGES_HOST
    IMMUTABLE -->|"bundle"| PAGES_HOST
    PAGES_HOST --> PAGES_FN
    PAGES_FN --> BROWSER
    WORKER_API --> BROWSER

    %% External Integrations
    GH -->|"CI/CD"| PAGES_HOST
    GH -->|"CI/CD"| WORKER_API
    CF -->|"hosts"| PAGES_HOST
    CF -->|"runs"| WORKER_API
    CF -->|"hosts"| PAGES_FN

    %% Development Workflow
    POETRY --> PIPELINE
    PNPM --> WEBAPP
    PNPM --> LEGACY
    VITE --> WEBAPP
    WRANGLER --> WORKER_API

    %% AI Integration
    CONTEXT --> SKILLS
    CONTEXT --> AGENTS
    SKILLS -.->|"assists"| PIPELINE
    SKILLS -.->|"assists"| WEBAPP
    AGENTS -.->|"deep work"| PIPELINE
    AGENTS -.->|"deep work"| GH

    style CSV fill:#fff3cd
    style PIPELINE fill:#f8d7da
    style IMMUTABLE fill:#d1ecf1
    style WEBAPP fill:#d4f1d4
    style PAGES_FN fill:#cfe2ff
    style WORKER_API fill:#cfe2ff
    style SKILLS fill:#e7d4f5
    style AGENTS fill:#e7d4f5
