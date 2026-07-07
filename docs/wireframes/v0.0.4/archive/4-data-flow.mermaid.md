%% Carbon ACX Data Flow
%% Version: v0.0.4 (Nov 2025)
%% How data moves from CSV sources → Python → Artifacts → Next.js → UI

sequenceDiagram
    participant Dev as Developer
    participant CSV as CSV Files<br/>(data/*.csv)
    participant Make as Makefile<br/>(orchestration)
    participant Python as Python Pipeline<br/>(calc/derive.py)
    participant Pydantic as Pydantic Validator<br/>(schema.py)
    participant Calc as Calculation Engine<br/>(emission logic)
    participant Hash as Hash Generator<br/>(SHA256)
    participant Artifacts as dist/artifacts/<br/>(manifests + figures)
    participant NextBuild as Next.js Build<br/>(SSG/SSR)
    participant FSLib as Filesystem Lib<br/>(lib/manifests.ts)
    participant API as API Routes<br/>(/api/manifests)
    participant TanStack as TanStack Query<br/>(client cache)
    participant UI as React UI<br/>(pages + components)
    participant ThreeJS as Three.js<br/>(DataUniverse)

    Note over Dev,CSV: 1. DATA UPDATE WORKFLOW

    Dev->>CSV: Edit activities.csv or<br/>emission_factors.csv
    Dev->>Make: Run: make build
    Make->>Python: Invoke: python -m calc.derive

    Note over Python,Pydantic: 2. VALIDATION & LOADING

    Python->>CSV: Read CSV files
    CSV->>Pydantic: Parse rows
    Pydantic->>Pydantic: Validate schema<br/>(ActivityId, RegionCode,<br/>EmissionFactor values)
    alt Validation Fails
        Pydantic-->>Python: Raise ValidationError
        Python-->>Make: Exit with error
        Make-->>Dev: Show validation errors
    end
    Pydantic->>Python: Return validated DataFrames

    Note over Python,Calc: 3. DERIVATION & CALCULATION

    Python->>Calc: Match activities ↔ emission factors<br/>(by region, vintage)
    Calc->>Calc: Calculate emissions<br/>quantity × emission_factor
    Calc->>Calc: Generate figure JSONs<br/>(one per activity)
    Calc->>Python: Return figures

    Note over Python,Hash: 4. MANIFEST CREATION

    Python->>Hash: Create SHA256 hashes<br/>(figure files)
    Hash->>Python: Return hash strings
    Python->>Python: Bundle manifests<br/>(figure + provenance + citations)
    Python->>Artifacts: Write files:<br/>manifest.json<br/>manifests/*.json<br/>figures/*.json<br/>references/*.json

    Note over Artifacts,NextBuild: 5. FRONTEND BUILD

    Make->>NextBuild: Run: pnpm build
    NextBuild->>FSLib: Import manifest helpers<br/>(build time)
    FSLib->>Artifacts: Read manifest.json
    Artifacts->>FSLib: Return root manifest
    NextBuild->>NextBuild: Generate static pages<br/>(SSG for /manifests)
    NextBuild->>NextBuild: Bundle components<br/>(.next/ directory)

    Note over UI,API: 6. RUNTIME: USER VISITS /manifests

    UI->>NextBuild: Request /manifests page
    NextBuild->>FSLib: getManifests()<br/>(Server Component)
    FSLib->>Artifacts: Read manifest files
    Artifacts->>FSLib: Return manifest data
    FSLib->>NextBuild: Return ManifestListItem[]
    NextBuild->>UI: Render page with data<br/>(SSR/SSG)

    Note over UI,TanStack: 7. RUNTIME: CLIENT-SIDE DATA FETCH

    UI->>API: fetch('/api/manifests')
    API->>FSLib: getManifests()<br/>(API route handler)
    FSLib->>Artifacts: Read manifest files
    Artifacts->>FSLib: Return data
    FSLib->>API: Return JSON
    API->>TanStack: Cache response<br/>(5 min staleTime)
    TanStack->>UI: Provide cached data

    Note over UI,ThreeJS: 8. RUNTIME: 3D VISUALIZATION

    UI->>UI: User clicks<br/>"See in 3D Universe"
    UI->>UI: React.lazy() triggers<br/>DataUniverse import
    UI->>ThreeJS: Load Three.js bundle<br/>(887KB, 241KB gzip)
    ThreeJS->>ThreeJS: Parse activities data<br/>(emissions, names, categories)
    ThreeJS->>ThreeJS: Calculate sizes<br/>(logarithmic scale)
    ThreeJS->>ThreeJS: Calculate positions<br/>(orbital motion)
    ThreeJS->>ThreeJS: Create 3D scene<br/>(spheres, lights, starfield)
    ThreeJS->>UI: Render Canvas<br/>(WebGL context)

    Note over UI,ThreeJS: 9. RUNTIME: USER INTERACTION

    UI->>ThreeJS: User hovers sphere
    ThreeJS->>ThreeJS: Raycasting detects hover
    ThreeJS->>ThreeJS: Apply glow effect<br/>(1.2x scale outer sphere)
    ThreeJS->>UI: Show HTML tooltip<br/>(activity details)

    UI->>ThreeJS: User clicks sphere
    ThreeJS->>ThreeJS: Raycasting detects click
    ThreeJS->>UI: onActivityClick callback
    UI->>UI: Update selection state<br/>(show details panel)

    Note over Dev,Artifacts: 10. VERIFICATION WORKFLOW

    Dev->>API: Request /api/manifests/:id
    API->>FSLib: getManifest(id)
    FSLib->>Artifacts: Read manifest file
    Artifacts->>FSLib: Return manifest
    FSLib->>API: Return JSON
    API->>UI: Display manifest details

    UI->>API: Click "Verify Integrity"
    API->>FSLib: verifyManifest(id)
    FSLib->>Artifacts: Read figure file
    Artifacts->>FSLib: Return file bytes
    FSLib->>Hash: Compute SHA256
    Hash->>FSLib: Return computed hash
    FSLib->>FSLib: Compare with stored hash
    FSLib->>API: Return verification result
    API->>UI: Show verification status<br/>(✓ Verified / ✗ Failed)
