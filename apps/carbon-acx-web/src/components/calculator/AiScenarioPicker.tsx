'use client'

import { useEffect, useMemo, useState } from 'react'
import { DataState } from '@/components/content'
import {
  getAiActivities,
  listScenariosForActivity,
} from '@/lib/calculator'
import type { AiScenario } from '@/lib/calculator'

export function scenarioLabel(scenario: AiScenario): string {
  const version = scenario.modelVersion && scenario.modelVersion !== 'not disclosed'
    ? ` ${scenario.modelVersion}`
    : ''
  return `${scenario.providerId} · ${scenario.modelId}${version} (${scenario.functionalUnit})`
}

export function ScenarioEvidence({ scenario }: { scenario: AiScenario }) {
  const rows: Array<[string, string]> = [
    ['Provider', scenario.providerId],
    ['Service', scenario.serviceId],
    ['Model', `${scenario.modelId}${scenario.modelVersion && scenario.modelVersion !== 'not disclosed' ? ` (${scenario.modelVersion})` : ''}`],
    ['Generation mode', scenario.generationMode],
    ['Functional unit', `${scenario.functionalUnit}${scenario.tokenBasis ? ` · ${scenario.tokenBasis}` : ''}`],
    ['Scope boundary', scenario.scopeBoundary],
    ['PUE treatment', scenario.pueTreatment],
    ['Vintage', `${scenario.vintageYear ?? 'Not specified'} (retrieved ${scenario.retrievedAt})`],
    ['Source', scenario.sourceRefs[0]?.citation ?? scenario.sourceRefs[0]?.locator ?? 'Not specified'],
  ]
  return (
    <ul className="compact-reference-list">
      {rows.map(([label, value]) => (
        <li key={label}>{label}<strong>{value}</strong></li>
      ))}
      {typeof scenario.energyWh === 'number' ? (
        <li>Reported energy<strong>{`${scenario.energyWh} Wh${scenario.energyWhLow != null || scenario.energyWhHigh != null ? ` (${String(scenario.energyWhLow ?? '?')}–${String(scenario.energyWhHigh ?? '?')})` : ''}`}</strong></li>
      ) : null}
      {scenario.carbonGPerUnit !== null ? (
        <li>Published factor<strong>{scenario.carbonGPerUnit} g CO₂e / {scenario.functionalUnit}</strong></li>
      ) : null}
      {scenario.notes ? <li>Notes<strong>{scenario.notes}</strong></li> : null}
    </ul>
  )
}

interface ScenarioGroup {
  key: string
  label: string
  scenarios: AiScenario[]
}

function scenarioGroups(): ScenarioGroup[] {
  const groups = new Map<string, AiScenario[]>()
  for (const activity of getAiActivities()) {
    for (const scenario of listScenariosForActivity(activity.id)) {
      const key = `${scenario.providerId}:${scenario.serviceId}`
      const current = groups.get(key) ?? []
      current.push(scenario)
      groups.set(key, current)
    }
  }
  return [...groups.entries()]
    .map(([key, scenarios]) => ({
      key,
      label: `${scenarios[0]?.providerId ?? 'Provider'} · ${scenarios[0]?.serviceId ?? 'Service'}`,
      scenarios: [...scenarios].sort((a, b) => scenarioLabel(a).localeCompare(scenarioLabel(b))),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function AiScenarioPicker({ onSelect }: { onSelect: (scenarioId: string) => void }) {
  const groups = useMemo(scenarioGroups, [])
  const [groupKey, setGroupKey] = useState('')
  const selectedGroup = groups.find((group) => group.key === groupKey)
  const [scenarioId, setScenarioId] = useState('')

  useEffect(() => {
    setScenarioId('')
    if (selectedGroup?.scenarios.length === 1) {
      onSelect(selectedGroup.scenarios[0].scenarioId)
    }
  }, [onSelect, selectedGroup])

  return (
    <div className="ai-scenario-picker">
      <p className="routine-chooser__hint">Choose a provider or service group. Exact models and use-cases stay separate.</p>
      <div className="routine-choice-grid">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            className={group.key === groupKey ? 'routine-choice is-selected' : 'routine-choice'}
            aria-pressed={group.key === groupKey}
            onClick={() => setGroupKey(group.key)}
          >
            <span>{group.label}</span>
            <small>{group.scenarios.length} exact {group.scenarios.length === 1 ? 'scenario' : 'scenarios'}</small>
          </button>
        ))}
      </div>
      {selectedGroup && selectedGroup.scenarios.length > 1 ? (
        <label className="routine-select-field" htmlFor="ai-scenario-choice">
          Model or use case
          <select
            id="ai-scenario-choice"
            value={scenarioId}
            onChange={(event) => {
              const next = event.target.value
              setScenarioId(next)
              if (next) onSelect(next)
            }}
          >
            <option value="">Choose an exact scenario…</option>
            {selectedGroup.scenarios.map((scenario) => (
              <option key={scenario.scenarioId} value={scenario.scenarioId}>{scenarioLabel(scenario)}</option>
            ))}
          </select>
        </label>
      ) : null}
      {!groups.length ? (
        <DataState title="No AI scenario groups available" tone="warning">The catalogue does not contain an exact scenario to trace.</DataState>
      ) : null}
    </div>
  )
}
