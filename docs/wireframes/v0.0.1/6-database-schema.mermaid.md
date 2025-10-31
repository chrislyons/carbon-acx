%% Carbon ACX - Database Schema (Client-Side Storage)
%% Visualizes Zustand state shape, localStorage format, and type definitions
%% Last updated: 2025-10-26
%% NOTE: No server-side database - all storage is client-side (localStorage)

classDiagram
    class AppStore {
        <<Zustand Store>>
        +CanvasZone activeZone
        +TransitionState transitionState
        +ProfileData profile
        +setActiveZone(zone)
        +setTransitionState(state)
        +addActivity(activity)
        +removeActivity(activityId)
        +updateActivityQuantity(activityId, quantity)
        +clearProfile()
        +saveCalculatorResults(results)
        +addLayer(layer)
        +removeLayer(layerId)
        +toggleLayerVisibility(layerId)
        +renameLayer(layerId, name)
        +addGoal(goal)
        +updateGoal(goalId, updates)
        +removeGoal(goalId)
        +addScenario(scenario)
        +updateScenario(scenarioId, updates)
        +removeScenario(scenarioId)
        +getTotalEmissions() number
        +get activities Activity[]
        +get layers ProfileLayer[]
        +get calculatorResults CalculatorResult[]
        +get goals CarbonGoal[]
        +get scenarios Scenario[]
    }

    class ProfileData {
        <<Interface>>
        +Activity[] activities
        +CalculatorResult[] calculatorResults
        +ProfileLayer[] layers
        +CarbonGoal[] goals
        +Scenario[] scenarios
        +string lastUpdated
    }

    class Activity {
        <<Interface>>
        +string id
        +string sectorId
        +string name
        +string|null category
        +number quantity
        +string unit
        +number carbonIntensity
        +number annualEmissions
        +string addedAt
        +string? iconType
        +string? iconUrl
        +string? badgeColor
    }

    class ProfileLayer {
        <<Interface>>
        +string id
        +string name
        +string|null sourceProfileId
        +string color
        +boolean visible
        +Activity[] activities
        +string createdAt
    }

    class CalculatorResult {
        <<Interface>>
        +string category
        +string label
        +number annualEmissions
        +string calculatedAt
    }

    class CarbonGoal {
        <<Interface>>
        +string id
        +string name
        +number targetEmissions
        +number currentEmissions
        +string? deadline
        +string createdAt
        +string updatedAt
        +Milestone[] milestones
    }

    class Milestone {
        <<Type>>
        +number percent
        +boolean achieved
        +string? achievedAt
    }

    class Scenario {
        <<Interface>>
        +string id
        +string name
        +string? description
        +ScenarioChange[] changes
        +number totalImpact
        +number percentageChange
        +string createdAt
        +string updatedAt
    }

    class ScenarioChange {
        <<Type>>
        +string activityId
        +string activityName
        +number originalQuantity
        +number newQuantity
        +number quantityDiff
        +number emissionsDiff
    }

    class JourneyMachineContext {
        <<XState Context>>
        +boolean hasCompletedOnboarding
        +boolean hasEstablishedBaseline
        +number activitiesAdded
        +number scenariosCreated
        +number goalsSet
        +number exportsGenerated
        +string|null startedAt
        +string|null currentStepCompletedAt
    }

    class LocalStorage {
        <<Browser API>>
        +string key = "carbon-acx-storage"
        +string value = JSON
    }

    AppStore "1" --> "1" ProfileData : contains
    ProfileData "1" --> "*" Activity : has
    ProfileData "1" --> "*" CalculatorResult : has
    ProfileData "1" --> "*" ProfileLayer : has
    ProfileData "1" --> "*" CarbonGoal : has
    ProfileData "1" --> "*" Scenario : has
    ProfileLayer "1" --> "*" Activity : contains
    CarbonGoal "1" --> "*" Milestone : tracks
    Scenario "1" --> "*" ScenarioChange : defines
    AppStore "1" ..> "1" LocalStorage : persists to
    JourneyMachineContext ..> AppStore : reads data from

    note for AppStore "Zustand store with persist middleware\nPartial persistence (profile only)\nNo UI state persisted"
    note for LocalStorage "Key: 'carbon-acx-storage'\nFormat: JSON\nMaximum ~5MB (browser limit)\nSynchronous API"
    note for JourneyMachineContext "XState machine context\nNOT persisted to localStorage\nEphemeral (resets on reload)"
    note for Activity "Core entity: user's emission activities\nEmissions = quantity × carbonIntensity\nImmutable after creation (except quantity)"
