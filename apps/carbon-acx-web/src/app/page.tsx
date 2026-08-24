import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'

export default function HomePage() {
  return (
    <div className="editorial-page home-page">
      <TraceEstimate />
      <nav className="home-utilities ruled-section" aria-label="Carbon ACX supporting tools">
        <Link className="home-utility" href="/methodology#primer">
          <span className="section-kicker">Method</span>
          <strong>Learn how the equation works</strong>
          <span>See user-authored terms, derived passenger-kilometres, and the published factor separately.</span>
        </Link>
        <Link className="home-utility" href="/explore">
          <span className="section-kicker">Evidence</span>
          <strong>Inspect the evidence library</strong>
          <span>Browse layer choices and open record-level provenance when you want the technical detail.</span>
        </Link>
      </nav>
    </div>
  )
}
