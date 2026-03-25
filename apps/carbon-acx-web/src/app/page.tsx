import Link from 'next/link'
import { ACTIVITIES, CATEGORY_INFO, type ActivityCategory } from '@/lib/calculator'

const primarySurfaces = [
  {
    href: '/calculator',
    label: 'Calculator',
    meta: 'activity inputs + real factors',
    description: 'Estimate emissions from tracked activities using the generated calculator dataset.',
  },
  {
    href: '/manifests',
    label: 'Manifests',
    meta: 'hashes + provenance',
    description: 'Inspect dataset lineage, artifact integrity, and the references behind each publication step.',
  },
  {
    href: '/explore',
    label: 'Explore',
    meta: 'route hub',
    description: 'Jump into the visualization routes and keep calculator, 3D, and world scenarios in one place.',
  },
  {
    href: '/explore/3d',
    label: '3D Universe',
    meta: 'orbital data view',
    description: 'Navigate the spatial view for comparing emission sources and relationships at a glance.',
  },
  {
    href: '/explore/worlds',
    label: 'Carbon Worlds',
    meta: 'scenario gallery',
    description: 'Review scenario presets and world-building flows without losing the core data product context.',
  },
] as const

const pipelineSteps = [
  'Curate canonical CSV inputs in the dataset.',
  'Validate schemas and relationships in the derivation layer.',
  'Compute figures and calculator outputs from the same source-of-truth data.',
  'Package manifests with hashes, timestamps, and references.',
  'Publish product surfaces that consume the packaged outputs.',
] as const

const provenanceSignals = [
  'Manifest-first artifact publishing',
  'Byte-level hash verification',
  'Reproducible Python derivation pipeline',
  'Open-source review of methods and references',
] as const

const categoryOrder: ActivityCategory[] = ['transport', 'food', 'digital', 'home', 'shopping']

const categorySummaries = categoryOrder.map((category) => ({
  category,
  info: CATEGORY_INFO[category],
  count: ACTIVITIES.filter((activity) => activity.category === category).length,
}))

const headlineStats = [
  { value: String(ACTIVITIES.length), label: 'Tracked activities' },
  { value: String(categorySummaries.length), label: 'Calculator categories' },
  { value: String(primarySurfaces.length), label: 'Primary surfaces' },
  { value: '100%', label: 'Open source' },
] as const

export default function HomePage() {
  return (
    <div className="pb-10 sm:pb-12">
      <section className="page-shell pt-6 sm:pt-8 lg:pt-10">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <div className="surface-card surface-card-accent">
            <p className="section-kicker">Manifest-first carbon accounting</p>
            <h1 className="home-title">Carbon ACX</h1>
            <p className="section-copy text-base sm:text-lg">
              Carbon ACX is a compact product surface for carbon accounting workflows: calculate activity
              emissions, inspect manifests, and move between narrative exploration routes without leaving the
              underlying data contract behind.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="action-link action-link-primary" href="/calculator">
                Open calculator
              </Link>
              <Link className="action-link" href="/manifests">
                Review manifests
              </Link>
              <Link className="action-link" href="/explore">
                Explore routes
              </Link>
            </div>
            <div className="metric-grid mt-6">
              {headlineStats.map((stat) => (
                <div key={stat.label} className="metric-card">
                  <div className="metric-value">{stat.value}</div>
                  <div className="metric-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="surface-card">
            <p className="section-kicker">Delivery pipeline</p>
            <h2 className="section-title text-2xl">One data path, multiple product surfaces.</h2>
            <ol className="pipeline-list mt-5">
              {pipelineSteps.map((step, index) => (
                <li key={step} className="pipeline-step">
                  <span className="pipeline-step-index">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="surface-divider" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="metric-value text-2xl">{ACTIVITIES.length}</div>
                <div className="metric-label">calculator activities</div>
              </div>
              <div>
                <div className="metric-value text-2xl">{categorySummaries.length}</div>
                <div className="metric-label">coverage groups</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="page-shell pt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Primary surfaces</p>
            <h2 className="section-title">Start from the route that matches the job.</h2>
          </div>
          <p className="section-copy max-w-2xl">
            The homepage is a routing layer into calculation, provenance, and exploration. It should get users
            into working product surfaces quickly instead of acting like a marketing landing page.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primarySurfaces.map((surface) => (
            <Link key={surface.href} href={surface.href} className="product-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="section-kicker">{surface.meta}</div>
                  <h3 className="text-xl font-semibold text-foreground">{surface.label}</h3>
                </div>
                <span className="product-card-arrow" aria-hidden="true">
                  /
                </span>
              </div>
              <p className="section-copy">{surface.description}</p>
              <span className="product-card-link">Open route</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell pt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="surface-card">
            <p className="section-kicker">Coverage snapshot</p>
            <h2 className="section-title text-2xl">Calculator categories stay tied to the generated dataset.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {categorySummaries.map(({ category, info, count }) => (
                <div
                  key={category}
                  className="coverage-card"
                  style={{ borderColor: `${info.color}33` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {info.emoji}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{info.name}</div>
                      <div className="metric-label">{count} activities</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card">
            <p className="section-kicker">Provenance</p>
            <h2 className="section-title text-2xl">Trust comes from inspectable outputs.</h2>
            <ul className="detail-list mt-5">
              {provenanceSignals.map((signal) => (
                <li key={signal} className="detail-list-item">
                  <span className="detail-list-marker" aria-hidden="true" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="action-link" href="/methodology">
                Methodology
              </Link>
              <Link className="action-link" href="/manifests">
                Artifact manifests
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
