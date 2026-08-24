'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { ScenarioEvidence } from '@/components/calculator/AiScenarioPicker'
import { DataState, EvidenceBadge, Eyebrow, FactorRecordDetails } from '@/components/content'
import { CATEGORY_INFO, getActivityById, resolveScenarioById, formatEmissions } from '@/lib/calculator'
import { calculateRoutineWorksheet, decodeRoutineWorksheet, ROUTINE_STORAGE_KEY, type WorksheetResult } from '@/lib/routines'
import type { Activity as VisualizationActivity, DataUniverseProps } from '@/components/viz/DataUniverse'

type DataUniverseComponent = ComponentType<DataUniverseProps>

export default function ThreeDVisualizationPage() {
  const [results, setResults] = useState<WorksheetResult[]>([])
  const [totalEmissionsKg, setTotalEmissionsKg] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canUseWebGl, setCanUseWebGl] = useState(false)
  const [DataUniverse, setDataUniverse] = useState<DataUniverseComponent | null>(null)

  useEffect(() => {
    try {
      const encoded = localStorage.getItem(ROUTINE_STORAGE_KEY)
      const summary = encoded ? calculateRoutineWorksheet(decodeRoutineWorksheet(encoded)) : calculateRoutineWorksheet([])
      setResults(summary.results)
      setTotalEmissionsKg(summary.totalEmissionsKg)
    } catch {
      localStorage.removeItem(ROUTINE_STORAGE_KEY)
      setResults([])
      setTotalEmissionsKg(0)
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = document.createElement('canvas')
    const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!reducedMotion && webgl) {
      setCanUseWebGl(true)
      import('@/components/viz/DataUniverse').then(({ DataUniverse: Component }) => setDataUniverse(() => Component))
    }
  }, [])

  const visualizationActivities = useMemo<VisualizationActivity[]>(
    () => results.map((result) => ({
      id: result.lineKey,
      name: result.name,
      annualEmissions: result.emissionsKg,
      category: CATEGORY_INFO[result.category].name,
      color: CATEGORY_INFO[result.category].color,
    })),
    [results],
  )
  const selected = selectedId ? results.find((result) => result.lineKey === selectedId) : null

  return (
    <div className="page-shell py-10 sm:py-14">
      <Eyebrow>Optional representation</Eyebrow>
      <h1 className="section-title">A spatial view of the same routine results.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        This route never introduces a new metric. Each sphere represents one already-calculated published activity or AI scenario; estimate and unavailable lines stay in calculator notices and never enter 3-D arithmetic.
      </p>

      {results.length === 0 ? (
        <div className="mt-8">
          <DataState title="No published routine result is stored">
            Complete a routine worksheet first, then return here to view the same published data.{' '}
            <Link className="underline" href="/calculator">Open the routine worksheet</Link>
          </DataState>
        </div>
      ) : (
        <>
          <section className="mt-8 surface-card">
            {canUseWebGl && DataUniverse ? (
              <DataUniverse
                totalEmissions={totalEmissionsKg}
                activities={visualizationActivities}
                onActivityClick={(activity) => setSelectedId(activity.id)}
                enableIntroAnimation={false}
                enableClickToFly={false}
              />
            ) : (
              <DataState title="2D representation in use">
                WebGL is unavailable or reduced motion is requested. The full result table and evidence below provide the same information without a canvas.
              </DataState>
            )}
          </section>

          <section className="mt-6 surface-card">
            <Eyebrow>2D contribution table</Eyebrow>
            <p className="mt-2 text-sm text-foreground-muted">This accessible table is always available, including when the 3D canvas loads.</p>
            <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="2D contribution table">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-[color:var(--surface-border)] text-xs uppercase tracking-wide text-foreground-muted">
                  <tr><th className="pb-3">Routine</th><th className="pb-3">Annual estimate</th><th className="pb-3">Evidence</th><th className="pb-3">Details</th></tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.lineKey} className="border-b border-[color:var(--surface-border)] last:border-0">
                      <td className="py-3 font-semibold text-foreground">{result.name}</td>
                      <td className="py-3 font-mono">{formatEmissions(result.emissions)}</td>
                      <td className="py-3"><ResultEvidence result={result} /></td>
                      <td className="py-3"><button type="button" onClick={() => setSelectedId(result.lineKey)} className="font-semibold text-[color:var(--accent-primary)] underline-offset-2 hover:underline">Inspect evidence</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected ? <ResultEvidencePane result={selected} /> : null}
        </>
      )}
    </div>
  )
}

function ResultEvidence({ result }: { result: WorksheetResult }) {
  if (result.source === 'activity') {
    const activity = getActivityById(result.sourceId)
    return activity ? <EvidenceBadge evidence={activity.evidence} /> : <span>Published</span>
  }
  const resolution = resolveScenarioById(result.sourceId)
  return resolution.status === 'unavailable' ? <span>Unavailable</span> : <span>{resolution.status === 'published' ? 'Published scenario' : 'Estimate'}</span>
}

function ResultEvidencePane({ result }: { result: WorksheetResult }) {
  if (result.source === 'activity') {
    const activity = getActivityById(result.sourceId)
    if (!activity) return null
    return (
      <section className="mt-6 surface-card" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">{result.name}</h2>
          <EvidenceBadge evidence={activity.evidence} />
        </div>
        <FactorRecordDetails
          description={activity.description}
          unitDefinition={activity.unitDefinition}
          notes={activity.notes}
          unitLabel={result.unitLabel}
          emissionFactor={result.emissionFactor}
          evidence={activity.evidence}
          quantity={result.quantity}
        />
      </section>
    )
  }

  const resolution = resolveScenarioById(result.sourceId)
  return (
    <section className="mt-6 surface-card" aria-live="polite">
      <h2 className="text-xl font-semibold text-foreground">{result.name}</h2>
      {resolution.status === 'unavailable' ? (
        <DataState title="Unavailable" tone="warning">{resolution.reason}</DataState>
      ) : (
        <>
          <DataState title="Published AI scenario">Exact scenario evidence and factor details.</DataState>
          <ScenarioEvidence scenario={resolution.scenario} />
        </>
      )}
    </section>
  )
}
