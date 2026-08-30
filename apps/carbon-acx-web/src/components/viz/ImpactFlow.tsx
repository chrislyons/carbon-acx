'use client'

import { sankey, sankeyLinkHorizontal, type SankeyGraph, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useId, useMemo } from 'react'
import { useContainerWidth } from '@/components/viz/useContainerWidth'
import { formatEmissions, type ActivityCategory, type CategoryInfo, type CalculatorSummary } from '@/lib/calculator'
import { buildImpactFlowData, type ImpactFlowLink, type ImpactFlowNode } from '@/lib/visualization'

interface PositionedFlow {
  graph: SankeyGraph<ImpactFlowNode, ImpactFlowLink>
  height: number
  width: number
}

type PositionedNode = SankeyNode<ImpactFlowNode, ImpactFlowLink>
type PositionedLink = SankeyLink<ImpactFlowNode, ImpactFlowLink>

export function ImpactFlow({
  summary,
  categoryInfo,
}: {
  summary: CalculatorSummary
  categoryInfo: Record<ActivityCategory, CategoryInfo>
}) {
  const flow = useMemo(() => buildImpactFlowData(summary), [summary])
  const { ref, width } = useContainerWidth<HTMLDivElement>()
  const gradientPrefix = useId().replaceAll(':', '')
  const positionedFlow = useMemo<PositionedFlow | null>(() => {
    if (width < 480 || !flow.links.length) return null

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

  return (
    <div ref={ref} className="impact-flow" role="group" aria-label="Impact flow from activities through categories to total">
      {positionedFlow ? <ImpactFlowSvg positionedFlow={positionedFlow} gradientPrefix={gradientPrefix} categoryInfo={categoryInfo} /> : null}
    </div>
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
