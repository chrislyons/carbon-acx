import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Eyebrow, VerifyArtifactButton } from '@/components/content'
import { TabHeader } from '@/components/layout/TabHeader'
import { getAllManifestIds, getManifest, getManifests } from '@/lib/manifests'

interface ManifestDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return (await getAllManifestIds()).map((id) => ({ id }))
}

export default async function ManifestDetailPage({ params }: ManifestDetailPageProps) {
  const { id } = await params
  const [manifest, manifestItems] = await Promise.all([getManifest(id), getManifests()])
  if (!manifest) notFound()
  const manifestItem = manifestItems.find((item) => item.id === id)
  if (!manifestItem) notFound()
  const rawManifest = `/artifacts/${manifestItem.manifest_path}`
  const rawFigure = `/artifacts/${manifest.figure_path}`
  const rawReferences = `/artifacts/${manifest.references.path}`

  return (
    <div className="page-shell reading-page manifest-detail-page">
      <TabHeader
        route="evidence"
        title={manifest.figure_id}
        meta={
          <>
            <span>SHA-256 <strong>{manifest.hash_prefix}</strong></span>
            <span className="mono">{manifest.figure_path}</span>
          </>
        }
        actions={<Link className="action-link" href="/evidence"><ArrowLeft aria-hidden="true" size={15} />Back to Evidence</Link>}
      />

      <p className="manifest-detail__method">{manifest.figure_method} · schema {manifest.schema_version} · generated {manifest.generated_at}</p>
      <div className="manifest-detail__grid">
        <article className="surface-card">
          <Eyebrow>Byte hash</Eyebrow>
          <h2>SHA-256 of the published figure</h2>
          <code className="manifest-detail__hash">{manifest.figure_sha256}</code>
          <div className="manifest-detail__verify"><VerifyArtifactButton artifactPath={manifest.figure_path} expectedHash={manifest.figure_sha256} /></div>
          <p className="text-sm">The browser downloads the raw static figure, hashes its bytes, and compares that digest with the manifest value.</p>
        </article>
        <article className="surface-card">
          <Eyebrow>Reported build metadata</Eyebrow>
          <h2>Numeric invariance</h2>
          <dl className="manifest-detail__facts">
            <div><dt>Build-reported status</dt><dd>{manifest.numeric_invariance.passed ? 'Passed' : 'Failed'}</dd></div>
            <div><dt>Tolerance</dt><dd>{manifest.numeric_invariance.tolerance_percent}%</dd></div>
            <div><dt>Hash prefix</dt><dd className="mono">{manifest.hash_prefix}</dd></div>
          </dl>
          <p className="text-sm">This is manifest-supplied build metadata, not a separate browser calculation.</p>
        </article>
      </div>

      <section className="surface-card manifest-detail__raw">
        <Eyebrow>Raw static files</Eyebrow>
        <div className="manifest-detail__links">
          <a className="action-link" href={rawManifest} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={15} />Raw manifest JSON</a>
          <a className="action-link" href={rawFigure} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={15} />Raw figure</a>
          <a className="action-link" href={rawReferences} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={15} />Raw references</a>
        </div>
      </section>

      <section className="surface-card manifest-detail__references">
        <Eyebrow>Reference order</Eyebrow>
        <p className="text-sm">Exact source IDs appear in the order supplied by this manifest.</p>
        <ol>
          {manifest.references.order.map((reference) => (
            <li key={`${reference.index}-${reference.source_id}`}><span className="mono">{reference.index}</span><code>{reference.source_id}</code></li>
          ))}
        </ol>
        <dl className="manifest-detail__facts">
          <div><dt>References file hash</dt><dd className="mono">{manifest.references.sha256}</dd></div>
          <div><dt>Reference lines</dt><dd>{manifest.references.line_count}</dd></div>
        </dl>
      </section>
    </div>
  )
}
