'use client'

import Link from 'next/link'
import { useState } from 'react'
import { EvidenceBadge, SourceList } from '@/components/content'
import { ImpactTrace } from '@/components/viz/ImpactTrace'
import { CATEGORY_INFO, calculateEmissions, encodeCalculatorInputs, getActivityById } from '@/lib/calculator'

const activity = getActivityById('TRAN.SCHOOLRUN.CAR.KM')!
const initialQuantity = 1_000

export function TraceEstimate() {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [value, setValue] = useState(String(initialQuantity))
  const [invalid, setInvalid] = useState(false)
  const result = calculateEmissions([{ activityId: activity.id, quantity }]).results[0]!

  function update(next: string) {
    setValue(next)
    const parsed = Number(next)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setQuantity(parsed)
  }

  return (
    <section className="trace-estimate ruled-section" aria-labelledby="trace-title">
      <div className="trace-estimate__lead">
        <p className="section-kicker">Trace one number</p>
        <h1 id="trace-title">What does one year of driving look like in carbon terms?</h1>
        <p>Start with a distance. Carbon ACX keeps the quantity, factor, boundary, and sources together.</p>
        <label className="quantity-field" htmlFor="trace-distance">
          <span>Annual distance</span>
          <input id="trace-distance" type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(event) => update(event.target.value)} aria-invalid={invalid} aria-describedby={invalid ? 'trace-distance-error' : undefined} />
          <span>kilometres</span>
        </label>
        {invalid ? <p id="trace-distance-error" role="alert" className="field-error">Enter a positive annual distance. <span>Showing the last valid amount.</span></p> : null}
        <ImpactTrace quantity={quantity} factor={activity.emissionFactor} unitLabel={activity.unitLabel} emissions={result.emissions} color={CATEGORY_INFO[activity.category].color} />
        <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [activity.id]: quantity })}`}>Continue with this estimate</Link>
      </div>
      <aside className="evidence-rail" aria-label="Factor evidence">
        <p className="section-kicker">What this number means</p>
        <div className="evidence-rail__badges">
          <EvidenceBadge evidence={activity.evidence} />
          <span className="evidence-chip">Region · {activity.evidence.region}</span>
          <span className="evidence-chip">Scope · {activity.evidence.scopeBoundary}</span>
          <span className="evidence-chip">Vintage · {activity.evidence.vintageYear}</span>
          <span className="evidence-chip">Uncertainty · {activity.evidence.uncertainty.lowGPerUnit == null || activity.evidence.uncertainty.highGPerUnit == null ? 'Not quantified' : `${activity.evidence.uncertainty.lowGPerUnit}–${activity.evidence.uncertainty.highGPerUnit} g / ${activity.unitLabel}`}</span>
        </div>
        <p className="evidence-rail__example">Example: 1 of 22 published activities</p>
        <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
      </aside>
    </section>
  )
}
