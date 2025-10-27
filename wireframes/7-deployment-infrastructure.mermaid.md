%% Carbon ACX - Deployment Infrastructure
%% Visualizes Cloudflare Pages, Workers, CI/CD pipeline, and edge delivery
%% Last updated: 2025-10-26

graph TB
    subgraph "GitHub Repository"
        REPO["/carbon-acx<br/>Main branch"]
        PR["Pull Request<br/>Feature branch"]
        WORKFLOWS[".github/workflows/<br/>ci.yml<br/>release.yml"]
    end

    subgraph "GitHub Actions CI/CD Pipeline"
        TRIGGER_PUSH["Trigger: push to main"]
        TRIGGER_PR["Trigger: pull_request"]

        LINT["Job: lint-yaml<br/>Validate workflow syntax"]

        BUILD["Job: build-static<br/>Steps:<br/>1. Install pnpm/Node<br/>2. Install Python/Poetry<br/>3. Build artifacts (CSV)<br/>4. Build web app<br/>5. Verify manifests"]

        TEST["Job: tests<br/>Steps:<br/>1. Guard binary files<br/>2. Run site tests (Vitest)<br/>3. Run Python tests (pytest)"]

        UPLOAD_ARTIFACTS["Upload artifacts:<br/>dist-artifacts/<br/>dist-site/"]

        TRIGGER_PUSH --> LINT
        TRIGGER_PR --> LINT
        LINT --> BUILD
        BUILD --> TEST
        TEST --> UPLOAD_ARTIFACTS
    end

    subgraph "Cloudflare Pages (Static Hosting)"
        PAGES["Cloudflare Pages<br/>carbon-acx.pages.dev"]
        AUTO_DEPLOY["Auto-deploy trigger<br/>GitHub integration"]
        PAGES_BUILD["Pages build:<br/>pnpm run build:web"]
        PAGES_DIST["Output dir:<br/>apps/carbon-acx-web/dist/"]
        PAGES_EDGE["Edge caching<br/>Global CDN"]

        AUTO_DEPLOY --> PAGES_BUILD
        PAGES_BUILD --> PAGES_DIST
        PAGES_DIST --> PAGES
        PAGES --> PAGES_EDGE
    end

    subgraph "Cloudflare Pages Functions (Edge)"
        FUNCTIONS["functions/<br/>carbon-acx/[[path]].ts"]
        CATCH_ALL["Catch-all route<br/>Proxy artifact access"]
        IMMUTABLE_CACHE["Immutable caching<br/>Content-addressable"]

        FUNCTIONS --> CATCH_ALL
        CATCH_ALL --> IMMUTABLE_CACHE
    end

    subgraph "Cloudflare Workers (API)"
        WORKER["workers/compute/<br/>index.ts"]
        API_COMPUTE["/api/compute<br/>On-demand calculations"]
        API_HEALTH["/api/health<br/>Health check"]
        WORKER_DEPLOY["wrangler deploy<br/>Manual deployment"]

        WORKER --> API_COMPUTE
        WORKER --> API_HEALTH
        WORKER_DEPLOY --> WORKER
    end

    subgraph "Preview Deployments"
        PR_PREVIEW["PR preview URL:<br/>pr-{number}.carbon-acx.pages.dev"]
        PREVIEW_BUILD["Automatic preview build<br/>Every git push to PR"]
        PREVIEW_COMMENT["GitHub bot comment<br/>Preview link in PR"]

        PR --> PREVIEW_BUILD
        PREVIEW_BUILD --> PR_PREVIEW
        PR_PREVIEW --> PREVIEW_COMMENT
    end

    subgraph "Environment Variables"
        ENV_CI["CI Variables:<br/>ACX_GENERATED_AT<br/>ACX_DATA_BACKEND=csv<br/>ACX_OUTPUT_ROOT<br/>PYTHONPATH"]
        ENV_PAGES["Pages Variables:<br/>NODE_VERSION=20.19.4<br/>PNPM_VERSION=10.5.2<br/>Build command<br/>Output directory"]
        ENV_WORKER["Worker Variables:<br/>ACX_DATASET_VERSION<br/>Compatibility date"]
    end

    subgraph "Build Outputs"
        DIST_ROOT["dist/<br/>Root output directory"]
        DIST_ARTIFACTS["dist/artifacts/<br/>Content-addressed manifests<br/>Hashed emission data"]
        DIST_SITE["dist/site/<br/>Legacy static site bundle"]
        DIST_WEB["apps/carbon-acx-web/dist/<br/>Modern web app bundle"]

        DIST_ROOT --> DIST_ARTIFACTS
        DIST_ROOT --> DIST_SITE
        DIST_WEB -.-> PAGES_DIST
    end

    subgraph "Edge Delivery Network"
        CDN["Cloudflare CDN<br/>200+ global PoPs"]
        CACHE_STRATEGY["Caching strategy:<br/>Immutable: max-age=31536000<br/>HTML: no-cache<br/>Assets: hash-based"]
        HTTP2["HTTP/2 + Brotli<br/>Compression enabled"]

        PAGES_EDGE --> CDN
        CDN --> CACHE_STRATEGY
        CDN --> HTTP2
    end

    REPO --> TRIGGER_PUSH
    REPO --> TRIGGER_PR
    UPLOAD_ARTIFACTS -.->|Deployment trigger| AUTO_DEPLOY
    BUILD --> DIST_ROOT
    DIST_ARTIFACTS -.-> FUNCTIONS

    WORKFLOWS -.-> ENV_CI
    PAGES -.-> ENV_PAGES
    WORKER -.-> ENV_WORKER

    style PAGES fill:#f96854
    style WORKER fill:#f96854
    style PAGES_EDGE fill:#fff3e0
    style BUILD fill:#e3f2fd
    style TEST fill:#e8f5e9
