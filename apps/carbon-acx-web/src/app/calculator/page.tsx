'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScenarioEvidence } from '@/components/calculator/AiScenarioPicker'
import { RoutineWorksheet } from '@/components/calculator/RoutineWorksheet'
import { DataState, EvidenceBadge, FactorRecordDetails } from '@/components/content'
import {
  CATEGORY_INFO,
  DEFAULT_BENCHMARK_KEY,
  comparisonToBenchmark,
  formatEmissions,
  getActivityById,
  getBenchmark,
  getBenchmarkOptions,
  resolveScenarioById,
} from '@/lib/calculator'
import type { ActivityCategory, Benchmark } from '@/lib/calculator'
import {
  calculateRoutineWorksheet,
  decodeRoutineWorksheet,
  encodeRoutineWorksheet,
  ROUTINE_STORAGE_KEY,
  deriveRoutineLine,
} from '@/lib/routines'
import type { RoutineLine, WorksheetSummary } from '@/lib/routines'
import { toRoutineImpactSummary } from '@/lib/visualization'
import type { ImpactSummary } from '@/lib/visualization'

const ImpactComposition = dynamic(
  () => import('@/components/viz/ImpactComposition').then((mod) => mod.ImpactComposition),
  {
    loading: () => (
      <div className="empty-ruled-field" aria-live="polite">
        Loading full composition…
      </div>
    ),
  },
)

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="page-shell py-12">Loading routine worksheet…</div>}>
      <CalculatorContent />
    </Suspense>
  )
}

