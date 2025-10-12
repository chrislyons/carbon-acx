import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

/**
 * EmissionsHeatmap - 2D grid visualization of carbon intensity
 *
 * Features:
 * - Color-coded cells by intensity
 * - Interactive (hover for details)
 * - Flexible dimensions (activity × time, sector × type, etc.)
 * - Custom color scales
 * - Legend
 * - Responsive
 */

export interface HeatmapDataPoint {
  x: string; // X-axis category (e.g., activity name)
  y: string; // Y-axis category (e.g., time period)
  value: number; // Intensity value
  label?: string; // Display label
  metadata?: Record<string, any>; // Additional data for tooltip
}

export interface EmissionsHeatmapProps {
  data: HeatmapDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Color scale type */
  colorScale?: 'green-red' | 'blue-red' | 'monochrome';
  /** Show legend */
  showLegend?: boolean;
  /** Cell size in pixels */
  cellSize?: number;
  /** Gap between cells */
  cellGap?: number;
  /** Enable animation */
  animated?: boolean;
}

// Color scale functions
const colorScales = {
  'green-red': (value: number, min: number, max: number): string => {
    const normalized = (value - min) / (max - min);
    if (normalized < 0.2) return '#27ae60'; // Green
    if (normalized < 0.4) return '#52c41a';
    if (normalized < 0.6) return '#faad14'; // Yellow
    if (normalized < 0.8) return '#ff7a45'; // Orange
    return '#f5222d'; // Red
  },
  'blue-red': (value: number, min: number, max: number): string => {
    const normalized = (value - min) / (max - min);
    if (normalized < 0.2) return '#1890ff'; // Blue
    if (normalized < 0.4) return '#52c41a';
    if (normalized < 0.6) return '#faad14';
    if (normalized < 0.8) return '#ff7a45';
    return '#f5222d';
  },
  'monochrome': (value: number, min: number, max: number): string => {
    const normalized = (value - min) / (max - min);
    const intensity = Math.round(255 * (1 - normalized));
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  },
};

export default function EmissionsHeatmap({
  data,
  title,
  description,
  xAxisLabel = 'Category',
  yAxisLabel = 'Time',
  colorScale = 'green-red',
  showLegend = true,
  cellSize = 60,
  cellGap = 2,
  animated = true,
}: EmissionsHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapDataPoint | null>(null);

  // Extract unique x and y values
  const { xCategories, yCategories, minValue, maxValue } = useMemo(() => {
    const xSet = new Set(data.map((d) => d.x));
    const ySet = new Set(data.map((d) => d.y));
    const values = data.map((d) => d.value);

    return {
      xCategories: Array.from(xSet),
      yCategories: Array.from(ySet),
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [data]);

  // Create data lookup
  const dataLookup = useMemo(() => {
    const lookup = new Map<string, HeatmapDataPoint>();
    data.forEach((d) => {
      lookup.set(`${d.x}-${d.y}`, d);
    });
    return lookup;
  }, [data]);

  const getColorForValue = (value: number): string => {
    return colorScales[colorScale](value, minValue, maxValue);
  };

  const cellTotalSize = cellSize + cellGap;
  const gridWidth = xCategories.length * cellTotalSize + 100;
  const gridHeight = yCategories.length * cellTotalSize + 60;

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

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <svg
          width={gridWidth}
          height={gridHeight}
          className="font-sans"
        >
          {/* Y-axis labels */}
          {yCategories.map((y, yIndex) => (
            <text
              key={`y-${y}`}
              x={90}
              y={yIndex * cellTotalSize + cellSize / 2 + 50}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-muted)"
              alignmentBaseline="middle"
            >
              {y.length > 15 ? `${y.substring(0, 15)}...` : y}
            </text>
          ))}

          {/* X-axis labels */}
          {xCategories.map((x, xIndex) => (
            <text
              key={`x-${x}`}
              x={100 + xIndex * cellTotalSize + cellSize / 2}
              y={40}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-muted)"
              transform={`rotate(-45, ${100 + xIndex * cellTotalSize + cellSize / 2}, 40)`}
            >
              {x.length > 12 ? `${x.substring(0, 12)}...` : x}
            </text>
          ))}

          {/* Grid cells */}
          <g transform="translate(100, 50)">
            {yCategories.map((y, yIndex) =>
              xCategories.map((x, xIndex) => {
                const dataPoint = dataLookup.get(`${x}-${y}`);

                if (!dataPoint) {
                  return (
                    <rect
                      key={`cell-${x}-${y}`}
                      x={xIndex * cellTotalSize}
                      y={yIndex * cellTotalSize}
                      width={cellSize}
                      height={cellSize}
                      fill="var(--border)"
                      opacity={0.1}
                      rx={4}
                    />
                  );
                }

                return (
                  <motion.rect
                    key={`cell-${x}-${y}`}
                    x={xIndex * cellTotalSize}
                    y={yIndex * cellTotalSize}
                    width={cellSize}
                    height={cellSize}
                    fill={getColorForValue(dataPoint.value)}
                    rx={4}
                    initial={animated ? { scale: 0, opacity: 0 } : undefined}
                    animate={animated ? { scale: 1, opacity: 1 } : undefined}
                    transition={animated ? {
                      delay: (xIndex + yIndex) * 0.02,
                      duration: 0.3,
                    } : undefined}
                    onMouseEnter={() => setHoveredCell(dataPoint)}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: 'pointer' }}
                    className="transition-opacity hover:opacity-80"
                  />
                );
              })
            )}
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 rounded-lg border border-border bg-surface shadow-lg"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {hoveredCell.x} × {hoveredCell.y}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getColorForValue(hoveredCell.value) }}
              />
              <span className="text-2xl font-bold text-foreground">
                {hoveredCell.value.toFixed(2)}
              </span>
              <span className="text-sm text-text-muted">kg CO₂</span>
            </div>
            {hoveredCell.label && (
              <p className="text-xs text-text-muted">{hoveredCell.label}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Legend */}
      {showLegend && (
        <Legend
          minValue={minValue}
          maxValue={maxValue}
          colorScale={colorScale}
          getColor={getColorForValue}
        />
      )}
    </motion.div>
  );
}

// Legend component
function Legend({
  minValue,
  maxValue,
  colorScale,
  getColor,
}: {
  minValue: number;
  maxValue: number;
  colorScale: string;
  getColor: (value: number) => string;
}) {
  const steps = 5;
  const values = Array.from({ length: steps }, (_, i) => {
    return minValue + ((maxValue - minValue) / (steps - 1)) * i;
  });

  return (
    <div className="flex items-center gap-4 pt-4 border-t border-border">
      <span className="text-sm text-text-muted font-medium">Intensity:</span>
      <div className="flex items-center gap-1">
        {values.map((value, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: getColor(value) }}
            />
            <span className="text-xs text-text-muted">{value.toFixed(0)}</span>
          </div>
        ))}
      </div>
      <span className="text-xs text-text-muted ml-auto">kg CO₂</span>
    </div>
  );
}

// Skeleton loader
export function EmissionsHeatmapSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-6 w-48 bg-neutral-200 rounded mb-2" />
        <div className="h-4 w-full max-w-md bg-neutral-200 rounded" />
      </div>
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="aspect-square bg-neutral-200 rounded" />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-neutral-200 rounded" />
        ))}
      </div>
    </div>
  );
}
