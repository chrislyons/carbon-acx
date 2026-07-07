%% Carbon ACX Deployment Infrastructure
%% How the code runs in production - Cloudflare Pages, Workers, and edge architecture

graph TB
    subgraph "Developer Workflow"
        dev_local["Local Development<br/>✓ pnpm dev (port 5173)<br/>✓ make app (port 8050)<br/>✓ wrangler dev (port 8787)"]

        dev_commit["git commit<br/>Git repository<br/>chrislyons/carbon-acx"]

        dev_push["git push origin <branch>"]
    end

    subgraph "GitHub Integration"
        gh_repo["GitHub Repository<br/>main branch<br/>feature/* branches"]

        gh_actions[".github/workflows/ci.yml<br/>CI Pipeline<br/>✓ Lint & type check<br/>✓ Run tests<br/>✓ Build artifacts"]

        gh_pr["Pull Request<br/>Review & approval<br/>Merge to main"]
    end

    subgraph "Cloudflare Pages - Automatic Deployment"
        cf_pages["Cloudflare Pages<br/>Git integration<br/>Auto-deploy on push"]

        cf_build["Build Environment<br/>✓ Node.js 20.19.4<br/>✓ pnpm 10.5.2<br/>✓ Build command: pnpm build<br/>✓ Output: dist/"]

        cf_preview["Preview Deployments<br/>https://<hash>.carbon-acx.pages.dev<br/>✓ Per-commit deployment<br/>✓ Unique URL per build<br/>✓ 14-day retention"]

        cf_production["Production Deployment<br/>https://carbon-acx.pages.dev<br/>✓ Main branch only<br/>✓ Atomic deployments<br/>✓ Instant rollback"]
    end

    subgraph "Cloudflare Pages CDN"
        cdn_global["Global CDN<br/>300+ cities worldwide<br/>< 50ms latency"]

        cdn_cache["Cache Strategy<br/>✓ Static assets: immutable<br/>✓ HTML: no-cache<br/>✓ API JSON: 1 hour TTL"]

        cdn_routes["Route Handling<br/>/ → index.html<br/>/calculator → SPA fallback<br/>/assets/* → long-lived cache"]
    end

    subgraph "Cloudflare Pages Functions"
        pages_fn["functions/carbon-acx/[[path]].ts<br/>Serverless edge function<br/>Artifact proxy"]

        pages_fn_logic["Function Logic<br/>✓ Parse /carbon-acx/<path><br/>✓ Check KV cache<br/>✓ Serve artifacts/<hash>/<br/>✓ Set Cache-Control: immutable"]

        kv_store["KV Namespace<br/>CARBON_ACX_ARTIFACTS<br/>Key-value storage<br/>Global replication"]
    end

    subgraph "Cloudflare Workers - Compute API"
        worker["workers/compute/index.ts<br/>Dedicated Worker<br/>Edge compute"]

        worker_routes["Worker Routes<br/>POST /api/compute<br/>GET /api/health"]

        worker_runtime["V8 Isolate Runtime<br/>✓ 0ms cold start<br/>✓ 50ms CPU limit<br/>✓ 128MB memory<br/>✓ No Node.js APIs"]

        worker_bindings["Bindings<br/>✓ KV: EMISSION_FACTORS<br/>✓ D1: CARBON_DB (future)<br/>✓ Env vars: ACX_*"]
    end

    subgraph "Environment-Specific Configuration"
        env_dev["Development<br/>✓ localhost:5173<br/>✓ No caching<br/>✓ HMR enabled<br/>✓ Source maps"]

        env_preview["Preview<br/>✓ <hash>.pages.dev<br/>✓ Production build<br/>✓ Full CDN<br/>✓ Separate KV"]

        env_prod["Production<br/>✓ carbon-acx.pages.dev<br/>✓ Minified bundles<br/>✓ Brotli compression<br/>✓ Analytics enabled"]
    end

    subgraph "Build Artifacts Structure"
        dist_folder["dist/<br/>Vite output"]

        dist_folder --> dist_index["index.html<br/>SPA shell"]
        dist_folder --> dist_assets["assets/<br/>JS/CSS bundles<br/>Content-hashed"]
        dist_folder --> dist_api["api/<br/>Static JSON files<br/>Exported from CSV"]

        dist_assets --> dist_main["NewApp-<hash>.js<br/>Main bundle (218kB)"]
        dist_assets --> dist_universe["DataUniverse-<hash>.js<br/>3D viz bundle (845kB)<br/>Lazy loaded"]
        dist_assets --> dist_insights["InsightsPage-<hash>.js<br/>Charts bundle (252kB)<br/>Lazy loaded"]
    end

    subgraph "Production Runtime Flow"
        user["User Browser<br/>Any location"]

        user -->|1. HTTPS request| cdn_global
        cdn_global -->|2. Route to nearest edge| cdn_cache
        cdn_cache -->|3. Cache miss| cdn_routes

        cdn_routes -->|4a. Static asset| dist_assets
        dist_assets -->|5. Serve with immutable cache| user

        cdn_routes -->|4b. API request| pages_fn
        pages_fn -->|5. Check KV| kv_store
        kv_store -->|6. Serve artifact| user

        cdn_routes -->|4c. Compute request| worker
        worker -->|5. Calculate emissions| worker_bindings
        worker_bindings -->|6. Return JSON| user

        cdn_routes -->|4d. SPA route| dist_index
        dist_index -->|5. Client-side routing| user
    end

    subgraph "Deployment Pipeline Stages"
        stage1["Stage 1: Build<br/>✓ pnpm install<br/>✓ tsx export-data.ts<br/>✓ tsc type check<br/>✓ vite build"]

        stage2["Stage 2: Deploy<br/>✓ Upload dist/ to Pages<br/>✓ Generate unique URL<br/>✓ Update DNS (prod only)"]

        stage3["Stage 3: Activate<br/>✓ Warm CDN cache<br/>✓ Update routing<br/>✓ Atomic cutover"]

        stage4["Stage 4: Verify<br/>✓ Health check<br/>✓ Smoke tests<br/>✓ Analytics monitoring"]

        stage1 --> stage2
        stage2 --> stage3
        stage3 --> stage4
    end

    subgraph "Rollback Strategy"
        rollback_detect["Detect Issue<br/>✓ Error rate spike<br/>✓ Health check fail<br/>✓ Manual trigger"]

        rollback_instant["Instant Rollback<br/>✓ Switch DNS to previous<br/>✓ < 10 second cutover<br/>✓ No downtime"]

        rollback_verify["Verify Rollback<br/>✓ Confirm metrics<br/>✓ Notify team<br/>✓ Incident report"]

        rollback_detect --> rollback_instant
        rollback_instant --> rollback_verify
    end

    subgraph "Monitoring & Observability"
        analytics["Cloudflare Analytics<br/>✓ Request volume<br/>✓ Bandwidth<br/>✓ Cache hit rate<br/>✓ Error rate"]

        logs["Real-time Logs<br/>✓ Worker console.log<br/>✓ Exception tracking<br/>✓ Tail workers"]

        webvitals["Web Vitals<br/>✓ LCP (Largest Contentful Paint)<br/>✓ FID (First Input Delay)<br/>✓ CLS (Cumulative Layout Shift)"]
    end

    %% Developer workflow connections
    dev_local --> dev_commit
    dev_commit --> dev_push
    dev_push --> gh_repo

    %% CI/CD pipeline
    gh_repo --> gh_actions
    gh_actions -->|Tests pass| gh_pr
    gh_pr -->|Merge| gh_repo

    %% Deployment flow
    gh_repo -->|Branch push| cf_pages
    cf_pages --> cf_build
    cf_build -->|Feature branch| cf_preview
    cf_build -->|Main branch| cf_production

    %% Production infrastructure
    cf_preview --> cdn_global
    cf_production --> cdn_global
    cdn_global --> cdn_cache
    cdn_cache --> cdn_routes

    cdn_routes --> pages_fn
    pages_fn --> kv_store

    cdn_routes --> worker
    worker --> worker_bindings

    %% Build artifacts
    cf_build -->|Generates| dist_folder

    %% Deployment stages
    cf_build -.->|Triggers| stage1
    stage4 -.->|Monitor| analytics
    stage4 -.->|Check| webvitals

    %% Rollback
    analytics -.->|Alert| rollback_detect
