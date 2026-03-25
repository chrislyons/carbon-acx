%% Carbon ACX Component Map
%% Detailed component breakdown showing module boundaries, responsibilities, and dependencies

graph TB
    subgraph "Modern Web App - apps/carbon-acx-web"
        direction TB

        subgraph "Entry Point & Routing"
            main["main.tsx<br/>✓ React 18 root<br/>✓ StrictMode"]
            app["App.tsx<br/>✓ Context providers<br/>✓ RouterProvider"]
            router["router.tsx<br/>✓ React Router v6<br/>✓ Lazy loading<br/>✓ Deferred data"]
        end

        subgraph "Context Providers - Global State"
            toast_ctx["ToastContext<br/>✓ Notification system<br/>✓ Success/error messages"]
            profile_ctx["ProfileContext<br/>✓ User profile data<br/>✓ Selected profile"]
            layer_ctx["LayerContext<br/>✓ Activity layers<br/>✓ Sector filtering"]
        end

        subgraph "Pages - Route Components"
            welcome["WelcomePage<br/>✓ Landing/onboarding<br/>✓ Journey start"]
            calculator["CalculatorPage<br/>✓ Quick estimate form<br/>✓ Celebration view<br/>✓ Calculator → 3D viz"]
            explore["ExplorePage<br/>✓ Timeline mode<br/>✓ 3D Universe mode<br/>✓ Activity browser"]
            insights["InsightsPage<br/>✓ Breakdown charts<br/>✓ Comparison overlays<br/>✓ Export CSV"]
        end

        subgraph "Visualization Components - Tier 3"
            datauniverse["DataUniverse.tsx<br/>✓ Three.js Canvas<br/>✓ Orbital mechanics<br/>✓ Activity spheres<br/>✓ Click-to-fly camera"]

            datauniverse_wrapper["DataUniverseWrapper.tsx<br/>✓ SSR guard<br/>✓ Lazy loading<br/>✓ Error boundary"]

            timeline["TimelineViz<br/>✓ ECharts timeline<br/>✓ Emissions over time"]

            breakdown_charts["BreakdownCharts<br/>✓ Category pie<br/>✓ Activity bars<br/>✓ Recharts integration"]
        end

        subgraph "Layout Components - Tier 2"
            canvas_zone["CanvasZone<br/>✓ Viewport zones<br/>✓ Hero/Insight/Detail<br/>✓ Collision handling"]

            story_scene["StoryScene<br/>✓ Scene orchestration<br/>✓ Layout: canvas/grid<br/>✓ Transition wrapper"]

            nav_bar["NavigationBar<br/>✓ Journey progress<br/>✓ Route links"]
        end

        subgraph "Primitive Components - Tier 1 (Radix UI)"
            button["Button<br/>✓ CVA variants<br/>✓ Accessible"]
            dialog["Dialog<br/>✓ Modal overlay<br/>✓ Radix Dialog"]
            tabs["Tabs<br/>✓ View switcher<br/>✓ Radix Tabs"]
            tooltip["Tooltip<br/>✓ Hover hints<br/>✓ Radix Tooltip"]
        end

        subgraph "Domain Components - Tier 4"
            calculator_form["EmissionCalculator<br/>✓ Input fields<br/>✓ Category forms<br/>✓ Validation"]

            activity_browser["ActivityBrowser<br/>✓ Sector selection<br/>✓ Activity cards<br/>✓ Add to baseline"]

            comparison_overlay["ComparisonOverlay<br/>✓ Benchmark display<br/>✓ Percentile calc"]

            celebration_view["CelebrationView<br/>✓ Results summary<br/>✓ 3D universe<br/>✓ Share/explore CTAs"]
        end

        subgraph "State Management"
            zustand_store["useAppStore (Zustand)<br/>✓ activities: Activity[]<br/>✓ calculatorResults<br/>✓ totalEmissions<br/>✓ persist: localStorage"]

            journey_machine["useJourneyMachine (XState)<br/>✓ onboarding state<br/>✓ scene transitions<br/>✓ completion tracking"]
        end

        subgraph "API Layer - lib/"
            api_loader["api.ts<br/>✓ loadSectors()<br/>✓ loadActivities()<br/>✓ loadDataset()<br/>✓ Fetch from /public/api/"]

            csv_export["exportToCSV.ts<br/>✓ CSV generation<br/>✓ Download trigger"]

            calculations["calculations.ts<br/>✓ totalEmissions()<br/>✓ categoryBreakdown()<br/>✓ emission factors"]
        end

        subgraph "Utilities & Hooks"
            hooks["hooks/<br/>✓ useLocalStorage<br/>✓ useDebounce<br/>✓ useIntersection"]

            utils["utils/<br/>✓ formatters<br/>✓ validators<br/>✓ type guards"]

            cn["cn() - Tailwind Merge<br/>✓ Class name merging<br/>✓ CVA integration"]
        end
    end

    subgraph "Dash Analytics App - app/"
        dash_main["app.py<br/>✓ Dash instance<br/>✓ Plotly layout<br/>✓ Callbacks"]

        dash_components["components/<br/>✓ Sector selector<br/>✓ Agency breakdown<br/>✓ Reference viewer"]

        dash_lib["lib/<br/>✓ load_manifest()<br/>✓ load_figures()<br/>✓ parse_artifacts"]
    end

    subgraph "Derivation Engine - calc/"
        derive_py["derive.py<br/>✓ Main orchestrator<br/>✓ CLI argparse<br/>✓ Validation pipeline"]

        schemas["schemas.py<br/>✓ Pydantic models<br/>✓ Activity schema<br/>✓ Manifest schema"]

        dal_sqlite["dal/sqlite_dal.py<br/>✓ Database interface<br/>✓ Query optimization<br/>✓ Index management"]

        calc_utils["utils/<br/>✓ emission_calc.py<br/>✓ intensity_matrix.py<br/>✓ aggregations.py"]
    end

    subgraph "Cloudflare Workers - workers/"
        compute_worker["compute/index.ts<br/>✓ POST /api/compute<br/>✓ Request validation<br/>✓ Emission calculation<br/>✓ GET /api/health"]
    end

    %% Component dependencies
    main --> app
    app --> toast_ctx
    app --> profile_ctx
    app --> layer_ctx
    app --> router

    router --> welcome
    router --> calculator
    router --> explore
    router --> insights

    calculator --> calculator_form
    calculator --> celebration_view
    celebration_view --> datauniverse_wrapper
    datauniverse_wrapper --> datauniverse

    explore --> timeline
    explore --> datauniverse_wrapper
    explore --> activity_browser

    insights --> breakdown_charts
    insights --> comparison_overlay

    datauniverse --> canvas_zone
    welcome --> story_scene
    calculator --> story_scene

    calculator_form --> button
    calculator_form --> tooltip
    activity_browser --> dialog
    explore --> tabs

    calculator --> zustand_store
    explore --> zustand_store
    insights --> zustand_store
    welcome --> journey_machine

    activity_browser --> api_loader
    insights --> csv_export
    calculator_form --> calculations

    api_loader --> utils
    calculations --> utils
    all_components["All Components"] -.->|Import| hooks
    all_components -.->|Import| cn

    %% Backend
    dash_main --> dash_components
    dash_components --> dash_lib
    dash_lib -.->|Load| artifacts

    derive_py --> schemas
    derive_py --> dal_sqlite
    derive_py --> calc_utils
    derive_py -.->|Generate| artifacts

    artifacts["artifacts/<br/>Manifests"]
