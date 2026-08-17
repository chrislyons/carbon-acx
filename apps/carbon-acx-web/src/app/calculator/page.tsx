'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { ActivityShelf } from '@/components/calculator/ActivityShelf'
import { BenchmarkContext, DataState, EvidenceBadge, FactorRecordDetails } from '@/components/content'
import { ImpactComposition } from '@/components/viz/ImpactComposition'
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
  type Activity,
  type ActivityCategory,
  type Benchmark,
  type CalculatorSummary,
} from '@/lib/calculator'

const STORAGE_KEY = 'carbon-acx-calculator-inputs'
const CATEGORIES = Object.keys(CATEGORY_INFO) as ActivityCategory[]

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="page-shell py-12">Loading annual worksheet…</div>}>
      <CalculatorContent />
    </Suspense>
  )
}

function CalculatorContent() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('transport')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const evidenceRestoreId = useRef<string | null>(null)
  const [benchmarkKey, setBenchmarkKey] = useState(DEFAULT_BENCHMARK_KEY)
  const [shared, setShared] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (evidenceId || !evidenceRestoreId.current) return
    const triggerId = evidenceRestoreId.current
    evidenceRestoreId.current = null
    document.getElementById(`evidence-trigger-${triggerId}`)?.focus()
  }, [evidenceId])

  useEffect(() => {
    const encoded = searchParams.get('data')
    const rawInputs: Record<string, unknown> = encoded
      ? decodeCalculatorInputs(encoded)
      : (() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, unknown>
          } catch {
            return {}
          }
        })()
    const published = Object.fromEntries(
      Object.entries(rawInputs).filter(
        ([id, value]) => getActivityById(id) && typeof value === 'number' && Number.isFinite(value) && value > 0,
      ),
    ) as Record<string, number>
    setInputs(published)
    setDrafts(Object.fromEntries(Object.entries(published).map(([id, value]) => [id, String(value)])))
    setSelectedIds(Object.keys(published))
    setShared(Boolean(encoded))
  }, [searchParams])

  useEffect(() => {
    const safe = Object.fromEntries(
      Object.entries(inputs).filter(
        ([id, value]) => getActivityById(id) && Number.isFinite(value) && value > 0,
      ),
    )
    if (Object.keys(safe).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
    else localStorage.removeItem(STORAGE_KEY)
  }, [inputs])

  const summary = useMemo(
    () => calculateEmissions(Object.entries(inputs).map(([activityId, quantity]) => ({ activityId, quantity }))),
    [inputs],
  )
  const benchmark = getBenchmark(benchmarkKey) ?? getBenchmark(DEFAULT_BENCHMARK_KEY)!
  const selected = selectedIds.map(getActivityById).filter((activity): activity is Activity => Boolean(activity))
  const activities = getActivitiesByCategory(activeCategory)

  const add = (activity: Activity) => {
    if (selectedIds.includes(activity.id)) {
      setAnnouncement(`${activity.name} is already in your activity basket.`)
      return
    }
    setSelectedIds((ids) => [...ids, activity.id])
    setDrafts((current) => ({ ...current, [activity.id]: current[activity.id] ?? '' }))
    setAnnouncement(`${activity.name} added to your activity basket.`)
  }
  const remove = (id: string) => {
    const activity = getActivityById(id)
    setSelectedIds((ids) => ids.filter((value) => value !== id))
    setInputs(({ [id]: _, ...rest }) => rest)
    setDrafts(({ [id]: _, ...rest }) => rest)
    setErrors(({ [id]: _, ...rest }) => rest)
    if (evidenceId === id) setEvidenceId(null)
    if (activity) setAnnouncement(`${activity.name} removed from your activity basket.`)
  }
  const update = (id: string, raw: string) => {
    setDrafts((current) => ({ ...current, [id]: raw }))
    if (raw.trim() === '') {
      setInputs(({ [id]: _, ...rest }) => rest)
      setErrors(({ [id]: _, ...rest }) => rest)
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
  const reset = () => {
    setSelectedIds([])
    setInputs({})
    setDrafts({})
    setErrors({})
    setEvidenceId(null)
    setAnnouncement('Activity basket cleared.')
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
    <div className="editorial-page worksheet">
      {shared ? <DataState title="Shared worksheet">Shared worksheet. These annual quantities remain editable.</DataState> : null}
      <header className="ruled-section worksheet__intro">
        <p className="section-kicker">Annual activity worksheet</p>
        <h1>Build one understandable estimate.</h1>
        <p>This is not a verified personal inventory. It is a transparent estimate from published activity factors.</p>
      </header>
      <nav className="worksheet__groups" aria-label="Activity categories">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'category-button is-selected' : 'category-button'}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            <ActivityMark category={category} size={22} />
            <span>{CATEGORY_INFO[category].name}</span>
            <small>{getActivitiesByCategory(category).length} activities</small>
          </button>
        ))}
      </nav>
      <ActivityShelf category={activeCategory} activities={activities} selectedIds={selectedIds} onAdd={add} />
      <div className="basket-header ruled-section">
        <div>
          <p className="section-kicker">Selected activities</p>
          <h2>Your activity basket <span>({selected.length})</span></h2>
        </div>
        <CategoryTally selectedIds={selectedIds} />
      </div>
      <div className="worksheet__body">
        <section className="worksheet__editors" aria-label="Selected activities">
          {selected.length === 0
            ? <div className="empty-ruled-field">Your activity basket is empty. Choose an activity above to start comparing.</div>
            : selected.map((activity) => (
                <ActivityEditor
                  key={activity.id}
                  activity={activity}
                  value={drafts[activity.id] ?? ''}
                  error={errors[activity.id]}
                  result={summary.results.find((result) => result.activityId === activity.id)}
                  totalEmissions={summary.totalEmissions}
                  onChange={update}
                  onRemove={remove}
                  onEvidence={setEvidenceId}
                />
              ))}
        </section>
        <ResultPanel
          summary={summary}
          benchmarkKey={benchmarkKey}
          setBenchmarkKey={setBenchmarkKey}
          benchmark={benchmark}
          evidenceId={evidenceId}
        />
      </div>
      {evidenceId ? (
        <EvidencePane
          activity={getActivityById(evidenceId)!}
          quantity={inputs[evidenceId]}
          close={closeEvidence}
        />
      ) : null}
      {summary.skipped.length ? (
        <DataState title="Inputs not included">Unavailable, unknown, invalid, or non-positive quantities are not included in the annual total.</DataState>
      ) : null}
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <footer className="worksheet__actions">
        <button type="button" onClick={reset}>Clear worksheet</button>
        <button type="button" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
      </footer>
    </div>
  )
}

