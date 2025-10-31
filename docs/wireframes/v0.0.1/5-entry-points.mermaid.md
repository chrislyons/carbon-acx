%% Carbon ACX - Application Entry Points
%% Visualizes initialization sequences and bootstrap flows
%% Last updated: 2025-10-26

flowchart TB
    subgraph "HTML Entry"
        INDEX["/index.html<br/>Root HTML"]
        ROOT_DIV["#root div<br/>React mount point"]
        INDEX --> ROOT_DIV
    end

    subgraph "Main Bootstrap (main.tsx)"
        MAIN["main.tsx<br/>Entry point"]
        ENV_CHECK{"ACX_LEGACY_UI<br/>env var?"}
        LOAD_LEGACY["import('./legacy/LegacyApp')"]
        LOAD_NEW["import('./NewApp')"]
        RENDER["ReactDOM.createRoot()<br/>React 18 concurrent mode"]

        MAIN --> ENV_CHECK
        ENV_CHECK -->|"=== '1'"| LOAD_LEGACY
        ENV_CHECK -->|"!== '1'"| LOAD_NEW
        LOAD_LEGACY --> RENDER
        LOAD_NEW --> RENDER
    end

    subgraph "Modern App Entry (NewApp.tsx → CanvasApp.tsx)"
        NEW_APP["NewApp.tsx<br/>Re-exports CanvasApp"]
        CANVAS_APP["CanvasApp.tsx<br/>Phase 1 entry point"]
        IMPORT_STYLES["Import styles/<br/>tokens.css<br/>index.css"]
        INIT_HOOKS["Initialize hooks:<br/>useJourneyMachine()<br/>useAppStore()"]
        SMART_INIT{"Has existing data?<br/>activities.length > 0"}

        NEW_APP --> CANVAS_APP
        CANVAS_APP --> IMPORT_STYLES
        CANVAS_APP --> INIT_HOOKS
        INIT_HOOKS --> SMART_INIT
        SMART_INIT -->|Yes| SKIP_SCENES["skipOnboarding()<br/>baselineComplete()<br/>exploreSectors()"]
        SMART_INIT -->|No| RENDER_SCENES["Render scenes:<br/>OnboardingScene<br/>BaselineScene<br/>ExploreScene<br/>InsightScene"]
        SKIP_SCENES --> RENDER_SCENES
    end

    subgraph "State Initialization"
        ZUSTAND_INIT["Zustand Store<br/>appStore.ts"]
        PERSIST["Zustand persist middleware<br/>localStorage key:<br/>'carbon-acx-storage'"]
        HYDRATE["Hydrate from localStorage"]
        XSTATE_INIT["XState Machine<br/>journeyMachine.ts"]
        JOURNEY_CTX["Initialize context:<br/>hasCompletedOnboarding: false<br/>hasEstablishedBaseline: false<br/>activitiesAdded: 0"]

        INIT_HOOKS --> ZUSTAND_INIT
        INIT_HOOKS --> XSTATE_INIT
        ZUSTAND_INIT --> PERSIST
        PERSIST --> HYDRATE
        XSTATE_INIT --> JOURNEY_CTX
    end

    subgraph "Legacy React Router Entry"
        LEGACY_APP["LegacyApp.tsx<br/>(deprecated)"]
        ROUTER_PROVIDER["RouterProvider<br/>React Router v6"]
        ROUTES["Routes:<br/>/ → HomeView<br/>/dashboard → CanvasApp<br/>/dashboard-legacy → DashboardView<br/>/sectors/:id → SectorView"]

        LEGACY_APP --> ROUTER_PROVIDER
        ROUTER_PROVIDER --> ROUTES
    end

    subgraph "Development Server"
        VITE_DEV["pnpm dev<br/>vite dev server"]
        PORT["http://localhost:5173"]
        HMR["Hot Module Replacement<br/>React Fast Refresh"]
        MIDDLEWARE["Sample Queries API<br/>Middleware:<br/>/api/sectors<br/>/api/datasets<br/>/api/emission-factors"]

        VITE_DEV --> PORT
        VITE_DEV --> HMR
        VITE_DEV --> MIDDLEWARE
    end

    subgraph "Production Build"
        VITE_BUILD["pnpm build<br/>vite build"]
        PREBUILD["prebuild script:<br/>Generate schema"]
        DIST["dist/<br/>Static assets"]
        MINIFY["Tree-shake + minify<br/>Code split chunks"]

        VITE_BUILD --> PREBUILD
        PREBUILD --> DIST
        VITE_BUILD --> MINIFY
        MINIFY --> DIST
    end

    subgraph "Python Dash App (Legacy Analytics)"
        MAKE_APP["make app<br/>Launch Dash"]
        DASH_SERVER["Python Dash server<br/>app/"]
        DASH_PORT["http://localhost:8050"]

        MAKE_APP --> DASH_SERVER
        DASH_SERVER --> DASH_PORT
    end

    subgraph "Static React Site (Marketing)"
        SITE_DEV["cd site && npm run dev"]
        SITE_SERVER["Vite dev server<br/>site/"]
        SITE_PORT["http://localhost:5174"]

        SITE_DEV --> SITE_SERVER
        SITE_SERVER --> SITE_PORT
    end

    ROOT_DIV -.-> MAIN
    LOAD_NEW -.-> NEW_APP
    LOAD_LEGACY -.-> LEGACY_APP
    RENDER_SCENES --> ZUSTAND_INIT
    RENDER_SCENES --> XSTATE_INIT

    style CANVAS_APP fill:#e3f2fd
    style ZUSTAND_INIT fill:#fff3e0
    style XSTATE_INIT fill:#f3e5f5
    style VITE_DEV fill:#e8f5e9
    style DASH_SERVER fill:#fce4ec
