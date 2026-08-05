'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { DataState, EvidenceBadge, Eyebrow, FactorRecordDetails } from '@/components/content'
import { calculateEmissions, CATEGORY_INFO, formatEmissions, getActivityById, type CalculatorInput } from '@/lib/calculator'
import type { Activity as VisualizationActivity, DataUniverseProps } from '@/components/viz/DataUniverse'
const STORAGE_KEY = 'carbon-acx-calculator-inputs'

type DataUniverseComponent = ComponentType<DataUniverseProps>
export default function ThreeDVisualizationPage() {
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canUseWebGl, setCanUseWebGl] = useState(false)
  const [DataUniverse, setDataUniverse] = useState<DataUniverseComponent | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setInputs(JSON.parse(saved))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = document.createElement('canvas')
    const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!reducedMotion && webgl) {
      setCanUseWebGl(true)
      import('@/components/viz/DataUniverse').then(({ DataUniverse: Component }) => setDataUniverse(() => Component))
    }
  }, [])

  const summary = useMemo(() => {
    const calculatorInputs: CalculatorInput[] = Object.entries(inputs).map(([activityId, quantity]) => ({ activityId, quantity }))
    return calculateEmissions(calculatorInputs)
  }, [inputs])
  const visualizationActivities = useMemo<VisualizationActivity[]>(
    () => summary.results.map((result) => ({
      id: result.activityId,
      name: result.activityName,
      annualEmissions: result.emissionsKg,
      category: CATEGORY_INFO[result.category].name,
      color: CATEGORY_INFO[result.category].color,
    })),
    [summary.results],
  )
  const selected = selectedId ? summary.results.find((result) => result.activityId === selectedId) : null
  const selectedActivity = selectedId ? getActivityById(selectedId) : null

  return (
    <div className="page-shell py-10 sm:py-14">
      <Eyebrow>Optional representation</Eyebrow>
      <h1 className="section-title">A spatial view of the same calculated results.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        This route never introduces a new metric. Each sphere represents one already-calculated published result;
        select a sphere to open the same evidence shown in the table below.
      </p>

      {summary.results.length === 0 ? (
        <div className="mt-8">
          <DataState title="No calculated result is stored">
            Complete an annual worksheet first, then return here to view that same published data.{' '}
            <Link className="underline" href="/calculator">Open Estimate</Link>
          </DataState>
        </div>
      ) : (
        <>
          <section className="mt-8 surface-card">
            {canUseWebGl && DataUniverse ? (
              <DataUniverse
                totalEmissions={summary.totalEmissionsKg}
                activities={visualizationActivities}
                onActivityClick={(activity) => setSelectedId(activity.id)}
                enableIntroAnimation={false}
                enableClickToFly={false}
              />
            ) : (
              <DataState title="2D representation in use">
                WebGL is unavailable or reduced motion is requested. The full result table and evidence below provide
                the same information without a canvas.
              </DataState>
            )}
          </section>

          <section className="mt-6 surface-card">
            <Eyebrow>2D contribution table</Eyebrow>
            <p className="mt-2 text-sm text-foreground-muted">This accessible table is always available, including when the 3D canvas loads.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-[color:var(--surface-border)] text-xs uppercase tracking-wide text-foreground-muted">
                  <tr><th className="pb-3">Activity</th><th className="pb-3">Annual estimate</th><th className="pb-3">Evidence</th><th className="pb-3">Details</th></tr>
                </thead>
                <tbody>
                  {summary.results.map((result) => (
                    <tr key={result.activityId} className="border-b border-[color:var(--surface-border)] last:border-0">
                      <td className="py-3 font-semibold text-foreground">{result.activityName}</td>
                      <td className="py-3 font-mono">{formatEmissions(result.emissions)}</td>
                      <td className="py-3"><EvidenceBadge evidence={result.evidence} /></td>
                      <td className="py-3"><button type="button" onClick={() => setSelectedId(result.activityId)} className="font-semibold text-[color:var(--accent-primary)] underline-offset-2 hover:underline">Inspect evidence</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected ? (
            <section className="mt-6 surface-card" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{selected.activityName}</h2>
                <EvidenceBadge evidence={selected.evidence} />
              </div>
              <FactorRecordDetails
                description={selectedActivity?.description ?? selected.activityName}
                unitDefinition={selectedActivity?.unitDefinition ?? ''}
                notes={selectedActivity?.notes ?? ''}
                unitLabel={selected.unitLabel}
                emissionFactor={selected.emissionFactor}
                evidence={selected.evidence}
                quantity={selected.quantity}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
