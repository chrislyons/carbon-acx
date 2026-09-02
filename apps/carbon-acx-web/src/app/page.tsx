import { BookOpenText, ScanSearch, ShoppingBasket } from 'lucide-react'
import Link from 'next/link'
import { TraceEstimate } from '@/components/experience/TraceEstimate'

export default function HomePage() {
  return (
    <div className="editorial-page home-page workspace">
      <header className="trace-intro">
        <h1 id="trace-title">Compare a year of travel</h1>
        <p>Change the travel mode or annual distance; the quantity, factor, boundary, and sources stay attached.</p>
      </header>
      <TraceEstimate />
      <section className="editorial-jobs ruled-section" aria-label="Continue with Carbon ACX">
        <ol>
          <li>
            <BookOpenText aria-hidden="true" className="job-path__icon" size={26} />
            <h2><span className="job-path__action">Read the method</span></h2>
            <p>Quantity × factor, boundary, and evidence in one readable path.</p>
            <Link className="text-link text-link--primary" href="/methodology#primer">Open method</Link>
          </li>
          <li>
            <ShoppingBasket aria-hidden="true" className="job-path__icon" size={26} />
            <h2><span className="job-path__action">Build a worksheet</span></h2>
            <p>Edit annual quantities while each factor keeps its source trail.</p>
            <Link className="text-link" href="/calculator">Open worksheet</Link>
          </li>
          <li>
            <ScanSearch aria-hidden="true" className="job-path__icon" size={26} />
            <h2><span className="job-path__action">Inspect the record</span></h2>
            <p>Compare only records with compatible units and known coverage.</p>
            <Link className="text-link" href="/explore">Browse the Atlas</Link>
          </li>
        </ol>
      </section>
    </div>
  )
}
