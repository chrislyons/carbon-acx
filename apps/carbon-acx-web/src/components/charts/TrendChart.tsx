'use client'

import { useEffect, useState, Suspense } from 'react'
import {
  GridIntensityPoint,
  GridIntensitySeries,
  processGridIntensityTrends,
  formatIntensity,
  getTrendDirection,
} from '@/lib/gridTrends'

interface TrendChartProps {
  series: GridIntensitySeries[]
  selectedRegions: string[]
  onRegionToggle: (region: string) => void
}

export function TrendChart({ series, selectedRegions, onRegionToggle }: TrendChartProps) {
  const [showLowHigh, setShowLowHigh] = useState(false)

  const filteredSeries = series.filter(s => selectedRegions.includes(s.region))

  if (filteredSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground-muted">
        <p>Select regions to display</p>
      </div>
    )
  }

  // Find global min/max for Y-axis
  const allValues = filteredSeries.flatMap(s => s.data.map(d => d.intensityGPerKwh))
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const padding = (maxValue - minValue) * 0.1 || 10
  const yMin = Math.max(0, minValue - padding)
  const yMax = maxValue + padding

  // Canvas dimensions
  const width = 800
  const height = 400
  const margin = { top: 40, right: 120, bottom: 60, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xScale = (year: number, minYear: number, maxYear: number) =>
    margin.left + ((year - minYear) / (maxYear - minYear)) * innerWidth

  const yScale = (value: number) =>
    margin.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight

  const allYears = filteredSeries.flatMap(s => s.data.map(d => d.vintageYear))
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)

  return (
    <div className="space-y-4">
      {/* Legend / Region Selector */}
      <div className="flex flex-wrap gap-2">
        {series.map(s => (
          <button
            key={s.region}
            onClick={() => onRegionToggle(s.region)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
              selectedRegions.includes(s.region)
                ? `bg-${s.color.replace('#', '')} text-white border-${s.color.replace('#', '')}`
                : 'bg-background-elevated text-foreground-muted border-surface-border hover:border-surface-border-strong'
            }`}
            aria-pressed={selectedRegions.includes(s.region)}
          >
            {s.regionLabel}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative bg-background-elevated border border-surface-border rounded-lg p-4">
        <svg width={width} height={height} className="w-full h-auto" role="img" aria-label="Grid intensity trends over time">
          {/* Grid lines */}
          <g stroke="var(--surface-border)" stroke-width="0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <line
                key={i}
                x1={margin.left}
                x2={width - margin.right}
                y1={margin.top + (innerHeight * i) / 5}
                y2={margin.top + (innerHeight * i) / 5}
              />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={i}
                x1={margin.left + (innerWidth * i) / 10}
                x2={margin.left + (innerWidth * i) / 10}
                y1={margin.top}
                y2={height - margin.bottom}
              />
            ))}
          </g>

          {/* Y-axis labels */}
          <g fontSize="11" fill="var(--foreground-muted)" fontFamily="var(--font-mono)">
            {Array.from({ length: 6 }).map((_, i) => {
              const value = yMax - (yMax - yMin) * i / 5
              return (
                <text
                  key={i}
                  x={margin.left - 10}
                  y={margin.top + (innerHeight * i) / 5 + 4}
                  textAnchor="end"
                >
                  {formatIntensity(value)}
                </text>
              )
            })}
          </g>

          {/* X-axis labels */}
          <g fontSize="11" fill="var(--foreground-muted)" fontFamily="var(--font-mono)">
            {Array.from({ length: 11 }).map((_, i) => {
              const year = minYear + Math.round((maxYear - minYear) * i / 10)
              return (
                <text
                  key={i}
                  x={margin.left + (innerWidth * i) / 10}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                >
                  {year}
                </text>
              )
            })}
          </g>

          {/* Axes */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={height - margin.bottom}
            stroke="var(--surface-border-strong)"
            strokeWidth={2}
          />
          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="var(--surface-border-strong)"
            strokeWidth={2}
          />

          {/* Data lines */}
          <g>
            {filteredSeries.map(series => (
              <g key={series.region}>
                {/* Low/High band */}
                {showLowHigh && series.data.some(d => d.intensityLowGPerKwh !== undefined || d.intensityHighGPerKwh !== undefined) && (
                  <path
                    d={[
                      ...series.data
                        .filter(d => d.intensityLowGPerKwh !== undefined)
                        .map(d => `L${xScale(d.vintageYear, minYear, maxYear)},${yScale(d.intensityLowGPerKwh!)}`),
                      `L${xScale(series.data[series.data.length - 1].vintageYear, minYear, maxYear)},${yScale(series.data[series.data.length - 1].intensityHighGPerKwh!)}`,
                      ...series.data
                        .filter(d => d.intensityHighGPerKwh !== undefined)
                        .slice().reverse()
                        .map(d => `L${xScale(d.vintageYear, minYear, maxYear)},${yScale(d.intensityHighGPerKwh!)}`),
                      `L${xScale(series.data[0].vintageYear, minYear, maxYear)},${yScale(series.data[0].intensityLowGPerKwh!)}`,
                      'Z',
                    ].join(' ')}
                    fill={series.color}
                    fillOpacity={0.15}
                    stroke="none"
                  />
                )}

                {/* Main line */}
                <path
                  d={[
                    'M',
                    ...series.data.map(d => `${xScale(d.vintageYear, minYear, maxYear)},${yScale(d.intensityGPerKwh)}`),
                  ].join(' L')}
                  stroke={series.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {series.data.map((d, i) => (
                  <circle
                    key={i}
                    cx={xScale(d.vintageYear, minYear, maxYear)}
                    cy={yScale(d.intensityGPerKwh)}
                    r={4}
                    fill={series.color}
                    stroke="var(--background)"
                    strokeWidth={2}
                    className="hover:r-6 hover:stroke-2 transition-all"
                  />
                ))}

                {/* Year 2024 label */}
                {series.data.find(d => d.vintageYear === 2024) && (
                  <text
                    x={xScale(2024, minYear, maxYear) + 8}
                    y={yScale(series.data.find(d => d.vintageYear === 2024)!.intensityGPerKwh) - 8}
                    fontSize="11"
                    fill={series.color}
                    fontWeight={600}
                    fontFamily="var(--font-mono)"
                  >
                    {formatIntensity(series.data.find(d => d.vintageYear === 2024)!.intensityGPerKwh)}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredSeries.map(series => {
          const latest = series.data[series.data.length - 1]
          const first = series.data[0]
          const change = ((latest.intensityGPerKwh - first.intensityGPerKwh) / first.intensityGPerKwh) * 100
          const trend = getTrendDirection(series.data)
          
          return (
            <div key={series.region} className="bg-background-elevated border border-surface-border rounded-lg p-4 border-l-4" style={{ borderLeftColor: series.color }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{series.regionLabel}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  trend === 'improving' ? 'bg-success/20 text-success' :
                  trend === 'worsening' ? 'bg-error/20 text-error' :
                  'bg-warning/20 text-warning'
                }`}>
                  {trend === 'improving' ? '↓ Improving' : trend === 'worsening' ? '↑ Worsening' : '→ Stable'}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatIntensity(latest.intensityGPerKwh)}
              </div>
              <div className="text-sm text-foreground-muted font-mono">
                {change >= 0 ? '+' : ''}{change.toFixed(1)}% since {first.vintageYear}
              </div>
            </div>
          )
        })}
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-foreground-muted">
          <input
            type="checkbox"
            checked={showLowHigh}
            onChange={e => setShowLowHigh(e.target.checked)}
            className="rounded border-surface-border-strong"
          />
          Show uncertainty bounds
        </label>
        <span className="text-xs text-foreground-subtle ml-auto">
          Source: ECCC NIR, IESO, CER | GWP100 (AR6)
        </span>
      </div>
    </div>
  )
}

export function TrendsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-24 animate-pulse bg-surface-border rounded-full" />
        ))}
      </div>
      <div className="h-96 animate-pulse bg-surface-border rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse bg-surface-border rounded-lg" />
        ))}
      </div>
    </div>
  )
}