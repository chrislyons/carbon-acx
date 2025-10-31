%% Entry Points - Carbon ACX Application Entry & Routing
%% Shows: Web app entry, Dash app, CLI commands, Worker API, Pages Function, dev servers

graph TB
    subgraph "🌐 Web App Entry (Modern Interface)"
        IndexHTML["📄 index.html<br/>HTML entry point<br/>&lt;div id='root'&gt;&lt;/div&gt;"]
        MainTSX["⚛️ main.tsx<br/>React 18 entry<br/>createRoot(root).render()"]
        CanvasApp["🎨 CanvasApp.tsx<br/>Main app component<br/>React Router setup"]
        Router["🧭 React Router<br/>BrowserRouter<br/>Route definitions"]

        WelcomeRoute["📍 Route: /<br/>→ WelcomePage"]
        CalculatorRoute["📍 Route: /calculator<br/>→ CalculatorPage"]
        ExploreRoute["📍 Route: /explore<br/>→ ExplorePage"]
        InsightsRoute["📍 Route: /insights<br/>→ InsightsPage"]

        IndexHTML --> MainTSX
        MainTSX --> CanvasApp
        CanvasApp --> Router
        Router --> WelcomeRoute
        Router --> CalculatorRoute
        Router --> ExploreRoute
        Router --> InsightsRoute
    end

    subgraph "🐍 Dash Operations Client (Analyst Interface)"
        DashEntry["🐍 app/app.py<br/>Python Dash entry<br/>Plotly Dash server"]
        DashInit["⚡ Dash App Init<br/>app = dash.Dash(__name__)"]
        DashLayouts["📊 Layouts<br/>Agency breakdowns<br/>Scenario toggles"]
        DashCallbacks["🔄 Callbacks<br/>@app.callback decorators<br/>Interactive updates"]
        DashServer["🌐 Flask Server<br/>app.run_server()<br/>Default: localhost:8050"]

        DashEntry --> DashInit
        DashInit --> DashLayouts
        DashInit --> DashCallbacks
        DashCallbacks --> DashServer
    end

    subgraph "⚙️ CLI Commands (Build & Data Processing)"
        subgraph "🔨 Make Targets (Makefile)"
            MakeBuild["🔨 make build<br/>Full derivation pipeline<br/>CSV → artifacts"]
            MakeApp["🔨 make app<br/>Launch Dash server<br/>ACX_DATA_BACKEND=csv"]
            MakePackage["🔨 make package<br/>Build web + artifacts<br/>→ dist/site/"]
            MakeSite["🔨 make site<br/>Build legacy site<br/>Vite build"]
            MakeValidate["🔨 make validate<br/>Ruff + Black + pytest"]
        end

        subgraph "🐍 Python Module Invocations"
            DeriveCLI["🐍 python -m calc.derive<br/>Main derivation<br/>--output-root dist/artifacts"]
            DeriveIntensity["🐍 python -m calc.derive intensity<br/>Intensity matrix export<br/>--fu all --output-dir dist/"]
            MakeCatalog["🐍 python -m calc.make_catalog<br/>Layer catalog generation<br/>→ artifacts/catalog.json"]
            PackageArtifacts["🐍 python -m scripts.package_artifacts<br/>Bundle artifacts<br/>→ dist/packaged-artifacts/"]
        end

        MakeBuild --> DeriveCLI
        MakeBuild --> DeriveIntensity
        MakeBuild --> MakeCatalog
        MakePackage --> PackageArtifacts
        MakeApp --> DashEntry
    end

    subgraph "☁️ Cloudflare Worker API (Edge Compute)"
        WorkerEntry["⚡ workers/index.ts<br/>Cloudflare Worker entry<br/>export default { fetch }"]
        WorkerRouter["🧭 Worker Router<br/>URL pattern matching<br/>/api/*"]

        ComputeEndpoint["📍 POST /api/compute<br/>On-demand calculations<br/>Body: { activities, profile }"]
        HealthEndpoint["📍 GET /api/health<br/>Health check<br/>Returns: { status: 'ok' }"]

        WorkerValidation["✅ Input Validation<br/>Pydantic-like schemas<br/>Reject invalid requests"]
        WorkerCompute["🧮 Emission Calculation<br/>quantity × emission_factor<br/>Grid-indexed factors"]
        WorkerResponse["📤 JSON Response<br/>{ totalEmissions, activities }<br/>CORS headers"]

        WorkerEntry --> WorkerRouter
        WorkerRouter --> ComputeEndpoint
        WorkerRouter --> HealthEndpoint
        ComputeEndpoint --> WorkerValidation
        WorkerValidation --> WorkerCompute
        WorkerCompute --> WorkerResponse
    end

    subgraph "📦 Cloudflare Pages Function (Artifact Proxy)"
        PagesEntry["⚡ functions/carbon-acx/[[path]].ts<br/>Catch-all route handler<br/>Proxies artifact access"]
        PathParsing["🔍 Path Parsing<br/>Extract build hash<br/>Extract artifact type"]
        ArtifactFetch["📥 Fetch Artifact<br/>R2 bucket or KV store<br/>dist/artifacts/<hash>/..."]
        CacheHeaders["🔒 Cache Headers<br/>Cache-Control: immutable<br/>max-age=31536000"]
        ArtifactResponse["📤 Artifact Response<br/>JSON or CSV<br/>Served from edge"]

        PagesEntry --> PathParsing
        PathParsing --> ArtifactFetch
        ArtifactFetch --> CacheHeaders
        CacheHeaders --> ArtifactResponse
    end

    subgraph "🖥️ Development Servers"
        subgraph "⚛️ Web Dev Server"
            PnpmDev["📦 pnpm dev<br/>Runs: apps/carbon-acx-web<br/>Vite dev server"]
            ViteServer["⚡ Vite Dev Server<br/>HMR enabled<br/>localhost:5173"]
            HMR["🔥 Hot Module Replacement<br/>Sub-second updates<br/>State preservation"]

            PnpmDev --> ViteServer
            ViteServer --> HMR
        end

        subgraph "🌐 Legacy Site Dev"
            SiteDev["📦 cd site && npm run dev<br/>Legacy Vite server<br/>localhost:5174"]
        end

        subgraph "☁️ Worker Dev Server"
            WranglerDev["⚡ wrangler dev<br/>Local Worker runtime<br/>localhost:8787"]
            LocalBinding["🔗 Local Bindings<br/>KV, R2, D1 emulation<br/>.dev.vars config"]

            WranglerDev --> LocalBinding
        end
    end

    subgraph "🚀 Production Entry Points"
        ProdDomain["🌐 carbon-acx.pages.dev<br/>Cloudflare Pages domain"]
        ProdIndex["📄 index.html<br/>Served from edge<br/>Brotli compressed"]
        ProdAssets["📦 /assets/*<br/>Hashed JS/CSS bundles<br/>Cache: immutable"]
        ProdArtifacts["📦 /artifacts/*<br/>Pages Function proxy<br/>→ R2 or KV"]
        ProdAPI["⚡ /api/*<br/>Worker routes<br/>Edge compute"]

        ProdDomain --> ProdIndex
        ProdDomain --> ProdAssets
        ProdDomain --> ProdArtifacts
        ProdDomain --> ProdAPI

        ProdIndex --> MainTSX
        ProdArtifacts --> PagesEntry
        ProdAPI --> WorkerEntry
    end

    %% Cross-references
    MainTSX -.->|Fetches| ProdArtifacts
    DashServer -.->|Reads| DeriveCLI
    PackageArtifacts -.->|Packages for| ProdArtifacts

    %% Styling
    classDef webEntry fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    classDef dashEntry fill:#fef3c7,stroke:#d97706,stroke-width:2px
    classDef cliEntry fill:#d1fae5,stroke:#059669,stroke-width:2px
    classDef workerEntry fill:#fce7f3,stroke:#db2777,stroke-width:2px
    classDef pagesEntry fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    classDef devServer fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    classDef prodEntry fill:#fef3c7,stroke:#ea580c,stroke-width:2px

    class IndexHTML,MainTSX,CanvasApp,Router,WelcomeRoute,CalculatorRoute,ExploreRoute,InsightsRoute webEntry
    class DashEntry,DashInit,DashLayouts,DashCallbacks,DashServer dashEntry
    class MakeBuild,MakeApp,MakePackage,MakeSite,MakeValidate,DeriveCLI,DeriveIntensity,MakeCatalog,PackageArtifacts cliEntry
    class WorkerEntry,WorkerRouter,ComputeEndpoint,HealthEndpoint,WorkerValidation,WorkerCompute,WorkerResponse workerEntry
    class PagesEntry,PathParsing,ArtifactFetch,CacheHeaders,ArtifactResponse pagesEntry
    class PnpmDev,ViteServer,HMR,SiteDev,WranglerDev,LocalBinding devServer
    class ProdDomain,ProdIndex,ProdAssets,ProdArtifacts,ProdAPI prodEntry
