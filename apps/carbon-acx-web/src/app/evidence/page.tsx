import Link from 'next/link'
import releaseDataJson from '@/generated/release-data.json'
import { DataState, Disclosure, Eyebrow, OwidContextCard, SourceList } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { TabFooter } from '@/components/layout/TabFooter'
import { getManifests } from '@/lib/manifests'
import { ACTIVITIES, CALCULATOR_DATASET, getBenchmarkOptions } from '@/lib/calculator'

const sourcePairs = ACTIVITIES.flatMap((activity) =>
  activity.evidence.sourceIds.map((sourceId, index) => [
    sourceId,
    activity.evidence.sourceCitations[index],
    activity.evidence.sourceUrls[index] ?? null,
  ] as const),
).filter(([sourceId], index, all) => all.findIndex(([candidate]) => candidate === sourceId) === index)

export default async function EvidencePage() {
  const manifests = await getManifests()
  const benchmarks = getBenchmarkOptions()

  return (
    <div className="page-shell evidence-page app-stage">
      <TabHeader
        title="Evidence"
        meta={
          <>
            <span><strong>{manifests.length}</strong> manifests</span>
            <span><strong>{sourcePairs.length}</strong> sources</span>
            <span><strong>{benchmarks.length}</strong> benchmarks</span>
          </>
        }
      />
      <div className="evidence-layout">
        <section id="manifests" className="evidence-panel">
          <Eyebrow>Figure manifests</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            Figures and their manifests are packaged with the static site. A manifest reports build metadata; the
            browser verifier compares downloaded bytes against the published SHA-256 value.
          </p>
          {manifests.length === 0 ? (
            <div className="mt-4"><DataState title="No manifests are packaged">Run <code>make build</code> before creating the static bundle.</DataState></div>
          ) : (
            <div className="manifest-list">
              {manifests.map((manifest) => (
                <Link key={manifest.id} href={`/evidence/${manifest.id}`} className="surface-card block hover:border-[color:var(--surface-border-strong)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{manifest.figure_id}</h2>
                      <p className="mt-1 font-mono text-xs text-foreground-muted">{manifest.figure_path}</p>
                    </div>
                    <span className="font-mono text-xs text-[color:var(--accent-primary)]">{manifest.hash_prefix}</span>
                  </div>
                  <p className="mt-3 text-sm text-foreground-muted">Generated {manifest.generated_at}. Open static metadata and raw artifact links &rarr;</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="sources" className="surface-card reference-panel">
          <Eyebrow>Source registry</Eyebrow>
          <p className="mt-3 text-foreground-muted">
            This ordered list is generated from published calculator records; it is not maintained separately in page
            copy. Every result displays the applicable subset.
          </p>
          <div className="reference-scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Source registry entries">
            <SourceList
              sourceIds={sourcePairs.map(([sourceId]) => sourceId)}
              citations={sourcePairs.map(([, citation]) => citation)}
              urls={sourcePairs.map(([, , url]) => url)}
            />
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
            Current Canadian and provincial comparisons are 2023 territorial / production-based emissions excluding
            LULUCF. Consumption and equity measures are not mixed into this selector.
          </Disclosure>
        </section>

        <section id="dataset" className="surface-card reference-panel">
          <Eyebrow>Generated metadata</Eyebrow>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><dt className="metric-label">Dataset version</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.schemaVersion}</dd></div>
            <div><dt className="metric-label">Generated</dt><dd className="font-mono text-sm">{CALCULATOR_DATASET.generatedAt}</dd></div>
            <div><dt className="metric-label">Published calculator activities</dt><dd className="font-mono text-sm">{ACTIVITIES.length}</dd></div>
          </dl>
          <div className="mt-4">
            <a className="text-link" href="/data/stream-catalog.json">Open the data-stream catalog</a>
          </div>
          <Disclosure summary="Curation rule">
            A factor must have a finite resolved value, matching activity unit, source registry citation, region,
            scope boundary, GWP horizon, and vintage. Demo sources are rejected during generation.
          </Disclosure>
        </section>

        <section
          id="global"
          className="reference-panel evidence-global"
          data-panel-scroll
          tabIndex={0}
          role="region"
          aria-label="Global emissions context and release"
        >
          <OwidContextCard />
          <div className="surface-card">
            <Eyebrow>Offline release metadata</Eyebrow>
            <p className="mt-3 text-foreground-muted">
              This context is released as checked-in static bytes. The release manifest records the input and authority
              digests used by the public site; it does not turn OWID data into a calculator factor.
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><dt className="metric-label">Release schema</dt><dd className="font-mono text-sm">{releaseDataJson.schemaVersion}</dd></div>
              <div><dt className="metric-label">Release generated</dt><dd className="font-mono text-sm">{releaseDataJson.generatedAt}</dd></div>
              <div><dt className="metric-label">OWID status</dt><dd className="font-mono text-sm">{releaseDataJson.owid.status}</dd></div>
            </dl>
          </div>
        </section>
      </div>
      <TabFooter>
        <div className="tab-footerbar__group">
          <a className="text-link" href="#manifests">Manifests</a>
          <a className="text-link" href="#sources">Sources</a>
          <a className="text-link" href="#benchmarks">Benchmarks</a>
          <a className="text-link" href="#global">Global</a>
        </div>
        <div className="tab-footerbar__group">
          <a className="text-link" href="/artifacts/" target="_blank" rel="noreferrer">Browse raw artifacts</a>
          <span className="tab-footerbar__meta">Generated <strong>{releaseDataJson.generatedAt}</strong></span>
        </div>
      </TabFooter>
    </div>
  )
}
