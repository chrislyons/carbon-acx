import Link from 'next/link'
import { SourceList } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import {
  ACTIVITIES,
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
      <div className="reference-scroll" data-panel-scroll tabIndex={0} role="region" aria-label={`${record.name} description`}>
        <p>{record.description}</p>
      </div>
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
      <div className="reference-scroll" data-panel-scroll tabIndex={0} role="region" aria-label={`${record.name} provenance`}>
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
      </div>
      <div className="reference-scroll" data-panel-scroll tabIndex={0} role="region" aria-label={`${record.name} sources`}>
        <p className="text-sm">
          Screening estimate only; this is not a verified inventory. Use this record only within its published unit,
          geography, boundary, GWP horizon, and vintage. Incompatible units must not be compared.
        </p>
        <SourceList
          sourceIds={record.evidence.sourceIds}
          citations={record.evidence.sourceCitations}
          urls={record.evidence.sourceUrls}
        />
      </div>
      {record.evidence.methodNotes ? <p className="text-sm">Method note: {record.evidence.methodNotes}</p> : null}
      <Link className="text-link text-link--primary" href={recordLink}>
        {calculatorRecord ? 'Open this record in the calculator' : 'Inspect this record in the Atlas'}
      </Link>
    </article>
  )
}

export default function LearnPage() {
  return (
    <div className="page-shell page-shell--reading app-stage">
      <TabHeader
        title="Learn"
        meta={
          <>
            <span><strong>{CASE_STUDIES.length}</strong> published examples</span>
            <span>{ACTIVITIES.length} calculator records · {CATALOG_ACTIVITIES.length} atlas records</span>
          </>
        }
      />
      <div className="learning-layout">
        <section className="learning-grid" aria-label="Published learning examples">
          {CASE_STUDIES.map((study) => <LearningCard key={study.id} study={study} />)}
        </section>
        <div className="learning-actions">
          <Link className="action-link" href="/methodology#primer">Read the six-question primer</Link>
          <Link className="action-link" href="/explore">Browse the full Activity Atlas</Link>
        </div>
      </div>
    </div>
  )
}