function CategoryTally({ selectedIds }: { selectedIds: string[] }) {
  const represented = CATEGORIES.filter((category) => selectedIds.some((id) => getActivityById(id)?.category === category))
  const label = represented.length ? represented.map((category) => CATEGORY_INFO[category].name).join(', ') : 'none'
  return (
    <div className="category-tally" role="img" aria-label={`Categories in basket: ${label}`}>
      {CATEGORIES.map((category) => {
        const isRepresented = represented.includes(category)
        return (
          <span
            key={category}
            className={isRepresented ? 'category-tally__item is-selected' : 'category-tally__item'}
            style={isRepresented ? { color: CATEGORY_INFO[category].color } : undefined}
            title={CATEGORY_INFO[category].name}
          >
            <ActivityMark category={category} size={26} />
          </span>
        )
      })}
    </div>
  )
}

function ActivityEditor({
  activity,
  value,
  error,
  result,
  totalEmissions,
  onChange,
  onRemove,
  onEvidence,
}: {
  activity: Activity
  value: string
  error?: string
  result?: CalculatorSummary['results'][number]
  totalEmissions: number
  onChange: (id: string, value: string) => void
  onRemove: (id: string) => void
  onEvidence: (id: string) => void
}) {
  const alertId = `${activity.id}-quantity-error`
  const contribution = result && totalEmissions > 0 ? (result.emissions / totalEmissions) * 100 : 0
  return (
    <article className="activity-editor">
      <div className="activity-editor__identity">
        <ActivityMark category={activity.category} activityId={activity.id} size={34} />
        <div>
          <p className="section-kicker">{CATEGORY_INFO[activity.category].name}</p>
          <EvidenceBadge evidence={activity.evidence} />
          <h2>{activity.name}</h2>
          <p>{activity.description}</p>
          <p className="mono">Factor: {activity.emissionFactor} g CO₂e / {activity.unitLabel}</p>
        </div>
      </div>
      <div className="activity-editor__control">
        <label htmlFor={`${activity.id}-quantity`}>Annual quantity ({activity.unitLabel})</label>
        <input
          id={`${activity.id}-quantity`}
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value}
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
          <button id={`evidence-trigger-${activity.id}`} type="button" onClick={() => onEvidence(activity.id)}>Factor evidence</button>
          <button type="button" onClick={() => onRemove(activity.id)}>Remove</button>
        </div>
      </div>
    </article>
  )
}

