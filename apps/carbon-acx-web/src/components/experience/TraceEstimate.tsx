'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { EvidenceBadge, SourceList } from '@/components/content'
import { ImpactTrace } from '@/components/viz/ImpactTrace'
import { CATEGORY_INFO, getActivityById, type ActivityCategory } from '@/lib/calculator'
import {
  calculateRoutineWorksheet,
  createActivityLine,
  deriveRoutineLine,
  encodeRoutineWorksheet,
  type RoutineFieldId,
  type RoutineValues,
} from '@/lib/routines'

const MODE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'TRAN.SCHOOLRUN.CAR.KM', label: 'Car' },
  { id: 'TRAN.TTC.SUBWAY.KM', label: 'Subway' },
  { id: 'TRAN.TTC.BUS.KM', label: 'Bus' },
  { id: 'TRAN.SCHOOLRUN.BIKE.KM', label: 'Bicycle' },
]

const INITIAL_VALUES: RoutineValues = {
  oneWayKm: '8',
  legsPerDay: '2',
  travelDaysPerWeek: '5',
  weeksPerYear: '48',
}

export function TraceEstimate() {
  const [activityId, setActivityId] = useState(MODE_OPTIONS[0].id)
  const [values, setValues] = useState<RoutineValues>(INITIAL_VALUES)
  const [calculationValues, setCalculationValues] = useState<RoutineValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<Partial<Record<RoutineFieldId, string>>>({})
  const activity = getActivityById(activityId)!
  const line = useMemo(() => createActivityLine(activityId, calculationValues), [activityId, calculationValues])
  const derivation = useMemo(() => deriveRoutineLine(line), [line])
  const summary = useMemo(() => calculateRoutineWorksheet([line]), [line])
  const result = summary.results[0]
  const quantity = derivation.quantity ?? 0
  const emissions = result?.emissions ?? 0
  function update(fieldId: RoutineFieldId, next: string) {
    setValues((current) => ({ ...current, [fieldId]: next }))
    const parsed = Number(next)
    const error = next.trim() === ''
      ? 'Enter a value.'
      : !Number.isFinite(parsed) || parsed <= 0
        ? 'Enter a positive number.'
        : null
    setErrors((current) => {
      const nextErrors = { ...current }
      if (error) nextErrors[fieldId] = error
      else delete nextErrors[fieldId]
      return nextErrors
    })
    if (!error) {
      setCalculationValues((current) => ({ ...current, [fieldId]: next }))
    }
  }

  const encoded = encodeRoutineWorksheet([line])

  return (
    <section className="trace-estimate trace-estimate--routine" aria-labelledby="trace-title">
      <div className="trace-estimate__lead">
        <p className="section-kicker">Start with a familiar routine</p>
        <h1 id="trace-title" className="route-hero-title route-hero-title--home">What does one school run look like over a year?</h1>
        <p>Use the terms you already know. Carbon ACX derives passenger-kilometres from distance, legs, travel days, and weeks before applying the published factor.</p>
        <div className="trace-routine__modes" role="group" aria-label="Commute mode">
          {MODE_OPTIONS.map((option) => {
            const selected = option.id === activityId
            return (
              <button
                key={option.id}
                type="button"
                className={selected ? 'trace-routine__mode is-selected' : 'trace-routine__mode'}
                aria-pressed={selected}
                onClick={() => setActivityId(option.id)}
              >
                <ActivityMark category="transport" activityId={option.id} size={22} />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
        <div className="trace-routine__fields">
          <label htmlFor="trace-one-way-km">
            One-way distance <span>km/leg</span>
            <input id="trace-one-way-km" type="number" min="0" step="any" inputMode="decimal" value={values.oneWayKm ?? ''} onChange={(event) => update('oneWayKm', event.target.value)} aria-invalid={Boolean(errors.oneWayKm)} />
          </label>
          <label htmlFor="trace-legs-per-day">
            Legs per travel day <span>legs/day</span>
            <input id="trace-legs-per-day" type="number" min="0" step="any" inputMode="decimal" value={values.legsPerDay ?? ''} onChange={(event) => update('legsPerDay', event.target.value)} aria-invalid={Boolean(errors.legsPerDay)} />
          </label>
          <label htmlFor="trace-travel-days">
            Travel days per week <span>days/week</span>
            <input id="trace-travel-days" type="number" min="0" step="any" inputMode="decimal" value={values.travelDaysPerWeek ?? ''} onChange={(event) => update('travelDaysPerWeek', event.target.value)} aria-invalid={Boolean(errors.travelDaysPerWeek)} />
          </label>
          <label htmlFor="trace-weeks-year">
            Weeks per year <span>weeks/year</span>
            <input id="trace-weeks-year" type="number" min="0" step="any" inputMode="decimal" value={values.weeksPerYear ?? ''} onChange={(event) => update('weeksPerYear', event.target.value)} aria-invalid={Boolean(errors.weeksPerYear)} />
          </label>
        </div>
        {Object.values(errors).some(Boolean) ? <p role="alert" className="field-error">Enter positive values for every routine term.</p> : null}
        <p className="trace-routine__quantity" aria-live="polite">
          {quantity.toLocaleString('en-CA')} passenger-kilometres/year
        </p>
        <p className="trace-routine__equation">
          {quantity.toLocaleString('en-CA')} passenger-kilometres/year × {activity.emissionFactor} g CO₂e / passenger-kilometre = {result ? `${result.emissionsKg.toLocaleString('en-CA', { maximumFractionDigits: 1 })} kg CO₂e/year` : 'incomplete'}
        </p>
        <Link className="text-link text-link--primary" href={`/calculator?data=${encoded}`}>Continue with this routine</Link>
        <ImpactTrace quantity={quantity} factor={activity.emissionFactor} unitLabel={activity.unitLabel} emissions={emissions} color={CATEGORY_INFO[activity.category].color} />
      </div>
      <aside className="evidence-rail" aria-label="Commute factor evidence">
        <div className="trace-routine__identity">
          <ActivityMark category={activity.category as ActivityCategory} activityId={activity.id} size={34} />
          <div>
            <p className="section-kicker">Worked example</p>
            <h2>{activity.name}</h2>
          </div>
        </div>
        <div className="evidence-rail__badges">
          <EvidenceBadge evidence={activity.evidence} />
          <span className="evidence-chip">Factor · {activity.emissionFactor} g / passenger-kilometre</span>
          <span className="evidence-chip">Region · {activity.evidence.region}</span>
          <span className="evidence-chip">Scope · {activity.evidence.scopeBoundary}</span>
          <span className="evidence-chip">Vintage · {activity.evidence.vintageYear}</span>
        </div>
        <p className="trace-routine__assumption"><strong>One-passenger assumption:</strong> {activity.notes || 'The published car record does not define an occupancy allocation model.'}</p>
        <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
      </aside>
    </section>
  )
}
