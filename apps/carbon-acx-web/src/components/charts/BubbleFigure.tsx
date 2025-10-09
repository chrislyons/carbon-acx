import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import type { BubbleDatum, BubbleFigure as BubbleFigureType } from '../../lib/api';
import { cn } from '../../lib/cn';

interface BubbleFigureProps {
  figure: BubbleFigureType;
  className?: string;
}

export function BubbleFigure({ figure, className }: BubbleFigureProps) {
  const chartId = useId();
  const descriptionId = `${chartId}-description`;

  const points = useMemo(() => figure.data.points ?? [], [figure.data.points]);

  return (
    <motion.section
      aria-labelledby={`${chartId}-title`}
      aria-describedby={descriptionId}
      role="figure"
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex h-full w-full flex-col gap-6', className)}
    >
      <header className="flex flex-col gap-2">
        <div>
          <h3 id={`${chartId}-title`} className="text-xl font-semibold text-foreground">
            {figure.title}
          </h3>
          {figure.data.subtitle && (
            <p className="text-sm text-text-secondary">{figure.data.subtitle}</p>
          )}
        </div>
        {figure.description && (
          <p className="text-sm text-text-muted max-w-prose">{figure.description}</p>
        )}
      </header>
      <div className="relative flex-1 rounded-xl border border-border bg-surface/70 p-4 shadow-sm">
        <span id={descriptionId} className="sr-only">
          Bubble chart plotting {points.length} data points. Values are read as {figure.data.xAxis.label} on the x axis,
          {figure.data.yAxis.label} on the y axis, with bubble size representing {figure.data.valueAxis.label}.
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 16, right: 24, bottom: 40, left: 48 }}
            role="img"
            aria-label={`${figure.title} bubble chart`}
          >
            <CartesianGrid stroke="rgba(23,28,42,0.08)" strokeDasharray="4 4" />
            <XAxis
              dataKey="x"
              name={figure.data.xAxis.label}
              tickLine={false}
              axisLine={false}
              stroke="var(--text-muted)"
              label={{ value: axisLabel(figure.data.xAxis), position: 'bottom', fill: 'var(--text-muted)' }}
            />
            <YAxis
              dataKey="y"
              name={figure.data.yAxis.label}
              tickLine={false}
              axisLine={false}
              stroke="var(--text-muted)"
              label={{ value: axisLabel(figure.data.yAxis), angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
            />
            <ZAxis dataKey="value" range={[80, 400]} name={figure.data.valueAxis.label} />
            <RechartsTooltip content={<BubbleTooltip />} cursor={{ fill: 'rgba(53, 88, 255, 0.08)' }} />
            <Scatter
              name={figure.title}
              data={points}
              fill="var(--accent-500)"
              fillOpacity={0.8}
              shape="circle"
              animationDuration={180}
              animationEasing="ease-out"
              isAnimationActive
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <dl className="grid gap-4 text-xs text-text-muted sm:grid-cols-3">
        <div>
          <dt className="font-medium text-text-secondary">X axis</dt>
          <dd>{axisLabel(figure.data.xAxis)}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-secondary">Y axis</dt>
          <dd>{axisLabel(figure.data.yAxis)}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-secondary">Bubble size</dt>
          <dd>{axisLabel(figure.data.valueAxis)}</dd>
        </div>
      </dl>
    </motion.section>
  );
}

function axisLabel(axis: { label: string; unit?: string | null }) {
  return axis.unit ? `${axis.label} (${axis.unit})` : axis.label;
}

function BubbleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: unknown; payload: BubbleDatum }> }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const datum = payload[0]?.payload;
  if (!datum) {
    return null;
  }
  return (
    <div className="rounded-md border border-border bg-surface/95 px-3 py-2 text-xs text-text-secondary shadow-md">
      <p className="font-semibold text-foreground">{datum.label}</p>
      <p>X: {datum.x.toLocaleString()}</p>
      <p>Y: {datum.y.toLocaleString()}</p>
      <p>Value: {datum.value.toLocaleString()}</p>
      {datum.description && <p className="mt-1 text-[0.7rem]">{datum.description}</p>}
    </div>
  );
}
