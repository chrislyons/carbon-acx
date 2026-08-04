import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'

export default function HomePage() {
  return (
    <div className="editorial-page">
      <TraceEstimate />
      <section className="editorial-jobs ruled-section" aria-label="Choose how to use Carbon ACX">
        <article>
          <p className="section-kicker">Understand</p>
          <h2>Understand a carbon estimate</h2>
          <p>Learn what the equation measures, how boundaries shape it, and how to read evidence without mistaking a screening estimate for an inventory.</p>
          <Link className="text-link text-link--primary" href="/methodology#primer">Understand a carbon estimate</Link>
        </article>
        <article>
          <p className="section-kicker">Estimate</p>
          <h2>Estimate an activity</h2>
          <p>Build an editable annual worksheet from published activity records. Every included quantity keeps its factor and source trail visible.</p>
          <Link className="text-link" href="/calculator">Estimate an activity</Link>
        </article>
        <article>
          <p className="section-kicker">Inspect</p>
          <h2>Inspect the evidence</h2>
          <p>Browse the Activity Atlas by layer and inspect record-level boundary, geography, vintage, uncertainty, and source links.</p>
          <Link className="text-link" href="/explore">Inspect the evidence</Link>
        </article>
      </section>
    </div>
  )
}
