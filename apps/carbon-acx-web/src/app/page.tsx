import { BookOpenText, ScanSearch, ShoppingBasket } from 'lucide-react'
import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'
import { ACTIVITIES, CATALOG_ACTIVITIES } from '@/lib/calculator'

const publishedCalculatorCount = ACTIVITIES.filter((activity) => activity.evidence.publicationStatus === 'published').length
const publishedCatalogueCount = CATALOG_ACTIVITIES.filter((activity) => activity.evidence.publicationStatus === 'published').length
const unavailableCatalogueCount = CATALOG_ACTIVITIES.length - publishedCatalogueCount

/**
 * Modular home panels. The headline is the active panel's title; adding a
 * future interactive panel means appending an entry here (and later turning
 * the headline itself into the selector).
 */
const HOME_PANELS = [
  {
    id: 'commute',
    title: 'Your annual commute.',
    lede: 'Drag the marker or switch vehicle class — the factor, boundary, and sources stay attached.',
    Component: TraceEstimate,
  },
] as const

const activePanel = HOME_PANELS[0]

export default function HomePage() {
  const Panel = activePanel.Component
  return (
    <div className="editorial-page home-page app-stage">
      <header className="trace-intro">
        <p className="section-kicker">Trace one number</p>
        <h1 id="trace-title">{activePanel.title}</h1>
        <p>{activePanel.lede}</p>
      </header>
      <Panel />
      <section className="editorial-jobs ruled-section" aria-label="Go further with Carbon ACX">
        <article>
          <BookOpenText aria-hidden="true" className="job-path__icon" size={30} />
          <p className="section-kicker">Learn</p>
          <h2>How the number is built</h2>
          <p>The six-question primer turns any result into a readable story — boundary, region, vintage, and sources.</p>
          <Link className="text-link text-link--primary" href="/methodology#primer">Open the primer</Link>
          <small>7 compatible benchmarks</small>
        </article>
        <article>
          <ShoppingBasket aria-hidden="true" className="job-path__icon" size={30} />
          <p className="section-kicker">Build</p>
          <h2>Estimate a full year</h2>
          <p>Take this estimate into the calculator and stack activities into an annual worksheet — every line keeps its factor and source trail.</p>
          <Link className="text-link" href="/calculator">Open the calculator</Link>
          <small>{publishedCalculatorCount} published calculator activities</small>
        </article>
        <article>
          <ScanSearch aria-hidden="true" className="job-path__icon" size={30} />
          <p className="section-kicker">Inspect</p>
          <h2>Verify the evidence</h2>
          <p>Every Atlas record carries its boundary, geography, vintage, uncertainty, and citations — no invisible assumptions.</p>
          <Link className="text-link" href="/explore">Browse the Activity Atlas</Link>
          <small>{CATALOG_ACTIVITIES.length} catalogue records · {publishedCatalogueCount} published · {unavailableCatalogueCount} unavailable</small>
        </article>
      </section>
    </div>
  )
}
