import Link from 'next/link'
import { SourceList } from '@/components/content'
import {
  CATALOG_ACTIVITIES,
  calculateEmissions,
  encodeCalculatorInputs,
  formatEmissions,
  getActivityById,
  type Activity,
  type CatalogActivity,
} from '@/lib/calculator'

type LearningRecord = Activity | CatalogActivity

const CASE_STUDIES = [
  {
    id: 'TRAN.SCHOOLRUN.CAR.KM',
    label: 'Household school travel',
    quantity: 1_000,
    quantityLabel: 'kilometres',
  },
  {
    id: 'BUILDING.OFFICE.M2.YEAR',
    label: 'Small-organization office area',
    quantity: 100,
    quantityLabel: 'square metre-years',
  },
  {
    id: 'ENERGY.CA-ON.GRID.KWH',
    label: 'Canadian-system electricity',
    quantity: 100,
    quantityLabel: 'kilowatt-hours',
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

function LearningCard({
  study,
}: {
  study: (typeof CASE_STUDIES)[number]
}) {
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

  const workedEmissions = getWorkedEmissions(record, study.quantity)
  const isUnavailable = record.emissionFactor === null || record.evidence.publicationStatus === 'unavailable'
  const calculatorRecord = getActivityById(record.id)
  const recordLink = calculatorRecord
    ? `/calculator?data=${encodeCalculatorInputs({ [record.id]: study.quantity })}`
    : '/explore'

  return (
    <article className="surface-card learning-card">
      <p className="section-kicker">{study.label}</p>
      <h2>{record.name}</h2>
      <p>{record.description}</p>
      {isUnavailable ? (
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
        <div>
          <dt>Boundary</dt>
          <dd>{record.evidence.scopeBoundary || 'Not specified'}</dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>{record.evidence.region ?? 'Not specified'}</dd>
        </div>
        <div>
          <dt>Vintage</dt>
          <dd>{record.evidence.vintageYear ?? 'Not specified'}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{record.unitDefinition || record.unitLabel}</dd>
        </div>
      </dl>
      <p className="text-sm">
        Screening estimate only; this is not a verified inventory. Use this record only within its published unit,
        geography, boundary, GWP horizon, and vintage. Incompatible units must not be compared.
      </p>
      <SourceList
        sourceIds={record.evidence.sourceIds}
        citations={record.evidence.sourceCitations}
        urls={record.evidence.sourceUrls}
      />
      {record.evidence.methodNotes ? <p className="text-sm">Method note: {record.evidence.methodNotes}</p> : null}
      <Link className="text-link text-link--primary" href={recordLink}>
        {calculatorRecord ? 'Open this record in the calculator' : 'Inspect this record in the Atlas'}
      </Link>
    </article>
  )
}

export default function LearnPage() {
  return (
    <div className="page-shell max-w-6xl py-10 sm:py-14">
      <p className="section-kicker">Learn</p>
      <h1 className="section-title max-w-3xl">Read a carbon estimate from the record outward.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        These three examples use only published Activity Atlas records. Each result keeps its unit, boundary,
        geography, vintage, and source attached so the arithmetic can be inspected instead of treated as a universal
        conversion.
      </p>
      <section className="learning-grid mt-8" aria-label="Published learning examples">
        {CASE_STUDIES.map((study) => <LearningCard key={study.id} study={study} />)}
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="action-link" href="/methodology#primer">Read the six-question primer</Link>
        <Link className="action-link" href="/explore">Browse the full Activity Atlas</Link>
      </div>
    </div>
  )
}
