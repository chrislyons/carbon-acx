import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

/**
 * TimeSeriesChart - Visualize emissions data over time
 *
 * Features:
 * - Line or area chart styles
 * - Multiple data series support
 * - Trend lines
 * - Goal/target reference lines
 * - Responsive and animated
 * - Custom tooltips
 */

export interface TimeSeriesDataPoint {
  date: string; // ISO date or formatted string
  value: number; // Primary metric (emissions)
  label?: string; // Optional label for tooltip
  [key: string]: string | number | undefined; // Additional series
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Primary metric key in data */
  valueKey?: string;
  /** Additional series to plot */
  additionalSeries?: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  /** Chart style: line or area */
  variant?: 'line' | 'area';
  /** Show trend line */
  showTrend?: boolean;
  /** Reference lines (goals, targets) */
  referenceLines?: Array<{
    value: number;
    label: string;
    color?: string;
  }>;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Height in pixels */
  height?: number;
  /** Enable animation */
  animated?: boolean;
}

export default function TimeSeriesChart({
  data,
  title,
  description,
  valueKey = 'value',
  additionalSeries = [],
  variant = 'line',
  showTrend = false,
  referenceLines = [],
  yAxisLabel = 'kg CO₂',
  height = 300,
  animated = true,
}: TimeSeriesChartProps) {
  // Calculate trend line if requested
  const trendData = showTrend ? calculateTrendLine(data, valueKey) : null;

  const ChartComponent = variant === 'area' ? AreaChart : LineChart;

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
        <ChartComponent
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />

          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
          />

          <YAxis
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px', fill: 'var(--text-muted)' },
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'var(--accent-500)', strokeWidth: 1 }}
          />

          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />

          {/* Reference lines (goals, targets) */}
          {referenceLines.map((ref, index) => (
            <ReferenceLine
              key={index}
              y={ref.value}
              label={ref.label}
              stroke={ref.color || 'var(--accent-danger)'}
              strokeDasharray="5 5"
            />
          ))}

          {/* Primary series */}
          {variant === 'area' ? (
            <Area
              type="monotone"
              dataKey={valueKey}
              stroke="var(--accent-500)"
              fill="var(--accent-500)"
              fillOpacity={0.6}
              strokeWidth={2}
              animationDuration={animated ? 800 : 0}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={valueKey}
              stroke="var(--accent-500)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={animated ? 800 : 0}
            />
          )}

          {/* Additional series */}
          {additionalSeries.map((series) =>
            variant === 'area' ? (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                fill={series.color}
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={animated ? 800 : 0}
              />
            ) : (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                animationDuration={animated ? 800 : 0}
              />
            )
          )}

          {/* Trend line */}
          {trendData && (
            <Line
              data={trendData}
              type="linear"
              dataKey="trend"
              stroke="var(--text-muted)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Trend"
              animationDuration={animated ? 800 : 0}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Insights */}
      {data.length > 1 && (
        <DataInsights data={data} valueKey={valueKey} />
      )}
    </motion.div>
  );
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-surface shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Calculate linear trend line
function calculateTrendLine(
  data: TimeSeriesDataPoint[],
  valueKey: string
): TimeSeriesDataPoint[] | null {
  if (data.length < 2) return null;

  const values = data.map((d) => d[valueKey] as number).filter((v) => typeof v === 'number');
  if (values.length < 2) return null;

  // Simple linear regression
  const n = values.length;
  const sumX = values.reduce((sum, _, i) => sum + i, 0);
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
  const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((d, i) => ({
    ...d,
    trend: slope * i + intercept,
  }));
}

// Data insights component
function DataInsights({
  data,
  valueKey,
}: {
  data: TimeSeriesDataPoint[];
  valueKey: string;
}) {
  const values = data
    .map((d) => d[valueKey] as number)
    .filter((v) => typeof v === 'number');

  if (values.length < 2) return null;

  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const percentChange = ((change / first) * 100);
  const isIncreasing = change > 0;

  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
      <InsightCard
        label="Change"
        value={`${isIncreasing ? '+' : ''}${change.toFixed(1)}`}
        sublabel={`${isIncreasing ? '+' : ''}${percentChange.toFixed(1)}%`}
        color={isIncreasing ? 'text-accent-danger' : 'text-accent-success'}
      />
      <InsightCard
        label="Average"
        value={avg.toFixed(1)}
      />
      <InsightCard
        label="Min"
        value={min.toFixed(1)}
      />
      <InsightCard
        label="Max"
        value={max.toFixed(1)}
      />
    </div>
  );
}

function InsightCard({
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
      {sublabel && <p className="text-xs text-text-muted mt-0.5">{sublabel}</p>}
    </div>
  );
}

// Skeleton loader
export function TimeSeriesChartSkeleton({ height = 300 }: { height?: number }) {
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
