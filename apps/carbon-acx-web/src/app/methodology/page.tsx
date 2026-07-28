import Link from 'next/link'
import { Disclosure, Eyebrow, SourceList } from '@/components/content'
import { ACTIVITIES, CALCULATOR_DATASET, getBenchmarkOptions } from '@/lib/calculator'

const sourcePairs = ACTIVITIES.flatMap((activity) =>
  activity.evidence.sourceIds.map((sourceId, index) => [sourceId, activity.evidence.sourceCitations[index]] as const),
).filter(([sourceId], index, all) => all.findIndex(([candidate]) => candidate === sourceId) === index)

export default function MethodologyPage() {
  const benchmarks = getBenchmarkOptions()

  return (
    <div className="page-shell max-w-5xl py-10 sm:py-14">
      <Eyebrow>How we know</Eyebrow>
      <h1 className="section-title max-w-3xl">The published-data contract.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        Carbon ACX derives its public calculator and Activity Atlas from canonical CSV records. A visitor-facing
        estimate is only shown when its factor has a registered source, boundary, region, GWP horizon, and vintage.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
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

      <section className="mt-8 surface-card">
        <Eyebrow>Generated metadata</Eyebrow>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="metric-label">Dataset version</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.schemaVersion}</dd></div>
          <div><dt className="metric-label">Generated</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.generatedAt}</dd></div>
          <div><dt className="metric-label">Published calculator activities</dt><dd className="font-mono text-sm">{ACTIVITIES.length}</dd></div>
        </dl>
      </section>

      <section className="mt-8 surface-card">
        <Eyebrow>Comparison records</Eyebrow>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-[color:var(--surface-border)] text-xs uppercase tracking-wide text-foreground-muted">
              <tr><th className="pb-3">Benchmark</th><th className="pb-3">Annual value</th><th className="pb-3">Year</th><th className="pb-3">Source</th></tr>
            </thead>
            <tbody>
              {benchmarks.map((benchmark) => (
                <tr key={benchmark.key} className="border-b border-[color:var(--surface-border)] last:border-0">
                  <td className="py-3 font-semibold text-foreground">{benchmark.label}</td>
                  <td className="py-3">{benchmark.perCapitaTonnes.toFixed(1)} t CO₂e / capita</td>
                  <td className="py-3">{benchmark.year}</td>
                  <td className="py-3 font-mono text-xs">{benchmark.sourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 surface-card">
        <Eyebrow>Source registry</Eyebrow>
        <p className="mt-3 text-foreground-muted">
          This ordered list is generated from published calculator records; it is not maintained separately in page
          copy. Every result displays the applicable subset.
        </p>
        <div className="mt-4">
          <SourceList sourceIds={sourcePairs.map(([sourceId]) => sourceId)} citations={sourcePairs.map(([, citation]) => citation)} />
        </div>
      </section>

      <section className="mt-8 surface-card">
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
    </div>
  )
}
