import Link from 'next/link'
import {
  ACTIVITIES,
  CATEGORY_INFO,
  type ActivityCategory,
  getActivitiesByCategory,
} from '@/lib/calculator'

const categoryOrder: ActivityCategory[] = ['transport', 'food', 'digital', 'home', 'shopping']

const categorySummaries = categoryOrder.map((category) => {
  const activities = getActivitiesByCategory(category)
  const factors = activities.map((a) => a.emissionFactor)
  return {
    category,
    info: CATEGORY_INFO[category],
    count: activities.length,
    minFactor: Math.min(...factors),
    maxFactor: Math.max(...factors),
    unit: activities[0]?.unit ?? '',
  }
})

const routes = [
  {
    href: '/calculator',
    label: 'Calculator',
    kicker: 'activity inputs + real factors',
    description: 'Estimate emissions from tracked activities using the generated calculator dataset.',
  },
  {
    href: '/manifests',
    label: 'Manifests',
    kicker: 'hashes + provenance',
    description: 'Inspect dataset lineage, artifact integrity, and publication references.',
  },
  {
    href: '/explore',
    label: 'Explore',
    kicker: 'visualization hub',
    description: 'Navigate spatial, scenario, and comparative views of emissions data.',
  },
] as const

export default function HomePage() {
  return (
    <div className="page-shell pb-8 pt-5 sm:pt-6">
      {/* Dashboard header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
            Carbon ACX
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            <span className="font-mono text-xs font-medium text-[color:var(--accent-primary)]">
              {ACTIVITIES.length}
            </span>{' '}
            activities{' '}
            <span className="text-[color:var(--text-subtle)]">/</span>{' '}
            <span className="font-mono text-xs font-medium text-[color:var(--accent-primary)]">
              {categorySummaries.length}
            </span>{' '}
            categories{' '}
            <span className="text-[color:var(--text-subtle)]">/</span>{' '}
            manifest-first
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="action-link action-link-primary" href="/calculator">
            Calculator
          </Link>
          <Link className="action-link" href="/manifests">
            Manifests
          </Link>
          <Link className="action-link" href="/explore">
            Explore
          </Link>
        </div>
      </section>

      {/* Category metric grid */}
      <section className="mt-5">
        <p className="section-kicker">Coverage</p>
        <div className="mt-2 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {categorySummaries.map(({ category, info, count, minFactor, maxFactor }) => (
            <div
              key={category}
              className="surface-card"
              style={{ borderColor: `${info.color}28` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">{info.emoji}</span>
                <span className="text-sm font-medium text-foreground">{info.name}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-xl font-semibold text-foreground">{count}</span>
                <span className="metric-label" style={{ marginTop: 0 }}>activities</span>
              </div>
              <div className="mt-1 font-mono text-xs text-[color:var(--text-subtle)]">
                {minFactor.toLocaleString()}&ndash;{maxFactor.toLocaleString()} g/unit
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Route cards */}
      <section className="mt-6">
        <p className="section-kicker">Surfaces</p>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="surface-card flex flex-col gap-2 transition-colors hover:border-[color:var(--surface-border-strong)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="section-kicker">{route.kicker}</span>
                  <h2 className="mt-0.5 text-base font-semibold text-foreground">{route.label}</h2>
                </div>
                <span className="font-mono text-sm text-[color:var(--text-subtle)]" aria-hidden="true">
                  &rarr;
                </span>
              </div>
              <p className="text-sm text-[color:var(--text-muted)] leading-relaxed">
                {route.description}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/explore/3d" className="quiet-link hover:text-foreground">
            3D Universe &rarr;
          </Link>
          <Link href="/explore/worlds" className="quiet-link hover:text-foreground">
            Carbon Worlds &rarr;
          </Link>
        </div>
      </section>

      {/* Provenance footer */}
      <section className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--text-subtle)]">
        <span>Manifest-first</span>
        <span className="hidden sm:inline">/</span>
        <span>Byte hashes</span>
        <span className="hidden sm:inline">/</span>
        <span>Reproducible derivation</span>
        <span className="hidden sm:inline">/</span>
        <span>Open source</span>
        <span className="hidden sm:inline">&middot;</span>
        <Link href="/methodology" className="quiet-link underline decoration-[color:var(--surface-border)] underline-offset-2">
          Methodology
        </Link>
      </section>
    </div>
  )
}
