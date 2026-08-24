'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { ActivityShelf } from '@/components/calculator/ActivityShelf'
import { AiScenarioPicker } from '@/components/calculator/AiScenarioPicker'
import { RoutineLine } from '@/components/calculator/RoutineLine'
import { CATEGORY_INFO, formatEmissions, getActivitiesByCategory, getActivityById, type Activity, type ActivityCategory } from '@/lib/calculator'
import {
  calculateRoutineWorksheet,
  createActivityLine,
  createScenarioLine,
  deriveRoutineLine,
  getRoutineComparisonOptions,
  type RoutineFieldId,
  type RoutineLine as RoutineLineModel,
} from '@/lib/routines'

interface RoutineWorksheetProps {
  lines: RoutineLineModel[]
  benchmarkLabel: string
  onLinesChange: (lines: RoutineLineModel[]) => void
  onPreviewLines: (lines: RoutineLineModel[]) => void
  onEvidence: (line: RoutineLineModel) => void
  onAnnouncement: (message: string) => void
}

type RoutineChoiceKind = 'commute' | 'flight' | 'streaming' | 'social' | 'music' | 'ai' | 'food' | 'home' | 'shopping'

interface RoutineSelection {
  family: ActivityCategory | null
  kind: RoutineChoiceKind | null
  returning?: boolean
}

const FAMILIES: Array<{ category: ActivityCategory; label: string }> = [
  { category: 'transport', label: 'Travel' },
  { category: 'food', label: 'Food & drink' },
  { category: 'digital', label: 'Digital use' },
  { category: 'home', label: 'Home & utilities' },
  { category: 'shopping', label: 'Goods' },
]

const TRAVEL_KINDS: Array<{ kind: RoutineChoiceKind; label: string; description: string }> = [
  { kind: 'commute', label: 'Commute', description: 'A regular school, work, or care journey.' },
  { kind: 'flight', label: 'Flight', description: 'Short- or long-haul passenger travel.' },
]

const DIGITAL_KINDS: Array<{ kind: RoutineChoiceKind; label: string; description: string }> = [
  { kind: 'streaming', label: 'Streaming', description: 'HD or UHD video hours.' },
  { kind: 'social', label: 'Social', description: 'Instagram use hours.' },
  { kind: 'music', label: 'Music', description: 'Standard-quality streaming hours.' },
  { kind: 'ai', label: 'AI', description: 'A source-backed monthly event pattern.' },
]

const ACTIVITY_IDS_BY_KIND: Record<Exclude<RoutineChoiceKind, 'ai' | 'food' | 'home' | 'shopping'>, string[]> = {
  commute: [
    'TRAN.SCHOOLRUN.CAR.KM',
    'TRAN.SCHOOLRUN.BIKE.KM',
    'TRAN.TTC.SUBWAY.KM',
    'TRAN.TTC.BUS.KM',
  ],
  flight: ['TRAN.FLIGHT.SHORTHAUL.PKM', 'TRAN.FLIGHT.LONGHAUL.PKM'],
  streaming: ['MEDIA.STREAM.HD.HOUR', 'MEDIA.STREAM.UHD.HOUR'],
  social: ['SOCIAL.INSTAGRAM.HOUR'],
  music: ['MUSIC.STREAM.STANDARD.HOUR'],
}

const ACTIVITY_IDS_BY_FAMILY: Record<'food' | 'home' | 'shopping', string[]> = {
  food: [
    'FOOD.MEAL.BEEF.SERVING',
    'FOOD.MEAL.CHICKEN.SERVING',
    'FOOD.MEAL.VEG.SERVING',
  ],
  home: [
    'ENERGY.NATGAS.M3',
    'MUNI.WATER.POTABLE.M3',
    'REFR.APPL.FRIDGE.OP.YEAR',
    'REFR.HVAC.AC.OP.YEAR',
  ],
  shopping: [
    'CLOTHING.TSHIRT.COTTON',
    'CLOTHING.JEANS.DENIM',
    'DEVICE.SMARTPHONE.UNIT',
    'DEVICE.LAPTOP.UNIT',
  ],
}

