'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { ActivityShelf } from '@/components/calculator/ActivityShelf'
import { TabHeader } from '@/components/layout/TabHeader'
import { abbreviateUnit } from '@/lib/units'
import {
  DataState,
  EvidenceBadge,
  EvidenceFacts,
} from '@/components/content'
import {
  CATEGORY_INFO,
  DEFAULT_BENCHMARK_KEY,
  calculateEmissions,
  comparisonToBenchmark,
  decodeCalculatorInputs,
  encodeCalculatorInputs,
  formatEmissions,
  getActivitiesByCategory,
  getActivityById,
  getBenchmark,
  getBenchmarkOptions,
} from '@/lib/calculator'
import type {
  Activity,
  ActivityCategory,
  Benchmark,
  CalculatorSummary,
} from '@/lib/calculator'


const STORAGE_KEY = 'carbon-acx-calculator-inputs'
const CATEGORIES = Object.keys(CATEGORY_INFO) as ActivityCategory[]

const ImpactComposition = dynamic(
  () => import('@/components/viz/ImpactComposition').then((mod) => mod.ImpactComposition),
  {
    loading: () => <div className="empty-ruled-field" aria-live="polite">Loading ranked activity impacts…</div>,
  },
)

const ScenarioPane = dynamic(
  () => import('@/components/calculator/ScenarioPane').then((mod) => mod.ScenarioPane),
  {
    ssr: false,
    loading: () => <div className="empty-ruled-field" aria-live="polite">Loading documented scenarios…</div>,
  },
)

const EvidencePane = dynamic(
  () => import('@/components/calculator/EvidencePane').then((mod) => mod.EvidencePane),
  {
    ssr: false,
    loading: () => <div className="empty-ruled-field" aria-live="polite">Loading factor evidence…</div>,
  },
)

const BenchmarkContext = dynamic(
  () => import('@/components/content/BenchmarkContext').then((mod) => mod.BenchmarkContext),
  { ssr: false },
)

function getPublishedInputs(rawInputs: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rawInputs).filter(
      ([id, value]) => getActivityById(id) && typeof value === 'number' && Number.isFinite(value) && value > 0,
    ),
  ) as Record<string, number>
}

export default function CalculatorPage() {
  return <CalculatorContent />
}

