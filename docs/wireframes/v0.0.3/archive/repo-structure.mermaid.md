%% Carbon ACX Repository Structure
%% Complete directory tree visualization showing code organization patterns

graph TB
    subgraph "Root Configuration"
        root["/"]
        root --> pyproject["pyproject.toml<br/>Python Poetry config<br/>Dependencies & build"]
        root --> package["package.json<br/>Root workspace<br/>pnpm monorepo"]
        root --> makefile["Makefile<br/>Build automation<br/>Task orchestration"]
        root --> wrangler["wrangler.toml<br/>Cloudflare config<br/>Worker & Pages"]
    end

    subgraph "Data Layer - Canonical CSV Sources"
        data["data/<br/>Source of truth<br/>CSV datasets"]
        data --> layers["layers.csv<br/>Activity layers"]
        data --> activities["activities.csv<br/>Carbon activities"]
        data --> factors["emission_factors.csv<br/>Emission factors"]
        data --> schedules["schedules.csv<br/>Time-based data"]
        data --> staged["_staged/<br/>Incoming data"]
    end

    subgraph "Derivation Engine - Python"
        calc["calc/<br/>Python engine<br/>Pydantic schemas"]
        calc --> derive["derive.py<br/>Main pipeline<br/>CSV → manifests"]
        calc --> dal["dal/<br/>Data access layer<br/>SQLite backend"]
        calc --> utils["utils/<br/>Calculations<br/>Validations"]
        calc --> outputs["outputs/<br/>Generated artifacts<br/>Hashed manifests"]
    end

    subgraph "User Interfaces"
        ui_dash["app/<br/>Dash analytics<br/>Python Plotly"]
        ui_dash --> dash_comp["components/<br/>Dash components"]
        ui_dash --> dash_lib["lib/<br/>Data loaders"]

        ui_modern["apps/carbon-acx-web/<br/>Modern React app<br/>Vite TypeScript"]
        ui_modern --> modern_src["src/<br/>React components"]
        ui_modern --> modern_tests["tests/<br/>Playwright e2e"]
        ui_modern --> modern_public["public/<br/>Static API JSON"]

        ui_site["site/<br/>Static React<br/>Marketing/Investor"]
        ui_site --> site_src["src/<br/>Components & routes"]
        ui_site --> site_public["public/<br/>Artifacts & models"]
    end

    subgraph "Edge Delivery"
        workers["workers/<br/>Cloudflare Workers<br/>Compute API"]
        workers --> compute["compute/<br/>/api/compute<br/>/api/health"]

        functions["functions/<br/>Cloudflare Pages<br/>Artifact proxy"]
        functions --> carbon_fn["carbon-acx/[[path]].ts<br/>Immutable caching"]
    end

    subgraph "CI/CD & Tooling"
        github[".github/<br/>GitHub Actions<br/>CI workflows"]
        scripts["scripts/<br/>Build automation<br/>Python & Bash"]
        tools["tools/<br/>Utilities"]
        tools --> citations["citations/<br/>Reference checking"]
        tools --> validator["validator/<br/>Schema validation"]
    end

    subgraph "Documentation"
        docs["docs/<br/>Documentation"]
        docs --> acx_docs["acx/<br/>ACX series<br/>Decision records"]
        docs --> guides["guides/<br/>How-to guides"]
        docs --> audits["audits/<br/>PR reviews<br/>Quality checks"]
    end

    subgraph "Testing & Quality"
        tests["tests/<br/>Python test suite"]
        tests --> fixtures["fixtures/<br/>Test data"]
        tests --> ui_tests["ui/<br/>UI tests"]
        tests --> visual["visual/<br/>Visual regression"]
    end

    subgraph "References & Artifacts"
        refs["references/<br/>Source documents<br/>PDFs & papers"]
        artifacts["artifacts/<br/>Build outputs<br/>Versioned bundles"]
        db["db/<br/>SQLite databases<br/>Query backend"]
    end

    %% Data flow connections
    data -.->|CSV input| calc
    calc -.->|Generates| artifacts
    artifacts -.->|Consumed by| ui_dash
    artifacts -.->|Consumed by| ui_modern
    artifacts -.->|Consumed by| ui_site
    ui_modern -.->|Deploys to| functions
    workers -.->|APIs| ui_modern
    scripts -.->|Builds| calc
    scripts -.->|Packages| artifacts