function familyForActivity(activity: Activity): ActivityCategory {
  return activity.category
}

function lineName(line: RoutineLineModel): string {
  if (line.source === 'activity') return getActivityById(line.activityId)?.name ?? line.activityId
  return line.scenarioId
}
function continuationLabel(line: RoutineLineModel): string {
  if (line.source === 'scenario') return 'Add another AI use'
  const activity = getActivityById(line.activityId)
  if (!activity) return 'Add another routine'
  if (activity.category === 'transport') return 'Add another way you travel'
  if (activity.category === 'digital') return 'Add another digital service'
  if (activity.category === 'food') return 'Add another meal pattern'
  if (activity.category === 'home') return 'Add another home utility'
  return 'Add another purchase'
}

function replaceLine(lines: RoutineLineModel[], nextLine: RoutineLineModel): RoutineLineModel[] {
  const existing = lines.some((line) => line.key === nextLine.key)
  return existing
    ? lines.map((line) => (line.key === nextLine.key ? nextLine : line))
    : [...lines, nextLine]
}

export function RoutineWorksheet({
  lines,
  benchmarkLabel,
  onLinesChange,
  onPreviewLines,
  onEvidence,
  onAnnouncement,
}: RoutineWorksheetProps) {
  const [selection, setSelection] = useState<RoutineSelection>({ family: null, kind: null })
  const [draft, setDraft] = useState<RoutineLineModel | null>(null)
  const [asymmetricOutbound, setAsymmetricOutbound] = useState<RoutineLineModel | null>(null)
  const addAnotherRef = useRef<HTMLButtonElement>(null)
  const previousLineCount = useRef(lines.length)
  const [browseCategory, setBrowseCategory] = useState<ActivityCategory>('transport')

  const previewLines = useMemo(() => {
    if (!draft) return lines
    const derivation = deriveRoutineLine(draft)
    if (derivation.quantity === null) return lines
    return replaceLine(lines, draft)
  }, [draft, lines])
  const previewSummary = useMemo(() => calculateRoutineWorksheet(previewLines), [previewLines])
  useEffect(() => {
    if (previousLineCount.current > 0 && lines.length === 0) {
      setDraft(null)
      setAsymmetricOutbound(null)
      setSelection({ family: null, kind: null })
    }
    previousLineCount.current = lines.length
  }, [lines.length])

  useEffect(() => {
    onPreviewLines(previewLines)
  }, [onPreviewLines, previewLines])

  const openDraft = useCallback((line: RoutineLineModel, duplicateMessage?: string) => {
    setDraft(line)
    setSelection({ family: null, kind: null })
    if (duplicateMessage) onAnnouncement(duplicateMessage)
  }, [onAnnouncement])

  const startActivity = useCallback((activityId: string, values?: RoutineLineModel['values']) => {
    const existing = lines.find((line) => line.source === 'activity' && line.activityId === activityId)
    const activity = getActivityById(activityId)
    if (existing) {
      openDraft(existing, `${activity?.name ?? activityId} is already in your routines.`)
      return
    }
    openDraft(createActivityLine(activityId, values))
  }, [lines, openDraft])

  const startScenario = useCallback((scenarioId: string) => {
    const existing = lines.find((line) => line.source === 'scenario' && line.scenarioId === scenarioId)
    if (existing) {
      openDraft(existing, `${scenarioId} is already in your routines.`)
      return
    }
    openDraft(createScenarioLine(scenarioId))
  }, [lines, openDraft])

  const cancelDraft = useCallback(() => {
    setDraft(null)
    setAsymmetricOutbound(null)
    setSelection({ family: null, kind: null })
    onPreviewLines(lines)
  }, [lines, onPreviewLines])

  const saveDraft = useCallback(() => {
    if (!draft) return
    const derivation = deriveRoutineLine(draft)
    if (derivation.quantity === null) {
      const firstInvalid = Object.keys(derivation.errors)[0] as RoutineFieldId | undefined
      if (firstInvalid) document.getElementById(`${draft.key}-${firstInvalid}`)?.focus()
      onAnnouncement(derivation.errors[firstInvalid ?? 'oneWayKm'] ?? 'Complete the routine inputs before saving.')
      return
    }

    const nextLines = asymmetricOutbound
      ? replaceLine(replaceLine(lines, asymmetricOutbound), draft)
      : replaceLine(lines, draft)
    onLinesChange(nextLines)
    onPreviewLines(nextLines)
    onAnnouncement(`${lineName(draft)} saved to your routines.`)
    setDraft(null)
    setAsymmetricOutbound(null)
    setSelection({ family: null, kind: null })
    window.setTimeout(() => addAnotherRef.current?.focus({ preventScroll: true }), 0)
  }, [asymmetricOutbound, draft, lines, onAnnouncement, onLinesChange, onPreviewLines])

  const removeLine = useCallback((line: RoutineLineModel) => {
    const nextLines = lines.filter((candidate) => candidate.key !== line.key)
    onLinesChange(nextLines)
    onPreviewLines(nextLines)
    onAnnouncement(`${lineName(line)} removed from your routines.`)
    if (draft?.key === line.key) setDraft(null)
  }, [draft?.key, lines, onAnnouncement, onLinesChange, onPreviewLines])

  const editLine = useCallback((line: RoutineLineModel) => {
    setDraft(line)
    setSelection({ family: null, kind: null })
  }, [])

  const changeDraft = useCallback((fieldId: RoutineFieldId, value: string) => {
    setDraft((current) => current ? { ...current, values: { ...current.values, [fieldId]: value } } : current)
  }, [])

  const beginDifferentReturn = useCallback(() => {
    if (!draft || draft.source !== 'activity' || draft.recipeKind !== 'commute') return
    const outbound = {
      ...draft,
      values: { ...draft.values, legsPerDay: '1' },
    }
    setAsymmetricOutbound(outbound)
    setDraft(null)
    setSelection({ family: 'transport', kind: 'commute', returning: true })
    onAnnouncement('Outbound journey set to one leg. Choose a different return mode.')
  }, [draft, onAnnouncement])

  const chooseFamily = useCallback((family: ActivityCategory) => {
    setSelection({ family, kind: family === 'transport' || family === 'digital' ? null : family })
  }, [])

  const chooseKind = useCallback((kind: RoutineChoiceKind) => {
    setSelection((current) => ({ ...current, kind }))
  }, [])

  const chooseReturnActivity = useCallback((activityId: string) => {
    if (!asymmetricOutbound) return
    startActivity(activityId, {
      oneWayKm: asymmetricOutbound.values.oneWayKm,
      legsPerDay: '1',
      travelDaysPerWeek: asymmetricOutbound.values.travelDaysPerWeek,
      weeksPerYear: asymmetricOutbound.values.weeksPerYear,
    })
  }, [asymmetricOutbound, startActivity])
  const compareLine = useCallback((line: RoutineLineModel, targetId: string, source: 'activity' | 'scenario') => {
    if (source === 'activity') {
      startActivity(targetId, line.values)
      return
    }
    const existing = lines.find((candidate) => candidate.source === 'scenario' && candidate.scenarioId === targetId)
    if (existing) {
      openDraft(existing, `${targetId} is already in your routines.`)
      return
    }
    openDraft(createScenarioLine(targetId, line.values))
  }, [lines, openDraft, startActivity])

  const activityChoices: string[] = selection.kind === 'commute'
    || selection.kind === 'flight'
    || selection.kind === 'streaming'
    || selection.kind === 'social'
    || selection.kind === 'music'
    ? ACTIVITY_IDS_BY_KIND[selection.kind]
    : selection.kind === 'food' || selection.kind === 'home' || selection.kind === 'shopping'
      ? ACTIVITY_IDS_BY_FAMILY[selection.kind]
      : []
  const outboundActivityId = asymmetricOutbound?.source === 'activity' ? asymmetricOutbound.activityId : undefined
  const returnChoices = ACTIVITY_IDS_BY_KIND.commute.filter((activityId: string) => activityId !== outboundActivityId)

  const renderFamilyChooser = () => (
    <div className="routine-choice-grid routine-choice-grid--families">
      {FAMILIES.map(({ category, label }) => (
        <button key={category} type="button" className="routine-choice routine-choice--family" onClick={() => chooseFamily(category)}>
          <ActivityMark category={category} size={28} />
          <span>{label}</span>
          <small>Trace a familiar pattern</small>
        </button>
      ))}
    </div>
  )

  const renderKindChooser = () => {
    const choices = selection.family === 'transport' ? TRAVEL_KINDS : DIGITAL_KINDS
    return (
      <>
        <button type="button" className="routine-back" onClick={() => setSelection({ family: null, kind: null })}>Back to routine families</button>
        <div className="routine-choice-grid">
          {choices.map((choice) => (
            <button key={choice.kind} type="button" className="routine-choice" onClick={() => chooseKind(choice.kind)}>
              <span>{choice.label}</span>
              <small>{choice.description}</small>
            </button>
          ))}
        </div>
      </>
    )
  }

  const renderIdentityChooser = () => {
    if (selection.kind === 'ai') {
      return (
        <>
          <button type="button" className="routine-back" onClick={() => setSelection({ family: 'digital', kind: null })}>Back to digital use</button>
          <AiScenarioPicker onSelect={startScenario} />
        </>
      )
    }
    const choices = selection.returning ? returnChoices : activityChoices
    return (
      <>
        <button
          type="button"
          className="routine-back"
          onClick={() => setSelection({ family: selection.family, kind: selection.family === 'transport' || selection.family === 'digital' ? null : selection.family })}
        >
          Back
        </button>
        <p className="routine-chooser__hint">
          {selection.returning ? 'How will you return? Your outbound distance, travel days, and weeks are carried across.' : 'Choose the exact record you want to trace.'}
        </p>
        <div className="routine-choice-grid">
          {choices.map((activityId) => {
            const activity = getActivityById(activityId)
            if (!activity) return null
            return (
              <button
                key={activity.id}
                type="button"
                className="routine-choice routine-choice--identity"
                onClick={() => selection.returning ? chooseReturnActivity(activity.id) : startActivity(activity.id)}
              >
                <ActivityMark category={familyForActivity(activity)} activityId={activity.id} size={28} />
                <span>{activity.name}</span>
                <small>{activity.unitLabel} · {activity.evidence.publicationStatus}</small>
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const renderChooser = () => {
    const stageTitle = selection.family === null
      ? 'What would you like to trace?'
      : selection.returning
        ? 'Choose your return journey'
        : selection.kind === null
          ? `Choose a ${selection.family === 'transport' ? 'travel' : 'digital'} pattern`
          : `Choose a ${selection.family === 'digital' ? 'digital service' : CATEGORY_INFO[selection.family].name.toLowerCase()}`
    return (
      <section className="routine-chooser" aria-labelledby="routine-chooser-title">
        <p className="section-kicker">{lines.length ? 'Add another routine' : 'Start with a familiar pattern'}</p>
        <h2 id="routine-chooser-title">{stageTitle}</h2>
        {selection.family === null ? renderFamilyChooser() : selection.kind === null && !selection.returning ? renderKindChooser() : renderIdentityChooser()}
      </section>
    )
  }

  const renderBrowse = () => (
    <details className="routine-disclosure">
      <summary>Browse all activities</summary>
      <div className="routine-disclosure__body">
        <p>Use the full published activity catalogue when a routine does not fit the guided choices.</p>
        <nav className="worksheet__groups" aria-label="Activity categories">
          {(Object.keys(CATEGORY_INFO) as ActivityCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              className={category === browseCategory ? 'category-button is-selected' : 'category-button'}
              aria-pressed={category === browseCategory}
              onClick={() => setBrowseCategory(category)}
            >
              <ActivityMark category={category} size={22} />
              <span>{CATEGORY_INFO[category].name}</span>
              <small>{getActivitiesByCategory(category).length} records</small>
            </button>
          ))}
        </nav>
        <ActivityShelf
          category={browseCategory}
          activities={getActivitiesByCategory(browseCategory)}
          selectedIds={lines.filter((line) => line.source === 'activity').map((line) => line.activityId)}
          onAdd={(activity) => startActivity(activity.id)}
        />
      </div>
    </details>
  )

  const latestLine = lines[lines.length - 1]
  return (
    <section className="routine-workbook" aria-label="Routine worksheet">
      {lines.length ? (
        <div className="routine-lines" aria-label="Saved routines">
          {draft && !lines.some((line) => line.key === draft.key) ? (
            <RoutineLine
              line={draft}
              active
              onChange={changeDraft}
              onSave={saveDraft}
              onCancel={cancelDraft}
              onEdit={() => undefined}
              onRemove={() => cancelDraft()}
              onEvidence={() => onEvidence(draft)}
              onDifferentReturn={beginDifferentReturn}
              saveLabel={asymmetricOutbound ? 'Save both journeys' : undefined}
            />
          ) : null}
          {lines.map((line) => {
            const comparison = getRoutineComparisonOptions(line)[0]
            return (
              <RoutineLine
                key={line.key}
                line={draft?.key === line.key ? draft : line}
                active={draft?.key === line.key}
                onChange={changeDraft}
                onSave={saveDraft}
                onCancel={cancelDraft}
                onEdit={() => editLine(line)}
                onRemove={() => removeLine(line)}
                onEvidence={() => onEvidence(draft?.key === line.key && draft ? draft : line)}
                onCompare={comparison ? () => compareLine(line, comparison.id, comparison.source) : undefined}
                comparison={comparison}
                onDifferentReturn={beginDifferentReturn}
                saveLabel={asymmetricOutbound ? 'Save both journeys' : undefined}
              />
            )
          })}
        </div>
      ) : draft ? (
        <div className="routine-lines">
          <RoutineLine
            line={draft}
            active
            onChange={changeDraft}
            onSave={saveDraft}
            onCancel={cancelDraft}
            onEdit={() => undefined}
            onRemove={cancelDraft}
            onEvidence={() => onEvidence(draft)}
            onDifferentReturn={beginDifferentReturn}
            saveLabel={asymmetricOutbound ? 'Save both journeys' : undefined}
          />
        </div>
      ) : null}
      {lines.length || draft ? (
        <div className="routine-summary routine-summary--inline" aria-label="Live worksheet result">
          <p className="section-kicker">Live result</p>
          <strong>{previewSummary.results.length ? `${formatEmissions(previewSummary.totalEmissions)}/year` : 'Complete the routine'}</strong>
          <p>{previewSummary.results.length ? `Compared with ${benchmarkLabel}.` : 'A valid draft will replace or add to the saved total.'}</p>
        </div>
      ) : null}
      {lines.length ? (
        <button ref={addAnotherRef} type="button" className="routine-continuation" aria-label="Add another routine" onClick={() => setSelection({ family: null, kind: null })}>
          {latestLine ? continuationLabel(latestLine) : 'Add another routine'}
        </button>
      ) : null}
      {!draft ? renderChooser() : null}
      {renderBrowse()}
    </section>
  )
}
