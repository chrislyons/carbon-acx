import Link from 'next/link'
import type { Benchmark } from '@/lib/calculator'

export function BenchmarkContext({ benchmark, percentage }: { benchmark: Benchmark; percentage: number }) {
  const year = benchmark.year ?? 'Not specified'
  const geography = [benchmark.regionCode ?? 'Not specified', benchmark.scope ?? 'Not specified'].join(' · ')

  return (
    <section className="benchmark-context" aria-label="Why this matters">
      <p className="section-kicker">Why this matters</p>
      <h3>{benchmark.label}</h3>
      <p>
        This worksheet is {percentage.toFixed(1)}% of the selected per-capita annual scale. The comparison is context,
        not a direct organizational inventory.
      </p>
      <dl>
        <div><dt>Geography / scope</dt><dd>{geography}</dd></div>
        <div><dt>Year</dt><dd>{year}</dd></div>
        <div><dt>Annual per-capita value</dt><dd>{benchmark.perCapitaTonnes.toFixed(1)} t CO₂e / capita</dd></div>
        <div><dt>Accounting basis</dt><dd>{benchmark.accountingBasis}</dd></div>
        <div><dt>Land-use change</dt><dd>{benchmark.landUseChange}</dd></div>
        <div><dt>Notes</dt><dd>{benchmark.notes ?? 'Not specified'}</dd></div>
      </dl>
      <ul className="benchmark-context__sources">
        <li><span>Emissions source</span>{reference(benchmark.sourceCitation, benchmark.sourceUrl)}</li>
        <li><span>Population source</span>{reference(benchmark.populationCitation, benchmark.populationSourceUrl)}</li>
      </ul>
      <p><Link className="text-link" href="/methodology#benchmarks">Read the compatible benchmark method</Link></p>
      <p className="benchmark-context__caveat">Context only: this is a territorial/production-based per-capita scale, not a direct organizational or peer comparison.</p>
    </section>
  )
}

function reference(citation: string | null, url: string | null) {
  if (!citation) return 'Not specified'
  return url ? <a href={url} target="_blank" rel="noreferrer">{citation}</a> : citation
}
