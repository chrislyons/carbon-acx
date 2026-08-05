'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { BenchmarkContext, DataState, FactorRecordDetails } from '@/components/content'
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

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="page-shell py-12">Loading annual worksheet…</div>}>
      <CalculatorContent />
    </Suspense>
  )
}

function CalculatorContent() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<ActivityCategory | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const [benchmarkKey, setBenchmarkKey] = useState(DEFAULT_BENCHMARK_KEY)
  const [shared, setShared] = useState(false)
  const [copied, setCopied] = useState(false)

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
  const add = (activity: Activity) => {
    setSelectedIds((ids) => (ids.includes(activity.id) ? ids : [...ids, activity.id]))
    setDrafts((current) => ({ ...current, [activity.id]: current[activity.id] ?? '' }))
  }
  const remove = (id: string) => {
    setSelectedIds((ids) => ids.filter((value) => value !== id))
    setInputs(({ [id]: _, ...rest }) => rest)
    setDrafts(({ [id]: _, ...rest }) => rest)
    setErrors(({ [id]: _, ...rest }) => rest)
    if (evidenceId === id) setEvidenceId(null)
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
    localStorage.removeItem(STORAGE_KEY)
  }
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/calculator?data=${encodeCalculatorInputs(inputs)}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  const selected = selectedIds.map(getActivityById).filter((activity): activity is Activity => Boolean(activity))

  return (
    <div className="editorial-page worksheet">
      {shared ? <DataState title="Shared worksheet">Shared worksheet. These annual quantities remain editable.</DataState> : null}
      <header className="ruled-section worksheet__intro">
        <p className="section-kicker">Annual activity worksheet</p>
        <h1>Build one understandable estimate.</h1>
        <p>This is not a verified personal inventory. It is a transparent estimate from published activity factors.</p>
      </header>
      <section className="worksheet__groups" aria-label="Activity categories">
        {(Object.keys(CATEGORY_INFO) as ActivityCategory[]).map((category) => (
          <button
            key={category}
            className={activeCategory === category ? 'category-button is-selected' : 'category-button'}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            <ActivityMark category={category} />
            <span>{CATEGORY_INFO[category].name}</span>
            <small>{getActivitiesByCategory(category).length} activities</small>
          </button>
        ))}
      </section>
      {activeCategory ? (
        <section className="activity-picker ruled-section" aria-labelledby="picker-title">
          <div>
            <p className="section-kicker">Choose a published activity</p>
            <h2 id="picker-title">{CATEGORY_INFO[activeCategory].name}</h2>
          </div>
          <div className="activity-picker__list">
            {getActivitiesByCategory(activeCategory).map((activity) => (
              <article key={activity.id}>
                <h3>{activity.name}</h3>
                <p>{activity.description}</p>
                <p className="mono">{activity.emissionFactor} g CO₂e / {activity.unitLabel}</p>
                <button className="text-link" onClick={() => add(activity)}>Add {activity.name}</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="worksheet__body">
        <section className="worksheet__editors" aria-label="Selected activities">
          {selected.length === 0
            ? <div className="empty-ruled-field">Choose a category, then add an activity to begin.</div>
            : selected.map((activity) => (
                <ActivityEditor
                  key={activity.id}
                  activity={activity}
                  value={drafts[activity.id] ?? ''}
                  error={errors[activity.id]}
                  onChange={update}
                  onRemove={remove}
                  onEvidence={setEvidenceId}
                />
              ))}
        </section>
        <ResultComposition
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
          close={() => setEvidenceId(null)}
        />
      ) : null}
      {summary.skipped.length ? (
        <DataState title="Inputs not included">Unavailable, unknown, invalid, or non-positive quantities are not included in the annual total.</DataState>
      ) : null}
      <footer className="worksheet__actions">
        <button onClick={reset}>Clear worksheet</button>
        <button onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
      </footer>
    </div>
  )
}

function ActivityEditor({
  activity,
  value,
  error,
  onChange,
  onRemove,
  onEvidence,
}: {
  activity: Activity
  value: string
  error?: string
  onChange: (id: string, value: string) => void
  onRemove: (id: string) => void
  onEvidence: (id: string) => void
}) {
  const alertId = `${activity.id}-quantity-error`
  return (
    <article className="activity-editor">
      <div>
        <p className="section-kicker">{CATEGORY_INFO[activity.category].name}</p>
        <h2>{activity.name}</h2>
        <p>{activity.description}</p>
        <p className="mono">Factor: {activity.emissionFactor} g CO₂e / {activity.unitLabel}</p>
      </div>
      <div className="activity-editor__control">
        <label htmlFor={`${activity.id}-quantity`}>Annual quantity ({activity.unitLabel})</label>
        <input
          id={`${activity.id}-quantity`}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(activity.id, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? alertId : undefined}
        />
        {error ? <p id={alertId} role="alert" className="field-error">{error}</p> : null}
        <div className="activity-editor__actions">
          <button className="text-link" onClick={() => onEvidence(activity.id)}>Factor evidence</button>
          <button className="text-link" onClick={() => onRemove(activity.id)}>Remove</button>
        </div>
      </div>
    </article>
  )
}

function ResultComposition({
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
  return (
    <aside className="result-composition" aria-live="polite">
      <p className="section-kicker">Selected activities</p>
      <h2>{summary.results.length > 0 ? `${formatEmissions(summary.totalEmissions)}/year` : 'Add a valid annual quantity'}</h2>
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
      {summary.results.length > 0 ? (
        <>
          <p>
            <strong>Selected activities</strong> versus <strong>{benchmark.label} ({benchmark.year ?? 'Not specified'})</strong>:{' '}
            {percentage.toFixed(1)}% of this scale. {benchmark.accountingBasis}/production-based, excluding LULUCF.
          </p>
          <BenchmarkContext benchmark={benchmark} percentage={percentage} />
        </>
      ) : null}
      {evidenceId ? <p className="section-kicker">Evidence detail open</p> : null}
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
  return (
    <aside className="detail-pane" aria-label={`${activity.name} factor evidence`}>
      <button onClick={close}>Close evidence</button>
      <p className="section-kicker">Factor evidence</p>
      <h2>{activity.name}</h2>
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
