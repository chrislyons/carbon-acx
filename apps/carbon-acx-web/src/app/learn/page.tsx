'use client'

import Link from 'next/link'
import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { SourceList } from '@/components/content'
import {
  CATALOG_ACTIVITIES,
  calculateEmissions,
  formatEmissions,
  getActivityById,
  type Activity,
  type CatalogActivity,
} from '@/lib/calculator'
import { createActivityLine, encodeRoutineWorksheet } from '@/lib/routines'

type LearningRecord = Activity | CatalogActivity

const CASE_STUDIES = [
  {
    id: 'TRAN.SCHOOLRUN.CAR.KM',
    label: 'Household school travel',
    quantity: 3840,
    quantityLabel: 'passenger-kilometres/year',
    routine: true,
  },
  {
    id: 'BUILDING.OFFICE.M2.YEAR',
    label: 'Small-organization office area',
    quantity: 100,
    quantityLabel: 'square metre-years',
    routine: false,
  },
  {
    id: 'ENERGY.CA-ON.GRID.KWH',
    label: 'Canadian-system electricity',
    quantity: 100,
    quantityLabel: 'kilowatt-hours',
    routine: false,
  },
] as const

function getWorkedEmissions(record: LearningRecord, quantity: number) {
  if (record.emissionFactor === null) return null
  const calculatorRecord = getActivityById(record.id)
  if (calculatorRecord) {
    const result = calculateEmissions([{ activityId: calculatorRecord.id, quantity }]).results[0]
    return result ? formatEmissions(result.emissions) : null
  }
  return formatEmissions(record.emissionFactor * quantity)
}

function routineLink() {
  const line = createActivityLine('TRAN.SCHOOLRUN.CAR.KM', {
    oneWayKm: '8',
    travelDaysPerWeek: '5',
  })
  return `/calculator?data=${encodeRoutineWorksheet([line])}`
}

function LearningCard({ study, headingRef }: { study: (typeof CASE_STUDIES)[number]; headingRef?: RefObject<HTMLHeadingElement | null> }) {
  const record = getActivityById(study.id) ?? CATALOG_ACTIVITIES.find((activity) => activity.id === study.id)
  if (!record) {
    return (
      <article className="surface-card learning-card">
        <p className="section-kicker">{study.label}</p>
        <h2>Record unavailable</h2>
        <p>The requested catalogue record is not present in the generated authority.</p>
        <p className="text-sm">No numeric value is substituted.</p>
      </article>
    )
  }

  const workedEmissions = study.routine
    ? getWorkedEmissions(record, study.quantity)
    : getWorkedEmissions(record, study.quantity)
  const isUnavailable = record.emissionFactor === null || record.evidence.publicationStatus === 'unavailable'
  const calculatorRecord = getActivityById(record.id)
  const recordLink = study.routine
    ? routineLink()
    : calculatorRecord
      ? '/calculator'
      : '/explore'

  return (
    <article className="surface-card learning-card learning-card--active">
      <h2 ref={headingRef} tabIndex={-1}>{record.name}</h2>
      <p>{record.description}</p>
      {study.routine ? (
        <div className="learning-card__arithmetic">
          <span className="section-kicker">Worked routine</span>
          <p>8 km/leg × 2 legs/travel day × 5 travel days/week × 48 weeks/year = 3,840 passenger-kilometres/year.</p>
          <p>3,840 passenger-kilometres/year × {record.emissionFactor} g CO₂e / passenger-kilometre = {workedEmissions}/year.</p>
        </div>
      ) : isUnavailable ? (
        <div className="data-state data-state--warning">
          <strong>Not available</strong>
          <p>{'unavailabilityReason' in record ? record.unavailabilityReason : 'No published numeric value is available.'}</p>
          <p>No numeric value is substituted.</p>
        </div>
      ) : (
        <div className="learning-card__arithmetic">
          <span className="section-kicker">Worked arithmetic</span>
          <p>
            {study.quantity.toLocaleString('en-CA')} {study.quantityLabel} × {record.emissionFactor} g CO₂e /{' '}
            {record.unitLabel.replace(/s$/, '')} = {workedEmissions}
          </p>
        </div>
      )}
      <dl className="compact-reference-list learning-card__metadata">
        <div><dt>Boundary</dt><dd>{record.evidence.scopeBoundary || 'Not specified'}</dd></div>
        <div><dt>Region</dt><dd>{record.evidence.region ?? 'Not specified'}</dd></div>
        <div><dt>Vintage</dt><dd>{record.evidence.vintageYear ?? 'Not specified'}</dd></div>
        <div><dt>Unit</dt><dd>{record.unitDefinition || record.unitLabel}</dd></div>
      </dl>
      <p className="text-sm">
        Screening estimate only; this is not a verified inventory. Use this record only within its published unit,
        geography, boundary, GWP horizon, and vintage. Incompatible units must not be compared.
      </p>
      <SourceList sourceIds={record.evidence.sourceIds} citations={record.evidence.sourceCitations} urls={record.evidence.sourceUrls} />
      {record.evidence.methodNotes ? <p className="text-sm">Method note: {record.evidence.methodNotes}</p> : null}
      <Link className="text-link text-link--primary" href={recordLink}>
        {study.routine ? 'Continue with this routine' : calculatorRecord ? 'Open this record in the calculator' : 'Inspect this record in the Atlas'}
      </Link>
    </article>
  )
}

export default function LearnPage() {
  const [index, setIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const study = CASE_STUDIES[index]

  useEffect(() => {
    headingRef.current?.focus()
  }, [index])

  return (
    <div className="page-shell page-shell--reading max-w-6xl py-10 sm:py-14">
      <p className="section-kicker">Learn</p>
      <h1 className="section-title max-w-3xl">Read a carbon estimate from the record outward.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        Move through one published example at a time. Each result keeps its unit, boundary, geography, vintage, and source attached so the arithmetic can be inspected instead of treated as a universal conversion.
      </p>
      <section className="learning-sequence mt-8" aria-label="Guided published learning examples">
        <div className="learning-sequence__controls">
          <button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>Previous example</button>
          <span>Example {index + 1} of {CASE_STUDIES.length}</span>
          <button type="button" onClick={() => setIndex((current) => Math.min(CASE_STUDIES.length - 1, current + 1))} disabled={index === CASE_STUDIES.length - 1}>Next example</button>
        </div>
        <div aria-live="polite">
          <LearningCard study={study} headingRef={headingRef} />
        </div>
        <button type="button" className="learning-sequence__browse" aria-expanded={showAll} onClick={() => setShowAll((visible) => !visible)}>
          {showAll ? 'Hide all examples' : 'Browse all examples'}
        </button>
        {showAll ? (
          <ul className="learning-sequence__list" aria-label="All learning examples">
            {CASE_STUDIES.map((entry, entryIndex) => (
              <li key={entry.id}>
                <button type="button" onClick={() => { setIndex(entryIndex); setShowAll(false) }}>
                  <span>{entry.label}</span><small>{entry.id}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="action-link" href="/methodology#primer">Read the routine primer</Link>
        <Link className="action-link" href="/explore">Browse the full Activity Atlas</Link>
      </div>
    </div>
  )
}