function ResultPanel({
  summary,
  benchmarkKey,
  setBenchmarkKey,
  benchmark,
  evidenceId,
}: {
  summary: CalculatorSummary
  benchmarkKey: string
  setBenchmarkKey: (key: string) => void
  benchmark: Benchmark
  evidenceId: string | null
}) {
  const categories = Object.entries(summary.byCategory).filter(([, grams]) => grams > 0) as [ActivityCategory, number][]
  const percentage = comparisonToBenchmark(summary.totalEmissions, benchmark)
  const status = summary.results.length > 0
    ? `${formatEmissions(summary.totalEmissions)} per year.`
    : 'Add a valid annual quantity to see a total.'
  return (
    <aside className="result-composition" aria-label="Worksheet result">
      <p className="section-kicker">Worksheet total</p>
      <h2>{summary.results.length > 0 ? `${formatEmissions(summary.totalEmissions)}/year` : 'Add a valid annual quantity'}</h2>
      <p className="result-composition__live" role="status" aria-live="polite">{evidenceId ? `${status} Evidence detail open.` : status}</p>
      {categories.length ? (
        <div className="composition-bar" aria-label="Category contribution">
          {categories.map(([category, grams]) => (
            <span
              key={category}
              style={{ width: `${(grams / summary.totalEmissions) * 100}%`, background: CATEGORY_INFO[category].color }}
              title={`${CATEGORY_INFO[category].name}: ${formatEmissions(grams)}`}
            />
          ))}
        </div>
      ) : <div className="empty-ruled-field">No published quantity is included yet.</div>}
      <ul className="compact-reference-list">
        {categories.map(([category, grams]) => (
          <li key={category}>{CATEGORY_INFO[category].name}<strong>{formatEmissions(grams)}</strong></li>
        ))}
      </ul>
      {summary.results.map((result) => (
        <p className="equation" key={result.activityId}>
          {result.quantity} {result.unitLabel} × {result.emissionFactor} g CO₂e / {result.unitLabel} = {formatEmissions(result.emissions)}
        </p>
      ))}
      <label>
        Comparison basis
        <select value={benchmarkKey} onChange={(event) => setBenchmarkKey(event.target.value)}>
          {getBenchmarkOptions().map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
      <ImpactComposition summary={summary} categoryInfo={CATEGORY_INFO} />
      {summary.results.length > 0 ? (
        <>
          <p>
            <strong>Selected activities</strong> versus <strong>{benchmark.label} ({benchmark.year ?? 'Not specified'})</strong>:{' '}
            {percentage.toFixed(1)}% of this scale. {benchmark.accountingBasis}/production-based, excluding LULUCF.
          </p>
          <BenchmarkContext benchmark={benchmark} percentage={percentage} totalEmissions={summary.totalEmissions} />
        </>
      ) : null}
    </aside>
  )
}

function EvidencePane({
  activity,
  quantity,
  close,
}: {
  activity: Activity
  quantity?: number
  close: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  return (
    <aside className="detail-pane" aria-label={`${activity.name} factor evidence`}>
      <button type="button" onClick={close}>Close evidence</button>
      <p className="section-kicker">Factor evidence</p>
      <EvidenceBadge evidence={activity.evidence} />
      <h2 ref={headingRef} id={`evidence-heading-${activity.id}`} tabIndex={-1}>{activity.name}</h2>
      <FactorRecordDetails
        description={activity.description}
        unitDefinition={activity.unitDefinition}
        notes={activity.notes}
        unitLabel={activity.unitLabel}
        emissionFactor={activity.emissionFactor}
        evidence={activity.evidence}
        quantity={quantity}
      />
    </aside>
  )
}
