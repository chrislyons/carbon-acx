'use client'

import dynamic from 'next/dynamic'
import { CircleHelp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { formatEmissions, type ActivityCategory, type CategoryInfo, type CalculatorSummary } from '@/lib/calculator'
import { buildActivityImpactData } from '@/lib/visualization'
import { useContainerWidth } from '@/components/viz/useContainerWidth'

const ImpactFlow = dynamic(
  () => import('@/components/viz/ImpactFlow').then((mod) => mod.ImpactFlow),
  { ssr: false },
)

export function ImpactComposition({
  summary,
  categoryInfo,
}: {
  summary: CalculatorSummary
  categoryInfo: Record<ActivityCategory, CategoryInfo>
}) {
  const ranked = useMemo(() => buildActivityImpactData(summary), [summary])
  const { ref, width } = useContainerWidth<HTMLDivElement>()
  const [flowOpen, setFlowOpen] = useState(false)
  const maxEmissions = Math.max(1, ...ranked.map((item) => item.emissions))
  const flowEligible = width >= 480 && ranked.filter((item) => item.emissions > 0).length >= 2

  return (
    <section className="impact-composition" aria-labelledby="impact-composition-title">
      <div className="impact-composition__heading">
        <div>
          <p className="section-kicker">Contribution view</p>
          <h3 id="impact-composition-title">Ranked activity impacts</h3>
        </div>
      </div>
      {ranked.length ? (
        <ol className="impact-rank" aria-label="Ranked activity impacts">
          {ranked.map((item) => {
            const color = categoryInfo[item.category].color
            const widthPercentage = item.emissions > 0 ? (item.emissions / maxEmissions) * 100 : 0
            const rangeLeft = item.lowEmissions !== null ? (item.lowEmissions / maxEmissions) * 100 : 0
            const rangeWidth = item.lowEmissions !== null && item.highEmissions !== null
              ? Math.max(0, ((item.highEmissions - item.lowEmissions) / maxEmissions) * 100)
              : 0
            return (
              <li key={item.activityId} className="impact-rank__row">
                <div className="impact-rank__label">
                  <ActivityMark category={item.category} activityId={item.activityId} size={24} />
                  <div>
                    <strong>{item.activityName}</strong>
                    <span>{item.quantity.toLocaleString('en-CA')} {item.unitLabel} · {categoryInfo[item.category].name}</span>
                  </div>
                </div>
                <div className="impact-rank__measure">
                  <div className="impact-rank__track" aria-hidden="true">
                    <span className="impact-rank__bar" style={{ width: `${widthPercentage}%`, backgroundColor: color }} />
                    {item.uncertainty === 'bounded' ? (
                      <span
                        className="impact-rank__whisker"
                        style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%`, backgroundColor: color }}
                      />
                    ) : null}
                    {item.emissions === 0 ? <span className="impact-rank__zero-marker" /> : null}
                  </div>
                  <strong>{formatEmissions(item.emissions)}</strong>
                </div>
                <div className="impact-rank__meta">
                  {item.uncertainty === 'bounded' && item.lowEmissions !== null && item.highEmissions !== null ? (
                    <span>Range: {formatEmissions(item.lowEmissions)}–{formatEmissions(item.highEmissions)}</span>
                  ) : (
                    <span><CircleHelp aria-hidden="true" size={15} />Range not quantified</span>
                  )}
                  {item.emissions === 0 ? <span className="impact-rank__zero">Published zero · 0 g CO₂e</span> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="empty-ruled-field">No published quantity is included yet.</p>
      )}
      <div ref={ref} className="impact-flow-disclosure">
        {flowEligible ? (
          <details onToggle={(event) => setFlowOpen(event.currentTarget.open)}>
            <summary>Show activity → category flow</summary>
            {flowOpen ? <ImpactFlow summary={summary} categoryInfo={categoryInfo} /> : null}
          </details>
        ) : null}
      </div>
    </section>
  )
}
