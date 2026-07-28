import Link from 'next/link'
import { DataState, Eyebrow } from '@/components/content'
import { getManifests } from '@/lib/manifests'

export default async function ManifestsPage() {
  const manifests = await getManifests()

  return (
    <div className="page-shell max-w-5xl py-10 sm:py-14">
      <Eyebrow>Evidence library</Eyebrow>
      <h1 className="section-title">Static figure manifests.</h1>
      <p className="section-copy mt-4 max-w-3xl">
        Each record links a figure to a hash, build-reported invariance metadata, and source IDs. Open a record to
        inspect raw static files or verify the downloaded figure bytes in your browser.
      </p>

      {manifests.length === 0 ? (
        <div className="mt-8"><DataState title="No manifests are packaged">Run <code>make build</code> before creating the static bundle.</DataState></div>
      ) : (
        <div className="manifest-list">
          {manifests.map((manifest) => (
            <Link key={manifest.id} href={`/manifests/${manifest.id}`} className="surface-card block hover:border-[color:var(--surface-border-strong)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{manifest.figure_id}</h2>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">{manifest.figure_path}</p>
                </div>
                <span className="font-mono text-xs text-[color:var(--accent-primary)]">{manifest.hash_prefix}</span>
              </div>
              <p className="mt-3 text-sm text-foreground-muted">Generated {manifest.generated_at}. Open static metadata and raw artifact links →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
