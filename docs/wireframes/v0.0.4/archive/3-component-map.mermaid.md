%% Carbon ACX Component Map
%% Version: v0.0.4 (Nov 2025)
%% React component hierarchy and relationships (Next.js 15 + React 19)

graph TB
    subgraph "App Router (Server Components)"
        ROOT_LAYOUT["app/layout.tsx<br/>Root Layout<br/>───────<br/>• QueryProvider<br/>• Header<br/>• Footer<br/>• Metadata"]

        HOME_PAGE["app/page.tsx<br/>Home Page<br/>───────<br/>3-card navigation:<br/>Calculator | Explore | Methodology"]

        CALCULATOR_PAGE["app/calculator/page.tsx<br/>Calculator Page<br/>───────<br/>Carbon footprint wizard<br/>Activity selection<br/>Results display"]

        EXPLORE_PAGE["app/explore/page.tsx<br/>Explore Hub<br/>───────<br/>2D/3D toggle<br/>View mode launcher"]

        EXPLORE_3D_PAGE["app/explore/3d/page.tsx<br/>3D Universe Page<br/>───────<br/>Full DataUniverse<br/>Activity interaction"]

        MANIFESTS_LIST["app/manifests/page.tsx<br/>Manifest List<br/>───────<br/>Browse all manifests<br/>Server Component"]

        MANIFEST_DETAIL["app/manifests/[id]/page.tsx<br/>Manifest Detail<br/>───────<br/>Provenance view<br/>Byte hash verification<br/>Server Component"]

        METHODOLOGY_PAGE["app/methodology/page.tsx<br/>Methodology Docs<br/>───────<br/>Calculation methods<br/>Data sources<br/>Server Component"]
    end

    subgraph "API Routes (Server)"
        API_HEALTH["api/health/route.ts<br/>Health Check<br/>───────<br/>GET /api/health<br/>Returns: {status: 'ok'}"]

        API_MANIFESTS["api/manifests/route.ts<br/>List Manifests<br/>───────<br/>GET /api/manifests<br/>Server-side file reads"]

        API_MANIFEST_ID["api/manifests/[id]/route.ts<br/>Get Manifest<br/>───────<br/>GET /api/manifests/:id<br/>Returns: FigureManifest"]
    end

    subgraph "Layout Components"
        HEADER["components/layout/Header.tsx<br/>Navigation Bar<br/>───────<br/>Logo, nav links<br/>Mobile menu"]

        FOOTER["components/layout/Footer.tsx<br/>Footer<br/>───────<br/>Links, metadata<br/>Version info"]
    end

    subgraph "Provider Components"
        QUERY_PROVIDER["components/providers/<br/>QueryProvider.tsx<br/>───────<br/>TanStack Query wrapper<br/>Client Component<br/>───────<br/>Config:<br/>• staleTime: 5min<br/>• gcTime: 10min<br/>• refetchOnFocus: false"]
    end

    subgraph "Visualization Components (Client)"
        DATA_UNIVERSE["components/viz/<br/>DataUniverse.tsx<br/>520 lines<br/>───────<br/>Client Component<br/>Lazy-loaded<br/>───────<br/>• Three.js Canvas<br/>• Central sphere (total)<br/>• Orbiting spheres (activities)<br/>• Camera choreography<br/>• Hover/click interactions<br/>───────<br/>Props:<br/>• totalEmissions: number<br/>• activities: Activity[]<br/>• manifest?: ManifestInfo<br/>• onActivityClick?: fn<br/>• enableIntroAnimation?: bool"]

        CENTRAL_SPHERE["CentralSphere<br/>Internal component<br/>───────<br/>• Total emissions<br/>• Pulsing animation<br/>• Logarithmic size<br/>• Color-coded"]

        ORBITING_SPHERE["OrbitingActivity<br/>Internal component<br/>───────<br/>• Individual activity<br/>• Orbital motion<br/>• Hover glow<br/>• Click handler<br/>• HTML label"]

        CAMERA_ANIMATOR["CameraAnimator<br/>Internal component<br/>───────<br/>• Intro zoom<br/>• Click-to-fly<br/>• Easing functions<br/>• Frame-rate independent"]

        STARFIELD["Stars<br/>From @react-three/drei<br/>───────<br/>• 5000 particles<br/>• Radius: 100<br/>• Background effect"]

        ORBIT_CONTROLS["OrbitControls<br/>From @react-three/drei<br/>───────<br/>• Drag to rotate<br/>• Scroll to zoom<br/>• Touch support"]
    end

    subgraph "Domain Components"
        ACTIVITY_CARD["ActivityCard<br/>Display activity details<br/>───────<br/>• Name, category<br/>• Emissions<br/>• Color-coded badge"]

        CITATION_PANEL["CitationPanel<br/>Show data sources<br/>───────<br/>• Emission factor<br/>• Source reference<br/>• Methodology<br/>• Links to sources"]

        ACTIVITY_MGMT["ActivityManagement<br/>Manage user activities<br/>───────<br/>• 2D table view<br/>• Edit quantity<br/>• Delete activity<br/>• View citations"]

        METHODOLOGY_MODAL["MethodologyModal<br/>Calculation docs<br/>───────<br/>• Formula explanations<br/>• Data sources<br/>• QA process<br/>• Limitations"]

        MANIFEST_CARD["ManifestCard<br/>Display manifest summary<br/>───────<br/>• Figure ID<br/>• Generated date<br/>• Hash preview<br/>• Citation count"]

        MANIFEST_DETAIL_VIEW["ManifestDetailView<br/>Full manifest display<br/>───────<br/>• Schema version<br/>• Byte hashes<br/>• Citations<br/>• References<br/>• Verify button"]
    end

    subgraph "Server-Side Libraries"
        MANIFESTS_LIB["lib/manifests.ts<br/>Server helpers<br/>───────<br/>• getRootManifest()<br/>• getManifests()<br/>• getManifest(id)<br/>• verifyManifest(id)<br/>───────<br/>Reads from:<br/>dist/artifacts/"]

        UTILS_LIB["lib/utils.ts<br/>Utility functions<br/>───────<br/>• cn() - className merge<br/>• formatters<br/>• date helpers"]
    end

    subgraph "Type Definitions"
        MANIFEST_TYPES["types/manifest.ts<br/>TypeScript interfaces<br/>───────<br/>• RootManifest<br/>• FigureManifest<br/>• ManifestListItem<br/>• Activity<br/>• ManifestInfo"]

        R3F_TYPES["types/react-three-fiber.d.ts<br/>Three.js type extensions<br/>───────<br/>• ThreeElements<br/>• JSX namespace<br/>• Custom mesh props"]
    end

    ROOT_LAYOUT --> QUERY_PROVIDER
    ROOT_LAYOUT --> HEADER
    ROOT_LAYOUT --> FOOTER

    ROOT_LAYOUT --> HOME_PAGE
    ROOT_LAYOUT --> CALCULATOR_PAGE
    ROOT_LAYOUT --> EXPLORE_PAGE
    ROOT_LAYOUT --> EXPLORE_3D_PAGE
    ROOT_LAYOUT --> MANIFESTS_LIST
    ROOT_LAYOUT --> MANIFEST_DETAIL
    ROOT_LAYOUT --> METHODOLOGY_PAGE

    CALCULATOR_PAGE -.-> DATA_UNIVERSE
    EXPLORE_3D_PAGE --> DATA_UNIVERSE

    DATA_UNIVERSE --> CENTRAL_SPHERE
    DATA_UNIVERSE --> ORBITING_SPHERE
    DATA_UNIVERSE --> CAMERA_ANIMATOR
    DATA_UNIVERSE --> STARFIELD
    DATA_UNIVERSE --> ORBIT_CONTROLS

    CALCULATOR_PAGE -.-> ACTIVITY_CARD
    CALCULATOR_PAGE -.-> CITATION_PANEL
    CALCULATOR_PAGE -.-> METHODOLOGY_MODAL

    EXPLORE_PAGE -.-> ACTIVITY_MGMT

    MANIFESTS_LIST --> MANIFEST_CARD
    MANIFEST_DETAIL --> MANIFEST_DETAIL_VIEW

    API_MANIFESTS --> MANIFESTS_LIB
    API_MANIFEST_ID --> MANIFESTS_LIB
    MANIFESTS_LIST --> MANIFESTS_LIB
    MANIFEST_DETAIL --> MANIFESTS_LIB

    MANIFESTS_LIB --> MANIFEST_TYPES
    DATA_UNIVERSE --> R3F_TYPES

    QUERY_PROVIDER -.-> API_MANIFESTS
    QUERY_PROVIDER -.-> API_MANIFEST_ID

    style ROOT_LAYOUT fill:#0a0e27,stroke:#60a5fa,stroke-width:3px,color:#fff
    style DATA_UNIVERSE fill:#06b6d4,stroke:#0891b2,stroke-width:3px,color:#fff
    style QUERY_PROVIDER fill:#3b82f6,stroke:#2563eb,color:#fff
    style MANIFESTS_LIB fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style API_MANIFESTS fill:#10b981,stroke:#059669,color:#fff
