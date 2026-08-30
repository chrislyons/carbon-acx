import { BadgeCheck, BookOpenText, ExternalLink, FileJson, Globe2 } from 'lucide-react'
import Link from 'next/link'
import releaseDataJson from '@/generated/release-data.json'
import { DataState, Disclosure, Eyebrow, OwidContextCard, SourceRegistry } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { getManifests } from '@/lib/manifests'
import { ACTIVITIES, CALCULATOR_DATASET, CATALOG_ACTIVITIES, getBenchmarkOptions } from '@/lib/calculator'
import { buildSourceRegistry } from '@/lib/sources'

export default async function EvidencePage() {
  const manifests = await getManifests()
  const benchmarks = getBenchmarkOptions()
  const sourceRegistry = buildSourceRegistry()
  const publishedRecordCount = CATALOG_ACTIVITIES.filter((record) => record.evidence.publicationStatus === 'published').length

  return (
    <div className="page-shell evidence-page reading-page">
      <TabHeader
        route="evidence"
        meta={
          <>
            <span>Generated <strong>{releaseDataJson.generatedAt}</strong></span>
            <span><strong>{manifests.length}</strong> versioned artifacts</span>
          </>
        }
        actions={
          <a className="action-link" href="/artifacts/" target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={15} />Raw artifacts</a>
        }
      />
      <nav className="in-content-subnav in-content-subnav--expanded" aria-label="Evidence sections">
        <a href="#sources"><BadgeCheck aria-hidden="true" size={15} />Sources</a>
        <a href="#benchmarks"><BookOpenText aria-hidden="true" size={15} />Benchmarks</a>
        <a href="#global"><Globe2 aria-hidden="true" size={15} />Global context</a>
        <a href="#release"><FileJson aria-hidden="true" size={15} />Release</a>
        <a href="#manifests"><FileJson aria-hidden="true" size={15} />Manifests</a>
      </nav>
      <ol className="trust-path" aria-label="Evidence trust path">
        <li><span>01</span><strong>Published records</strong><small>{publishedRecordCount} available catalog records</small></li>
        <li><span>02</span><strong>Registered sources</strong><small>{sourceRegistry.summary.registeredCount} source entries · {sourceRegistry.summary.calculatorReferencedSourceCount} Calculator-referenced · {sourceRegistry.summary.atlasReferencedSourceCount} Atlas-referenced · {sourceRegistry.summary.scenarioReferencedSourceCount} scenario-referenced</small></li>
        <li><span>03</span><strong>Context/benchmarks</strong><small>{benchmarks.length} compatible comparison records plus labelled macro context</small></li>
        <li><span>04</span><strong>Versioned artifacts</strong><small>{manifests.length} browser-verifiable figure manifests</small></li>
      </ol>
      <div className="evidence-layout">
        <section id="sources" className="surface-card reference-panel">
          <Eyebrow>Registered sources</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            Source metadata and usage counts are derived from the generated source envelope and every calculator,
            Atlas, and documented scenario reference.
          </p>
          <div className="mt-4">
            <SourceRegistry entries={sourceRegistry.entries} />
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
          <Disclosure summary="Benchmark basis">
            Current Canadian and provincial comparisons are territorial, production-based emissions excluding LULUCF.
            Consumption and equity measures are not mixed into this selector.
          </Disclosure>
        </section>

        <section id="global" className="reference-panel">
          <OwidContextCard />
          <section id="release" className="surface-card">
            <Eyebrow>Offline release metadata</Eyebrow>
            <p className="mt-3 text-foreground-muted">
              This context is released as checked-in static bytes. The release manifest records input and authority
              digests used by the public site; it does not turn OWID data into a calculator factor or direct benchmark.
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><dt className="metric-label">Release schema</dt><dd className="font-mono text-sm">{releaseDataJson.schemaVersion}</dd></div>
              <div><dt className="metric-label">Release generated</dt><dd className="font-mono text-sm">{releaseDataJson.generatedAt}</dd></div>
              <div><dt className="metric-label">OWID status</dt><dd className="font-mono text-sm">{releaseDataJson.owid.status}</dd></div>
            </dl>
          </section>
        </section>

        <section id="dataset" className="surface-card reference-panel">
          <Eyebrow>Generated dataset</Eyebrow>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><dt className="metric-label">Calculator schema</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.schemaVersion}</dd></div>
            <div><dt className="metric-label">Calculator generated</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.generatedAt}</dd></div>
            <div><dt className="metric-label">Calculator activities</dt><dd className="font-mono text-sm">{ACTIVITIES.length}</dd></div>
          </dl>
          <div className="mt-4">
            <a className="text-link" href="/data/stream-catalog.json"><FileJson aria-hidden="true" size={15} />Open the data-stream catalog</a>
          </div>
        </section>

        <section id="manifests" className="evidence-panel">
          <Eyebrow>Versioned figure manifests</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            Each manifest reports build metadata; its detail page verifies downloaded figure bytes against the
            published SHA-256 value in the browser.
          </p>
          {manifests.length === 0 ? (
            <div className="mt-4"><DataState title="No manifests are packaged">Run <code>make build</code> before creating the static bundle.</DataState></div>
          ) : (
            <div className="manifest-list">
              {manifests.map((manifest) => (
                <Link key={manifest.id} href={`/evidence/${manifest.id}`} className="surface-card manifest-card">
                  <div className="manifest-card__header">
                    <div>
                      <h2>{manifest.figure_id}</h2>
                      <p className="mono">{manifest.figure_path}</p>
                    </div>
                    <span className="mono">{manifest.hash_prefix}</span>
                  </div>
                  <p>Generated {manifest.generated_at}. Open metadata and raw artifact links.</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