function CalculatorContent() {
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('transport')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [collapsedIds, setCollapsedIds] = useState<string[]>([])
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null)
  const [completedEditorId, setCompletedEditorId] = useState<string | null>(null)
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const evidenceRestoreId = useRef<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const summaryRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [benchmarkKey, setBenchmarkKey] = useState(DEFAULT_BENCHMARK_KEY)
  const [scenarioGrams, setScenarioGrams] = useState(0)
  const [shared, setShared] = useState(false)
  const [view, setView] = useState<'browse' | 'worksheet'>('browse')
  const [loaded, setLoaded] = useState(false)
  const initializationInteraction = useRef(false)
  const [scenarioOpen, setScenarioOpen] = useState(false)
  const scenarioDetailsRef = useRef<HTMLDetailsElement>(null)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (evidenceId || !evidenceRestoreId.current) return
    const triggerId = evidenceRestoreId.current
    evidenceRestoreId.current = null
    document.getElementById(`evidence-trigger-${triggerId}`)?.focus()
  }, [evidenceId])

  useEffect(() => {
    if (!activeEditorId) return
    window.requestAnimationFrame(() => inputRefs.current[activeEditorId]?.focus())
  }, [activeEditorId])
  useEffect(() => {
    if (!completedEditorId) return
    const completedId = completedEditorId
    window.requestAnimationFrame(() => {
      summaryRefs.current[completedId]?.focus()
      setCompletedEditorId(null)
    })
  }, [completedEditorId])
  useEffect(() => {
    if (initializationInteraction.current) {
      setLoaded(true)
      return
    }
    const encoded = new URLSearchParams(window.location.search).get('data')
    const rawInputs: Record<string, unknown> = encoded
      ? decodeCalculatorInputs(encoded)
      : (() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, unknown>
          } catch {
            return {}
          }
        })()
    const published = getPublishedInputs(rawInputs)
    setInputs(published)
    setDrafts(Object.fromEntries(Object.entries(published).map(([id, value]) => [id, String(value)])))
    setSelectedIds(Object.keys(published))
    setCollapsedIds(Object.keys(published))
    setShared(Boolean(encoded))
    setView(encoded ? 'worksheet' : 'browse')
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded && scenarioDetailsRef.current?.open) setScenarioOpen(true)
  }, [loaded])

  useEffect(() => {
    if (!loaded) return
    const safe = Object.fromEntries(
      Object.entries(inputs).filter(
        ([id, value]) => getActivityById(id) && Number.isFinite(value) && value > 0,
      ),
    )
    if (Object.keys(safe).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
    else localStorage.removeItem(STORAGE_KEY)
  }, [inputs, loaded])

  const summary = useMemo(
    () => calculateEmissions(Object.entries(inputs).map(([activityId, quantity]) => ({ activityId, quantity }))),
    [inputs],
  )
  const combinedTotal = summary.totalEmissions + scenarioGrams
  const benchmark = getBenchmark(benchmarkKey) ?? getBenchmark(DEFAULT_BENCHMARK_KEY)!
  const selected = selectedIds.map(getActivityById).filter((activity): activity is Activity => Boolean(activity))
  const activities = getActivitiesByCategory(activeCategory)
  const evidenceActivity = evidenceId ? getActivityById(evidenceId) : null

  const focusInput = (id: string) => {
    window.requestAnimationFrame(() => inputRefs.current[id]?.focus())
  }

  const add = (activity: Activity) => {
    initializationInteraction.current = true
    if (selectedIds.includes(activity.id)) {
      setAnnouncement(`${activity.name} is already in the worksheet.`)
      setCollapsedIds((ids) => ids.filter((value) => value !== activity.id))
      setView('worksheet')
      setActiveEditorId(activity.id)
      focusInput(activity.id)
      return
    }
    setSelectedIds((ids) => [...ids, activity.id])
    setCollapsedIds((ids) => ids.filter((value) => value !== activity.id))
    setDrafts((current) => ({ ...current, [activity.id]: current[activity.id] ?? '' }))
    setErrors(({ [activity.id]: _, ...rest }) => rest)
    setView('worksheet')
    setActiveEditorId(activity.id)
    setAnnouncement(`${activity.name} added to the worksheet.`)
  }

  const remove = (id: string) => {
    const activity = getActivityById(id)
    setSelectedIds((ids) => ids.filter((value) => value !== id))
    setCollapsedIds((ids) => ids.filter((value) => value !== id))
    setInputs(({ [id]: _, ...rest }) => rest)
    setDrafts(({ [id]: _, ...rest }) => rest)
    setErrors(({ [id]: _, ...rest }) => rest)
    if (activeEditorId === id) setActiveEditorId(null)
    if (evidenceId === id) setEvidenceId(null)
    if (activity) setAnnouncement(`${activity.name} removed from the worksheet.`)
  }

  const update = (id: string, raw: string) => {
    setActiveEditorId(id)
    setDrafts((current) => ({ ...current, [id]: raw }))
    if (raw.trim() === '') {
      setErrors((current) => ({ ...current, [id]: 'Enter a positive annual quantity.' }))
      setInputs(({ [id]: _, ...rest }) => rest)
      return
    }
    const value = Number(raw)
    const error = !Number.isFinite(value)
      ? 'Enter a finite number.'
      : value <= 0
        ? 'Enter a positive annual quantity.'
        : null
    if (error) {
      setErrors((current) => ({ ...current, [id]: error }))
      setInputs(({ [id]: _, ...rest }) => rest)
    } else {
      setErrors(({ [id]: _, ...rest }) => rest)
      setInputs((current) => ({ ...current, [id]: value }))
    }
  }

  const finishEditing = (id: string) => {
    if (errors[id] || inputs[id] === undefined) return
    setActiveEditorId(null)
    setCollapsedIds((ids) => ids.includes(id) ? ids : [...ids, id])
    setCompletedEditorId(id)
  }

  const reset = () => {
    setSelectedIds([])
    setCollapsedIds([])
    setDrafts({})
    setErrors({})
    setActiveEditorId(null)
    setEvidenceId(null)
    setView('browse')
    setAnnouncement('Worksheet cleared.')
    localStorage.removeItem(STORAGE_KEY)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/calculator?data=${encodeCalculatorInputs(inputs)}`)
    setCopied(true)
    setAnnouncement('Worksheet link copied.')
    window.setTimeout(() => setCopied(false), 1800)
  }

  const closeEvidence = () => {
    if (evidenceId) evidenceRestoreId.current = evidenceId
    setEvidenceId(null)
  }

  return (
    <div className="editorial-page worksheet workspace">
      <TabHeader
        route="calculator"
        meta={
          <>
            <span>Selected <strong>{selected.length}</strong></span>
            {combinedTotal > 0 ? <span><strong>{formatEmissions(combinedTotal)}</strong>/yr</span> : <span>Empty worksheet</span>}
            <span>{summary.skipped.length ? <><strong>{summary.skipped.length}</strong> not included</> : 'All inputs counted'}</span>
          </>
        }
        actions={
          <>
            <button type="button" disabled={!loaded} onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
            <button type="button" disabled={!loaded} className="action-destructive" onClick={reset}>Clear worksheet</button>
          </>
        }
      />
      <div className="calculator-view-toggle" role="group" aria-label="Calculator view">
        <button type="button" disabled={!loaded} aria-pressed={view === 'browse'} onClick={() => setView('browse')}>Browse activities</button>
        <button type="button" disabled={!loaded} aria-pressed={view === 'worksheet'} onClick={() => setView('worksheet')}>Worksheet</button>
      </div>
      {shared ? <DataState title="Shared worksheet">Shared worksheet. These annual quantities remain editable.</DataState> : null}
      <div className="calculator__columns">
        <section className="calculator__shelf panel" data-compact-view={view === 'browse' ? 'visible' : 'hidden'} aria-label="Browse activities">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Browse activities">
            <nav className="worksheet__groups" aria-label="Activity categories">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  disabled={!loaded}
                  className={activeCategory === category ? 'category-button is-selected' : 'category-button'}
                  aria-pressed={activeCategory === category}
                  onClick={() => {
                    initializationInteraction.current = true
                    setActiveCategory(category)
                  }}
                >
                  <ActivityMark category={category} size={22} />
                  <span>{CATEGORY_INFO[category].name}</span>
                  <small>{getActivitiesByCategory(category).length} activities</small>
                </button>
              ))}
            </nav>
            <ActivityShelf category={activeCategory} activities={activities} selectedIds={selectedIds} onAdd={add} disabled={!loaded} />
          </div>
        </section>
        <section className="calculator__worksheet panel" data-compact-view={view === 'worksheet' ? 'visible' : 'hidden'} aria-label="Worksheet">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Worksheet">
            <div className="worksheet-header ruled-section">
              <div>
                <p className="section-kicker">Selected activities</p>
                <h2>Worksheet <span>({selected.length})</span></h2>
              </div>
              <button type="button" className="text-link" onClick={() => setView('browse')}>Add another activity</button>
            </div>
            <div className="worksheet__body">
              <section className="worksheet__editors" aria-label="Selected activities">
                {selected.length === 0
                  ? <div className="empty-ruled-field">Your worksheet is empty. Browse activities to start comparing.</div>
                  : selected.map((activity) => {
                      const result = summary.results.find((item) => item.activityId === activity.id)
                      const collapsed = result && collapsedIds.includes(activity.id)
                      return collapsed ? (
                        <ActivitySummary
                          key={activity.id}
                          activity={activity}
                          result={result}
                          summaryRef={(element) => { summaryRefs.current[activity.id] = element }}
                          onEdit={() => {
                            setCollapsedIds((ids) => ids.filter((value) => value !== activity.id))
                            setActiveEditorId(activity.id)
                            focusInput(activity.id)
                          }}
                          onRemove={remove}
                          onEvidence={setEvidenceId}
                        />
                      ) : (
                        <ActivityEditor
                          key={activity.id}
                          activity={activity}
                          value={drafts[activity.id] ?? ''}
                          error={errors[activity.id]}
                          result={result}
                          totalEmissions={summary.totalEmissions}
                          active={activeEditorId === activity.id}
                          inputRef={(element) => { inputRefs.current[activity.id] = element }}
                          onFocus={() => setActiveEditorId(activity.id)}
                          onChange={update}
                          onDone={finishEditing}
                          onRemove={remove}
                          onEvidence={setEvidenceId}
                        />
                      )
                    })}
              </section>
              {evidenceActivity ? (
                <EvidencePane activity={evidenceActivity} quantity={inputs[evidenceActivity.id]} close={closeEvidence} />
              ) : (
                <ResultPanel
                  summary={summary}
                  additionalGrams={scenarioGrams}
                  benchmarkKey={benchmarkKey}
                  setBenchmarkKey={setBenchmarkKey}
                  benchmark={benchmark}
                />
              )}
            </div>
            <details ref={scenarioDetailsRef} className="scenario-disclosure" onToggle={(event) => setScenarioOpen(event.currentTarget.open)}>
              <summary>Add a documented AI scenario</summary>
              {scenarioOpen ? <ScenarioPane onPublishedGrams={setScenarioGrams} /> : null}
            </details>
            {summary.skipped.length ? (
              <DataState title="Inputs not included">Not available, unknown, invalid, or non-positive quantities are not included in the annual total.</DataState>
            ) : null}
          </div>
        </section>
      </div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </div>
  )
}

function ActivityEditor({
  activity,
  value,
  error,
  result,
  totalEmissions,
  active,
  inputRef,
  onFocus,
  onDone,
  onChange,
  onRemove,
  onEvidence,
}: {
  activity: Activity
  value: string
  error?: string
  result?: CalculatorSummary['results'][number]
  totalEmissions: number
  active: boolean
  inputRef: (element: HTMLInputElement | null) => void
  onFocus: () => void
  onDone: (id: string) => void
  onChange: (id: string, value: string) => void
  onRemove: (id: string) => void
  onEvidence: (id: string) => void
}) {
  const alertId = `${activity.id}-quantity-error`
  const contribution = result && totalEmissions > 0 ? (result.emissions / totalEmissions) * 100 : 0
  return (
    <article className={active ? 'activity-editor is-active' : 'activity-editor'}>
      <div className="activity-editor__identity">
        <ActivityMark category={activity.category} activityId={activity.id} size={34} />
        <div>
          <p className="section-kicker">{CATEGORY_INFO[activity.category].name}</p>
          <EvidenceBadge evidence={activity.evidence} />
          <h2>{activity.name}</h2>
          <p>{activity.description}</p>
          <p className="mono">Factor: {activity.emissionFactor} g CO₂e / {abbreviateUnit(activity.unitLabel)}</p>
        </div>
      </div>
      <div className="activity-editor__control">
        <label htmlFor={`${activity.id}-quantity`}>Annual quantity ({abbreviateUnit(activity.unitLabel)})</label>
        <input
          ref={inputRef}
          id={`${activity.id}-quantity`}
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value}
          onFocus={onFocus}
          onChange={(event) => onChange(activity.id, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? alertId : undefined}
        />
        {error ? <p id={alertId} role="alert" className="field-error">{error}</p> : null}
        {result ? (
          <div className="activity-editor__track" aria-label={`${formatEmissions(result.emissions)} contribution to the worksheet total`}>
            <span style={{ width: `${contribution}%`, backgroundColor: CATEGORY_INFO[activity.category].color }} />
          </div>
        ) : null}
        <div className="activity-editor__actions">
          {active && result && !error ? <button type="button" className="action-complete" onClick={() => onDone(activity.id)}>Done</button> : null}
          <button id={`evidence-trigger-${activity.id}`} type="button" onClick={() => onEvidence(activity.id)}>Factor evidence</button>
          <button type="button" onClick={() => onRemove(activity.id)}>Remove</button>
        </div>
        <details className="disclosure activity-editor__evidence">
          <summary>Evidence facts</summary>
          <EvidenceFacts evidence={activity.evidence} unitLabel={activity.unitLabel} />
        </details>
      </div>
    </article>
  )
}

function ActivitySummary({
  activity,
  result,
  summaryRef,
  onEdit,
  onRemove,
  onEvidence,
}: {
  activity: Activity
  result: CalculatorSummary['results'][number]
  summaryRef: (element: HTMLButtonElement | null) => void
  onEdit: () => void
  onRemove: (id: string) => void
  onEvidence: (id: string) => void
}) {
  return (
    <article className="activity-line">
      <button ref={summaryRef} type="button" className="activity-line__summary" onClick={onEdit} aria-label={`${activity.name} summary`}>
        <ActivityMark category={activity.category} activityId={activity.id} size={24} />
        <span>
          <strong>{activity.name}</strong>
          <small>{CATEGORY_INFO[activity.category].name} · {result.quantity.toLocaleString('en-CA')} {abbreviateUnit(result.unitLabel)} × {result.emissionFactor} g / unit</small>
        </span>
        <b>{formatEmissions(result.emissions)}</b>
      </button>
      <EvidenceBadge evidence={activity.evidence} />
      <div className="activity-line__actions">
        <button type="button" onClick={onEdit}>Edit</button>
        <button id={`evidence-trigger-${activity.id}`} type="button" onClick={() => onEvidence(activity.id)}>Factor evidence</button>
        <button type="button" onClick={() => onRemove(activity.id)}>Remove</button>
      </div>
    </article>
  )
}

function ResultPanel({
  summary,
  additionalGrams,
  benchmarkKey,
  setBenchmarkKey,
  benchmark,
}: {
  summary: CalculatorSummary
  additionalGrams: number
  benchmarkKey: string
  setBenchmarkKey: (key: string) => void
  benchmark: Benchmark
}) {
  const categories = Object.entries(summary.byCategory).filter(([, grams]) => grams > 0) as [ActivityCategory, number][]
  const combinedTotal = summary.totalEmissions + additionalGrams
  const percentage = comparisonToBenchmark(combinedTotal, benchmark)
  const hasTotal = summary.results.length > 0 || additionalGrams > 0
  const status = hasTotal
    ? `${formatEmissions(combinedTotal)}/yr.`
    : 'Add a valid annual quantity to see a total.'
  return (
    <aside className="result-composition" aria-label="Worksheet result">
      <p className="section-kicker">Estimate composition</p>
      <h2>{hasTotal ? `${formatEmissions(combinedTotal)}/yr` : 'Add a valid annual quantity'}</h2>
      <p className="result-composition__live" role="status" aria-live="polite">{status}</p>
      {additionalGrams > 0 ? (
        <p className="equation">Includes a published AI scenario: {formatEmissions(additionalGrams)}/yr.</p>
      ) : null}
      {categories.length ? (
        <>
          <div className="composition-bar" aria-label="Category contribution">
            {categories.map(([category, grams]) => (
              <span
                key={category}
                style={{ width: `${(grams / summary.totalEmissions) * 100}%`, background: CATEGORY_INFO[category].color }}
                title={`${CATEGORY_INFO[category].name}: ${formatEmissions(grams)}`}
              />
            ))}
          </div>
          <ul className="category-composition" aria-label="Emissions by category">
            {categories.map(([category, grams]) => (
              <li key={category}><span>{CATEGORY_INFO[category].name}</span><strong>{formatEmissions(grams)}</strong></li>
            ))}
          </ul>
        </>
      ) : <div className="empty-ruled-field">No published quantity is included yet.</div>}
      <label className="benchmark-selector">
        Comparison basis
        <select value={benchmarkKey} onChange={(event) => setBenchmarkKey(event.target.value)}>
          {getBenchmarkOptions().map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
      <ImpactComposition summary={summary} categoryInfo={CATEGORY_INFO} />
      {hasTotal ? (
        <>
          <p>
            <strong>Selected activities</strong> versus <strong>{benchmark.label} ({benchmark.year ?? 'Not specified'})</strong>:{' '}
            {percentage.toFixed(1)}% of this scale. {benchmark.accountingBasis}/production-based, excluding LULUCF.
          </p>
          <BenchmarkContext benchmark={benchmark} percentage={percentage} totalEmissions={combinedTotal} />
        </>
      ) : null}
    </aside>
  )
}
