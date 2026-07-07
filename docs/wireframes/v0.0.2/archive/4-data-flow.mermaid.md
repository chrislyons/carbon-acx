%% Data Flow - Carbon ACX 3D Universe Architecture
%% Shows: User journeys, data derivation pipeline, state updates, 3D rendering loop, artifact loading

graph TB
    subgraph "👤 User Journey Flows"
        UserArrives["🚪 User arrives at /<br/>WelcomePage loads"]
        QuickCalc["🧮 Choose 'Quick Calculator'<br/>Navigate to /calculator"]
        AnswerQuestions["📝 Answer 4 questions<br/>Real-time feedback"]
        ViewResults["📊 View 2D results<br/>Total emissions + comparisons"]
        Reveal3D["🌌 Click 'See in 3D Universe'<br/>DataUniverse lazy loads<br/>Intro animation plays"]
        ExploreMode["🔍 Navigate to /explore<br/>Mode: 3D | Timeline | Comparison"]
        ViewInsights["💡 Navigate to /insights<br/>Cards | 3D + sidebar"]

        UserArrives --> QuickCalc
        QuickCalc --> AnswerQuestions
        AnswerQuestions --> ViewResults
        ViewResults --> Reveal3D
        Reveal3D --> ExploreMode
        ExploreMode --> ViewInsights
    end

    subgraph "📊 Data Derivation Pipeline (Python)"
        CSVData["📁 CSV Data Sources<br/>data/activities.csv<br/>data/emission_factors.csv<br/>data/profiles.csv<br/>data/grid_intensity.csv"]
        DerivePy["🐍 calc/derive.py<br/>Main entry point<br/>Pydantic validation"]
        Validation["✅ Schema Validation<br/>Activity, EmissionFactor<br/>Profile, GridIntensity"]
        Computation["🧮 Emission Calculation<br/>quantity × emission_factor<br/>Grid-indexed factors<br/>Uncertainty ranges"]
        ManifestGen["📦 Manifest Generation<br/>dist/artifacts/<hash>/<br/>export_view.json<br/>manifest.json<br/>figures/*.json"]
        ImmutableHash["🔒 Immutable Hashing<br/>SHA256 build hash<br/>Content-addressable"]

        CSVData --> DerivePy
        DerivePy --> Validation
        Validation --> Computation
        Computation --> ManifestGen
        ManifestGen --> ImmutableHash
    end

    subgraph "🔄 State Management Flows"
        subgraph "📦 Zustand Store Updates"
            UserAction["⚡ User Action<br/>Add/Edit/Delete activity"]
            StoreAction["🎯 Store Action<br/>addActivity()<br/>updateActivityQuantity()<br/>removeActivity()"]
            StateUpdate["🔄 State Update<br/>Immutable update<br/>profile.activities[...]"]
            Persist["💾 Persist<br/>localStorage<br/>'carbon-acx-storage'"]
            ReRender["🖼️ Re-render<br/>React components<br/>subscribed to state"]

            UserAction --> StoreAction
            StoreAction --> StateUpdate
            StateUpdate --> Persist
            StateUpdate --> ReRender
        end

        subgraph "🌐 Server State (TanStack Query)"
            ArtifactRequest["📡 Request Artifacts<br/>useQuery({ queryKey })<br/>fetch('/artifacts/...')"]
            CacheCheck["🔍 Cache Check<br/>Is data fresh?"]
            BackgroundRefetch["🔄 Background Refetch<br/>Revalidate if stale"]
            CacheUpdate["💾 Cache Update<br/>TanStack Query cache"]
            ComponentUpdate["🖼️ Component Update<br/>Data available to UI"]

            ArtifactRequest --> CacheCheck
            CacheCheck -->|Fresh| ComponentUpdate
            CacheCheck -->|Stale| BackgroundRefetch
            BackgroundRefetch --> CacheUpdate
            CacheUpdate --> ComponentUpdate
        end
    end

    subgraph "🌌 3D Rendering Loop (Three.js)"
        UserLoads3D["👤 User loads DataUniverse<br/>Component mounts"]
        LazyLoad["⏳ React.lazy() + Suspense<br/>Load Three.js chunk<br/>887KB (241KB gzip)"]
        SSRCheck["🛡️ SSR Safety Check<br/>typeof window !== 'undefined'<br/>useEffect mount detection"]
        SceneSetup["🎬 Scene Setup<br/>Canvas + Lights + Stars<br/>CentralSphere + Activities"]
        RenderLoop["🔁 useFrame() Loop<br/>60fps rendering<br/>requestAnimationFrame"]
        OrbitalCalc["🌀 Orbital Calculation<br/>time = Date.now() * speed<br/>angle = time + phaseOffset<br/>x,y,z = orbital position"]
        CameraUpdate["📹 Camera Update<br/>Intro animation progress<br/>Ease-in-out interpolation"]
        MeshUpdate["⚙️ Mesh Updates<br/>Position, rotation, scale<br/>Emissive intensity on hover"]
        RenderFrame["🖼️ Render Frame<br/>WebGL draw call<br/>Display on canvas"]

        UserLoads3D --> LazyLoad
        LazyLoad --> SSRCheck
        SSRCheck -->|Client-side| SceneSetup
        SceneSetup --> RenderLoop
        RenderLoop --> OrbitalCalc
        RenderLoop --> CameraUpdate
        OrbitalCalc --> MeshUpdate
        CameraUpdate --> MeshUpdate
        MeshUpdate --> RenderFrame
        RenderFrame -.->|Next frame| RenderLoop
    end

    subgraph "📝 Activity CRUD Operations"
        AddActivity["➕ Add Activity<br/>User clicks 'Add'"]
        CreateObject["🏗️ Create Activity Object<br/>id, name, quantity<br/>carbonIntensity, annualEmissions"]
        ValidateDuplicate["✅ Validate<br/>Check for duplicate ID"]
        UpdateStore["💾 Update Store<br/>profile.activities.push()"]
        RecalcTotal["🧮 Recalculate Total<br/>getTotalEmissions()"]
        Update3D["🌌 Update 3D Universe<br/>New orbiting sphere<br/>Recalculate central size"]

        AddActivity --> CreateObject
        CreateObject --> ValidateDuplicate
        ValidateDuplicate --> UpdateStore
        UpdateStore --> RecalcTotal
        RecalcTotal --> Update3D
    end

    subgraph "🔗 Artifact Loading Flow"
        PageLoad["📄 Page Load<br/>ExplorePage or InsightsPage"]
        QueryArtifacts["📡 useQuery('artifacts')<br/>TanStack Query"]
        FetchManifest["📥 Fetch Manifest<br/>GET /artifacts/<hash>/manifest.json"]
        ParseJSON["🔍 Parse JSON<br/>Extract layers, sources<br/>citation_keys, references"]
        PopulateUI["🖼️ Populate UI<br/>Layer selector<br/>Citation panel data"]
        ImmutableCache["🔒 Immutable Cache<br/>staleTime: Infinity<br/>Never refetch (hash-based)"]

        PageLoad --> QueryArtifacts
        QueryArtifacts --> FetchManifest
        FetchManifest --> ParseJSON
        ParseJSON --> PopulateUI
        PopulateUI --> ImmutableCache
    end

    %% Cross-flow connections
    ImmutableHash -.->|Deployed artifacts| FetchManifest
    ReRender -.->|Activity data| Update3D
    ComponentUpdate -.->|Manifest data| PopulateUI

    %% Styling
    classDef userFlow fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    classDef pipeline fill:#fef3c7,stroke:#d97706,stroke-width:2px
    classDef stateFlow fill:#fce7f3,stroke:#db2777,stroke-width:2px
    classDef renderFlow fill:#e0f2fe,stroke:#0369a1,stroke-width:2px
    classDef crudFlow fill:#d1fae5,stroke:#059669,stroke-width:2px
    classDef artifactFlow fill:#f3e8ff,stroke:#9333ea,stroke-width:2px

    class UserArrives,QuickCalc,AnswerQuestions,ViewResults,Reveal3D,ExploreMode,ViewInsights userFlow
    class CSVData,DerivePy,Validation,Computation,ManifestGen,ImmutableHash pipeline
    class UserAction,StoreAction,StateUpdate,Persist,ReRender,ArtifactRequest,CacheCheck,BackgroundRefetch,CacheUpdate,ComponentUpdate stateFlow
    class UserLoads3D,LazyLoad,SSRCheck,SceneSetup,RenderLoop,OrbitalCalc,CameraUpdate,MeshUpdate,RenderFrame renderFlow
    class AddActivity,CreateObject,ValidateDuplicate,UpdateStore,RecalcTotal,Update3D crudFlow
    class PageLoad,QueryArtifacts,FetchManifest,ParseJSON,PopulateUI,ImmutableCache artifactFlow
