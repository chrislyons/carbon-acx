%% Component Map - Carbon ACX 3D Universe Architecture
%% Visual map of component tiers, modules, dependencies, and state management
%% Shows: Primitives → Visualizations → Domain → Pages + 3D/2D modules

graph TB
    subgraph "🎨 Tier 1: Primitives (Radix UI)"
        Button["📦 Button<br/>Radix UI Primitive"]
        Input["📦 Input<br/>Radix UI Primitive"]
        Dialog["📦 Dialog<br/>Radix UI Primitive"]
        Tabs["📦 Tabs<br/>Radix UI Primitive"]
        Tooltip["📦 Tooltip<br/>Radix UI Primitive"]
        ScrollArea["📦 ScrollArea<br/>Radix UI Primitive"]
    end

    subgraph "📊 Tier 2: Visualizations"
        subgraph "🌐 3D Module (DataUniverse)"
            DataUniverse["🌌 DataUniverse.tsx<br/>Three.js + React Three Fiber<br/>Central sphere + orbiting activities<br/>520 lines, lazy-loaded"]
            CentralSphere["⚫ CentralSphere<br/>Total emissions (pulsing)<br/>Logarithmic size scale"]
            OrbitingActivity["🔵 OrbitingActivity<br/>Individual activities<br/>Orbital motion + hover glow"]
            CameraAnimator["📹 CameraAnimator<br/>Intro zoom + click-to-fly<br/>Ease-in-out interpolation"]
            ErrorBoundary["🛡️ ErrorBoundary<br/>WebGL fallback handling<br/>SSR safety check"]

            DataUniverse --> CentralSphere
            DataUniverse --> OrbitingActivity
            DataUniverse --> CameraAnimator
            DataUniverse --> ErrorBoundary
        end

        subgraph "📈 2D Charts (ECharts Wrappers)"
            TimelineViz["📅 TimelineViz<br/>Apache ECharts 6.0<br/>Temporal emissions view"]
            ComparisonOverlay["⚖️ ComparisonOverlay<br/>Apache ECharts 6.0<br/>Side-by-side comparison"]
        end
    end

    subgraph "🏢 Tier 3: Domain Components"
        subgraph "📋 2D Overlays (Transparency)"
            CitationPanel["📖 CitationPanel.tsx<br/>Radix Dialog<br/>Emission factor sources<br/>Methodology references<br/>285 lines"]
            MethodologyModal["📚 MethodologyModal.tsx<br/>Radix Dialog<br/>Calculation methodology<br/>QA process documentation<br/>395 lines"]
            ActivityManagement["🗂️ ActivityManagement.tsx<br/>2D table view<br/>Inline edit/delete<br/>Citation access<br/>360 lines"]
        end

        EmissionCalculator["🧮 EmissionCalculator<br/>4-question calculator<br/>Real-time feedback"]
        ScenarioBuilder["🔮 ScenarioBuilder<br/>What-if modeling<br/>Impact visualization"]
    end

    subgraph "📄 Tier 4: Pages"
        WelcomePage["🏠 WelcomePage.tsx<br/>Entry point<br/>Quick calculator vs Manual"]
        CalculatorPage["🧮 CalculatorPage.tsx<br/>Calculator flow<br/>2D results → 3D reveal<br/>Lazy-loaded DataUniverse"]
        ExplorePage["🔍 ExplorePage.tsx<br/>3D Universe | Timeline | Comparison<br/>Mode toggle<br/>Lazy-loaded DataUniverse"]
        InsightsPage["💡 InsightsPage.tsx<br/>Cards mode | 3D + sidebar<br/>Activity details panel<br/>Lazy-loaded DataUniverse"]
    end

    subgraph "🧠 State Management"
        subgraph "📦 Zustand Store (appStore.ts)"
            AppStore["🗄️ useAppStore<br/>Single store pattern<br/>433 lines"]
            Activities["📋 Activities state<br/>CRUD operations<br/>Annual emissions"]
            Layers["🎚️ Layers state<br/>ProfileLayer management<br/>Visibility toggles"]
            Goals["🎯 Goals state<br/>CarbonGoal tracking<br/>Milestone progress"]
            Scenarios["🔮 Scenarios state<br/>What-if modeling<br/>Impact calculation"]

            AppStore --> Activities
            AppStore --> Layers
            AppStore --> Goals
            AppStore --> Scenarios
        end

        subgraph "🌐 Server State (TanStack Query)"
            QueryClient["📡 TanStack Query<br/>Server state caching<br/>Automatic revalidation"]
            ArtifactLoader["📦 Artifact loading<br/>Manifest fetching<br/>Immutable caching"]

            QueryClient --> ArtifactLoader
        end
    end

    subgraph "🎣 Hooks & Utilities"
        useAppStore["🪝 useAppStore.ts<br/>Zustand hook wrapper<br/>Type-safe access"]
        useArtifacts["🪝 useArtifacts<br/>TanStack Query hook<br/>Artifact data fetching"]
        designTokens["🎨 Design Tokens<br/>CSS custom properties<br/>Typography + Colors + Spacing"]
    end

    subgraph "🧩 System Components"
        Transition["🎬 Transition.tsx<br/>Framer Motion wrapper<br/>Page animations<br/>80 lines"]
    end

    %% Tier Dependencies
    CitationPanel --> Dialog
    MethodologyModal --> Dialog
    ActivityManagement --> Dialog
    ActivityManagement --> Tooltip

    DataUniverse -.->|Lazy loaded| CalculatorPage
    DataUniverse -.->|Lazy loaded| ExplorePage
    DataUniverse -.->|Lazy loaded| InsightsPage

    TimelineViz --> ExplorePage
    ComparisonOverlay --> ExplorePage

    CitationPanel --> ActivityManagement
    MethodologyModal --> WelcomePage
    MethodologyModal --> CalculatorPage

    EmissionCalculator --> CalculatorPage
    ScenarioBuilder --> InsightsPage

    WelcomePage --> Transition
    CalculatorPage --> Transition
    ExplorePage --> Transition
    InsightsPage --> Transition

    %% State Management Dependencies
    WelcomePage --> useAppStore
    CalculatorPage --> useAppStore
    ExplorePage --> useAppStore
    InsightsPage --> useAppStore

    DataUniverse --> useAppStore
    ActivityManagement --> useAppStore
    CitationPanel --> useArtifacts

    ExplorePage --> QueryClient
    InsightsPage --> QueryClient

    %% Design Token Usage
    DataUniverse --> designTokens
    CitationPanel --> designTokens
    MethodologyModal --> designTokens
    ActivityManagement --> designTokens

    %% Styling
    classDef primitives fill:#e0f2fe,stroke:#0369a1,stroke-width:2px
    classDef viz3d fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    classDef viz2d fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    classDef domain fill:#fef3c7,stroke:#d97706,stroke-width:2px
    classDef pages fill:#d1fae5,stroke:#059669,stroke-width:2px
    classDef state fill:#fce7f3,stroke:#db2777,stroke-width:2px
    classDef hooks fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    classDef system fill:#f1f5f9,stroke:#64748b,stroke-width:2px

    class Button,Input,Dialog,Tabs,Tooltip,ScrollArea primitives
    class DataUniverse,CentralSphere,OrbitingActivity,CameraAnimator,ErrorBoundary viz3d
    class TimelineViz,ComparisonOverlay viz2d
    class CitationPanel,MethodologyModal,ActivityManagement,EmissionCalculator,ScenarioBuilder domain
    class WelcomePage,CalculatorPage,ExplorePage,InsightsPage pages
    class AppStore,Activities,Layers,Goals,Scenarios,QueryClient,ArtifactLoader state
    class useAppStore,useArtifacts,designTokens hooks
    class Transition system
