import Link from 'next/link'
import releaseDataJson from '@/generated/release-data.json'
import { Disclosure, Eyebrow, OwidContextCard, SourceList } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { TabFooter } from '@/components/layout/TabFooter'
import { ACTIVITIES, CALCULATOR_DATASET, calculateEmissions, encodeCalculatorInputs, formatEmissions, getActivityById, getBenchmarkOptions } from '@/lib/calculator'

const sourcePairs = ACTIVITIES.flatMap((activity) =>
  activity.evidence.sourceIds.map((sourceId, index) => [
    sourceId,
    activity.evidence.sourceCitations[index],
    activity.evidence.sourceUrls[index] ?? null,
  ] as const),
).filter(([sourceId], index, all) => all.findIndex(([candidate]) => candidate === sourceId) === index)

const primerActivity = getActivityById('TRAN.SCHOOLRUN.CAR.KM')!
const primerQuantity = 1_000
const primerResult = calculateEmissions([{ activityId: primerActivity.id, quantity: primerQuantity }]).results[0]!
const primerUnit = primerActivity.unitLabel.endsWith('s')
  ? primerActivity.unitLabel.slice(0, -1)
  : primerActivity.unitLabel
const primerEquation = `${primerQuantity.toLocaleString('en-CA')} ${primerActivity.unitLabel} × ${primerActivity.emissionFactor} g CO₂e / ${primerUnit} = ${formatEmissions(primerResult.emissions)}/year`

export default function MethodologyPage() {
  const benchmarks = getBenchmarkOptions()

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

      <aside className="methodology-rail" data-panel-scroll tabIndex={0} role="region" aria-label="Data provenance">
      <section className="surface-card reference-panel">
        <Eyebrow>Generated metadata</Eyebrow>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="metric-label">Dataset version</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.schemaVersion}</dd></div>
          <div><dt className="metric-label">Generated</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.generatedAt}</dd></div>
          <div><dt className="metric-label">Published calculator activities</dt><dd className="font-mono text-sm">{ACTIVITIES.length}</dd></div>
        </dl>
        <div className="mt-4">
          <a className="text-link" href="/data/stream-catalog.json">Open the data-stream catalog</a>
        </div>
      </section>

      <section id="benchmarks" className="surface-card reference-panel">
        <Eyebrow>Comparison records</Eyebrow>
        <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Comparison records table">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-[color:var(--surface-border)] text-xs uppercase tracking-wide text-foreground-muted">
              <tr><th className="pb-3">Benchmark</th><th className="pb-3">Annual value</th><th className="pb-3">Year</th><th className="pb-3">Source</th></tr>
            </thead>
            <tbody>
              {benchmarks.map((benchmark) => (
                <tr key={benchmark.key} className="border-b border-[color:var(--surface-border)] last:border-0">
                  <td className="py-3 font-semibold text-foreground">{benchmark.label}</td>
                  <td className="py-3">{benchmark.perCapitaTonnes.toFixed(1)} t CO₂e / capita</td>
                  <td className="py-3">{benchmark.year ?? 'Not specified'}</td>
                  <td className="py-3 font-mono text-xs">{benchmark.sourceId ?? 'Not specified'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

        <section className="surface-card reference-panel">
          <Eyebrow>Static evidence artifacts</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            Figures and their manifests are packaged with the static site. A manifest reports build metadata; the
            browser verifier compares downloaded bytes against the published SHA-256 value.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="action-link" href="/manifests">Open the Evidence library</Link>
            <a className="action-link" href="/artifacts/" target="_blank" rel="noreferrer">Browse raw artifacts</a>
          </div>
          <Disclosure summary="Curation rule">
            A factor must have a finite resolved value, matching activity unit, source registry citation, region,
            scope boundary, GWP horizon, and vintage. Demo sources are rejected during generation.
          </Disclosure>
        </section>
      </aside>

      <section id="registry" className="surface-card reference-panel methodology__registry">
        <Eyebrow>Source registry</Eyebrow>
        <p className="mt-3 text-foreground-muted">
          This ordered list is generated from published calculator records; it is not maintained separately in page
          copy. Every result displays the applicable subset.
        </p>
        <div className="reference-scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Source registry entries">
          <SourceList
            sourceIds={sourcePairs.map(([sourceId]) => sourceId)}
            citations={sourcePairs.map(([, citation]) => citation)}
            urls={sourcePairs.map(([, , url]) => url)}
          />
        </div>
      </section>

      <section
        className="reference-panel methodology__owid"
        data-panel-scroll
        tabIndex={0}
        role="region"
        aria-label="Global emissions context"
      >
        <OwidContextCard />
        <div className="surface-card">
          <Eyebrow>Offline release metadata</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            This context is released as checked-in static bytes. The release manifest records the input and authority
            digests used by the public site; it does not turn OWID data into a calculator factor.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><dt className="metric-label">Release schema</dt><dd className="font-mono text-sm">{releaseDataJson.schemaVersion}</dd></div>
            <div><dt className="metric-label">Release generated</dt><dd className="font-mono text-sm">{releaseDataJson.generatedAt}</dd></div>
            <div><dt className="metric-label">OWID status</dt><dd className="font-mono text-sm">{releaseDataJson.owid.status}</dd></div>
          </dl>
        </div>
      </section>
      </div>
      <TabFooter>
        <div className="tab-footerbar__group">
          <a className="text-link" href="#primer">Primer</a>
          <a className="text-link" href="#benchmarks">Benchmarks</a>
          <a className="text-link" href="#registry">Registry</a>
        </div>
        <div className="tab-footerbar__group">
          <span className="tab-footerbar__meta">Generated <strong>{releaseDataJson.generatedAt}</strong></span>
        </div>
      </TabFooter>
    </div>
  )
}
