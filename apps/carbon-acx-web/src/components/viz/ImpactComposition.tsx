'use client'

import { CircleHelp } from 'lucide-react'
import { sankey, sankeyLinkHorizontal, type SankeyGraph, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useId, useMemo } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { formatEmissions, type ActivityCategory, type CategoryInfo } from '@/lib/calculator'
import { buildActivityImpactData, buildImpactFlowData, type ImpactFlowLink, type ImpactFlowNode, type ImpactSummary } from '@/lib/visualization'
import { useContainerWidth } from '@/components/viz/useContainerWidth'

interface PositionedFlow {
  graph: SankeyGraph<ImpactFlowNode, ImpactFlowLink>
  height: number
  width: number
}

type PositionedNode = SankeyNode<ImpactFlowNode, ImpactFlowLink>
type PositionedLink = SankeyLink<ImpactFlowNode, ImpactFlowLink>
export function ImpactComposition({
  summary,
  categoryInfo,
}: {
  summary: ImpactSummary
  categoryInfo: Record<ActivityCategory, CategoryInfo>
}) {
  const ranked = useMemo(() => buildActivityImpactData(summary), [summary])
  const flow = useMemo(() => buildImpactFlowData(summary), [summary])
  const { ref, width } = useContainerWidth<HTMLDivElement>()
  const gradientPrefix = useId().replaceAll(':', '')
  const positionedFlow = useMemo<PositionedFlow | null>(() => {
    if (width < 640 || !flow.links.length) return null

    const height = Math.max(320, flow.nodes.length * 42)
    const layout = sankey<ImpactFlowNode, ImpactFlowLink>()
      .nodeId((node) => node.id)
      .nodeWidth(8)
      .nodePadding(12)
      .iterations(12)
      .extent([[0, 0], [width, height]])
    const graph = layout({
      nodes: flow.nodes.map((node) => ({ ...node })),
      links: flow.links.map((link) => ({ ...link })),
    })
    return { graph, height, width }
  }, [flow, width])

  const maxEmissions = Math.max(1, ...ranked.map((item) => item.emissions))

  return (
    <section className="impact-composition" aria-labelledby="impact-composition-title">
      <div className="impact-composition__heading">
        <div>
          <p className="section-kicker">Contribution view</p>
          <h3 id="impact-composition-title">Ranked routine impacts</h3>
        </div>
      </div>
      {ranked.length ? (
        <ol className="impact-rank" aria-label="Ranked routine impacts">
          {ranked.map((item) => {
            const color = categoryInfo[item.category].color
            const widthPercentage = item.emissions > 0 ? (item.emissions / maxEmissions) * 100 : 0
            const rangeLeft = item.lowEmissions !== null ? (item.lowEmissions / maxEmissions) * 100 : 0
            const rangeWidth = item.lowEmissions !== null && item.highEmissions !== null
              ? Math.max(0, ((item.highEmissions - item.lowEmissions) / maxEmissions) * 100)
              : 0
            return (
              <li key={item.id} className="impact-rank__row">
                <div className="impact-rank__label">
                  <ActivityMark category={item.category} activityId={item.id} size={24} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.quantity.toLocaleString('en-CA')} {item.unitLabel} · {categoryInfo[item.category].name}</span>
                  </div>
                </div>
                <div className="impact-rank__measure">
                  <div className="impact-rank__track" aria-hidden="true">
                    <span className="impact-rank__bar" style={{ width: `${widthPercentage}%`, backgroundColor: color }} />
                    {item.uncertainty === 'bounded' ? (
                      <span
                        className="impact-rank__whisker"
                        style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%`, backgroundColor: color }}
                      />
                    ) : null}
                    {item.emissions === 0 ? <span className="impact-rank__zero-marker" /> : null}
                  </div>
                  <strong>{formatEmissions(item.emissions)}</strong>
                </div>
                <div className="impact-rank__meta">
                  {item.uncertainty === 'bounded' && item.lowEmissions !== null && item.highEmissions !== null ? (
                    <span>Range: {formatEmissions(item.lowEmissions)}–{formatEmissions(item.highEmissions)}</span>
                  ) : (
                    <span><CircleHelp aria-hidden="true" size={15} />Range not quantified</span>
                  )}
                  {item.emissions === 0 ? <span className="impact-rank__zero">Published zero · 0 g CO₂e</span> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="empty-ruled-field">No published quantity is included yet.</p>
      )}
      <div ref={ref} className="impact-flow" role="group" aria-label="Impact flow from activities through categories to total">
        {positionedFlow ? <ImpactFlowSvg positionedFlow={positionedFlow} gradientPrefix={gradientPrefix} categoryInfo={categoryInfo} /> : null}
      </div>
    </section>
  )
}

function ImpactFlowSvg({
  positionedFlow,
  gradientPrefix,
  categoryInfo,
}: {
  positionedFlow: PositionedFlow
  gradientPrefix: string
  categoryInfo: Record<ActivityCategory, CategoryInfo>
}) {
  const { graph, height, width } = positionedFlow
  return (
    <svg className="impact-flow__svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        {graph.links.map((link, index) => {
          const category = link.category ?? (link.source as PositionedNode).category
          const color = category ? categoryInfo[category].color : 'var(--viz-reward)'
          return (
            <linearGradient key={link.id} id={`${gradientPrefix}-flow-${index}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.42" />
              <stop offset="100%" stopColor={color} stopOpacity="0.9" />
            </linearGradient>
          )
        })}
      </defs>
      {graph.links.map((link, index) => {
        const path = sankeyLinkHorizontal<PositionedNode, PositionedLink>()(link as PositionedLink)
        return path ? <path key={link.id} d={path} stroke={`url(#${gradientPrefix}-flow-${index})`} strokeWidth={Math.max(1, link.width ?? 0)} fill="none" /> : null
      })}
      {graph.nodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x0} y={node.y0} width={(node.x1 ?? 0) - (node.x0 ?? 0)} height={(node.y1 ?? 0) - (node.y0 ?? 0)} fill={node.category ? categoryInfo[node.category].color : 'var(--ink)'} />
          <text x={(node.x0 ?? 0) < width / 2 ? (node.x1 ?? 0) + 8 : (node.x0 ?? 0) - 8} y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2} textAnchor={(node.x0 ?? 0) < width / 2 ? 'start' : 'end'} dominantBaseline="middle">
            {node.label} · {formatEmissions(node.value ?? 0)}
          </text>
        </g>
      ))}
    </svg>
  )
}
