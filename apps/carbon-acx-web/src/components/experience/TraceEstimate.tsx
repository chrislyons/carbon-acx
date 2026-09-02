'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { EvidenceBadge, EvidenceFacts, SourceList } from '@/components/content'
import { ImpactTrace } from '@/components/viz/ImpactTrace'
import { abbreviateUnit } from '@/lib/units'
import { useGraphKeyboard } from '@/components/viz/useGraphKeyboard'
import { ACTIVITIES, CATEGORY_INFO, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

const MIN_DISTANCE = 10
const MAX_DISTANCE = 200_000
const commuterVehicleIds = ['TRAN.SCHOOLRUN.CAR.KM', 'TRAN.TTC.BUS.KM', 'TRAN.TTC.SUBWAY.KM'] as const
const commuterVehicles = commuterVehicleIds.map((id) => getActivityById(id)!)
const defaultVehicle = commuterVehicles[0]
const publishedActivities = ACTIVITIES.filter((item) => item.evidence.publicationStatus === 'published')

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
  const isValidDistance = result !== null && distance !== null
  const publishedActivityOrdinal = publishedActivities.findIndex((item) => item.id === activity.id) + 1

  const selectAdjacentVehicle = useCallback((direction: 'previous' | 'next') => {
    const index = commuterVehicles.findIndex((vehicle) => vehicle.id === activityId)
    const offset = direction === 'next' ? 1 : -1
    setActivityId(commuterVehicles[(index + offset + commuterVehicles.length) % commuterVehicles.length].id)
  }, [activityId])

  const stepDistance = useCallback((direction: 'previous' | 'next', event: KeyboardEvent) => {
    if (distance === null) return false
    const step = event.shiftKey ? 200 : 50
    const nextDistance = direction === 'next' ? distance + step : distance - step
    setDistanceDraft(String(Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, nextDistance))))
  }, [distance])

  useGraphKeyboard({
    onHorizontalStep: stepDistance,
    onVerticalStep: (direction) => {
      selectAdjacentVehicle(direction)
    },
  })
  const distanceError = 'Enter a distance from 10 to 200,000 km.'

  const modeControls = (
    <div className="trace-mode-buttons">
      {commuterVehicles.map((vehicle) => {
        const selected = vehicle.id === activity.id
        const label = vehicleLabels[vehicle.id] ?? vehicle.name
        return (
          <button
            key={vehicle.id}
            type="button"
            className={selected ? 'trace-mode is-selected' : 'trace-mode'}
            aria-label={label}
            aria-pressed={selected}
            title={label}
            onClick={() => setActivityId(vehicle.id)}
          >
            <ActivityMark category={vehicle.category} activityId={vehicle.id} size={24} />
          </button>
        )
      })}
    </div>
  )

  const quantityControl = (
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
  )

  return (
    <section className="trace-estimate" aria-label="Published travel estimate">
      <div className="trace-estimate__lead">
        <ImpactTrace
          lines={commuterVehicles.map((vehicle) => ({
            id: vehicle.id,
            label: vehicleLabels[vehicle.id] ?? vehicle.name,
            factor: vehicle.emissionFactor,
            unitLabel: abbreviateUnit(vehicle.unitLabel),
          }))}
          activeId={activity.id}
          quantity={distance ?? MIN_DISTANCE}
          unitLabel={abbreviateUnit(activity.unitLabel)}
          emissions={result?.emissions ?? 0}
          color={CATEGORY_INFO[activity.category].color}
          modeControls={modeControls}
          quantityControl={quantityControl}
          onQuantityChange={(nextDistance) => setDistanceDraft(String(nextDistance))}
          invalidContent={isValidDistance ? undefined : (
            <>
              <p id="annual-distance-error" role="alert" className="field-error">{distanceError}</p>
              <p className="trace-invalid-copy">Enter a valid distance to continue</p>
            </>
          )}
        />
        {isValidDistance ? (
          <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [activity.id]: distance })}`}>
            Open this estimate in the calculator
          </Link>
        ) : null}
      </div>
      <aside className="evidence-rail" aria-label="Factor evidence">
        <p className="section-kicker">Evidence attached to this estimate</p>
        <div className="evidence-rail__badges">
          <EvidenceBadge evidence={activity.evidence} />
          <span className="evidence-chip">Factor · {formatEmissions(activity.emissionFactor)}/unit</span>
        </div>
        <EvidenceFacts evidence={activity.evidence} unitLabel={activity.unitLabel} />
        <p className="evidence-rail__example">
          {publishedActivityOrdinal > 0
            ? `Record ${publishedActivityOrdinal} of ${publishedActivities.length} published calculator activities`
            : `${publishedActivities.length} published calculator activities`}
        </p>
        {distance !== null ? (
          <details className="disclosure">
            <summary>{activity.evidence.sourceIds.length} source{activity.evidence.sourceIds.length === 1 ? '' : 's'}</summary>
            <div className="disclosure__body">
              <SourceList sourceIds={activity.evidence.sourceIds} citations={activity.evidence.sourceCitations} urls={activity.evidence.sourceUrls} />
            </div>
          </details>
        ) : null}
      </aside>
    </section>
  )
}
