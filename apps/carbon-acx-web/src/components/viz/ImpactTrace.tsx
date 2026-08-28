'use client'

import { scaleLinear } from 'd3-scale'
import { formatEmissions } from '@/lib/calculator'

export function ImpactTrace({
  quantity,
  factor,
  unitLabel,
  emissions,
  color,
}: {
  quantity: number
  factor: number
  unitLabel: string
  emissions: number
  color: string
}) {
  const endpoint = Math.max(2_000, (Math.floor(quantity / 1_000) + 1) * 1_000)
  const chartWidth = 640
  const chartHeight = 240
  const x = scaleLinear().domain([0, endpoint]).range([36, chartWidth - 28])
  const endpointEmissions = factor * endpoint
  const y = scaleLinear().domain([0, Math.max(emissions, endpointEmissions, 1)]).range([chartHeight - 42, 24])
  const ticks = [0, endpoint / 4, endpoint / 2, endpoint * 0.75, endpoint]
  const pointX = x(quantity)
  const pointY = y(emissions)

  return (
    <figure className="impact-trace" aria-labelledby="impact-trace-caption">
      <svg className="impact-trace__svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby="impact-trace-title impact-trace-caption">
        <title id="impact-trace-title">Annual quantity to carbon impact trace</title>
        <line x1={x(0)} y1={y(0)} x2={x(endpoint)} y2={y(endpointEmissions)} stroke={color} strokeWidth="3" />
        {ticks.map((tick, index) => (
          <g key={tick} className={index % 2 === 0 ? 'impact-trace__tick' : 'impact-trace__tick impact-trace__tick--minor'}>
            <line x1={x(tick)} y1={chartHeight - 38} x2={x(tick)} y2={chartHeight - 30} stroke="currentColor" strokeWidth="1" />
            <text x={x(tick)} y={chartHeight - 14} textAnchor="middle">{Math.round(tick).toLocaleString('en-CA')}</text>
          </g>
        ))}
        <line x1={x(0)} y1={chartHeight - 38} x2={x(endpoint)} y2={chartHeight - 38} stroke="currentColor" strokeOpacity="0.35" />
        <circle cx={pointX} cy={pointY} r="7" fill="var(--paper)" stroke={color} strokeWidth="3" />
        <text className="impact-trace__marker-label" x={Math.min(pointX + 12, chartWidth - 170)} y={Math.max(pointY - 14, 20)} fill="currentColor">
          {quantity.toLocaleString('en-CA')} {unitLabel} · {formatEmissions(emissions)}/yr
        </text>
        <text className="impact-trace__axis-label" x={chartWidth - 28} y={chartHeight - 48} textAnchor="end">quantity ({unitLabel})</text>
        <text className="impact-trace__axis-label" x="36" y="18">CO₂e</text>
      </svg>
      <p className="impact-trace__value" aria-live="polite">{formatEmissions(emissions)}/yr</p>
      <figcaption id="impact-trace-caption">
        The line scales from 0 to {endpoint.toLocaleString('en-CA')} {unitLabel}; the live marker shows {quantity.toLocaleString('en-CA')} {unitLabel} × {factor} g CO₂e / {unitLabel} = {formatEmissions(emissions)}/yr.
      </figcaption>
    </figure>
  )
}
