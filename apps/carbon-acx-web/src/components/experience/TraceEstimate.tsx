'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EvidenceBadge, SourceList } from '@/components/content'
import { ImpactTrace } from '@/components/viz/ImpactTrace'
import { abbreviateUnit } from '@/lib/units'
import { ACTIVITIES, CATEGORY_INFO, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

const commuterVehicleIds = ['TRAN.SCHOOLRUN.CAR.KM', 'TRAN.TTC.BUS.KM', 'TRAN.TTC.SUBWAY.KM'] as const
const commuterVehicles = commuterVehicleIds.map((id) => getActivityById(id)!)
const defaultVehicle = commuterVehicles[0]
const publishedActivityCount = ACTIVITIES.filter((item) => item.evidence.publicationStatus === 'published').length

const vehicleLabels: Record<string, string> = {
  'TRAN.SCHOOLRUN.CAR.KM': 'Car',
  'TRAN.TTC.BUS.KM': 'Toronto bus',
  'TRAN.TTC.SUBWAY.KM': 'Toronto subway',
}

export function TraceEstimate() {
  const [activityId, setActivityId] = useState<string>(defaultVehicle.id)
  const [quantity, setQuantity] = useState(1_000)
  const activity = getActivityById(activityId) ?? defaultVehicle
  const result = calculateEmissions([{ activityId: activity.id, quantity }]).results[0]!

  // Home-tab hotkeys: ↑/↓ switches vehicle class, ←/→ slides the marker.
  // Left/right are left to the slider's own handler while it holds focus.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const index = commuterVehicles.findIndex((vehicle) => vehicle.id === activityId)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActivityId(commuterVehicles[(index + 1) % commuterVehicles.length].id)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActivityId(commuterVehicles[(index - 1 + commuterVehicles.length) % commuterVehicles.length].id)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (target?.closest('.impact-trace__slider')) return
        event.preventDefault()
        const step = event.shiftKey ? 200 : 50
        setQuantity((current) =>
          event.key === 'ArrowLeft'
            ? Math.max(10, current - step)
            : Math.min(200_000, current + step),
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activityId])

  const lines = commuterVehicles.map((vehicle) => ({
    id: vehicle.id,
    factor: vehicle.emissionFactor,
    unitLabel: abbreviateUnit(vehicle.unitLabel),
  }))

  return (
    <section className="trace-estimate" aria-label="Commute estimator">
      <div className="trace-estimate__lead">
        <label className="quantity-field" htmlFor="commute-mode">
          <span>Vehicle class</span>
          <select id="commute-mode" value={activity.id} onChange={(event) => setActivityId(event.target.value)}>
            {commuterVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicleLabels[vehicle.id] ?? vehicle.name}</option>
            ))}
          </select>
          <span>{abbreviateUnit(activity.unitLabel)}</span>
        </label>
        <ImpactTrace
          lines={lines}
          activeId={activity.id}
          quantity={quantity}
          unitLabel={abbreviateUnit(activity.unitLabel)}
          emissions={result.emissions}
          color={CATEGORY_INFO[activity.category].color}
          onQuantityChange={setQuantity}
        />
        <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [activity.id]: quantity })}`}>Continue with this estimate</Link>
      </div>
      <aside className="evidence-rail" aria-label="Factor evidence">
        <p className="section-kicker">What this number means</p>
        <div className="evidence-rail__badges">
          <EvidenceBadge evidence={activity.evidence} />
          <span className="evidence-chip">Region · {activity.evidence.region}</span>
          <span className="evidence-chip">Scope · {activity.evidence.scopeBoundary}</span>
          <span className="evidence-chip">Vintage · {activity.evidence.vintageYear}</span>
          <span className="evidence-chip">Uncertainty · {activity.evidence.uncertainty.lowGPerUnit == null || activity.evidence.uncertainty.highGPerUnit == null ? 'Not quantified' : `${activity.evidence.uncertainty.lowGPerUnit}–${activity.evidence.uncertainty.highGPerUnit} g / ${abbreviateUnit(activity.unitLabel)}`}</span>
        </div>
        <p className="evidence-rail__example">Example: 1 of {publishedActivityCount} published activities</p>
        <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
      </aside>
    </section>
  )
}
