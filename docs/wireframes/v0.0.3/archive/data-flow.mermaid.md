%% Carbon ACX Data Flow
%% How data moves through the system from source CSVs to user visualizations

sequenceDiagram
    autonumber
    participant CSV as CSV Data Sources
    participant Staged as data/_staged/
    participant Derive as calc/derive.py
    participant DAL as calc/dal/sqlite_dal.py
    participant Calc as calc/utils/calculations
    participant Artifacts as artifacts/<hash>/
    participant CI as GitHub Actions
    participant Build as vite build
    participant Pages as Cloudflare Pages
    participant User as User Browser
    participant Store as Zustand Store
    participant API as lib/api.ts
    participant Viz as Visualization Components

    Note over CSV,Staged: DATA INGESTION PHASE
    CSV->>Staged: Manual CSV updates
    Staged->>Derive: Validation & import
    Derive->>DAL: Load CSVs into SQLite
    DAL-->>Derive: Queryable data

    Note over Derive,Artifacts: DERIVATION PHASE
    Derive->>Calc: Calculate emissions
    Calc-->>Derive: Emission factors & totals
    Derive->>Derive: Generate manifest.json<br/>SHA-256 hashing
    Derive->>Artifacts: Write versioned artifacts<br/>artifacts/<hash>/manifest.json
    Derive->>Artifacts: Write figures/<br/>Plotly & ECharts configs

    Note over CI,Pages: BUILD & DEPLOY PHASE
    CI->>Derive: Run make build
    Derive-->>CI: artifacts/ generated
    CI->>Build: Export artifacts to JSON<br/>tsx scripts/export-data.ts
    Build->>Build: Copy to public/api/
    Build->>Build: vite build
    Build->>Pages: Deploy dist/ to Cloudflare
    Pages-->>Pages: Cache artifacts (immutable)

    Note over User,Viz: USER SESSION - CALCULATOR FLOW
    User->>Pages: Navigate to /calculator
    Pages-->>User: Serve HTML + JS bundle
    User->>User: Fill calculator form<br/>commute, diet, energy, shopping
    User->>Store: Submit form
    Store->>Store: Calculate breakdown<br/>calculatorResults = {commute, diet, ...}
    Store->>Store: Persist to localStorage
    User->>User: Click "View Results"
    User->>Viz: Navigate to CelebrationView
    Viz->>Store: Read calculatorResults
    Store-->>Viz: {commute: 2.5, diet: 1.8, ...}
    Viz->>Viz: Transform to activity objects<br/>[{id: 'commute', emissions: 2.5}, ...]
    Viz->>Viz: Render DataUniverse 3D<br/>4 orbital spheres
    User->>Viz: Click sphere (click-to-fly)
    Viz->>Viz: Animate camera to sphere<br/>auto-clear after 2s

    Note over User,Viz: USER SESSION - EXPLORE FLOW
    User->>Pages: Navigate to /explore
    Pages-->>User: Serve ExplorePage
    User->>API: Click "Add Activities"
    API->>Pages: GET /api/sectors.json
    Pages-->>API: [{id: 'SECTOR.DEFENSE', ...}, ...]
    API-->>User: Display sector list
    User->>API: Select sector
    API->>Pages: GET /api/sectors/SECTOR.DEFENSE.json
    Pages-->>API: {sector, activities, profiles}
    API-->>User: Display activity cards
    User->>Store: Add activity to baseline
    Store->>Store: activities.push(activity)<br/>Persist to localStorage
    User->>Viz: Switch to Timeline mode
    Viz->>Store: Read activities[]
    Store-->>Viz: [{id, name, emissions}, ...]
    Viz->>Viz: Aggregate emissions by month
    Viz->>Viz: Render ECharts timeline
    User->>Viz: Switch to 3D Universe mode
    Viz->>Store: Read activities[]
    Viz->>Viz: Calculate orbital positions<br/>r = sqrt(emissions) * scale
    Viz->>Viz: Render DataUniverse<br/>N orbital spheres

    Note over User,Viz: USER SESSION - INSIGHTS FLOW
    User->>Pages: Navigate to /insights
    Pages-->>User: Serve InsightsPage
    Viz->>Store: Read activities[]
    Store-->>Viz: [{category, emissions}, ...]
    Viz->>Viz: categoryBreakdown()<br/>Aggregate by category
    Viz->>Viz: Render pie chart (Recharts)<br/>Transport, Energy, Food, ...
    User->>Viz: Click "Export CSV"
    Viz->>API: exportToCSV(activities, total)
    API->>API: Generate CSV string<br/>"Name,Category,Emissions\n..."
    API->>User: Download activities.csv

    Note over User,Pages: WORKER API - ON-DEMAND CALC
    User->>Pages: POST /api/compute<br/>{activities: [...]}
    Pages->>Worker: Forward request
    Worker->>Worker: Validate schema (Zod)
    Worker->>Worker: Calculate emissions
    Worker-->>Pages: {totalEmissions, breakdown}
    Pages-->>User: Display results

    Note over Derive,Artifacts: MANIFEST STRUCTURE
    Note right of Artifacts: manifest.json<br/>{<br/>  "version": "1.2.0",<br/>  "generated": "2025-10-28T...",<br/>  "hash": "a3f9b2...",<br/>  "figures": {<br/>    "FIG.001": {<br/>      "hash": "d4e8c1...",<br/>      "path": "figures/fig_001.json"<br/>    }<br/>  },<br/>  "datasets": {...},<br/>  "provenance": [...]<br/>}
