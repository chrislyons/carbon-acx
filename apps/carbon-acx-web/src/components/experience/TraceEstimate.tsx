'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { EvidenceBadge, EvidenceFacts, SourceList } from '@/components/content'
import { ImpactTrace } from '@/components/viz/ImpactTrace'
import { abbreviateUnit } from '@/lib/units'
import { ACTIVITIES, CATEGORY_INFO, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

const MIN_DISTANCE = 10
const MAX_DISTANCE = 200_000
const commuterVehicleIds = ['TRAN.SCHOOLRUN.CAR.KM', 'TRAN.TTC.BUS.KM', 'TRAN.TTC.SUBWAY.KM'] as const
const commuterVehicles = commuterVehicleIds.map((id) => getActivityById(id)!)
const defaultVehicle = commuterVehicles[0]
const publishedActivityCount = ACTIVITIES.filter((item) => item.evidence.publicationStatus === 'published').length

const vehicleLabels: Record<string, string> = {
  'TRAN.SCHOOLRUN.CAR.KM': 'Car',
  'TRAN.TTC.BUS.KM': 'Toronto bus',
  'TRAN.TTC.SUBWAY.KM': 'Toronto subway',
}

function parseDistance(raw: string): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= MIN_DISTANCE && value <= MAX_DISTANCE ? value : null
}

export function TraceEstimate() {
  const [activityId, setActivityId] = useState<string>(defaultVehicle.id)
  const [distanceDraft, setDistanceDraft] = useState('1000')
  const activity = getActivityById(activityId) ?? defaultVehicle
  const distance = parseDistance(distanceDraft.replaceAll(',', ''))
  const result = distance === null
    ? null
    : calculateEmissions([{ activityId: activity.id, quantity: distance }]).results[0] ?? null
  const distanceError = 'Enter a distance from 10 to 200,000 km.'

  return (
    <section className="trace-estimate" aria-label="Published travel estimate">
      <div className="trace-estimate__lead">
        <div className="trace-controls">
          <div>
            <p className="section-kicker">Travel mode</p>
            <div className="trace-controls__modes" role="group" aria-label="Travel mode">
              {commuterVehicles.map((vehicle) => {
                const selected = vehicle.id === activity.id
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    className={selected ? 'trace-mode is-selected' : 'trace-mode'}
                    aria-pressed={selected}
                    onClick={() => setActivityId(vehicle.id)}
                  >
                    <ActivityMark category={vehicle.category} activityId={vehicle.id} size={24} />
                    <span>{vehicleLabels[vehicle.id] ?? vehicle.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <label className="quantity-field" htmlFor="annual-distance">
            <span>Annual distance (km)</span>
            <input
              id="annual-distance"
              type="number"
              min={MIN_DISTANCE}
              max={MAX_DISTANCE}
              step="10"
              inputMode="decimal"
              value={distanceDraft}
              onChange={(event) => setDistanceDraft(event.target.value)}
              aria-invalid={distance === null}
              aria-describedby={distance === null ? 'annual-distance-error' : undefined}
            />
          </label>
          {distance === null ? <p id="annual-distance-error" role="alert" className="field-error">{distanceError}</p> : null}
        </div>
        {result && distance !== null ? (
          <>
            <ImpactTrace
              lines={commuterVehicles.map((vehicle) => ({
                id: vehicle.id,
                label: vehicleLabels[vehicle.id] ?? vehicle.name,
                factor: vehicle.emissionFactor,
                unitLabel: abbreviateUnit(vehicle.unitLabel),
              }))}
              activeId={activity.id}
              quantity={distance}
              unitLabel={abbreviateUnit(activity.unitLabel)}
              emissions={result.emissions}
              color={CATEGORY_INFO[activity.category].color}
              onQuantityChange={(nextDistance) => setDistanceDraft(String(nextDistance))}
            />
            <p className="trace-drag-hint">Drag marker or edit annual distance</p>
            <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [activity.id]: distance })}`}>
              Open this estimate in the calculator
            </Link>
          </>
        ) : (
          <p className="trace-invalid-copy">Enter a valid distance to continue</p>
        )}
      </div>
      <aside className="evidence-rail" aria-label="Factor evidence">
        <p className="section-kicker">Evidence attached to this estimate</p>
        <div className="evidence-rail__badges">
          <EvidenceBadge evidence={activity.evidence} />
          <span className="evidence-chip">Factor · {formatEmissions(activity.emissionFactor)}/unit</span>
        </div>
        <EvidenceFacts evidence={activity.evidence} unitLabel={activity.unitLabel} />
        <p className="evidence-rail__example">Record 1 of {publishedActivityCount} published calculator activities</p>
        {distance !== null ? (
          <details className="disclosure">
            <summary>{activity.evidence.sourceIds.length} sources</summary>
            <div className="disclosure__body">
              <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
            </div>
          </details>
        ) : null}
      </aside>
    </section>
  )
}
