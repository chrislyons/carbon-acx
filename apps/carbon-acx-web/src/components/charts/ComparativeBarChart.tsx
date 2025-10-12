import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

/**
 * ComparativeBarChart - Compare multiple data series side-by-side
 *
 * Features:
 * - Horizontal or vertical bars
 * - Multiple comparison metrics
 * - Color-coded by category
 * - Delta indicators (change from baseline)
 * - Sortable
 * - Responsive and animated
 */

export interface ComparativeDataPoint {
  category: string; // Category name (e.g., activity, sector)
  value: number; // Primary value
  baseline?: number; // Comparison baseline (e.g., average)
  target?: number; // Target/goal
  label?: string; // Display label
  color?: string; // Custom color
  [key: string]: string | number | undefined;
}

export interface ComparativeBarChartProps {
  data: ComparativeDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Horizontal or vertical orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Primary metric key */
  valueKey?: string;
  /** Comparison metrics to show */
  comparisonKeys?: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  /** Show delta from baseline */
  showDelta?: boolean;
  /** Sort by value */
  sortBy?: 'value' | 'category' | null;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Color scale function */
  colorScale?: (value: number) => string;
  /** Y-axis label (or X-axis if horizontal) */
  axisLabel?: string;
  /** Height in pixels */
  height?: number;
  /** Enable animation */
  animated?: boolean;
}

// Default color scale (green → yellow → red based on value)
const defaultColorScale = (value: number): string => {
  if (value < 100) return 'var(--accent-success)';
  if (value < 250) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
};

export default function ComparativeBarChart({
  data,
  title,
  description,
  orientation = 'vertical',
  valueKey = 'value',
  comparisonKeys = [],
  showDelta = false,
  sortBy = null,
  sortDirection = 'desc',
  colorScale = defaultColorScale,
  axisLabel = 'kg CO₂',
  height = 400,
  animated = true,
}: ComparativeBarChartProps) {
  // Sort data if requested
  const sortedData = sortBy
    ? [...data].sort((a, b) => {
        if (sortBy === 'value') {
          const diff = (a[valueKey] as number) - (b[valueKey] as number);
          return sortDirection === 'asc' ? diff : -diff;
        } else {
          const nameA = a.category || '';
          const nameB = b.category || '';
          return sortDirection === 'asc'
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
      })
    : data;

  // Calculate deltas if showing
  const dataWithDeltas = showDelta
    ? sortedData.map((d) => ({
        ...d,
        delta:
          d.baseline !== undefined
            ? ((d[valueKey] as number) - d.baseline) / d.baseline * 100
            : 0,
      }))
    : sortedData;

  const isHorizontal = orientation === 'horizontal';

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
          {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={dataWithDeltas}
          layout={isHorizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: isHorizontal ? 100 : 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
                label={{
                  value: axisLabel,
                  position: 'insideBottom',
                  offset: -10,
                  style: { fontSize: '12px', fill: 'var(--text-muted)' },
                }}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="var(--text-muted)"
                style={{ fontSize: '11px' }}
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="category"
                stroke="var(--text-muted)"
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="var(--text-muted)"
                style={{ fontSize: '12px' }}
                label={{
                  value: axisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: '12px', fill: 'var(--text-muted)' },
                }}
              />
            </>
          )}

          <Tooltip content={<CustomTooltip showDelta={showDelta} />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />

          {comparisonKeys.length > 0 && (
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="rect"
            />
          )}

          {/* Primary bars */}
          <Bar
            dataKey={valueKey}
            name={axisLabel}
            animationDuration={animated ? 800 : 0}
            radius={[4, 4, 0, 0]}
          >
            {dataWithDeltas.map((entry, index) => {
              // @ts-ignore - valueKey is guaranteed to be a valid key
              const value = entry[valueKey] ?? entry.value;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colorScale(value as number)}
                />
              );
            })}
            <LabelList
              dataKey={valueKey}
              position={isHorizontal ? 'right' : 'top'}
              style={{ fontSize: '11px', fill: 'var(--text-secondary)' }}
              formatter={(value: number) => value.toFixed(1)}
            />
          </Bar>

          {/* Comparison bars */}
          {comparisonKeys.map((comparison) => (
            <Bar
              key={comparison.key}
              dataKey={comparison.key}
              name={comparison.name}
              fill={comparison.color}
              animationDuration={animated ? 800 : 0}
              radius={[4, 4, 0, 0]}
              fillOpacity={0.6}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      {dataWithDeltas.length > 0 && (
        <SummaryStats data={dataWithDeltas} valueKey={valueKey} showDelta={showDelta} />
      )}
    </motion.div>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload, showDelta }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="p-3 rounded-lg border border-border bg-surface shadow-lg min-w-[200px]">
      <p className="text-sm font-semibold text-foreground mb-2">{data.category}</p>

      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm mt-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary">{entry.name}:</span>
          </div>
          <span className="font-semibold text-foreground">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}

      {showDelta && data.delta !== undefined && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">vs baseline:</span>
            <span
              className={`font-semibold ${
                data.delta > 0 ? 'text-accent-danger' : 'text-accent-success'
              }`}
            >
              {data.delta > 0 ? '+' : ''}
              {data.delta.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Summary statistics
function SummaryStats({
  data,
  valueKey,
  showDelta,
}: {
  data: ComparativeDataPoint[];
  valueKey: string;
  showDelta: boolean;
}) {
  const values = data
    .map((d) => d[valueKey] as number)
    .filter((v) => typeof v === 'number');

  if (values.length === 0) return null;

  const total = values.reduce((sum, v) => sum + v, 0);
  const avg = total / values.length;
  const max = Math.max(...values);
  const maxItem = data.find((d) => d[valueKey] === max);

  const avgDelta = showDelta
    ? data
        .filter((d) => typeof d.delta === 'number')
        .reduce((sum, d) => sum + (typeof d.delta === 'number' ? d.delta : 0), 0) / data.filter((d) => typeof d.delta === 'number').length
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
      <StatCard label="Total" value={total.toFixed(1)} />
      <StatCard label="Average" value={avg.toFixed(1)} />
      <StatCard label="Highest" value={max.toFixed(1)} sublabel={maxItem?.category} />
      {showDelta && (
        <StatCard
          label="Avg vs baseline"
          value={`${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(1)}%`}
          color={avgDelta > 0 ? 'text-accent-danger' : 'text-accent-success'}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  color = 'text-foreground',
}: {
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
      {sublabel && <p className="text-xs text-text-muted mt-0.5 truncate">{sublabel}</p>}
    </div>
  );
}

// Skeleton loader
export function ComparativeBarChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-6 w-48 bg-neutral-200 rounded mb-2" />
        <div className="h-4 w-full max-w-md bg-neutral-200 rounded" />
      </div>
      <div className="bg-neutral-100 rounded-lg" style={{ height }} />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-neutral-200 rounded" />
        ))}
      </div>
    </div>
  );
}
