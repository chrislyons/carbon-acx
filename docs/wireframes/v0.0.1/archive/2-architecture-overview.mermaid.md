%% Carbon ACX - Architecture Overview
%% High-level system design showing layers and interactions
%% Last updated: 2025-10-26

graph TB
    subgraph "External Services"
        GH[GitHub<br/>Version Control<br/>CI/CD Triggers]
        CF[Cloudflare<br/>Pages + Workers<br/>Edge Deployment]
    end

    subgraph "Data Layer"
        CSV[CSV Datasets<br/>emission_factors.csv<br/>activities.csv<br/>schedules.csv]

        CSV --> PIPELINE[Python Pipeline<br/>calc/derive.py<br/>Validates + Transforms]

        PIPELINE --> ARTIFACTS[Artifacts<br/>dist/artifacts/hash/<br/>Immutable Manifests]
        PIPELINE --> SQLITE[(SQLite Backend<br/>Optional<br/>For analytics)]
    end

    subgraph "Application Layer"
        subgraph "Phase 1 App (Canvas-First)"
            ROUTER[React Router<br/>Client-side routing]
            CANVAS[CanvasApp<br/>Entry point]

            ROUTER --> CANVAS

            CANVAS --> SCENES[Story Scenes<br/>Onboarding<br/>Baseline<br/>Explore<br/>Insight]

            SCENES --> DOMAIN[Domain Components<br/>EmissionCalculator<br/>ActivityBrowser]

            DOMAIN --> VIZ[Visualizations<br/>TimelineViz<br/>ComparisonOverlay<br/>Apache ECharts]

            DOMAIN --> LAYOUT[Layout System<br/>CanvasZone<br/>StoryScene]

            LAYOUT --> PRIMITIVES[UI Primitives<br/>Button, Dialog<br/>Radix UI]
        end

        subgraph "State Management"
            ZUSTAND[(Zustand Store<br/>Global State<br/>localStorage)]
            XSTATE[XState Machine<br/>Journey Flow<br/>Scene Transitions]

            SCENES --> ZUSTAND
            SCENES --> XSTATE

            ZUSTAND --> PERSIST[localStorage<br/>Persisted State]
        end
    end

    subgraph "Edge Layer (Cloudflare)"
        PAGES[Pages Function<br/>functions/carbon-acx/]
        WORKER[Worker API<br/>workers/<br/>/api/compute<br/>/api/health]

        PAGES --> CACHE[Edge Cache<br/>Immutable Assets]
        WORKER --> COMPUTE[On-demand<br/>Calculations]
    end

    subgraph "Legacy Applications"
        DASH[Python Dash<br/>app/<br/>Analytics UI]
        STATIC[Static React<br/>site/<br/>Marketing Site]
    end

    subgraph "Build Pipeline"
        VITE[Vite Build<br/>TypeScript → JS<br/>Code Splitting]
        TAILWIND[Tailwind CSS<br/>Design Tokens<br/>Utility Classes]

        CANVAS --> VITE
        VITE --> BUNDLE[Production Bundle<br/>dist/<br/>Optimized Assets]
    end

    GH -->|Push| CF
    CF -->|Deploy| PAGES
    CF -->|Deploy| WORKER

    BUNDLE -->|Deployed to| PAGES
    ARTIFACTS -->|Served by| PAGES

    CSV -.->|Used by| DASH
    CSV -.->|Used by| STATIC

    style CANVAS fill:#e3f2fd
    style ZUSTAND fill:#fff3e0
    style XSTATE fill:#f3e5f5
    style PIPELINE fill:#e8f5e9
    style CF fill:#ffe0b2
