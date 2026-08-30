import type { ReactNode } from 'react'
import { getRouteMeta, type RouteId } from '@/components/layout/routeMeta'

export interface TabHeaderProps {
  route: RouteId
  title?: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}

export function TabHeader({ route, title, description, meta, actions }: TabHeaderProps) {
  const routeMeta = getRouteMeta(route)
  const Icon = routeMeta.icon

  return (
    <header className="tab-headerbar">
      <div className="tab-headerbar__identity">
        <Icon aria-hidden="true" size={22} strokeWidth={2} />
        <div>
          <p className="section-kicker">{description ?? routeMeta.cue}</p>
          <h1 className="tab-headerbar__title">{title ?? routeMeta.label}</h1>
        </div>
      </div>
      <div className="tab-headerbar__right">
        {meta ? <div className="tab-headerbar__meta" aria-live="polite">{meta}</div> : null}
        {actions ? <div className="tab-headerbar__actions">{actions}</div> : null}
      </div>
    </header>
  )
}
