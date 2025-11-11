%% Carbon ACX Entry Points
%% Version: v0.0.4 (Nov 2025)
%% All ways to interact with the codebase

graph TB
    subgraph "Build & Development Entry Points"
        MAKE["Makefile<br/>───────<br/>Build orchestration"]
        MAKE_INSTALL["make install<br/>Install dependencies<br/>(Poetry + pnpm)"]
        MAKE_BUILD["make build<br/>Build artifacts<br/>(Python derivation)"]
        MAKE_VALIDATE["make validate<br/>Lint + format check<br/>(Ruff, Black)"]
        MAKE_TEST["make test<br/>Run test suite<br/>(pytest)"]
        MAKE_WEB["make build-web<br/>Build Next.js<br/>(pnpm build)"]
        MAKE_PACKAGE["make package<br/>Package for deploy<br/>(artifacts + web)"]
        MAKE_CI["make ci_build_pages<br/>Full CI pipeline<br/>(install + test + package)"]
    end

    subgraph "Python Entry Points"
        PYTHON_DERIVE["python -m calc.derive<br/>Main derivation engine<br/>───────<br/>• Load CSV<br/>• Validate schema<br/>• Calculate emissions<br/>• Generate manifests"]

        PYTHON_SERVICE["python -m calc.service<br/>High-level API<br/>───────<br/>• generate_figures()<br/>• verify_manifests()<br/>• export_catalog()"]

        PYTHON_CATALOG["python -m calc.make_catalog<br/>Generate catalog<br/>───────<br/>• Build activity index<br/>• Create layer summaries"]

        PYTEST["pytest tests/<br/>Test suite<br/>───────<br/>• test_emission_factors.py<br/>• test_manifests.py<br/>• test_schema.py"]
    end

    subgraph "Next.js Entry Points"
        PNPM_DEV["pnpm dev<br/>Dev server (localhost:3000)<br/>───────<br/>• Hot module reload<br/>• Fast refresh<br/>• Source maps"]

        PNPM_BUILD["pnpm build<br/>Production build<br/>───────<br/>• TypeScript compile<br/>• Bundle optimization<br/>• Static generation"]

        PNPM_START["pnpm start<br/>Start production server<br/>───────<br/>• Serve .next/ directory"]

        PNPM_TEST["pnpm test<br/>Run Vitest tests<br/>───────<br/>• Unit tests<br/>• Component tests"]

        PNPM_TYPECHECK["pnpm typecheck<br/>TypeScript validation<br/>───────<br/>• tsc --noEmit"]

        PNPM_LINT["pnpm lint<br/>ESLint check<br/>───────<br/>• Lint all .ts/.tsx"]
    end

    subgraph "Web Entry Points (User-Facing)"
        WEB_HOME["GET /<br/>Home Page<br/>───────<br/>Landing + navigation"]

        WEB_CALC["GET /calculator<br/>Carbon Calculator<br/>───────<br/>Interactive wizard"]

        WEB_EXPLORE["GET /explore<br/>Explore Hub<br/>───────<br/>2D/3D view launcher"]

        WEB_EXPLORE_3D["GET /explore/3d<br/>3D Universe<br/>───────<br/>Full DataUniverse"]

        WEB_MANIFESTS["GET /manifests<br/>Manifest List<br/>───────<br/>Browse all manifests"]

        WEB_MANIFEST_ID["GET /manifests/:id<br/>Manifest Detail<br/>───────<br/>Provenance view"]

        WEB_METHOD["GET /methodology<br/>Methodology Docs<br/>───────<br/>Calculation methods"]
    end

    subgraph "API Entry Points"
        API_HEALTH["GET /api/health<br/>Health Check<br/>───────<br/>Returns: {status: 'ok'}"]

        API_MANIFESTS["GET /api/manifests<br/>List Manifests<br/>───────<br/>Returns: ManifestListItem[]"]

        API_MANIFEST_ID["GET /api/manifests/:id<br/>Get Manifest<br/>───────<br/>Returns: FigureManifest"]
    end

    subgraph "Git Entry Points"
        GIT_CLONE["git clone<br/>Clone repository<br/>───────<br/>https://github.com/<br/>chrislyons/carbon-acx"]

        GIT_BRANCH["git checkout -b<br/>feature/my-feature<br/>───────<br/>Create feature branch"]

        GIT_COMMIT["git commit -m<br/>'feat: description'<br/>───────<br/>Commit changes"]

        GIT_PUSH["git push origin<br/>feature/my-feature<br/>───────<br/>Push to remote"]

        GIT_PR["GitHub PR<br/>Create pull request<br/>───────<br/>Triggers CI/CD"]
    end

    subgraph "Deployment Entry Points"
        WRANGLER_DEV["wrangler pages dev<br/>Local Cloudflare emulation<br/>───────<br/>Test SSR locally"]

        WRANGLER_DEPLOY["wrangler pages deploy<br/>Deploy to Cloudflare<br/>───────<br/>Publish .next/ directory"]

        CF_PUSH["Git push to main<br/>Auto-deploy<br/>───────<br/>Cloudflare watches repo<br/>Builds + deploys"]

        CF_PREVIEW["Git push to branch<br/>Preview deployment<br/>───────<br/>Unique URL per branch"]
    end

    subgraph "Configuration Entry Points"
        PYPROJECT["pyproject.toml<br/>Python config<br/>───────<br/>• Dependencies<br/>• Poetry settings<br/>• Tool configs"]

        PKG_JSON["package.json<br/>Node config<br/>───────<br/>• Scripts<br/>• Dependencies<br/>• Workspace setup"]

        NEXT_CONFIG["next.config.ts<br/>Next.js config<br/>───────<br/>• Build settings<br/>• Environment vars<br/>• Image optimization"]

        WRANGLER_TOML["wrangler.toml<br/>Cloudflare config<br/>───────<br/>• Project name<br/>• Build command<br/>• Routes"]

        CLAUDE_MD["CLAUDE.md<br/>Development guide<br/>───────<br/>• Architecture docs<br/>• Workflow patterns<br/>• File boundaries"]
    end

    MAKE --> MAKE_INSTALL
    MAKE --> MAKE_BUILD
    MAKE --> MAKE_VALIDATE
    MAKE --> MAKE_TEST
    MAKE --> MAKE_WEB
    MAKE --> MAKE_PACKAGE
    MAKE --> MAKE_CI

    MAKE_BUILD --> PYTHON_DERIVE
    PYTHON_DERIVE --> PYTHON_SERVICE
    PYTHON_DERIVE --> PYTHON_CATALOG
    MAKE_TEST --> PYTEST

    MAKE_WEB --> PNPM_BUILD
    PNPM_BUILD -.-> PNPM_START
    PNPM_DEV -.-> WEB_HOME
    PNPM_TEST -.-> PNPM_TYPECHECK
    PNPM_TEST -.-> PNPM_LINT

    WEB_HOME --> WEB_CALC
    WEB_HOME --> WEB_EXPLORE
    WEB_HOME --> WEB_METHOD
    WEB_EXPLORE --> WEB_EXPLORE_3D
    WEB_HOME --> WEB_MANIFESTS
    WEB_MANIFESTS --> WEB_MANIFEST_ID

    WEB_MANIFESTS -.-> API_MANIFESTS
    WEB_MANIFEST_ID -.-> API_MANIFEST_ID
    API_HEALTH -.-> API_MANIFESTS

    GIT_CLONE --> GIT_BRANCH
    GIT_BRANCH --> GIT_COMMIT
    GIT_COMMIT --> GIT_PUSH
    GIT_PUSH --> GIT_PR

    GIT_PUSH --> CF_PUSH
    GIT_PUSH --> CF_PREVIEW
    WRANGLER_DEPLOY -.-> CF_PUSH

    PYPROJECT -.-> MAKE_INSTALL
    PKG_JSON -.-> MAKE_INSTALL
    NEXT_CONFIG -.-> PNPM_BUILD
    WRANGLER_TOML -.-> WRANGLER_DEPLOY
    CLAUDE_MD -.-> MAKE

    style MAKE fill:#0a0e27,stroke:#60a5fa,stroke-width:3px,color:#fff
    style PYTHON_DERIVE fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    style WEB_HOME fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    style API_HEALTH fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    style GIT_CLONE fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style CF_PUSH fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff
