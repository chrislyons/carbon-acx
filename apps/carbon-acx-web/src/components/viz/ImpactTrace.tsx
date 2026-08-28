'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { formatEmissions } from '@/lib/calculator'

type TraceLine = {
  id: string
  factor: number
  unitLabel: string
}

export function ImpactTrace({
  lines,
  activeId,
  quantity,
  unitLabel,
  emissions,
  color,
  onQuantityChange,
}: {
  lines: TraceLine[]
  activeId: string
  quantity: number
  unitLabel: string
  emissions: number
  color: string
  onQuantityChange: (quantity: number) => void
}) {
  const MAX_QUANTITY = 200_000
  const endpoint = Math.max(2_000, (Math.floor(quantity / 1_000) + 1) * 1_000)
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // The viewBox derives from the measured box, so the drawing always fills
  // whatever space the layout awards the chart — no letterboxing, ever.
  const [box, setBox] = useState({ width: 960, height: 190 })
  const [dragging, setDragging] = useState(false)

  useLayoutEffect(() => {
    const el = figureRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setBox((current) => {
        const width = Math.max(360, Math.round(rect.width))
        const height = Math.max(96, Math.round(rect.height))
        if (Math.abs(width - current.width) <= 2 && Math.abs(height - current.height) <= 2) return current
        return { width, height }
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { width: chartWidth, height: chartHeight } = box
  const x = scaleLinear().domain([0, endpoint]).range([40, chartWidth - 36])
  const maxLineEmissions = Math.max(...lines.map((line) => line.factor * endpoint))
  const y = scaleLinear().domain([0, Math.max(emissions, maxLineEmissions, 1)]).range([chartHeight - 46, 26])
  const ticks = [0, endpoint / 4, endpoint / 2, endpoint * 0.75, endpoint]
  const pointX = x(quantity)
  const pointY = y(lines.find((line) => line.id === activeId)!.factor * quantity)

  function quantityFromClientX(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((clientX - rect.left) / rect.width) * chartWidth
    const next = Math.round(x.invert(svgX) / 10) * 10
    onQuantityChange(Math.min(MAX_QUANTITY, Math.max(10, next)))
  }

  function onPointerDown(event: React.PointerEvent<SVGCircleElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    quantityFromClientX(event.clientX)
  }

  function onPointerMove(event: React.PointerEvent<SVGCircleElement>) {
    if (!dragging) return
    quantityFromClientX(event.clientX)
  }

  return (
    <figure className="impact-trace" ref={figureRef} aria-labelledby="impact-trace-caption">
      <svg
        ref={svgRef}
        className="impact-trace__svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-labelledby="impact-trace-title impact-trace-caption"
      >
        <title id="impact-trace-title">Annual commute quantity to carbon impact trace</title>
        {lines.map((line) => {
          const active = line.id === activeId
          return (
            <line
              key={line.id}
              x1={x(0)}
              y1={y(0)}
              x2={x(endpoint)}
              y2={y(line.factor * endpoint)}
              stroke={active ? color : 'var(--ink-muted)'}
              strokeWidth={active ? 3 : 2}
              strokeOpacity={active ? 1 : 0.4}
            />
          )
        })}
        {ticks.map((tick, index) => (
          <g key={tick} className={index % 2 === 0 ? 'impact-trace__tick' : 'impact-trace__tick impact-trace__tick--minor'}>
            <line x1={x(tick)} y1={chartHeight - 40} x2={x(tick)} y2={chartHeight - 32} stroke="currentColor" strokeWidth="1" />
            <text x={x(tick)} y={chartHeight - 12} textAnchor="middle">{Math.round(tick).toLocaleString('en-CA')}</text>
          </g>
        ))}
        <line x1={x(0)} y1={chartHeight - 40} x2={x(endpoint)} y2={chartHeight - 40} stroke="currentColor" strokeOpacity="0.35" />
        <text className="impact-trace__axis-label" x={chartWidth - 36} y={chartHeight - 52} textAnchor="end">quantity ({unitLabel})</text>
        <text className="impact-trace__axis-label" x="40" y="16">CO₂e</text>
        <text className="impact-trace__axis-label" x={chartWidth - 36} y="16" textAnchor="end">drag the marker · ← →</text>
        <circle
          cx={pointX}
          cy={pointY}
          r="24"
          fill="transparent"
          className={dragging ? 'impact-trace__slider is-dragging' : 'impact-trace__slider'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        />
        <circle
          cx={pointX}
          cy={pointY}
          r="7"
          fill="var(--background)"
          stroke={color}
          strokeWidth="3"
          pointerEvents="none"
        />
        <text className="impact-trace__marker-label" x={Math.min(pointX + 14, chartWidth - 320)} y={Math.max(pointY - 16, 18)} fill="currentColor" pointerEvents="none">
          {`${Math.round(quantity).toLocaleString('en-CA')} ${unitLabel} · ${formatEmissions(emissions)}/yr`}
        </text>
      </svg>
      <p className="impact-trace__value" aria-live="polite">
        {Math.round(quantity).toLocaleString('en-CA')} {unitLabel} · {formatEmissions(emissions)}/yr
      </p>
      <figcaption id="impact-trace-caption">
        Solid line: selected vehicle class. Faint lines: other classes at the same annual quantity.
      </figcaption>
    </figure>
  )
}
