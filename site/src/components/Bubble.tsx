import { useMemo } from 'react';

import { formatEmission, formatKilograms } from '../lib/format';
import {
  formatReferenceHint,
  ReferenceCarrier,
  ReferenceLookup,
  resolveReferenceIndices
} from '../lib/references';

export interface BubbleDatum extends ReferenceCarrier {
  layer_id?: string | null;
  activity_id?: string | null;
  activity_name?: string | null;
  category?: string | null;
  sector?: string | null;
  values?: {
    mean?: number | null;
  } | null;
  units?: Record<string, string | null> | null;
}

export interface BubbleProps {
  title?: string;
  data?: BubbleDatum[] | null;
  referenceLookup: ReferenceLookup;
  variant?: 'card' | 'embedded';
}

interface BubblePoint {
  key: string;
  label: string;
  category: string;
  grams: number;
  kilograms: number;
  hint: string;
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 360;
const PADDING_X = 80;
const PADDING_Y = 50;
const MAX_RADIUS = 42;
const AXIS_FONT_SIZE = 11;
const AXIS_TICK_FONT_SIZE = 10;
function toCategory(value: string | null | undefined): string {
  if (!value) {
    return 'Other';
  }
  return value;
}

export function Bubble({
  title = 'Activity emissions bubble chart',
  data,
  referenceLookup,
  variant = 'card'
}: BubbleProps) {
  const points = useMemo<BubblePoint[]>(() => {
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((row, index) => {
        const mean = typeof row?.values?.mean === 'number' ? row.values.mean : null;
        if (mean == null || !Number.isFinite(mean) || mean <= 0) {
          return null;
        }
        const kilograms = mean / 1_000;
        const label = row?.activity_name || row?.activity_id || `Activity ${index + 1}`;
        const indices = resolveReferenceIndices(row, referenceLookup);
        return {
          key: `${row?.activity_id ?? index}-${index}`,
          label,
          category: toCategory(row?.category),
          grams: mean,
          kilograms,
          hint: `${label} — ${formatEmission(mean)} ${formatReferenceHint(indices)}`
        } satisfies BubblePoint;
      })
      .filter((value): value is BubblePoint => value !== null)
      .sort((a, b) => b.grams - a.grams);
  }, [data, referenceLookup]);

  const categories = useMemo(
    () => Array.from(new Set(points.map((point) => point.category))),
    [points]
  );

  const maxKg = useMemo(() => points.reduce((max, point) => Math.max(max, point.kilograms), 0), [points]);

  if (points.length === 0 || maxKg <= 0) {
    if (variant === 'card') {
      return (
        <section
          aria-labelledby="bubble-heading"
          className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
          id="bubble"
          role="region"
          tabIndex={-1}
        >
          <h3 id="bubble-heading" className="text-base font-semibold text-slate-100">
            {title}
          </h3>
          <p className="mt-4 text-sm text-slate-400">No activity data available.</p>
        </section>
      );
    }
    return <p className="text-sm text-slate-400">No activity data available.</p>;
  }

  const chartWidth = SVG_WIDTH - PADDING_X * 2;
  const chartHeight = SVG_HEIGHT - PADDING_Y * 2;
  const xStep = chartWidth / Math.max(categories.length, 1);

  const ticks = [0, maxKg / 2, maxKg];

  const chart = (
    <div className="mt-4 flex flex-col items-stretch">
      <svg
        data-testid="bubble-svg"
        role="img"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full text-slate-400"
        aria-describedby="bubble-axis-description"
      >
          <defs>
            <radialGradient id="bubble-fill" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <rect
            x={PADDING_X}
            y={PADDING_Y}
            width={chartWidth}
            height={chartHeight}
            fill="url(#bubble-fill)"
            fillOpacity={0.08}
            stroke="rgba(148, 163, 184, 0.25)"
            rx={24}
          />
          {points.map((point, index) => {
            const categoryIndex = categories.indexOf(point.category);
            const cx = PADDING_X + xStep * (categoryIndex + 0.5);
            const relative = point.kilograms / maxKg;
            const cy = PADDING_Y + chartHeight - relative * chartHeight;
            const radius = Math.max(8, Math.sqrt(relative) * MAX_RADIUS);
            return (
              <g
                key={point.key}
                className="group"
                transform={`translate(${cx}, ${cy})`}
                data-testid={`bubble-point-${index}`}
              >
                <circle
                  r={radius}
                  className="fill-sky-400/80 transition-transform duration-300 ease-out group-hover:scale-110 group-focus-within:scale-110"
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth={2}
                >
                  <title>{point.hint}</title>
                </circle>
              </g>
            );
          })}
          {categories.map((category, index) => {
            const cx = PADDING_X + xStep * (index + 0.5);
            return (
              <text
                key={category}
                x={cx}
                y={SVG_HEIGHT - 12}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: `${AXIS_TICK_FONT_SIZE}px` }}
              >
                {category}
              </text>
            );
          })}
          {ticks.map((tick) => {
            const relative = tick / maxKg;
            const y = PADDING_Y + chartHeight - relative * chartHeight;
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={PADDING_X - 8}
                  x2={PADDING_X}
                  y1={y}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.4)"
                />
                <text
                  x={PADDING_X - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400"
                  style={{ fontSize: `${AXIS_TICK_FONT_SIZE}px` }}
                >
                  {formatKilograms(tick)}
                </text>
              </g>
            );
          })}
          <text
            id="bubble-axis-description"
            x={PADDING_X - 48}
            y={SVG_HEIGHT / 2}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: `${AXIS_FONT_SIZE}px` }}
            transform={`rotate(-90 ${PADDING_X - 48} ${SVG_HEIGHT / 2})`}
          >
            Annual emissions (kg CO₂e)
          </text>
          <text
            x={SVG_WIDTH / 2}
            y={SVG_HEIGHT - 4}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: `${AXIS_FONT_SIZE}px` }}
          >
            Activity category
          </text>
      </svg>
    </div>
  );

  if (variant === 'card') {
    return (
      <section
        aria-labelledby="bubble-heading"
        className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
        id="bubble"
        role="region"
        tabIndex={-1}
      >
        <h3 id="bubble-heading" className="text-base font-semibold text-slate-100">
          {title}
        </h3>
        {chart}
      </section>
    );
  }

  return chart;
}
