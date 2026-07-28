import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Eyebrow, VerifyArtifactButton } from '@/components/content'
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
    <div className="page-shell max-w-5xl py-10 sm:py-14">
      <Link href="/manifests" className="quiet-link text-sm font-semibold text-[color:var(--accent-primary)]">← Evidence library</Link>
      <div className="mt-5">
        <Eyebrow>Static artifact manifest</Eyebrow>
        <h1 className="section-title">{manifest.figure_id}</h1>
        <p className="mt-3 text-foreground-muted">{manifest.figure_method} · generated {manifest.generated_at} · schema {manifest.schema_version}</p>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="surface-card">
          <Eyebrow>Byte hash</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-foreground">SHA-256 of the published figure</h2>
          <code className="mt-4 block break-all rounded-md bg-[color:var(--code-bg)] p-3 text-xs text-foreground">{manifest.figure_sha256}</code>
          <div className="mt-5"><VerifyArtifactButton artifactPath={manifest.figure_path} expectedHash={manifest.figure_sha256} /></div>
          <p className="mt-4 text-sm text-foreground-muted">The browser downloads the raw static figure, hashes its bytes, and compares that digest with the manifest value.</p>
        </article>
        <article className="surface-card">
          <Eyebrow>Reported build metadata</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Numeric invariance</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div><dt className="metric-label">Build-reported status</dt><dd>{manifest.numeric_invariance.passed ? 'Passed' : 'Failed'}</dd></div>
            <div><dt className="metric-label">Tolerance</dt><dd>{manifest.numeric_invariance.tolerance_percent}%</dd></div>
            <div><dt className="metric-label">Hash prefix</dt><dd className="font-mono">{manifest.hash_prefix}</dd></div>
          </dl>
          <p className="mt-5 text-sm text-foreground-muted">This is manifest-supplied build metadata, not a separate browser calculation.</p>
        </article>
      </section>

      <section className="mt-6 surface-card">
        <Eyebrow>Raw static files</Eyebrow>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="action-link" href={rawManifest} target="_blank" rel="noreferrer">Raw manifest JSON</a>
          <a className="action-link" href={rawFigure} target="_blank" rel="noreferrer">Raw figure</a>
          <a className="action-link" href={rawReferences} target="_blank" rel="noreferrer">Raw references</a>
        </div>
      </section>

      <section className="mt-6 surface-card">
        <Eyebrow>Reference order</Eyebrow>
        <p className="mt-3 text-sm text-foreground-muted">Exact source IDs appear in the order supplied by this manifest.</p>
        <ol className="mt-5 grid gap-3">
          {manifest.references.order.map((reference) => (
            <li key={`${reference.index}-${reference.source_id}`} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[color:var(--surface-border)] pb-3 last:border-0">
              <span className="font-mono text-sm text-[color:var(--accent-primary)]">{reference.index}</span>
              <code className="break-all text-sm text-foreground">{reference.source_id}</code>
            </li>
          ))}
        </ol>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="metric-label">References file hash</dt><dd className="break-all font-mono text-xs">{manifest.references.sha256}</dd></div>
          <div><dt className="metric-label">Reference lines</dt><dd>{manifest.references.line_count}</dd></div>
        </dl>
      </section>
    </div>
  )
}
