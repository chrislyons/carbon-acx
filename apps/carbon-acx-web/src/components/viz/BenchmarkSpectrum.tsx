import { comparisonToBenchmark, type Benchmark } from '@/lib/calculator'

export function BenchmarkSpectrum({
  totalEmissions,
  benchmark,
}: {
  totalEmissions: number
  benchmark: Benchmark
}) {
  const percentage = comparisonToBenchmark(totalEmissions, benchmark)
  const cappedPercentage = Math.min(100, Math.max(0, percentage))
  const overflowPercentage = Math.max(0, percentage - 100)

  return (
    <figure className="benchmark-spectrum" aria-labelledby="benchmark-spectrum-title">
      <figcaption id="benchmark-spectrum-title">
        Worksheet position against the selected benchmark: {percentage.toFixed(1)}%
      </figcaption>
      <div className="benchmark-spectrum__plot" role="img" aria-label={`${percentage.toFixed(1)}% of the selected benchmark`}>
        <div className="benchmark-spectrum__track">
          <span className="benchmark-spectrum__fill" style={{ width: `${cappedPercentage}%` }} />
          {overflowPercentage > 0 ? <span className="benchmark-spectrum__overflow" style={{ width: `${Math.min(overflowPercentage, 50)}%` }} /> : null}
        </div>
        <span className="benchmark-spectrum__marker benchmark-spectrum__marker--worksheet" style={{ left: `${cappedPercentage}%` }}>
          Worksheet {percentage.toFixed(1)}%
        </span>
        <span className="benchmark-spectrum__marker benchmark-spectrum__marker--benchmark" style={{ left: '100%' }}>
          Benchmark 100%
        </span>
        <div className="benchmark-spectrum__ticks" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((tick) => <span key={tick}>{tick}%</span>)}
        </div>
      </div>
      {overflowPercentage > 0 ? <p className="benchmark-spectrum__overflow-note">Overflow above 100%: {overflowPercentage.toFixed(1)} percentage points.</p> : null}
    </figure>
  )
}
