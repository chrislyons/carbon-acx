'use client'

import { useEffect, useMemo, useRef } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { DataState, EvidenceBadge } from '@/components/content'
import {
  formatEmissions,
  getActivityById,
  resolveScenarioById,
  type Activity,
  type ActivityCategory,
  type AiScenario,
} from '@/lib/calculator'
import {
  calculateRoutineWorksheet,
  deriveRoutineLine,
  getRoutineRecipe,
  getScenarioUnitLabel,
  type RoutineComparisonOption,
  type RoutineFieldId,
  type RoutineLine as RoutineLineModel,
} from '@/lib/routines'

interface RoutineLineProps {
  line: RoutineLineModel
  active: boolean
  onChange: (fieldId: RoutineFieldId, value: string) => void
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onRemove: () => void
  onEvidence: () => void
  comparison?: RoutineComparisonOption
  onCompare?: () => void
  onDifferentReturn?: () => void
  saveLabel?: string
}

interface LineIdentity {
  name: string
  category: ActivityCategory
  description: string
  activity: Activity | null
  scenario: AiScenario | null
}

function scenarioName(scenario: AiScenario): string {
  const model = scenario.modelId && scenario.modelId !== 'not disclosed' ? ` · ${scenario.modelId}` : ''
  return `${scenario.providerId} · ${scenario.serviceId}${model}`
}

