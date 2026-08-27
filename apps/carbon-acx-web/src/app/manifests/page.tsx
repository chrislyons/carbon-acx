import Link from 'next/link'
import { DataState } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { getManifests } from '@/lib/manifests'

export default async function ManifestsPage() {
  const manifests = await getManifests()

  return (
    <div className="page-shell manifests-page app-stage">
      <TabHeader
        title="Evidence library"
        meta={<span><strong>{manifests.length}</strong> figure manifests · static bytes, browser-verified</span>}
      />
      {manifests.length === 0 ? (
        <div><DataState title="No manifests are packaged">Run <code>make build</code> before creating the static bundle.</DataState></div>
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
              <p className="mt-3 text-sm text-foreground-muted">Generated {manifest.generated_at}. Open static metadata and raw artifact links &rarr;</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
