%% Carbon ACX Architecture Overview
%% Version: v0.0.4 (Nov 2025)
%% 4-Layer Architecture: Data → Derivation → UI → Edge

graph TB
    subgraph "Layer 1: Data Sources"
        CSV_FILES["Canonical CSV Files<br/>• activities.csv<br/>• emission_factors.csv<br/>• grid_intensity.csv<br/>• sources.csv"]
        VALIDATION["Schema Validation<br/>Pydantic Models<br/>(schema.py)"]
    end

    subgraph "Layer 2: Python Derivation Engine"
        DERIVE["Derivation Pipeline<br/>derive.py (1,926 lines)<br/>───────<br/>1. Load & Validate CSV<br/>2. Match Activities ↔ Factors<br/>3. Calculate Emissions<br/>4. Generate Figures"]

        FIGURES["Figure Generation<br/>figures.py<br/>───────<br/>• JSON output per activity<br/>• Layer aggregations<br/>• Comparative analysis"]

        MANIFEST_GEN["Manifest Creation<br/>figures_manifest.py<br/>───────<br/>• SHA256 byte hashes<br/>• Provenance tracking<br/>• Citation linkage<br/>• Schema versioning"]

        DAL["Data Access Layer<br/>calc/dal/<br/>───────<br/>CSV | DuckDB | SQLite"]
    end

    subgraph "Layer 3: Content-Addressed Artifacts"
        ARTIFACTS["dist/artifacts/<hash>/<br/>───────<br/>Immutable, hash-prefixed outputs"]

        MANIFEST_FILES["manifests/<br/>• Figure manifests<br/>• Byte hashes<br/>• Provenance"]

        FIGURE_FILES["figures/<br/>• JSON data<br/>• Calculations<br/>• Activity details"]

        REF_FILES["references/<br/>• Citation sources<br/>• Source URLs<br/>• Methodologies"]
    end

    subgraph "Layer 4: Next.js 15 Frontend"
        NEXTJS["Next.js App<br/>───────<br/>SSR + Static Generation<br/>React 19<br/>TypeScript"]

        SERVER_COMP["Server Components<br/>• Layout.tsx<br/>• Page components<br/>• Data fetching"]

        CLIENT_COMP["Client Components<br/>• DataUniverse (3D)<br/>• Interactive UI<br/>• Form inputs"]

        API_ROUTES["API Routes<br/>/api/manifests<br/>/api/manifests/[id]<br/>/api/health"]

        MANIFEST_LIB["lib/manifests.ts<br/>Server-side helpers<br/>───────<br/>• getRootManifest()<br/>• getManifests()<br/>• verifyManifest()"]
    end

    subgraph "Layer 5: 3D Visualization"
        THREEJS["Three.js<br/>^0.168.0"]
        R3F["React Three Fiber<br/>^8.17.10"]
        DREI["React Three Drei<br/>^9.114.3"]

        DATA_UNIVERSE["DataUniverse Component<br/>520 lines<br/>───────<br/>• Central sphere (total)<br/>• Orbiting spheres (activities)<br/>• Camera choreography<br/>• Hover interactions"]
    end

    subgraph "Layer 6: Edge Deployment"
        CF_PAGES["Cloudflare Pages<br/>───────<br/>Static hosting<br/>Global CDN<br/>SSR support"]

        CF_FUNCTIONS["Cloudflare Functions<br/>(file-based routing)"]

        CF_WORKERS["Cloudflare Workers<br/>(future: API proxy)"]
    end

    subgraph "State Management"
        TANSTACK["TanStack Query<br/>Server State<br/>───────<br/>• Manifest caching (5min)<br/>• API response cache<br/>• Automatic revalidation"]

        ZUSTAND["Zustand<br/>Client State<br/>───────<br/>• UI selections<br/>• Minimal usage<br/>• Component-local"]

        URL_STATE["URL State<br/>Next.js Search Params<br/>───────<br/>• Filters<br/>• Navigation<br/>• Shareable links"]
    end

    subgraph "External Services"
        GHG_PROTOCOL["GHG Protocol<br/>Emission factors"]
        EPA["EPA<br/>US data sources"]
        IPCC["IPCC AR6<br/>GWP horizons"]
        DEFRA["DEFRA<br/>UK factors"]
    end

    CSV_FILES --> VALIDATION
    VALIDATION --> DERIVE
    DERIVE --> DAL
    DERIVE --> FIGURES
    FIGURES --> MANIFEST_GEN
    MANIFEST_GEN --> ARTIFACTS

    ARTIFACTS --> MANIFEST_FILES
    ARTIFACTS --> FIGURE_FILES
    ARTIFACTS --> REF_FILES

    MANIFEST_FILES --> MANIFEST_LIB
    MANIFEST_LIB --> API_ROUTES
    API_ROUTES --> TANSTACK

    NEXTJS --> SERVER_COMP
    NEXTJS --> CLIENT_COMP
    NEXTJS --> API_ROUTES

    CLIENT_COMP --> DATA_UNIVERSE
    DATA_UNIVERSE --> THREEJS
    DATA_UNIVERSE --> R3F
    DATA_UNIVERSE --> DREI

    SERVER_COMP --> CF_PAGES
    CLIENT_COMP --> CF_PAGES
    API_ROUTES --> CF_FUNCTIONS
    CF_FUNCTIONS --> CF_WORKERS

    TANSTACK -.-> CLIENT_COMP
    ZUSTAND -.-> CLIENT_COMP
    URL_STATE -.-> NEXTJS

    VALIDATION -.-> GHG_PROTOCOL
    VALIDATION -.-> EPA
    VALIDATION -.-> IPCC
    VALIDATION -.-> DEFRA

    style CSV_FILES fill:#10b981,stroke:#059669,color:#fff
    style DERIVE fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style ARTIFACTS fill:#ef4444,stroke:#dc2626,color:#fff
    style NEXTJS fill:#f59e0b,stroke:#d97706,color:#fff
    style DATA_UNIVERSE fill:#06b6d4,stroke:#0891b2,color:#fff
    style CF_PAGES fill:#ec4899,stroke:#db2777,color:#fff
    style TANSTACK fill:#3b82f6,stroke:#2563eb,color:#fff