function lineIdentity(line: RoutineLineModel): LineIdentity {
  if (line.source === 'activity') {
    const activity = getActivityById(line.activityId)
    if (!activity) {
      return {
        name: line.activityId,
        category: 'digital',
        description: 'This activity is no longer available.',
        activity: null,
        scenario: null,
      }
    }
    return {
      name: activity.name,
      category: activity.category,
      description: activity.description,
      activity,
      scenario: null,
    }
  }

  const resolution = resolveScenarioById(line.scenarioId)
  if (resolution.status === 'unavailable') {
    return {
      name: line.scenarioId,
      category: 'digital',
      description: resolution.reason,
      activity: null,
      scenario: null,
    }
  }
  return {
    name: scenarioName(resolution.scenario),
    category: 'digital',
    description: resolution.scenario.notes ?? 'Source-backed AI scenario record.',
    activity: null,
    scenario: resolution.scenario,
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-CA', { maximumFractionDigits: 2 })
}

function routineEquation(line: RoutineLineModel, quantity: number | null, unitLabel: string): string {
  const recipe = getRoutineRecipe(line)
  const terms = recipe.fields.map((definition) => {
    const value = line.values[definition.id]
    return `${value?.trim() ? value : '—'} ${definition.unit}`
  })
  const operator = recipe.kind === 'replacement' ? ' ÷ ' : ' × '
  const resultUnit = unitLabel.endsWith(' per year') ? unitLabel : `${unitLabel}/year`
  const result = quantity === null ? 'incomplete' : `${formatNumber(quantity)} ${resultUnit}`
  return `${terms.join(operator)} = ${result}`
}

function statusLabel(line: RoutineLineModel, noticeStatus: string | undefined): string {
  if (line.source === 'scenario') {
    if (noticeStatus === 'estimate') return 'Estimate · evidence only'
    if (noticeStatus === 'unavailable') return 'Unavailable · evidence only'
    return 'Published scenario'
  }
  return noticeStatus === 'unavailable' ? 'Unavailable' : 'Published factor'
}

function unitForLine(identity: LineIdentity, resultUnit: string | undefined): string {
  if (resultUnit) return resultUnit
  if (identity.activity) return identity.activity.unitLabel
  if (identity.scenario) return getScenarioUnitLabel(identity.scenario)
  return 'annual units'
}

export function RoutineLine({
  line,
  active,
  onChange,
  onSave,
  onCancel,
  onEdit,
  onRemove,
  onEvidence,
  comparison,
  onCompare,
  onDifferentReturn,
  saveLabel = 'Save routine',
}: RoutineLineProps) {
  const identity = useMemo(() => lineIdentity(line), [line])
  const derivation = useMemo(() => deriveRoutineLine(line), [line])
  const worksheet = useMemo(() => calculateRoutineWorksheet([line]), [line])
  const result = worksheet.results[0]
  const notice = worksheet.notices[0]
  const unitLabel = unitForLine(identity, result?.unitLabel)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (active) firstInputRef.current?.focus()
  }, [active])

  if (!active) {
    return (
      <article className="routine-line routine-line--compact" data-line-key={line.key}>
        <div className="routine-line__identity">
          <ActivityMark category={identity.category} activityId={line.source === 'activity' ? line.activityId : undefined} size={30} />
          <div>
            <p className="section-kicker">{identity.category}</p>
            <h3>{identity.name}</h3>
            <p className="routine-line__equation">{routineEquation(line, derivation.quantity, unitLabel)}</p>
          </div>
        </div>
        <div className="routine-line__outcome">
          <span className={`routine-line__state routine-line__state--${notice?.status ?? 'published'}`}>{statusLabel(line, notice?.status)}</span>
          {result ? <strong>{formatEmissions(result.emissions)}/year</strong> : <span>{notice?.message ?? 'Complete this routine to calculate it.'}</span>}
        </div>
        <div className="routine-line__actions">
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" onClick={onRemove}>Remove</button>
          <button id={`evidence-trigger-${line.key}`} type="button" onClick={onEvidence}>Evidence</button>
          {comparison && onCompare ? <button type="button" onClick={onCompare}>Compare with {comparison.name}</button> : null}
        </div>
      </article>
    )
  }

  return (
    <article className="routine-line routine-line--active" data-line-key={line.key}>
      <div className="routine-line__identity">
        <ActivityMark category={identity.category} activityId={line.source === 'activity' ? line.activityId : undefined} size={38} />
        <div>
          <p className="section-kicker">{identity.category}</p>
          <h2>{identity.name}</h2>
          <p>{identity.description}</p>
          {identity.activity?.notes ? <p className="routine-line__assumption"><strong>Assumption:</strong> {identity.activity.notes}</p> : null}
          {identity.activity ? <EvidenceBadge evidence={identity.activity.evidence} /> : null}
          {identity.scenario ? (
            <span className={`routine-line__state routine-line__state--${identity.scenario.publicationStatus}`}>
              {identity.scenario.publicationStatus === 'published' ? 'Published scenario' : identity.scenario.publicationStatus}
            </span>
          ) : null}
        </div>
      </div>
      <div className="routine-equation">
        <p className="section-kicker">Trace the routine</p>
        <div className="routine-equation__fields">
          {getRoutineRecipe(line).fields.map((definition, index) => {
            const error = derivation.errors[definition.id]
            const errorId = `${line.key}-${definition.id}-error`
            return (
              <div className="routine-term" key={definition.id}>
                <label htmlFor={`${line.key}-${definition.id}`}>
                  {definition.label}
                  <span>{definition.unit}</span>
                </label>
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  id={`${line.key}-${definition.id}`}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={line.values[definition.id] ?? ''}
                  onChange={(event) => onChange(definition.id, event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                />
                {error ? <p id={errorId} role="alert" className="field-error">{error}</p> : null}
              </div>
            )
          })}
        </div>
        <p className="routine-equation__live" aria-live="polite">
          {routineEquation(line, derivation.quantity, unitLabel)}
        </p>
        {result ? (
          <DataState title={`${formatEmissions(result.emissions)} per year`}>
            <p>{result.quantity.toLocaleString('en-CA')} {result.unitLabel} × {result.emissionFactor} g CO₂e / {result.unitLabel}.</p>
          </DataState>
        ) : notice ? (
          <DataState title={statusLabel(line, notice.status)} tone="warning" badge={notice.status === 'estimate' ? 'estimate' : undefined}>
            {notice.message}
          </DataState>
        ) : null}
        <div className="routine-line__actions">
          <button type="button" onClick={onSave}>{saveLabel}</button>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button id={`evidence-trigger-${line.key}`} type="button" onClick={onEvidence}>Evidence</button>
          {line.source === 'activity' && line.recipeKind === 'commute' && onDifferentReturn ? (
            <button type="button" onClick={onDifferentReturn}>My return journey differs</button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

