import { useMemo, useState } from 'react';

import { formatEmission } from '../lib/format';
import {
  formatReferenceHint,
  ReferenceCarrier,
  ReferenceLookup,
  resolveReferenceIndices
} from '../lib/references';

export interface SankeyNode {
  id: string;
  label: string;
  type?: string | null;
}

export interface SankeyLink extends ReferenceCarrier {
  source: string;
  target: string;
  layer_id?: string | null;
  category?: string | null;
  values?: {
    mean?: number | null;
  } | null;
  metadata?: {
    loop_id?: string | null;
    sign?: string | null;
    lag_years?: string | null;
    strength?: number | null;
    notes?: string | null;
  } | null;
}

export interface SankeyData {
  nodes?: SankeyNode[] | null;
  links?: SankeyLink[] | null;
}

export interface SankeyProps {
  title?: string;
  data?: SankeyData | null;
  referenceLookup: ReferenceLookup;
  variant?: 'card' | 'embedded';
}

interface PositionedNode extends SankeyNode {
  x: number;
  y: number;
  color: string;
  total: number;
}

interface PreparedLink {
  source: PositionedNode;
  target: PositionedNode;
  mean: number;
  hint: string;
  gradientId: string;
  color: string;
  indices: number[];
  metadata?: SankeyLink['metadata'];
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 360;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 36;
const PADDING_X = 90;
const PADDING_Y = 40;
const MAX_LINK_WIDTH = 26;
const NODE_LABEL_MIN_FONT = 11;
const NODE_LABEL_MAX_FONT = 16;
const NODE_VALUE_FONT = 10;

const CATEGORY_COLORS = [
  '#38bdf8',
  '#c084fc',
  '#34d399',
  '#f472b6',
  '#facc15',
  '#f97316'
];

function computeNodeLabelFont(label: string): number {
  const trimmed = label?.trim() ?? '';
  const length = Math.max(trimmed.length, 6);
  const available = NODE_WIDTH - 24;
  const approximate = available / (length * 0.5);
  const bounded = Math.max(NODE_LABEL_MIN_FONT, Math.min(NODE_LABEL_MAX_FONT, approximate));
  return Math.round(bounded);
}

export function Sankey({
  title = 'Emission pathways',
  data,
  referenceLookup,
  variant = 'card'
}: SankeyProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const nodes = Array.isArray(data?.nodes) ? data?.nodes ?? [] : [];
  const links = Array.isArray(data?.links) ? data?.links ?? [] : [];

  const nodeMap = useMemo(() => {
    const categories = nodes.filter((node) => (node.type ?? 'category') === 'category');
    const activities = nodes.filter((node) => (node.type ?? 'activity') !== 'category');

    const categorySpacing = categories.length > 0 ? (SVG_HEIGHT - PADDING_Y * 2) / categories.length : NODE_HEIGHT;
    const activitySpacing = activities.length > 0 ? (SVG_HEIGHT - PADDING_Y * 2) / activities.length : NODE_HEIGHT;

    const colorMap = new Map<string, string>();
    categories.forEach((node, index) => {
      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
      colorMap.set(node.id, color);
    });

    const positioned = new Map<string, PositionedNode>();
    categories.forEach((node, index) => {
      const y = PADDING_Y + categorySpacing * index + NODE_HEIGHT / 2;
      const color = colorMap.get(node.id) ?? CATEGORY_COLORS[0];
      positioned.set(node.id, {
        ...node,
        type: node.type ?? 'category',
        x: PADDING_X,
        y,
        color,
        total: 0
      });
    });

    activities.forEach((node, index) => {
      const y = PADDING_Y + activitySpacing * index + NODE_HEIGHT / 2;
      positioned.set(node.id, {
        ...node,
        type: node.type ?? 'activity',
        x: SVG_WIDTH - PADDING_X,
        y,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        total: 0
      });
    });

    return positioned;
  }, [nodes]);

  const preparedLinks = useMemo<PreparedLink[]>(() => {
    const positionedLinks: PreparedLink[] = [];
    nodeMap.forEach((node) => {
      node.total = 0;
    });

    links.forEach((link, index) => {
      const mean = typeof link?.values?.mean === 'number' ? link.values.mean : null;
      const sourceNode = link?.source ? nodeMap.get(link.source) : undefined;
      const targetNode = link?.target ? nodeMap.get(link.target) : undefined;
      if (mean == null || !Number.isFinite(mean) || mean <= 0 || !sourceNode || !targetNode) {
        return;
      }
      sourceNode.total += mean;
      targetNode.total += mean;
      const indices = resolveReferenceIndices(link, referenceLookup);
      const metadata = link?.metadata ?? null;
      const emissionLabel = formatEmission(mean);
      const referenceHint = formatReferenceHint(indices);
      const strengthValue = metadata?.strength;
      const strengthLabel =
        typeof strengthValue === 'number' && Number.isFinite(strengthValue)
          ? `${Math.round(Math.abs(strengthValue) * 100)}% link`
          : null;
      let signLabel: string | null = null;
      if (metadata?.sign === '+') {
        signLabel = 'amplifying';
      } else if (metadata?.sign === '-') {
        signLabel = 'damping';
      }
      const lagLabel = metadata?.lag_years ? `lag ${metadata.lag_years}` : null;
      const note = typeof metadata?.notes === 'string' && metadata.notes.trim().length > 0 ? metadata.notes.trim() : null;
      const detailSegments = [signLabel, strengthLabel, lagLabel].filter((segment): segment is string => Boolean(segment));
      const detailLabel = detailSegments.length > 0 ? detailSegments.join(' · ') : null;
      let hint = `${sourceNode.label} → ${targetNode.label} — ${emissionLabel}`;
      if (detailLabel) {
        hint += ` · ${detailLabel}`;
      }
      hint += ` ${referenceHint}`;
      if (note) {
        hint += `\n${note}`;
      }
      positionedLinks.push({
        source: sourceNode,
        target: targetNode,
        mean,
        color: sourceNode.color,
        gradientId: `sankey-gradient-${index}`,
        hint,
        indices,
        metadata
      });
    });

    return positionedLinks;
  }, [links, nodeMap, referenceLookup]);

  const maxMean = useMemo(() => {
    let max = 0;
    preparedLinks.forEach((link) => {
      max = Math.max(max, link.mean);
    });
    return max;
  }, [preparedLinks]);

  if (nodeMap.size === 0 || preparedLinks.length === 0) {
    if (variant === 'card') {
      return (
        <section
          aria-labelledby="sankey-heading"
          className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
          id="sankey"
          role="region"
          tabIndex={-1}
        >
          <h3 id="sankey-heading" className="text-base font-semibold text-slate-100">
            {title}
          </h3>
          <p className="mt-4 text-sm text-slate-400">No sankey data available.</p>
        </section>
      );
    }
    return <p className="text-sm text-slate-400">No sankey data available.</p>;
  }

  const activeLinkIndex = hoveredLink ? Number(hoveredLink.replace('sankey-link-', '')) : NaN;
  const activeLink = Number.isFinite(activeLinkIndex) ? preparedLinks[activeLinkIndex] ?? null : null;

  const chart = (
    <svg
      data-testid="sankey-svg"
      role="img"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="mt-4 w-full text-slate-400"
    >
        <defs>
          {preparedLinks.map((link) => (
            <linearGradient
              key={link.gradientId}
              id={link.gradientId}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={link.color} stopOpacity={0.85} />
              <stop offset="100%" stopColor={link.color} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>
        {preparedLinks.map((link, index) => {
          const strokeWidth = maxMean > 0 ? Math.max((link.mean / maxMean) * MAX_LINK_WIDTH, 4) : 4;
          const pathId = `sankey-link-${index}`;
          const active =
            hoveredLink === pathId || (hoveredNode && link.source.id === hoveredNode);
          const dimmed = hoveredNode && link.source.id !== hoveredNode && hoveredLink !== pathId;
          return (
            <g key={pathId}>
              <path
                id={pathId}
                d={`M${link.source.x + NODE_WIDTH / 2} ${link.source.y} C ${
                  link.source.x + NODE_WIDTH / 2 + 60
                } ${link.source.y}, ${link.target.x - NODE_WIDTH / 2 - 60} ${link.target.y}, ${
                  link.target.x - NODE_WIDTH / 2
                } ${link.target.y}`}
                stroke={`url(#${link.gradientId})`}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                className={`transition-opacity duration-300 ${
                  active ? 'opacity-100' : dimmed ? 'opacity-25' : 'opacity-70'
                }`}
                onMouseEnter={() => setHoveredLink(pathId)}
                onFocus={() => setHoveredLink(pathId)}
                onMouseLeave={() => setHoveredLink(null)}
                onBlur={() => setHoveredLink(null)}
                tabIndex={0}
                >
                <title>{link.hint}</title>
              </path>
            </g>
          );
        })}
        {Array.from(nodeMap.values()).map((node) => {
          const outgoing = preparedLinks.filter((link) => link.source.id === node.id);
          const incoming = preparedLinks.filter((link) => link.target.id === node.id);
          const aggregate = node.total;
          const referenceSet = new Set<number>();
          outgoing.forEach((link) => link.indices.forEach((value) => referenceSet.add(value)));
          if (referenceSet.size === 0) {
            incoming.forEach((link) => link.indices.forEach((value) => referenceSet.add(value)));
          }
          const referenceHint = formatReferenceHint(Array.from(referenceSet).sort((a, b) => a - b));
          const active =
            hoveredNode === node.id ||
            (!!activeLink && (activeLink.source.id === node.id || activeLink.target.id === node.id));
          const labelFontSize = computeNodeLabelFont(node.label);
          const valueFontSize = Math.max(NODE_VALUE_FONT, Math.round(labelFontSize - 2));
          return (
            <g
              key={node.id}
              transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onFocus={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onBlur={() => setHoveredNode(null)}
              data-testid={`sankey-node-${node.id}`}
              tabIndex={0}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={18}
                fill={node.color}
                fillOpacity={active ? 0.9 : 0.55}
                stroke="rgba(15, 23, 42, 0.6)"
                strokeWidth={1.5}
              >
                <title>
                  {`${node.label} — ${formatEmission(aggregate)} ${referenceHint}`}
                </title>
              </rect>
              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                className="fill-slate-950 font-semibold"
                style={{ fontSize: `${labelFontSize}px` }}
              >
                {node.label}
              </text>
              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT + 14}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: `${valueFontSize}px` }}
              >
                {aggregate > 0 ? formatEmission(aggregate) : '—'}
              </text>
            </g>
          );
        })}
    </svg>
  );

  if (variant === 'card') {
    return (
      <section
        aria-labelledby="sankey-heading"
        className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
        id="sankey"
        role="region"
        tabIndex={-1}
      >
        <h3 id="sankey-heading" className="text-base font-semibold text-slate-100">
          {title}
        </h3>
        {chart}
      </section>
    );
  }

  return chart;
}
