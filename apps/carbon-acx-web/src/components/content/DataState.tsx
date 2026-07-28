import type { ReactNode } from 'react'

interface DataStateProps {
  title: string
  children: ReactNode
  tone?: 'default' | 'warning' | 'error'
}

export function DataState({ title, children, tone = 'default' }: DataStateProps) {
  return (
    <section className={`data-state data-state--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  )
}
