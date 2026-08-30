import { BookOpenText, ScanSearch } from 'lucide-react'
import Link from 'next/link'
import { EvidenceBadge, EvidenceFacts, SourceList } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { AtlasModeIcon } from '@/components/viz/AtlasCoverageMap'
import { abbreviateUnit } from '@/lib/units'
import {
  ACTIVITIES,
  CATALOG_ACTIVITIES,
  calculateEmissions,
  encodeCalculatorInputs,
  formatEmissions,
  getActivityById,
  getAtlasMode,
} from '@/lib/calculator'
import type { Activity, CatalogActivity } from '@/lib/calculator'

type LearningRecord = Activity | CatalogActivity

const CASE_STUDIES = [
  {
    id: 'TRAN.SCHOOLRUN.CAR.KM',
    scale: 'Household activity',
    quantity: 1_000,
    quantityLabel: 'kilometres',
  },
  {
    id: 'BUILDING.OFFICE.M2.YEAR',
    scale: 'Small organization',
    quantity: 100,
    quantityLabel: 'square metre-years',
  },
  {
    id: 'ENERGY.CA-ON.GRID.KWH',
    scale: 'Canadian system',
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

function LearningMark({ record }: { record: LearningRecord }) {
  const calculatorRecord = getActivityById(record.id)
  return calculatorRecord
    ? <ActivityMark category={calculatorRecord.category} activityId={calculatorRecord.id} size={30} />
    : <AtlasModeIcon mode={getAtlasMode(record as CatalogActivity)} />
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
        <p className="section-kicker">{study.scale}</p>
        <h2>Record not available</h2>
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
      <header className="learning-card__header">
        <LearningMark record={record} />
        <div>
          <p className="section-kicker">{study.scale}</p>
          <h2>{record.name}</h2>
        </div>
      </header>
      <section>
        <p className="section-kicker">What is measured</p>
        <p>{record.description}</p>
      </section>
      <section className="learning-card__arithmetic">
        <span className="section-kicker">Equation</span>
        {isUnavailable ? (
          <p>Not available. No numeric zero is substituted.</p>
        ) : (
          <p>
            {study.quantity.toLocaleString('en-CA')} {abbreviateUnit(study.quantityLabel)} × {record.emissionFactor} g CO₂e /{' '}
            {abbreviateUnit(record.unitLabel)} = {workedEmissions}
          </p>
        )}
      </section>
      <section>
        <p className="section-kicker">Evidence facts</p>
        <EvidenceBadge evidence={record.evidence} />
        <EvidenceFacts evidence={record.evidence} unitLabel={record.unitLabel} />
      </section>
      <details className="disclosure">
        <summary>{record.evidence.sourceIds.length} sources</summary>
        <div className="disclosure__body">
          <SourceList sourceIds={record.evidence.sourceIds} citations={record.evidence.sourceCitations} urls={record.evidence.sourceUrls} />
        </div>
      </details>
      <p className="learning-card__disclaimer">
        Use this example only within its published unit, geography, boundary, GWP horizon, and vintage. Incompatible units are not a magnitude ranking.
      </p>
      <Link className="text-link text-link--primary" href={recordLink}>
        {calculatorRecord ? 'Open this record in the calculator' : 'Inspect this record in the Atlas'}
      </Link>
    </article>
  )
}

export default function LearnPage() {
  return (
    <div className="page-shell reading-page">
      <TabHeader
        route="learn"
        meta={
          <>
            <span><strong>{CASE_STUDIES.length}</strong> generated examples</span>
            <span>{ACTIVITIES.length} calculator · {CATALOG_ACTIVITIES.length} Atlas records</span>
          </>
        }
        actions={
          <>
            <Link className="action-link" href="/methodology#primer"><BookOpenText aria-hidden="true" size={15} />Six-step primer</Link>
            <Link className="action-link" href="/explore"><ScanSearch aria-hidden="true" size={15} />Browse the Atlas</Link>
          </>
        }
      />
      <p className="reading-disclaimer">Three scales, not a magnitude ranking. Each example stays inside its published unit and evidence boundary.</p>
      <section className="learning-layout" aria-label="Examples across scales">
        <div className="learning-grid">
          {CASE_STUDIES.map((study) => <LearningCard key={study.id} study={study} />)}
        </div>
      </section>
    </div>
  )
}
