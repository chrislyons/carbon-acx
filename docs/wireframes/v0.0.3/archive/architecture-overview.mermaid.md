%% Carbon ACX Architecture Overview
%% High-level system design showing all architectural layers and external integrations

graph TB
    subgraph "External Data Sources"
        csv_sources["CSV Data Sources<br/>✓ emission_factors.csv<br/>✓ activities.csv<br/>✓ layers.csv<br/>✓ schedules.csv"]
        refs_external["Reference Documents<br/>✓ Academic papers<br/>✓ Standards (ISO, GHG Protocol)<br/>✓ Government datasets"]
    end

    subgraph "Data Layer - Canonical Storage"
        data_store["data/<br/>Git-versioned CSVs<br/>Single source of truth"]
        staged["data/_staged/<br/>Incoming/validation queue"]
    end

    subgraph "Derivation Engine - Python 3.11+"
        derive_main["calc/derive.py<br/>Main orchestrator<br/>Pydantic validation"]
        dal_layer["calc/dal/<br/>Data Access Layer<br/>SQLite backend"]
        calculation["calc/utils/<br/>Emission calculations<br/>Intensity matrices"]
        output_gen["calc/outputs/<br/>Manifest generation<br/>SHA-256 hashing"]
    end

    subgraph "Build Artifacts - Immutable Manifests"
        artifacts["artifacts/<br/>Versioned bundles<br/>Content-addressed"]
        manifests["manifest.json<br/>✓ Byte hashes<br/>✓ Schema versions<br/>✓ Provenance chains"]
        figures["figures/<br/>Plotly JSON<br/>ECharts configs"]
    end

    subgraph "User Interfaces - Multi-Target"
        direction TB

        dash_app["Dash Application<br/>Python Plotly<br/>Analyst-focused<br/>Port 8050"]

        modern_web["Modern Web App<br/>React 18 + TypeScript<br/>Vite 5 build<br/>Canvas-first UX"]

        static_site["Static React Site<br/>Marketing/Investor<br/>Vite SSG<br/>WebGPU chat"]
    end

    subgraph "Edge Runtime - Cloudflare"
        direction LR

        pages["Cloudflare Pages<br/>Static hosting<br/>Global CDN"]

        worker_api["Cloudflare Worker<br/>/api/compute<br/>/api/health<br/>On-demand calc"]

        pages_fn["Pages Function<br/>[[path]].ts<br/>Artifact proxy<br/>Cache: immutable"]
    end

    subgraph "State Management - Client Side"
        zustand["Zustand Store<br/>✓ App state<br/>✓ LocalStorage sync<br/>✓ Activities & results"]

        xstate["XState Machines<br/>✓ Journey orchestration<br/>✓ Scene transitions<br/>✓ Onboarding flow"]

        react_query["TanStack Query<br/>✓ API cache<br/>✓ Sector/dataset loading<br/>✓ Stale-while-revalidate"]
    end

    subgraph "Visualization Libraries"
        echarts["Apache ECharts 6<br/>✓ Canvas rendering<br/>✓ 60fps performance<br/>✓ Timeline/Sankey charts"]

        three_js["Three.js 0.168<br/>React Three Fiber 8.17<br/>✓ DataUniverse 3D<br/>✓ Orbital mechanics"]

        recharts["Recharts 2<br/>✓ Simple 2D charts<br/>✓ React integration"]
    end

    subgraph "Build & Deployment Pipeline"
        ci["GitHub Actions CI<br/>✓ Python tests (pytest)<br/>✓ JS tests (Vitest)<br/>✓ Lint & type check"]

        build_py["Python Build<br/>poetry install<br/>make build"]

        build_js["JavaScript Build<br/>pnpm install<br/>vite build"]

        deploy["Cloudflare Deploy<br/>✓ Pages (auto)<br/>✓ Workers (wrangler)"]
    end

    subgraph "Design System - Phase 1 Rebuild"
        tokens["CSS Custom Properties<br/>✓ Typography (Major Third)<br/>✓ Colors (carbon intensity)<br/>✓ Spacing (4px base)<br/>✓ Motion (story-driven)"]

        components["Component Tiers<br/>Tier 1: Primitives<br/>Tier 2: Layout<br/>Tier 3: Visualizations<br/>Tier 4: Domain"]

        zones["Canvas Zones<br/>Hero: 70vh<br/>Insight: 20vh<br/>Detail: 10vh"]
    end

    %% Data flow
    csv_sources -->|Manual updates| staged
    staged -->|Validation| data_store
    data_store -->|Read CSVs| derive_main
    derive_main --> dal_layer
    derive_main --> calculation
    calculation --> output_gen
    output_gen -->|Generate| artifacts
    artifacts -->|Manifests| manifests
    artifacts -->|Figures| figures

    %% UI consumption
    artifacts -.->|Load artifacts| dash_app
    artifacts -.->|Static JSON export| modern_web
    artifacts -.->|Copy to public/| static_site

    %% Deployment
    modern_web -->|Build| build_js
    build_js -->|Deploy| pages
    pages -->|Serve via| pages_fn

    worker_api -.->|On-demand calc| calculation

    %% Client-side architecture
    modern_web --> zustand
    modern_web --> xstate
    modern_web --> react_query
    modern_web --> echarts
    modern_web --> three_js
    modern_web --> tokens
    modern_web --> components

    %% CI/CD
    ci -->|Test Python| build_py
    ci -->|Test JS| build_js
    build_py -->|Package| artifacts
    build_js -->|Deploy| deploy
    deploy --> pages
    deploy --> worker_api

    %% External integrations
    refs_external -.->|Citation validation| tools
    tools["tools/citations<br/>tools/validator"]
    tools -.->|Schema check| derive_main