function CalculatorContent() {
  const searchParams = useSearchParams()
  const [lines, setLines] = useState<RoutineLine[]>([])
  const [previewLines, setPreviewLines] = useState<RoutineLine[]>([])
  const [loaded, setLoaded] = useState(false)
  const [shared, setShared] = useState(false)
  const [benchmarkKey, setBenchmarkKey] = useState(DEFAULT_BENCHMARK_KEY)
  const [evidenceLine, setEvidenceLine] = useState<RoutineLine | null>(null)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const evidenceRestoreKey = useRef<string | null>(null)

  useEffect(() => {
    const encoded = searchParams.get('data')
    let loadedLines: RoutineLine[] = []
    if (encoded) {
      loadedLines = decodeRoutineWorksheet(encoded)
      setShared(true)
    } else {
      try {
        const stored = localStorage.getItem(ROUTINE_STORAGE_KEY)
        loadedLines = stored ? decodeRoutineWorksheet(stored) : []
      } catch {
        loadedLines = []
      }
      setShared(false)
    }
    setLines(loadedLines)
    setPreviewLines(loadedLines)
    setLoaded(true)
  }, [searchParams])

  useEffect(() => {
    if (!loaded) return
    if (lines.length) localStorage.setItem(ROUTINE_STORAGE_KEY, encodeRoutineWorksheet(lines))
    else localStorage.removeItem(ROUTINE_STORAGE_KEY)
  }, [lines, loaded])

  useEffect(() => {
    if (evidenceLine || !evidenceRestoreKey.current) return
    const triggerKey = evidenceRestoreKey.current
    evidenceRestoreKey.current = null
    document.getElementById(`evidence-trigger-${triggerKey}`)?.focus()
  }, [evidenceLine])

  const summary = useMemo(() => calculateRoutineWorksheet(previewLines), [previewLines])
  const impactSummary = useMemo(() => toRoutineImpactSummary(summary), [summary])
  const benchmark = getBenchmark(benchmarkKey) ?? getBenchmark(DEFAULT_BENCHMARK_KEY)!

  const announce = useCallback((message: string) => setAnnouncement(message), [])
  const updateLines = useCallback((nextLines: RoutineLine[]) => {
    setLines(nextLines)
  }, [])
  const updatePreview = useCallback((nextLines: RoutineLine[]) => {
    setPreviewLines(nextLines)
  }, [])
  const openEvidence = useCallback((line: RoutineLine) => {
    setEvidenceLine(line)
  }, [])
  const closeEvidence = useCallback(() => {
    if (evidenceLine) evidenceRestoreKey.current = evidenceLine.key
    setEvidenceLine(null)
  }, [evidenceLine])

  const copyLink = useCallback(async () => {
    const encoded = encodeRoutineWorksheet(lines)
    const url = `${window.location.origin}/calculator?data=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setAnnouncement('Worksheet link copied.')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setAnnouncement('Copy failed. The worksheet remains available in this browser.')
    }
  }, [lines])

  const clearWorksheet = useCallback(() => {
    setLines([])
    setPreviewLines([])
    setEvidenceLine(null)
    setShared(false)
    localStorage.removeItem(ROUTINE_STORAGE_KEY)
    setAnnouncement('Worksheet cleared. Choose a routine to begin.')
  }, [])

  return (
    <div className="editorial-page worksheet">
      {shared ? (
        <DataState title="Shared worksheet">
          Imported routines remain editable. Estimate and unavailable evidence lines are retained but excluded from arithmetic.
        </DataState>
      ) : null}
      <header className="ruled-section worksheet__intro">
        <p className="section-kicker">Routine worksheet</p>
        <h1 className="route-hero-title">Trace the patterns you already know.</h1>
        <p>Choose a familiar extent and cadence. The worksheet derives the annual quantity, keeps the factor provenance beside it, and never invents missing evidence.</p>
      </header>
      <div className="routine-layout">
        <RoutineWorksheet
          lines={lines}
          benchmarkLabel={benchmark.label}
          onLinesChange={updateLines}
          onPreviewLines={updatePreview}
          onEvidence={openEvidence}
          onAnnouncement={announce}
        />
        <ResultPanel
          summary={summary}
          impactSummary={impactSummary}
          benchmark={benchmark}
          benchmarkKey={benchmarkKey}
          setBenchmarkKey={setBenchmarkKey}
        />
      </div>
      {evidenceLine ? <EvidencePane line={evidenceLine} close={closeEvidence} /> : null}
      <footer className="worksheet__actions">
        <button type="button" onClick={clearWorksheet}>Clear worksheet</button>
        <button type="button" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
      </footer>
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </div>
  )
}

function ResultPanel({
  summary,
  impactSummary,
  benchmark,
  benchmarkKey,
  setBenchmarkKey,
}: {
  summary: WorksheetSummary
  impactSummary: ImpactSummary
  benchmark: Benchmark
  benchmarkKey: string
  setBenchmarkKey: (key: string) => void
}) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [compositionOpen, setCompositionOpen] = useState(false)
  const categories = (Object.keys(CATEGORY_INFO) as ActivityCategory[])
    .map((category) => [category, summary.byCategory[category]] as const)
    .filter(([, grams]) => grams > 0)
  const hasTotal = summary.totalEmissions > 0 || summary.results.some((result) => result.emissions === 0)
  const percentage = comparisonToBenchmark(summary.totalEmissions, benchmark)

  return (
    <aside className="result-composition routine-summary" aria-label="Worksheet result">
      <p className="section-kicker">Live worksheet result</p>
      <h2>{hasTotal ? `${formatEmissions(summary.totalEmissions)}/year` : 'Add a valid routine'}</h2>
      <p className="result-composition__live" role="status" aria-live="polite">
        {hasTotal ? `${formatEmissions(summary.totalEmissions)} per year from published factors.` : 'Your last saved total stays unchanged while an incomplete line is edited.'}
      </p>
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
          <li key={category}><span>{CATEGORY_INFO[category].name}</span><strong>{formatEmissions(grams)}</strong></li>
        ))}
      </ul>
      {summary.notices.length ? (
        <ul className="routine-summary__notices" aria-label="Worksheet notices">
          {summary.notices.map((notice) => (
            <li key={notice.lineKey} className={`routine-summary__notice routine-summary__notice--${notice.status}`}>
              <strong>{notice.status}</strong> {notice.message}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="routine-summary__benchmark">
        This worksheet is {percentage.toFixed(1)}% of {benchmark.label} ({benchmark.year ?? 'current'}), a context-only territorial production scale.
      </p>
      <button type="button" className="routine-summary__toggle" aria-expanded={comparisonOpen} onClick={() => setComparisonOpen((open) => !open)}>
        {comparisonOpen ? 'Hide comparison basis' : 'Change comparison basis'}
      </button>
      {comparisonOpen ? (
        <label className="routine-select-field" htmlFor="comparison-basis">
          Comparison basis
          <select id="comparison-basis" value={benchmarkKey} onChange={(event) => setBenchmarkKey(event.target.value)}>
            {getBenchmarkOptions().map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
      <button type="button" className="routine-summary__toggle" aria-expanded={compositionOpen} onClick={() => setCompositionOpen((open) => !open)}>
        {compositionOpen ? 'Hide full composition' : 'See full composition'}
      </button>
      {compositionOpen ? <ImpactComposition summary={impactSummary} categoryInfo={CATEGORY_INFO} /> : null}
    </aside>
  )
}

function EvidencePane({ line, close }: { line: RoutineLine; close: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (line.source === 'activity') {
    const activity = getActivityById(line.activityId)
    if (!activity) return null
    const quantity = deriveRoutineLine(line).quantity ?? undefined
    return (
      <aside className="detail-pane" aria-label={`${activity.name} factor evidence`}>
        <button type="button" onClick={close}>Close evidence</button>
        <p className="section-kicker">Factor evidence</p>
        <EvidenceBadge evidence={activity.evidence} />
        <h2 ref={headingRef} id={`evidence-heading-${line.key}`} tabIndex={-1}>{activity.name}</h2>
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

  const resolution = resolveScenarioById(line.scenarioId)
  return (
    <aside className="detail-pane" aria-label={`${line.scenarioId} scenario evidence`}>
      <button type="button" onClick={close}>Close evidence</button>
      <p className="section-kicker">Scenario evidence</p>
      <h2 ref={headingRef} id={`evidence-heading-${line.key}`} tabIndex={-1}>{line.scenarioId}</h2>
      {resolution.status === 'unavailable' ? (
        <DataState title="Unavailable" tone="warning">{resolution.reason}</DataState>
      ) : (
        <>
          <DataState title={resolution.status === 'published' ? 'Published scenario' : 'Estimate — evidence only'} tone={resolution.status === 'estimate' ? 'warning' : 'default'} badge={resolution.status === 'estimate' ? 'estimate' : undefined}>
            <p>{resolution.status === 'published' ? 'This exact scenario may enter the worksheet total.' : 'This estimate remains visible for evidence and is excluded from arithmetic.'}</p>
          </DataState>
          <ScenarioEvidence scenario={resolution.scenario} />
        </>
      )}
    </aside>
  )
}
