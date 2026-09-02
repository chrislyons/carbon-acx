import { BadgeCheck, BookOpenText } from 'lucide-react'
import Link from 'next/link'
import { TabHeader } from '@/components/layout/TabHeader'
import { abbreviateUnit } from '@/lib/units'
import { ACTIVITIES, CALCULATOR_DATASET, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

const primerActivity = getActivityById('TRAN.SCHOOLRUN.CAR.KM')!
const primerQuantity = 1_000
const primerResult = calculateEmissions([{ activityId: primerActivity.id, quantity: primerQuantity }]).results[0]!
const primerUnit = abbreviateUnit(primerActivity.unitLabel).replace(/s$/, '')
const primerEquation = `${primerQuantity.toLocaleString('en-CA')} ${abbreviateUnit(primerActivity.unitLabel)} × ${primerActivity.emissionFactor} g CO₂e / ${primerUnit} = ${formatEmissions(primerResult.emissions)}/yr`

const METHOD_STEPS = [
  {
    number: '01',
    title: 'Quantity × factor',
    copy: 'Start with a measurable activity quantity and multiply it by the published factor for that unit.',
  },
  {
    number: '02',
    title: 'Annual period',
    copy: 'Calculator quantities describe one year. Keep the annual period visible when carrying a result into a worksheet.',
  },
  {
    number: '03',
    title: 'Boundary',
    copy: 'Read the scope boundary before interpreting the result; it identifies what upstream, operational, or downstream activity is included.',
  },
  {
    number: '04',
    title: 'Region + vintage',
    copy: `This worked example uses ${primerActivity.evidence.region} and a ${primerActivity.evidence.vintageYear} factor vintage. Geography and year stay attached to every record.`,
  },
  {
    number: '05',
    title: 'Uncertainty',
    copy: 'Published bounds describe a factor range when available. They do not turn a screening estimate into a verified inventory.',
  },
  {
    number: '06',
    title: 'Missing evidence',
    copy: 'Not available evidence is excluded from totals rather than converted to zero. Incompatible units remain separate.',
  },
] as const

export default function MethodologyPage() {
  return (
    <div className="page-shell reading-page">
      <TabHeader
        route="methodology"
        meta={
          <>
            <span>Dataset <strong>{CALCULATOR_DATASET.schemaVersion}</strong></span>
            <span>{ACTIVITIES.length} published activities</span>
          </>
        }
        actions={<Link className="action-link" href="/evidence"><BadgeCheck aria-hidden="true" size={15} />Evidence</Link>}
      />
      <nav className="in-content-subnav" aria-label="Methodology sections">
        <a href="#primer"><BookOpenText aria-hidden="true" size={15} />Primer</a>
        <a href="#benchmarks"><BookOpenText aria-hidden="true" size={15} />Benchmarks</a>
      </nav>
      <section id="primer" className="methodology-path" aria-labelledby="methodology-title">
        <header>
          <p className="section-kicker">The reading path</p>
          <h2 id="methodology-title">Six rules keep an estimate legible</h2>
          <p>Use the same order for every published record: quantity, period, boundary, context, uncertainty, then missing evidence.</p>
        </header>
        <aside className="working-example" aria-label="Generated school-run worked example">
          <p className="section-kicker">Working example</p>
          <p>{primerActivity.description}</p>
          <p className="working-example__equation">{primerEquation}</p>
          <div className="methodology-actions">
            <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [primerActivity.id]: primerQuantity })}`}>Open this example in the calculator</Link>
            <Link className="text-link" href="/explore">Inspect the published record</Link>
          </div>
        </aside>
        <ol className="methodology-steps">
          {METHOD_STEPS.map((step) => (
            <li key={step.number}>
              <span className="methodology-step__number" aria-hidden="true">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <p className="methodology-step__example">Worked example: {primerEquation}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section id="benchmarks" className="surface-card methodology-benchmark">
        <p className="section-kicker">Comparison note</p>
        <h2>Benchmark basis</h2>
        <p>Current Canadian and provincial comparisons use territorial, production-based emissions excluding LULUCF. Consumption and equity measures are not mixed into the calculator selector.</p>
        <p className="text-sm">Benchmarks provide compatible context; they are not emission factors and do not change the published arithmetic.</p>
      </section>
    </div>
  )
}
