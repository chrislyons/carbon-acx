import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'

export default function HomePage() {
  return <div className="editorial-page">
    <TraceEstimate />
    <section className="editorial-fork ruled-section" aria-label="Choose a next step">
      <article><p className="section-kicker">Build a worksheet</p><h2>Estimate an activity pattern</h2><p>Choose published activities you recognize. The worksheet keeps each quantity × factor calculation visible and leaves unknown inputs out of the total.</p><Link className="text-link text-link--primary" href="/calculator">Estimate an activity pattern</Link></article>
      <article><p className="section-kicker">Read the catalogue</p><h2>Explore the evidence catalogue</h2><p>Browse household activities separately from Canadian systems and industrial layers. A data gap is shown as a gap—not as a numeric zero.</p><Link className="text-link" href="/explore">Explore the evidence catalogue</Link></article>
    </section>
  </div>
}
