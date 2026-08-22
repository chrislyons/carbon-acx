import type { ReactNode } from 'react'

export type DataStateBadge = 'estimate' | 'modeled' | 'metered' | 'stale-vintage'

const BADGE_LABELS: Record<DataStateBadge, string> = {
  estimate: 'Estimate',
  modeled: 'Modeled',
  metered: 'Metered',
  'stale-vintage': 'Stale vintage',
}

interface DataStateProps {
  title: string
  children: ReactNode
  tone?: 'default' | 'warning' | 'error'
  badge?: DataStateBadge
}

export function DataState({ title, children, tone = 'default', badge }: DataStateProps) {
  return (
    <section className={`data-state data-state--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <h2>
        {badge ? <span className="data-state__chip">{BADGE_LABELS[badge]}</span> : null}
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}
