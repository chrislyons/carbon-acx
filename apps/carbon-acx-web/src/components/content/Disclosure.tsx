import type { ReactNode } from 'react'

interface DisclosureProps {
  summary: string
  children: ReactNode
  open?: boolean
}

export function Disclosure({ summary, children, open = false }: DisclosureProps) {
  return (
    <details className="disclosure" open={open}>
      <summary>{summary}</summary>
      <div className="disclosure__body">{children}</div>
    </details>
  )
}
