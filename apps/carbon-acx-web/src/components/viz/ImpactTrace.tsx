'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { scaleLinear } from 'd3-scale'
import { formatEmissions } from '@/lib/calculator'

export interface TraceLine {
  id: string
  label: string
  factor: number
  unitLabel: string
}

const MAX_QUANTITY = 200_000

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
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState({ width: 960, height: 190 })
  const [dragging, setDragging] = useState(false)
  const selectedLine = lines.find((line) => line.id === activeId) ?? lines[0]

  useLayoutEffect(() => {
    const element = figureRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const width = Math.max(360, Math.round(rect.width))
      const height = Math.max(140, Math.min(240, Math.round(width * 0.2)))
      setBox((current) => {
        if (Math.abs(width - current.width) <= 2 && Math.abs(height - current.height) <= 2) return current
        return { width, height }
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { width: chartWidth, height: chartHeight } = box
  const x = scaleLinear().domain([0, MAX_QUANTITY]).range([40, chartWidth - 36])
  const maxLineEmissions = Math.max(1, ...lines.map((line) => line.factor * MAX_QUANTITY))
  const y = scaleLinear().domain([0, Math.max(emissions, maxLineEmissions, 1)]).range([chartHeight - 46, 26])
  const ticks = [0, MAX_QUANTITY / 4, MAX_QUANTITY / 2, MAX_QUANTITY * 0.75, MAX_QUANTITY]
  const pointX = x(quantity)
  const pointY = y((selectedLine?.factor ?? 0) * quantity)

  function quantityFromClientX(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const svgX = ((clientX - rect.left) / rect.width) * chartWidth
    const next = Math.round(x.invert(svgX) / 10) * 10
    onQuantityChange(Math.min(MAX_QUANTITY, Math.max(10, next)))
  }

  function onPointerDown(event: ReactPointerEvent<SVGCircleElement>) {
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragging(true)
    quantityFromClientX(event.clientX)
  }

  function onPointerMove(event: ReactPointerEvent<SVGCircleElement>) {
    if (!dragging) return
    quantityFromClientX(event.clientX)
  }

  function endPointer(event: ReactPointerEvent<SVGCircleElement>) {
    if (typeof event.currentTarget.releasePointerCapture === 'function' && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
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
        <title id="impact-trace-title">Annual travel distance to carbon impact trace</title>
        {lines.map((line, index) => {
          const active = line.id === activeId
          const lineY = y(line.factor * MAX_QUANTITY)
          const labelY = Math.min(chartHeight - 54, 28 + index * 16)
          return (
            <g key={line.id}>
              <line
                x1={x(0)}
                y1={y(0)}
                x2={x(MAX_QUANTITY)}
                y2={lineY}
                stroke={active ? color : 'var(--ink-muted)'}
                strokeWidth={active ? 3 : 2}
                strokeOpacity={active ? 1 : 0.4}
              />
              <text className="impact-trace__line-label" x={chartWidth - 40} y={labelY} textAnchor="end">
                {line.label}
              </text>
            </g>
          )
        })}
        {ticks.map((tick, index) => (
          <g key={tick} className={index % 2 === 0 ? 'impact-trace__tick' : 'impact-trace__tick impact-trace__tick--minor'}>
            <line x1={x(tick)} y1={chartHeight - 40} x2={x(tick)} y2={chartHeight - 32} stroke="currentColor" strokeWidth="1" />
            <text x={x(tick)} y={chartHeight - 12} textAnchor="middle">{Math.round(tick).toLocaleString('en-CA')}</text>
          </g>
        ))}
        <line x1={x(0)} y1={chartHeight - 40} x2={x(MAX_QUANTITY)} y2={chartHeight - 40} stroke="currentColor" strokeOpacity="0.35" />
        <text className="impact-trace__axis-label" x={chartWidth - 36} y={chartHeight - 52} textAnchor="end">annual distance ({unitLabel})</text>
        <text className="impact-trace__axis-label" x="40" y="16">CO₂e / year</text>
        <circle
          cx={pointX}
          cy={pointY}
          r="24"
          fill="transparent"
          className={dragging ? 'impact-trace__slider is-dragging' : 'impact-trace__slider'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
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
        <text className="impact-trace__marker-label" x={Math.min(pointX + 14, chartWidth - 260)} y={Math.max(pointY - 16, 30)} fill="currentColor" pointerEvents="none">
          {`${Math.round(quantity).toLocaleString('en-CA')} ${unitLabel} · ${formatEmissions(emissions)}/yr`}
        </text>
      </svg>
      <p className="impact-trace__value" aria-live="polite">
        {Math.round(quantity).toLocaleString('en-CA')} {unitLabel} · {formatEmissions(emissions)}/yr
      </p>
      <p className="impact-trace__equation">
        {Math.round(quantity).toLocaleString('en-CA')} {unitLabel} × {selectedLine?.factor ?? 0} g CO₂e / {selectedLine?.unitLabel ?? unitLabel} = {formatEmissions(emissions)}/yr
      </p>
      <ul className="impact-trace__legend" aria-label="Travel mode legend">
        {lines.map((line) => <li key={line.id} className={line.id === activeId ? 'is-selected' : ''}>{line.label} · {line.factor} g CO₂e / {line.unitLabel}</li>)}
      </ul>
      <figcaption id="impact-trace-caption">
        Solid line: selected mode. Quiet lines: alternatives at the same distance. Transit uses passenger-kilometres; the car example assumes one occupant.
      </figcaption>
    </figure>
  )
}
