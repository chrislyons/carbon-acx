%% Carbon ACX - Repository Structure
%% Visualizes complete directory tree and organizational patterns
%% Last updated: 2025-10-26

graph TB
    subgraph "Repository Root"
        ROOT["/"]
        ROOT --> DATA["data/<br/>CSV datasets<br/>emission_factors.csv<br/>activities.csv<br/>schedules.csv"]
        ROOT --> CALC["calc/<br/>Python derivation<br/>derive.py<br/>schemas/"]
        ROOT --> LEGACY["legacy/<br/>Old grid-based app<br/>Archived"]
        ROOT --> DOCS["docs/<br/>acx/ - ACX###.md<br/>WHAT_RUNS_WHERE.md"]
        ROOT --> WORKERS["workers/<br/>Cloudflare Workers<br/>API endpoints"]
        ROOT --> FUNCTIONS["functions/<br/>Cloudflare Pages<br/>Edge functions"]
    end

    subgraph "Modern Web App (Phase 1)"
        APPS["apps/carbon-acx-web/"]
        APPS --> SRC["src/"]

        SRC --> COMPONENTS["components/<br/>Tier-based architecture"]
        SRC --> HOOKS["hooks/<br/>React hooks<br/>useJourneyMachine<br/>useAppStore"]
        SRC --> STORE["store/<br/>Zustand state<br/>appStore.ts"]
        SRC --> CONTEXTS["contexts/<br/>React Context<br/>ProfileContext"]
        SRC --> VIEWS["views/<br/>Page-level<br/>HomeView<br/>DashboardView"]
        SRC --> STYLES["styles/<br/>tokens.css<br/>Design system"]
        SRC --> ROUTER["router.tsx<br/>React Router"]
        SRC --> CANVAS["CanvasApp.tsx<br/>Phase 1 entry"]
    end

    subgraph "Component Tiers"
        COMPONENTS --> TIER1["system/<br/>Primitives<br/>Button, Dialog"]
        COMPONENTS --> TIER2["canvas/<br/>Layout<br/>CanvasZone<br/>StoryScene"]
        COMPONENTS --> TIER3["viz/<br/>Visualizations<br/>TimelineViz<br/>GaugeProgress"]
        COMPONENTS --> TIER4["domain/<br/>Business logic<br/>EmissionCalculator<br/>ActivityBrowser"]
        COMPONENTS --> TIER5["scenes/<br/>Full scenes<br/>OnboardingScene<br/>ExploreScene"]
    end

    subgraph "Configuration Files"
        ROOT --> PKG["package.json<br/>pnpm workspace"]
        ROOT --> VITE["vite.config.ts<br/>Build config"]
        ROOT --> TAIL["tailwind.config.ts<br/>Design tokens"]
        ROOT --> TS["tsconfig.json<br/>TypeScript config"]
        ROOT --> CLAUDE["CLAUDE.md<br/>Dev guidelines"]
        ROOT --> MAKE["Makefile<br/>Build automation"]
    end

    subgraph "Legacy Python App"
        APP["app/<br/>Python Dash<br/>analytics UI"]
        SITE["site/<br/>Static React<br/>marketing site"]
    end

    subgraph "Backend Data Pipeline"
        DATA --> EMISSION["emission_factors.csv<br/>99 factors<br/>Source: backend"]
        DATA --> ACTIVITIES["activities.csv<br/>107 activities<br/>Categorical data"]
        DATA --> SCHEDULES["schedules.csv<br/>Time-based data"]

        CALC --> DERIVE["derive.py<br/>Main pipeline<br/>Validates + computes"]
        CALC --> SCHEMAS["schemas/<br/>Pydantic models"]
        CALC --> DIST["dist/artifacts/<br/>Generated manifests<br/>Hashed outputs"]
    end

    style APPS fill:#e3f2fd
    style COMPONENTS fill:#fff3e0
    style DATA fill:#f3e5f5
    style CALC fill:#e8f5e9
