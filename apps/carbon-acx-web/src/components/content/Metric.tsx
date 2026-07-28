import type { ReactNode } from 'react'

interface MetricProps {
  label: string
  value: ReactNode
  detail?: ReactNode
}

export function Metric({ label, value, detail }: MetricProps) {
  return (
    <div className="metric">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {detail ? <p className="metric-detail">{detail}</p> : null}
    </div>
  )
}
