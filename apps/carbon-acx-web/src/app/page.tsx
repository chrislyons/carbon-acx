import { BookOpenText, ScanSearch, ShoppingBasket } from 'lucide-react'
import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'
import { ACTIVITIES, CATALOG_ACTIVITIES } from '@/lib/calculator'

const publishedCalculatorCount = ACTIVITIES.filter((activity) => activity.evidence.publicationStatus === 'published').length
const publishedCatalogueCount = CATALOG_ACTIVITIES.filter((activity) => activity.evidence.publicationStatus === 'published').length
const unavailableCatalogueCount = CATALOG_ACTIVITIES.length - publishedCatalogueCount

export default function HomePage() {
  return (
    <div className="editorial-page home-page workspace">
      <header className="trace-intro">
        <p className="section-kicker">Trace one published estimate</p>
        <h1 id="trace-title">Compare a year of travel</h1>
        <p>Change the travel mode or annual distance; the quantity, factor, boundary, and sources stay attached.</p>
      </header>
      <TraceEstimate />
      <section className="editorial-jobs ruled-section" aria-label="Continue with Carbon ACX">
        <ol>
          <li>
            <BookOpenText aria-hidden="true" className="job-path__icon" size={26} />
            <p className="section-kicker">Read the method</p>
            <h2>Understand the estimate</h2>
            <p>Follow quantity × factor through boundary, region, vintage, uncertainty, and missing evidence.</p>
            <Link className="text-link text-link--primary" href="/methodology#primer">Read the six-step method</Link>
            <small>{ACTIVITIES.length} calculator records</small>
          </li>
          <li>
            <ShoppingBasket aria-hidden="true" className="job-path__icon" size={26} />
            <p className="section-kicker">Build a worksheet</p>
            <h2>Carry the estimate forward</h2>
            <p>Open an editable annual worksheet and keep each activity’s factor and source trail attached.</p>
            <Link className="text-link" href="/calculator">Build the worksheet</Link>
            <small>{publishedCalculatorCount} published calculator activities</small>
          </li>
          <li>
            <ScanSearch aria-hidden="true" className="job-path__icon" size={26} />
            <p className="section-kicker">Inspect the record</p>
            <h2>Browse coverage and evidence</h2>
            <p>Review normalized coverage and publication status before comparing a compatible unit.</p>
            <Link className="text-link" href="/explore">Inspect the Activity Atlas</Link>
            <small>{CATALOG_ACTIVITIES.length} records · {publishedCatalogueCount} published · {unavailableCatalogueCount} not available</small>
          </li>
        </ol>
      </section>
    </div>
  )
}
