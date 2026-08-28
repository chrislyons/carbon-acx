import type { ReactNode } from 'react'

/**
 * TabHeader — the per-tab status bar, normalized across every non-home tab.
 * 54px (3.375rem), sticky directly below the site topbar. Carries the tab
 * title (page h1, distilled from the former hero) plus live tab-relevant
 * status meta (running tally, filtered counts, dataset identity, ...).
 */
export function TabHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="tab-headerbar">
      <h1 className="tab-headerbar__title">{title}</h1>
      {meta ? <div className="tab-headerbar__meta">{meta}</div> : null}
    </div>
  )
}
