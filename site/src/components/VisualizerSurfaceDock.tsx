import type { DockComponentProps } from './VisualizerSurface';

export default function VisualizerSurfaceDock({ theme }: DockComponentProps): JSX.Element {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">Secondary comparison</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Plotly dense theme active — margin {String((theme.layout?.margin as Record<string, unknown>)?.l ?? 0)}px.
        </p>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
        Connect a real Plotly figure to replace this placeholder.
      </div>
    </div>
  );
}
