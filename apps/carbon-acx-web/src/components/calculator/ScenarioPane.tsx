'use client'

import { useEffect, useMemo, useState } from 'react'

import { DataState } from '@/components/content'
import {
  formatEmissions,
  getAiActivities,
  listScenariosForActivity,
  resolveScenarioById,
  scenarioAnnualGrams,
  scenarioStaleVintage,
  type AiScenario,
  type ScenarioResolution,
} from '@/lib/calculator'

function scenarioLabel(scenario: AiScenario): string {
  const version =
    scenario.modelVersion && scenario.modelVersion !== 'not disclosed'
      ? ` ${scenario.modelVersion}`
      : ''
  return `${scenario.providerId} · ${scenario.modelId}${version} (${scenario.publicationStatus})`
}

function unitLabel(scenario: AiScenario): string {
  if (scenario.functionalUnit === 'prompt') return 'prompts per year'
  if (scenario.functionalUnit === 'response') return 'responses per year'
  if (scenario.functionalUnit === 'image') return 'images per year'
  if (scenario.functionalUnit === 'video_clip') return 'video clips per year'
  return 'inferences per year'
}

function ScenarioEvidence({ scenario }: { scenario: AiScenario }) {
  const rows: Array<[string, string]> = [
    ['Provider', scenario.providerId],
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
      {scenario.notes ? <li>Notes<strong>{scenario.notes}</strong></li> : null}
    </ul>
  )
}

export function ScenarioPane({
  onPublishedGrams,
}: {
  onPublishedGrams: (grams: number) => void
}) {
  const aiActivities = useMemo(() => getAiActivities(), [])
  const [activityId, setActivityId] = useState('')
  const [scenarioId, setScenarioId] = useState('')
  const [quantityDraft, setQuantityDraft] = useState('')

  const scenarios = activityId ? listScenariosForActivity(activityId) : []
  const quantity = Number(quantityDraft)
  const resolution: ScenarioResolution | null = scenarioId ? resolveScenarioById(scenarioId) : null
  const publishedGrams =
    resolution?.status === 'published' ? scenarioAnnualGrams(resolution.scenario, quantity) : null

  useEffect(() => {
    onPublishedGrams(publishedGrams ?? 0)
  }, [publishedGrams, onPublishedGrams])

  const selectedActivity = aiActivities.find((activity) => activity.id === activityId)

  return (
    <section className="scenario-pane ruled-section" aria-labelledby="scenario-pane-title">
      <div className="activity-shelf__heading">
        <div>
          <p className="section-kicker">Research layer</p>
          <h2 id="scenario-pane-title">AI usage scenarios</h2>
        </div>
        <p>
          Exact-match selection only. Published scenarios join your annual total; estimates stay
          evidence-only.
        </p>
      </div>
      <div className="worksheet__editors">
        <article className="activity-editor">
          <div className="activity-editor__identity">
            <div>
              <EvidenceHeader activityName={selectedActivity?.name ?? null} />
            </div>
          </div>
          <div className="activity-editor__control">
            <label htmlFor="scenario-activity">AI activity</label>
            <select
              id="scenario-activity"
              value={activityId}
              onChange={(event) => {
                setActivityId(event.target.value)
                setScenarioId('')
              }}
            >
              <option value="">Choose an AI activity…</option>
              {aiActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
            <label htmlFor="scenario-id">Scenario</label>
            <select
              id="scenario-id"
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value)}
              disabled={!activityId}
            >
              <option value="">
                {activityId ? 'Choose a documented scenario…' : 'Pick an AI activity first'}
              </option>
              {scenarios.map((scenario) => (
                <option key={scenario.scenarioId} value={scenario.scenarioId}>
                  {scenarioLabel(scenario)}
                </option>
              ))}
            </select>
            {resolution && resolution.status !== 'unavailable' ? (
              <>
                <label htmlFor="scenario-quantity">
                  Annual quantity ({unitLabel(resolution.scenario)})
                </label>
                <input
                  id="scenario-quantity"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={quantityDraft}
                  placeholder={`e.g. ${resolution.scenario.functionalUnit === 'prompt' ? '730' : '365'}`}
                  onChange={(event) => setQuantityDraft(event.target.value)}
                />
              </>
            ) : null}
          </div>
        </article>
      </div>
      {resolution == null ? (
        <p className="empty-ruled-field">
          Select a documented scenario to see its publication status and evidence.
        </p>
      ) : resolution.status === 'unavailable' ? (
        <DataState title="Unavailable" tone="warning">
          {resolution.reason} Nothing was added to your annual total.
        </DataState>
      ) : resolution.status === 'estimate' ? (
        <DataState title="Estimate — not included in your total" tone="warning" badge="estimate">
          This scenario is published as an estimate and stays outside calculator arithmetic under
          ACX107. Review the evidence below before citing it anywhere.
          <ScenarioEvidence scenario={resolution.scenario} />
        </DataState>
      ) : (
        <DataState
          title={`Included in your total: ${formatEmissions(publishedGrams ?? 0)} per year`}
          badge={scenarioStaleVintage(resolution.scenario) ? 'stale-vintage' : undefined}
        >
          {quantity > 0 && typeof resolution.scenario.carbonGPerUnit === 'number' ? (
            <p className="equation">
              {quantity} {unitLabel(resolution.scenario)} ×{' '}
              {resolution.scenario.carbonGPerUnit} g CO₂e ={' '}
              {formatEmissions(publishedGrams ?? 0)}
            </p>
          ) : (
            <p>Enter a positive annual quantity to include this scenario.</p>
          )}
          <ScenarioEvidence scenario={resolution.scenario} />
        </DataState>
      )}
    </section>
  )
}

function EvidenceHeader({ activityName }: { activityName: string | null }) {
  if (!activityName) {
    return <p className="section-kicker">Documented provider scenarios</p>
  }
  return (
    <>
      <p className="section-kicker">Catalogue record</p>
      <h3>{activityName}</h3>
    </>
  )
}
