%% Carbon ACX Deployment Infrastructure
%% Version: v0.0.4 (Nov 2025)
%% CI/CD pipeline and hosting architecture

graph TB
    subgraph "Development Environment"
        DEV_LOCAL["Local Development<br/>───────<br/>• pnpm dev<br/>• Hot reload<br/>• localhost:3000"]

        DEV_PYTHON["Python Dev<br/>───────<br/>• Poetry shell<br/>• pytest watch<br/>• Jupyter notebooks"]
    end

    subgraph "Version Control (GitHub)"
        GIT_REPO["GitHub Repository<br/>chrislyons/carbon-acx<br/>───────<br/>• Main branch<br/>• Feature branches<br/>• Pull requests"]

        GIT_MAIN["main branch<br/>───────<br/>• Protected<br/>• Requires PR<br/>• Auto-deploy"]

        GIT_FEATURE["feature/* branches<br/>───────<br/>• Development<br/>• Preview deploy<br/>• Merge to main"]
    end

    subgraph "CI/CD Pipeline"
        CI_TRIGGER["Git Push<br/>───────<br/>Triggers build"]

        CI_INSTALL["Step 1: Install<br/>───────<br/>• poetry install<br/>• pnpm install"]

        CI_LINT["Step 2: Lint<br/>───────<br/>• ruff check<br/>• black --check<br/>• pnpm lint"]

        CI_TEST["Step 3: Test<br/>───────<br/>• pytest tests/<br/>• pnpm test"]

        CI_BUILD_PYTHON["Step 4: Build Artifacts<br/>───────<br/>• python -m calc.derive<br/>• Generate manifests<br/>• SHA256 hashes"]

        CI_BUILD_NEXT["Step 5: Build Next.js<br/>───────<br/>• pnpm build<br/>• TypeScript compile<br/>• Bundle optimization"]

        CI_PACKAGE["Step 6: Package<br/>───────<br/>• Combine artifacts + web<br/>• Prepare for deploy"]
    end

    subgraph "Cloudflare Pages"
        CF_BUILD["Cloudflare Build<br/>───────<br/>• Command: make ci_build_pages<br/>• Output: .next/<br/>• Node 20.19.4"]

        CF_DEPLOY["Cloudflare Deploy<br/>───────<br/>• Upload .next/<br/>• Upload dist/artifacts/<br/>• Global CDN propagation"]

        CF_EDGE["Cloudflare Edge<br/>200+ locations<br/>───────<br/>• Static assets (CDN)<br/>• Server functions (Workers)<br/>• SSR support"]
    end

    subgraph "Production Environment"
        PROD_URL["Production URL<br/>carbon-acx.pages.dev<br/>───────<br/>• HTTPS (automatic)<br/>• Global CDN<br/>• Edge rendering"]

        PREVIEW_URL["Preview URLs<br/><hash>.carbon-acx.pages.dev<br/>───────<br/>• Per-branch deploy<br/>• Isolated environment<br/>• Shareable link"]
    end

    subgraph "Static Assets"
        STATIC_HTML["HTML Pages<br/>───────<br/>• Pre-rendered (SSG)<br/>• Cached at edge<br/>• ~50KB gzipped"]

        STATIC_JS["JavaScript Bundles<br/>───────<br/>• Main: 372KB gzip<br/>• DataUniverse: 241KB gzip<br/>• Code-split chunks"]

        STATIC_CSS["CSS Stylesheets<br/>───────<br/>• Tailwind compiled<br/>• Minified<br/>• ~20KB gzipped"]

        STATIC_ARTIFACTS["Artifacts (JSON)<br/>───────<br/>• Manifests<br/>• Figures<br/>• References<br/>• ~5MB total"]
    end

    subgraph "Edge Functions"
        EDGE_API["API Routes<br/>───────<br/>• /api/health<br/>• /api/manifests<br/>• /api/manifests/:id"]

        EDGE_SSR["SSR Pages<br/>───────<br/>• Dynamic routes<br/>• Server Components<br/>• Manifest loading"]

        EDGE_ISR["ISR (future)<br/>───────<br/>• Incremental regen<br/>• Stale-while-revalidate<br/>• Not yet enabled"]
    end

    subgraph "Monitoring & Analytics"
        CF_ANALYTICS["Cloudflare Analytics<br/>───────<br/>• Page views<br/>• Performance metrics<br/>• Bandwidth usage"]

        CF_LOGS["Function Logs<br/>───────<br/>• Console output<br/>• Error tracking<br/>• Request traces"]

        UPTIME["Uptime Monitoring<br/>───────<br/>• Health check (planned)<br/>• /api/health endpoint<br/>• Alerting"]
    end

    DEV_LOCAL -.-> GIT_REPO
    DEV_PYTHON -.-> GIT_REPO

    GIT_REPO --> GIT_MAIN
    GIT_REPO --> GIT_FEATURE

    GIT_MAIN --> CI_TRIGGER
    GIT_FEATURE --> CI_TRIGGER

    CI_TRIGGER --> CI_INSTALL
    CI_INSTALL --> CI_LINT
    CI_LINT --> CI_TEST
    CI_TEST --> CI_BUILD_PYTHON
    CI_BUILD_PYTHON --> CI_BUILD_NEXT
    CI_BUILD_NEXT --> CI_PACKAGE

    CI_PACKAGE --> CF_BUILD
    CF_BUILD --> CF_DEPLOY

    CF_DEPLOY --> CF_EDGE

    GIT_MAIN --> PROD_URL
    GIT_FEATURE --> PREVIEW_URL

    CF_EDGE --> STATIC_HTML
    CF_EDGE --> STATIC_JS
    CF_EDGE --> STATIC_CSS
    CF_EDGE --> STATIC_ARTIFACTS

    CF_EDGE --> EDGE_API
    CF_EDGE --> EDGE_SSR
    CF_EDGE --> EDGE_ISR

    PROD_URL --> CF_ANALYTICS
    CF_EDGE --> CF_LOGS
    PROD_URL --> UPTIME

    style GIT_MAIN fill:#0a0e27,stroke:#60a5fa,stroke-width:3px,color:#fff
    style CI_BUILD_PYTHON fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    style CI_BUILD_NEXT fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style CF_EDGE fill:#ec4899,stroke:#db2777,stroke-width:3px,color:#fff
    style PROD_URL fill:#10b981,stroke:#059669,stroke-width:3px,color:#fff
    style EDGE_API fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
