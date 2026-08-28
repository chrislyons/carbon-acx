import Link from 'next/link'
import { Disclosure } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { TabFooter } from '@/components/layout/TabFooter'
import { ACTIVITIES, CALCULATOR_DATASET, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById } from '@/lib/calculator'

const primerActivity = getActivityById('TRAN.SCHOOLRUN.CAR.KM')!
const primerQuantity = 1_000
const primerResult = calculateEmissions([{ activityId: primerActivity.id, quantity: primerQuantity }]).results[0]!
const primerUnit = primerActivity.unitLabel.endsWith('s')
  ? primerActivity.unitLabel.slice(0, -1)
  : primerActivity.unitLabel
const primerEquation = `${primerQuantity.toLocaleString('en-CA')} ${primerActivity.unitLabel} × ${primerActivity.emissionFactor} g CO₂e / ${primerUnit} = ${formatEmissions(primerResult.emissions)}/year`

export default function MethodologyPage() {
  return (
    <div className="page-shell page-shell--reading app-stage">
      <TabHeader
        title="Methodology"
        meta={
          <>
            <span>Dataset <strong>{CALCULATOR_DATASET.schemaVersion}</strong></span>
            <span>{ACTIVITIES.length} published activities</span>
          </>
        }
      />
      <div className="methodology-layout">
        <section id="primer" className="surface-card primer-card">
          <div className="primer-scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Six-question primer">
          <h2>Learn how to read a carbon estimate</h2>
          <Disclosure summary="Open the six-question primer" open>
            <div className="primer-card__questions">
              <article>
                <h3>What is the equation?</h3>
                <p>An activity quantity is multiplied by its published emission factor to make a transparent estimate.</p>
                <p className="working-example__equation">{primerEquation}</p>
              </article>
              <article>
                <h3>What period does it cover?</h3>
                <p>Calculator quantities use an annual convention: the quantity describes one year, and the result is shown as an annual estimate.</p>
              </article>
              <article>
                <h3>What is inside the boundary?</h3>
                <p>The published scope boundary states which upstream, operational, or downstream activity the factor includes. Read it before interpreting the total.</p>
              </article>
              <article>
                <h3>Which region and vintage apply?</h3>
                <p>This example uses {primerActivity.evidence.region} and a {primerActivity.evidence.vintageYear} factor vintage. Geography and year stay attached to every record.</p>
              </article>
              <article>
                <h3>How should uncertainty be read?</h3>
                <p>Uncertainty bounds describe the published factor range when available; they do not turn a screening estimate into a verified inventory.</p>
              </article>
              <article>
                <h3>What happens when evidence is missing?</h3>
                <p>Unavailable evidence is excluded from totals rather than converted to zero. Incompatible units must not be compared.</p>
              </article>
            </div>
            <div className="working-example">
              <p className="section-kicker">Working example</p>
              <p>{primerActivity.description}</p>
              <p className="working-example__equation">{primerEquation}</p>
              <div className="flex flex-wrap gap-3">
                <Link className="text-link text-link--primary" href={`/calculator?data=${encodeCalculatorInputs({ [primerActivity.id]: primerQuantity })}`}>Open this example in the calculator</Link>
                <Link className="text-link" href="/explore">Inspect the published record</Link>
              </div>
            </div>
          </Disclosure>
          </div>
        </section>

        <div className="methodology-grid">
          <section className="surface-card">
            <h2 className="text-xl font-semibold text-foreground">Annual convention</h2>
            <p className="mt-3 text-foreground-muted">
              Calculator quantities represent one year of activity. The arithmetic is annual quantity × g CO₂e per unit
              = annual estimate, shown in g, kg, or t CO₂e.
            </p>
          </section>
          <section className="surface-card">
            <h2 className="text-xl font-semibold text-foreground">Regional preference</h2>
            <p className="mt-3 text-foreground-muted">
              When more than one published factor exists, the generated dataset prefers Ontario, then Canada, then a
              global factor. The selected region remains visible with every result.
            </p>
          </section>
          <section className="surface-card">
            <h2 className="text-xl font-semibold text-foreground">Missing-data policy</h2>
            <p className="mt-3 text-foreground-muted">
              A missing or incomplete factor is marked Not available in the Activity Atlas and excluded from calculator
              totals. Carbon ACX never substitutes zero for absent evidence.
            </p>
          </section>
          <section className="surface-card">
            <h2 className="text-xl font-semibold text-foreground">Benchmark basis</h2>
            <p className="mt-3 text-foreground-muted">
              Current Canadian and provincial comparisons are 2023 territorial / production-based emissions excluding
              LULUCF. Consumption and equity measures are not mixed into this selector.
            </p>
          </section>
        </div>
      </div>
      <TabFooter>
        <div className="tab-footerbar__group">
          <a className="text-link" href="#primer">Primer</a>
          <Link className="text-link" href="/evidence">Evidence</Link>
        </div>
        <div className="tab-footerbar__group">
          <span className="tab-footerbar__meta">Reading the published-data contract</span>
        </div>
      </TabFooter>
    </div>
  )
}
