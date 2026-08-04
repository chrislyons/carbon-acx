'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SourceList } from '@/components/content/SourceList'
import { calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

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

  return <section className="trace-estimate ruled-section" aria-labelledby="trace-title">
    <div className="trace-estimate__lead">
      <p className="section-kicker">Trace one number</p>
      <h1 id="trace-title">What does one year of driving look like in carbon terms?</h1>
      <p>Start with a distance. Carbon ACX keeps the quantity, factor, boundary, and sources together.</p>
      <label className="quantity-field" htmlFor="trace-distance"><span>Annual distance</span><input id="trace-distance" inputMode="decimal" value={value} onChange={(event) => update(event.target.value)} aria-invalid={invalid} aria-describedby={invalid ? 'trace-distance-error' : undefined} /><span>kilometres</span></label>
      {invalid ? <p id="trace-distance-error" role="alert" className="field-error">Enter a positive annual distance.</p> : null}
      <p className="equation" aria-live="polite"><strong>{new Intl.NumberFormat('en-CA').format(quantity)} kilometres</strong> × <strong>{activity.emissionFactor} g CO₂e / kilometre</strong> = <strong>{formatEmissions(result.emissions)}/year</strong></p>
      <p className="trace-takeaway">{new Intl.NumberFormat('en-CA').format(quantity)} km by car → {formatEmissions(result.emissions)}/year</p>
      <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [activity.id]: quantity })}`}>Continue with this estimate</Link>
    </div>
    <aside className="evidence-rail" aria-label="Factor evidence">
      <p className="section-kicker">What this number means</p>
      <dl><div><dt>Factor</dt><dd>{activity.emissionFactor} g CO₂e / kilometre</dd></div><div><dt>Scope</dt><dd>{activity.evidence.scopeBoundary}</dd></div><div><dt>Region</dt><dd>{activity.evidence.region}</dd></div><div><dt>GWP horizon</dt><dd>{activity.evidence.gwpHorizon}</dd></div><div><dt>Vintage</dt><dd>{activity.evidence.vintageYear}</dd></div><div><dt>Uncertainty</dt><dd>{activity.evidence.uncertainty.lowGPerUnit == null ? 'Not quantified' : `${activity.evidence.uncertainty.lowGPerUnit}–${activity.evidence.uncertainty.highGPerUnit} g CO₂e / kilometre`}</dd></div><div><dt>Factor ID</dt><dd className="mono">{activity.evidence.emissionFactorId}</dd></div></dl>
      <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
    </aside>
  </section>
}
