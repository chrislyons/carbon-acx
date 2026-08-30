'use client'

import { Box } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { DataState, EvidenceBadge, Eyebrow, FactorRecordDetails } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { calculateEmissions, CATEGORY_INFO, formatEmissions, getActivityById } from '@/lib/calculator'
import type { Activity as VisualizationActivity, DataUniverseProps } from '@/components/viz/DataUniverse'
import type { CalculatorInput } from '@/lib/calculator'

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
  const status = summary.results.length === 0
    ? 'Empty worksheet'
    : canUseWebGl && DataUniverse ? '3D rendered' : '2D fallback'

  return (
    <div className="page-shell workspace three-d-page">
      <TabHeader
        route="explore"
        title="3D activity lab"
        meta={<span><strong>{status}</strong>{summary.results.length ? ` · ${summary.results.length} records · ${formatEmissions(summary.totalEmissions)}/yr` : ' · complete an annual worksheet'}</span>}
        actions={<Link className="action-link" href="/explore"><Box aria-hidden="true" size={15} />Back to Explore</Link>}
      />

      {summary.results.length === 0 ? (
        <DataState title="No calculated result is stored">
          Complete an annual worksheet first, then return here to view that same published data.{' '}
          <Link className="text-link" href="/calculator">Open worksheet</Link>
        </DataState>
      ) : (
        <>
          <section className="surface-card three-d-page__canvas">
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

          <section className="surface-card three-d-page__table">
            <Eyebrow>2D contribution table</Eyebrow>
            <p className="mt-2 text-sm text-foreground-muted">This accessible table is always available, including when the 3D canvas loads.</p>
            <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="2D contribution table">
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
                      <td className="py-3"><button type="button" onClick={() => setSelectedId(result.activityId)} className="text-link">Inspect evidence</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected ? (
            <section className="surface-card three-d-page__detail" aria-live="polite">
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
