%% Carbon ACX - Component Map
%% Detailed component breakdown showing tier hierarchy and dependencies
%% Last updated: 2025-10-26

graph TB
    subgraph "Tier 5 - Story Scenes"
        ONBOARDING[OnboardingScene<br/>Welcome + path selection<br/>Quick vs Manual]
        BASELINE[BaselineScene<br/>Calculator or manual entry<br/>Celebration view]
        EXPLORE[ExploreScene<br/>Timeline + Comparison modes<br/>Visualization controls]
        INSIGHT[InsightScene<br/>Personalized recommendations<br/>Goal setting]
    end

    subgraph "Tier 4 - Domain Components"
        EMICALC[EmissionCalculator<br/>In-depth calculator<br/>Real-time feedback]
        QUICKCALC[QuickCalculator<br/>2-min estimate<br/>Dialog-based]
        ACTBROWSER[ActivityBrowser<br/>Sector navigation<br/>Activity selection]
        SCENENAV[SceneNavigation<br/>Journey progress<br/>Scene switching]
    end

    subgraph "Tier 3 - Visualizations"
        TIMELINE[TimelineViz<br/>ECharts line chart<br/>Milestones + trends]
        COMPARISON[ComparisonOverlay<br/>Side-by-side charts<br/>Layer comparison]
        GAUGE[GaugeProgress<br/>Circular gauge<br/>Goal tracking]
        ECHART[EChartsWrapper<br/>Base chart component<br/>Theme + responsive]
    end

    subgraph "Tier 2 - Layout System"
        CANVASZONE[CanvasZone<br/>Viewport zones<br/>hero/insight/detail]
        STORYSCENE[StoryScene<br/>Full-screen container<br/>Scene transitions]
        TRANSITION[TransitionWrapper<br/>Fade/slide animations<br/>framer-motion]
    end

    subgraph "Tier 1 - Primitives (Radix UI)"
        BUTTON[Button<br/>Variants + sizes<br/>Icon support]
        DIALOG[Dialog<br/>Modal overlays<br/>Accessible]
        COLLAPSIBLE[Collapsible<br/>Expandable sections<br/>Smooth animations]
        INPUT[Input/Slider<br/>Form controls<br/>Validation]
    end

    subgraph "State Management"
        ZUSTAND[useAppStore<br/>Zustand hook<br/>Global state]
        JOURNEY[useJourneyMachine<br/>XState hook<br/>Journey flow]
    end

    subgraph "Routing & Entry"
        ROUTER[router.tsx<br/>React Router<br/>Route config]
        CANVASAPP[CanvasApp.tsx<br/>Phase 1 entry<br/>Scene orchestration]
    end

    %% Dependencies - Tier 5
    ONBOARDING --> QUICKCALC
    ONBOARDING --> BUTTON
    ONBOARDING --> STORYSCENE

    BASELINE --> EMICALC
    BASELINE --> ACTBROWSER
    BASELINE --> CANVASZONE

    EXPLORE --> TIMELINE
    EXPLORE --> COMPARISON
    EXPLORE --> CANVASZONE
    EXPLORE --> BUTTON

    INSIGHT --> GAUGE
    INSIGHT --> CANVASZONE
    INSIGHT --> BUTTON

    %% Dependencies - Tier 4
    EMICALC --> INPUT
    EMICALC --> GAUGE
    EMICALC --> COLLAPSIBLE
    EMICALC --> ZUSTAND

    QUICKCALC --> DIALOG
    QUICKCALC --> INPUT
    QUICKCALC --> BUTTON
    QUICKCALC --> COLLAPSIBLE
    QUICKCALC --> ZUSTAND

    ACTBROWSER --> BUTTON
    ACTBROWSER --> INPUT
    ACTBROWSER --> ZUSTAND

    SCENENAV --> BUTTON
    SCENENAV --> JOURNEY

    %% Dependencies - Tier 3
    TIMELINE --> ECHART
    COMPARISON --> ECHART
    GAUGE --> ECHART

    %% Dependencies - Tier 2
    CANVASZONE --> TRANSITION
    STORYSCENE --> TRANSITION

    %% Entry point connections
    ROUTER --> CANVASAPP
    CANVASAPP --> ONBOARDING
    CANVASAPP --> BASELINE
    CANVASAPP --> EXPLORE
    CANVASAPP --> INSIGHT
    CANVASAPP --> JOURNEY
    CANVASAPP --> ZUSTAND

    style ONBOARDING fill:#e3f2fd
    style BASELINE fill:#e3f2fd
    style EXPLORE fill:#e3f2fd
    style INSIGHT fill:#e3f2fd
    style ZUSTAND fill:#fff3e0
    style JOURNEY fill:#f3e5f5
