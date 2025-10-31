%% Carbon ACX Entry Points
%% All ways to interact with the codebase - CLI, API, UI, build commands

graph TB
    subgraph "Python CLI - Derivation Engine"
        cli_main["python -m calc.derive<br/>Main derivation pipeline"]

        cli_main --> cli_default["No args<br/>→ Full build pipeline<br/>→ Generate artifacts/"]
        cli_main --> cli_backend["--backend sqlite<br/>→ Use SQLite DAL<br/>→ Faster queries"]
        cli_main --> cli_output["--output <path><br/>→ Custom output dir<br/>→ Override artifacts/"]
        cli_main --> cli_verbose["--verbose<br/>→ Debug logging<br/>→ Show calculations"]

        make_build["make build<br/>Wrapper for derive.py"]
        make_build --> cli_default

        make_validate["make validate<br/>Quality checks"]
        make_validate --> ruff["ruff check<br/>Python linting"]
        make_validate --> black["black --check<br/>Code formatting"]
        make_validate --> pytest["pytest tests/<br/>Unit & integration"]
        make_validate --> npm_test["npm test (site)<br/>JavaScript tests"]
    end

    subgraph "Dash Analytics UI"
        dash_start["make app<br/>or python app/app.py"]
        dash_start --> dash_server["Dash server<br/>http://localhost:8050"]

        dash_server --> dash_home["/ (Home)<br/>Sector overview<br/>Dataset catalog"]
        dash_server --> dash_callbacks["Callbacks<br/>✓ Sector selection<br/>✓ Agency breakdown<br/>✓ Figure toggling"]
    end

    subgraph "Modern Web App - Development"
        pnpm_dev["pnpm dev<br/>or cd apps/carbon-acx-web && npm run dev"]
        pnpm_dev --> vite_dev["Vite dev server<br/>http://localhost:5173<br/>HMR enabled"]

        vite_dev --> route_root["/ (Welcome)<br/>Onboarding scene<br/>Journey start"]
        vite_dev --> route_calc["/calculator<br/>Quick estimate form<br/>Celebration view"]
        vite_dev --> route_explore["/explore<br/>Timeline/3D Universe<br/>Activity browser"]
        vite_dev --> route_insights["/insights<br/>Breakdown charts<br/>Export CSV"]

        pnpm_build["pnpm --filter carbon-acx-web build"]
        pnpm_build --> prebuild["tsx scripts/export-data.ts<br/>CSV → JSON export<br/>public/api/"]
        prebuild --> tsc_check["tsc --noEmit<br/>Type checking"]
        tsc_check --> vite_build["vite build<br/>Production bundle<br/>dist/"]
    end

    subgraph "Static React Site"
        site_dev["cd site && npm run dev"]
        site_dev --> site_vite["Vite dev<br/>http://localhost:5174"]

        site_build["cd site && npm run build"]
        site_build --> site_dist["dist/<br/>Static HTML/JS/CSS"]
    end

    subgraph "Cloudflare Workers API"
        worker_dev["wrangler dev<br/>Local worker runtime"]
        worker_dev --> worker_local["http://localhost:8787<br/>Local edge simulation"]

        worker_local --> api_compute["POST /api/compute<br/>Body: {activities: [...]}<br/>→ {totalEmissions, breakdown}"]
        worker_local --> api_health["GET /api/health<br/>→ {status: 'ok', ...}"]

        worker_deploy["wrangler deploy<br/>or wrangler publish"]
        worker_deploy --> worker_prod["Production worker<br/>https://carbon-acx.<account>.workers.dev"]
    end

    subgraph "Cloudflare Pages"
        pages_deploy["Automatic on git push<br/>GitHub → Cloudflare integration"]
        pages_deploy --> pages_preview["Preview deployment<br/>https://<hash>.carbon-acx.pages.dev"]
        pages_deploy --> pages_prod["Production deployment<br/>https://carbon-acx.pages.dev"]

        pages_preview --> pages_routes["Routes<br/>/ → index.html<br/>/calculator → SPA<br/>/api/* → JSON files"]
        pages_prod --> pages_routes
    end

    subgraph "Testing Entry Points"
        test_python["pytest tests/<br/>Python unit tests"]
        test_python --> test_fixtures["fixtures/<br/>Test data<br/>Minimal artifacts"]

        test_js["pnpm test<br/>Vitest unit tests"]
        test_js --> test_components["Component tests<br/>React Testing Library"]

        test_e2e["pnpm test:e2e<br/>Playwright e2e"]
        test_e2e --> test_browser["Browser automation<br/>User flow tests"]

        test_ui["make test-ui<br/>Python UI tests"]
        test_ui --> test_dash["Dash callback tests<br/>Integration tests"]
    end

    subgraph "Build Automation - Makefile"
        make_catalog["make catalog<br/>Generate layer catalogs"]
        make_sbom["make sbom<br/>Software bill of materials"]
        make_package["make package<br/>Create deployment bundle<br/>artifacts/ + site/dist/"]
        make_clean["make clean<br/>Remove build artifacts<br/>dist/, __pycache__, etc."]
        make_install["make install<br/>poetry install --with dev"]
        make_site_install["make site_install<br/>cd site && npm install"]
    end

    subgraph "Data Management"
        csv_edit["Edit CSV files<br/>data/*.csv<br/>Manual updates"]
        csv_edit --> staged["Move to data/_staged/<br/>Validation queue"]
        staged --> cli_default

        refs_add["Add references<br/>references/*.pdf<br/>Academic papers"]
        refs_add --> citation_check["tools/citations/<br/>Validate citations<br/>Extract metadata"]
    end

    subgraph "Configuration Entry Points"
        env_local[".env.local<br/>VITE_* variables<br/>ACX_* variables"]
        env_local --> vite_dev

        wrangler_toml["wrangler.toml<br/>Worker config<br/>KV bindings<br/>Routes"]
        wrangler_toml --> worker_dev
        wrangler_toml --> worker_deploy

        vite_config["apps/carbon-acx-web/vite.config.ts<br/>Build settings<br/>SSR exclusions<br/>Optimization"]
        vite_config --> pnpm_build

        pyproject["pyproject.toml<br/>Python dependencies<br/>Poetry config"]
        pyproject --> make_install
    end

    subgraph "CI/CD Entry Points"
        gh_push["git push origin <branch>"]
        gh_push --> ci_workflow[".github/workflows/ci.yml<br/>Automated pipeline"]

        ci_workflow --> ci_lint["Lint & Type Check<br/>Python + TypeScript"]
        ci_workflow --> ci_test["Run Tests<br/>pytest + Vitest"]
        ci_workflow --> ci_build["Build Artifacts<br/>make build<br/>pnpm build"]
        ci_workflow --> ci_deploy["Deploy<br/>Cloudflare Pages (auto)"]

        pr_create["gh pr create<br/>Create pull request"]
        pr_create --> pr_preview["Preview deployment<br/>Comment with URL"]
    end

    %% Relationships between entry points
    make_build -.->|Generates| artifacts
    artifacts["artifacts/"] -.->|Consumed by| dash_start
    prebuild -.->|Exports| public_api["public/api/*.json"]
    public_api -.->|Bundled in| vite_build
    vite_build -.->|Deployed to| pages_deploy

    csv_edit -.->|Triggers| make_build
    make_validate -.->|Runs| test_python
    make_validate -.->|Runs| test_js

    ci_workflow -.->|Calls| make_validate
    ci_workflow -.->|Calls| make_build
    ci_workflow -.->|Calls| pnpm_build
