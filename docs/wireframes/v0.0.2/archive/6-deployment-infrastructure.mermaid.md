%% Deployment Infrastructure - Carbon ACX Build & Deploy Pipeline
%% Shows: Build process, GitHub Actions, Cloudflare Pages/Workers, artifact hosting, CDN

graph TB
    subgraph "🔨 Local Build Process"
        DevMachine["💻 Developer Machine<br/>Local workspace"]
        MakeBuild["🔨 make build<br/>Python derivation pipeline<br/>CSV → artifacts"]
        CalcDerive["🐍 calc/derive.py<br/>Pydantic validation<br/>Emission calculations<br/>Manifest generation"]
        BuildHash["🔒 Build Hash<br/>SHA256(manifest + rows)<br/>12-char prefix"]
        ArtifactsDir["📦 dist/artifacts/<hash>/<br/>export_view.json<br/>manifest.json<br/>figures/*.json"]

        MakePackage["📦 make package<br/>Build web + artifacts"]
        WebBuild["⚛️ pnpm run build:web<br/>Vite build<br/>TypeScript → JS<br/>React app bundle"]
        WebDist["📦 apps/carbon-acx-web/dist/<br/>index.html<br/>assets/index-abc.js<br/>assets/index-xyz.css"]
        CopyArtifacts["📋 Copy Artifacts<br/>dist/site/<br/>Web dist + artifacts<br/>+ _headers, _redirects"]

        DevMachine --> MakeBuild
        MakeBuild --> CalcDerive
        CalcDerive --> BuildHash
        BuildHash --> ArtifactsDir

        DevMachine --> MakePackage
        MakePackage --> MakeBuild
        MakePackage --> WebBuild
        WebBuild --> WebDist
        MakePackage --> CopyArtifacts
        ArtifactsDir --> CopyArtifacts
        WebDist --> CopyArtifacts
    end

    subgraph "🤖 GitHub Actions CI/CD"
        GitPush["🔀 git push origin main<br/>Trigger workflow"]
        GHActions["⚙️ GitHub Actions<br/>.github/workflows/deploy.yml"]

        subgraph "📋 CI Steps"
            Checkout["📥 Checkout Code<br/>actions/checkout@v4"]
            SetupPython["🐍 Setup Python 3.11<br/>actions/setup-python@v5<br/>Install Poetry"]
            SetupNode["📦 Setup Node 20.19.4<br/>actions/setup-node@v4<br/>Install pnpm 10.5.2"]
            InstallDeps["📚 Install Dependencies<br/>poetry install<br/>pnpm install"]
            RunLint["✅ make validate<br/>Ruff + Black + pytest"]
            RunBuild["🔨 make build<br/>Generate artifacts"]
            RunPackage["📦 make package<br/>Build web + bundle"]
            UploadArtifacts["⬆️ Upload Artifacts<br/>actions/upload-artifact@v4<br/>dist/site/"]
        end

        GitPush --> GHActions
        GHActions --> Checkout
        Checkout --> SetupPython
        SetupPython --> SetupNode
        SetupNode --> InstallDeps
        InstallDeps --> RunLint
        RunLint --> RunBuild
        RunBuild --> RunPackage
        RunPackage --> UploadArtifacts
    end

    subgraph "☁️ Cloudflare Pages Deployment"
        CFPages["🌐 Cloudflare Pages<br/>Project: carbon-acx"]
        CFBuild["🔨 Pages Build<br/>Build command: (skip)<br/>Output dir: dist/site"]
        CFDeploy["🚀 Deploy to Edge<br/>Global CDN distribution<br/>150+ locations"]

        subgraph "📦 Deployed Assets"
            StaticHTML["📄 index.html<br/>Entry point<br/>Brotli compressed"]
            StaticJS["📦 /assets/index-*.js<br/>Hashed bundles<br/>Cache: immutable"]
            StaticCSS["🎨 /assets/index-*.css<br/>Hashed stylesheets<br/>Cache: immutable"]
            ArtifactFiles["📊 /artifacts/<hash>/*<br/>JSON manifests<br/>CSV exports<br/>Cache: immutable"]
        end

        UploadArtifacts --> CFPages
        CFPages --> CFBuild
        CFBuild --> CFDeploy
        CFDeploy --> StaticHTML
        CFDeploy --> StaticJS
        CFDeploy --> StaticCSS
        CFDeploy --> ArtifactFiles
    end

    subgraph "⚡ Cloudflare Workers Deployment"
        WorkerCode["💼 workers/index.ts<br/>Edge API handlers<br/>/api/compute, /api/health"]
        WranglerDeploy["🚀 wrangler deploy<br/>Deploy Worker to edge"]
        WorkerRuntime["⚡ Worker Runtime<br/>V8 isolates<br/>Edge execution"]
        WorkerBindings["🔗 Bindings<br/>KV, R2, D1<br/>Environment variables"]

        WorkerCode --> WranglerDeploy
        WranglerDeploy --> WorkerRuntime
        WorkerRuntime --> WorkerBindings
    end

    subgraph "🔧 Cloudflare Pages Functions"
        FunctionCode["📝 functions/carbon-acx/[[path]].ts<br/>Artifact proxy<br/>Catch-all handler"]
        FunctionDeploy["🚀 Deployed with Pages<br/>Automatic function detection"]
        FunctionRuntime["⚡ Function Runtime<br/>V8 isolates<br/>Edge execution"]

        FunctionCode --> FunctionDeploy
        CFDeploy --> FunctionDeploy
        FunctionDeploy --> FunctionRuntime
    end

    subgraph "🌐 CDN & Caching"
        EdgeCache["🌍 Cloudflare Edge Cache<br/>150+ locations globally<br/>Tiered cache hierarchy"]

        subgraph "📋 Cache Rules"
            HTMLCache["📄 HTML: no-cache<br/>Always revalidate<br/>ETag support"]
            AssetCache["📦 Assets: immutable<br/>max-age=31536000<br/>Hash-based URLs"]
            ArtifactCache["📊 Artifacts: immutable<br/>max-age=31536000<br/>Hash-based paths"]
        end

        EdgeCache --> HTMLCache
        EdgeCache --> AssetCache
        EdgeCache --> ArtifactCache
    end

    subgraph "🔒 SSR Safety & Environment"
        SSRCheck["🛡️ SSR Safety<br/>typeof window !== 'undefined'<br/>useEffect mount detection"]
        LazyLoad["⏳ React.lazy()<br/>Dynamic imports<br/>Code splitting"]
        Suspense["⏳ React.Suspense<br/>Loading fallbacks<br/>Async boundaries"]

        SSRCheck --> LazyLoad
        LazyLoad --> Suspense
    end

    subgraph "📊 Monitoring & Analytics"
        CFAnalytics["📈 Cloudflare Analytics<br/>Requests, bandwidth<br/>Cache hit ratio"]
        CFLogs["📝 Real-time Logs<br/>Worker logs<br/>Function logs<br/>wrangler tail"]
        Sentry["🐛 Error Tracking<br/>(Optional) Sentry<br/>Client-side errors"]

        CFDeploy -.->|Reports to| CFAnalytics
        WorkerRuntime -.->|Logs to| CFLogs
        FunctionRuntime -.->|Logs to| CFLogs
        StaticJS -.->|Errors to| Sentry
    end

    subgraph "🌐 Production Request Flow"
        UserBrowser["👤 User Browser<br/>https://carbon-acx.pages.dev/"]
        EdgeRequest["🌍 Cloudflare Edge<br/>Nearest location<br/>DNS resolution"]
        CacheCheck["🔍 Cache Check<br/>Is resource cached?"]
        CacheHit["✅ Cache Hit<br/>Serve from edge<br/>< 10ms"]
        CacheMiss["❌ Cache Miss<br/>Forward to origin"]
        OriginResponse["📤 Origin Response<br/>Pages/Worker response<br/>Cache at edge"]

        UserBrowser --> EdgeRequest
        EdgeRequest --> CacheCheck
        CacheCheck -->|Cached| CacheHit
        CacheCheck -->|Not cached| CacheMiss
        CacheMiss --> OriginResponse
        OriginResponse --> EdgeCache
        EdgeCache --> CacheHit
        CacheHit --> UserBrowser
    end

    %% Cross-flow connections
    CopyArtifacts -.->|Uploaded to| CFPages
    StaticHTML -.->|Loads| StaticJS
    StaticJS -.->|Fetches| ArtifactFiles
    ArtifactFiles -.->|Proxied by| FunctionRuntime
    StaticJS -.->|Calls| WorkerRuntime

    SSRCheck -.->|Applied in| WebBuild
    LazyLoad -.->|Bundles in| StaticJS

    %% Styling
    classDef buildProcess fill:#d1fae5,stroke:#059669,stroke-width:2px
    classDef cicd fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    classDef pages fill:#fef3c7,stroke:#d97706,stroke-width:2px
    classDef workers fill:#fce7f3,stroke:#db2777,stroke-width:2px
    classDef functions fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    classDef cdn fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    classDef ssr fill:#fed7aa,stroke:#ea580c,stroke-width:2px
    classDef monitoring fill:#e0f2fe,stroke:#0369a1,stroke-width:2px
    classDef request fill:#fecaca,stroke:#dc2626,stroke-width:2px

    class DevMachine,MakeBuild,CalcDerive,BuildHash,ArtifactsDir,MakePackage,WebBuild,WebDist,CopyArtifacts buildProcess
    class GitPush,GHActions,Checkout,SetupPython,SetupNode,InstallDeps,RunLint,RunBuild,RunPackage,UploadArtifacts cicd
    class CFPages,CFBuild,CFDeploy,StaticHTML,StaticJS,StaticCSS,ArtifactFiles pages
    class WorkerCode,WranglerDeploy,WorkerRuntime,WorkerBindings workers
    class FunctionCode,FunctionDeploy,FunctionRuntime functions
    class EdgeCache,HTMLCache,AssetCache,ArtifactCache cdn
    class SSRCheck,LazyLoad,Suspense ssr
    class CFAnalytics,CFLogs,Sentry monitoring
    class UserBrowser,EdgeRequest,CacheCheck,CacheHit,CacheMiss,OriginResponse request
