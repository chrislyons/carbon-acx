%% Carbon ACX - Data Flow
%% State management and data transformations throughout the system
%% Last updated: 2025-10-26

sequenceDiagram
    participant U as User
    participant QC as QuickCalculator
    participant Z as Zustand Store
    participant LS as localStorage
    participant CA as CanvasApp
    participant XS as XState Journey
    participant ES as ExploreScene
    participant TV as TimelineViz

    Note over U,TV: Flow 1: User Completes Calculator

    U->>QC: Fill out calculator
    QC->>QC: Calculate emissions locally
    QC->>QC: Show results preview

    U->>QC: Click "Save to Profile"
    QC->>Z: saveCalculatorResults(breakdown)

    Z->>Z: Update profile.calculatorResults[]
    Z->>LS: Persist state (middleware)
    LS-->>Z: Confirm saved

    QC->>CA: navigate('/dashboard')

    Note over U,TV: Flow 2: Dashboard Loads User Data

    CA->>XS: Check journey state
    XS-->>CA: isExplore = true

    CA->>Z: Read activities + calculatorResults
    Z->>LS: Hydrate from storage
    LS-->>Z: Return persisted data
    Z-->>CA: Return profile data

    CA->>ES: Render with show=true
    ES->>Z: getTotalEmissions()
    Z-->>ES: Return sum of all emissions

    ES->>TV: Pass timeline data
    TV->>TV: Generate ECharts options
    TV->>TV: Render canvas chart

    Note over U,TV: Flow 3: Add Activity from Browser

    participant AB as ActivityBrowser

    U->>AB: Select activity
    AB->>Z: addActivity({id, emissions, ...})

    Z->>Z: Check for duplicates
    Z->>Z: Add to profile.activities[]
    Z->>LS: Persist updated state
    LS-->>Z: Confirm saved

    Z->>ES: Trigger re-render (subscription)
    ES->>Z: getTotalEmissions() [recalculated]
    Z-->>ES: New total with added activity

    ES->>TV: Update chart data
    TV->>TV: Re-render with new data point

    Note over U,TV: Flow 4: Journey State Transitions

    U->>CA: App loads
    CA->>XS: Initialize journey machine
    XS-->>CA: Initial state: 'onboarding'

    CA->>Z: Check for existing data
    Z->>LS: Read profile
    LS-->>Z: activities.length > 0
    Z-->>CA: Has baseline data

    CA->>XS: skipOnboarding()
    XS->>XS: Transition: onboarding → baseline

    CA->>XS: baselineComplete()
    XS->>XS: Transition: baseline → explore

    CA->>XS: exploreSectors()
    XS->>XS: Set explore mode

    XS-->>CA: isExplore = true
    CA->>ES: Render ExploreScene

    Note over U,TV: Flow 5: Layer Comparison

    participant CO as ComparisonOverlay

    U->>ES: Switch to "Compare" mode
    ES->>Z: getVisibleLayers()
    Z-->>ES: Return layers array

    ES->>CO: Pass baseline + comparison data
    CO->>CO: Generate side-by-side charts
    CO->>CO: Render dual ECharts

    Note over U,TV: Flow 6: Data Pipeline (Backend)

    participant CSV as CSV Files
    participant PY as Python derive.py
    participant DIST as dist/artifacts/

    CSV->>PY: Read emission_factors.csv
    PY->>PY: Validate via Pydantic
    PY->>PY: Transform data
    PY->>PY: Compute hash (SHA-256)
    PY->>DIST: Write manifest to /<hash>/
    DIST-->>PY: Confirm written

    Note right of DIST: Frontend loads<br/>artifacts by hash<br/>(immutable caching)
