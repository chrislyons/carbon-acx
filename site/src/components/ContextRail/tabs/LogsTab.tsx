import type { ReactNode } from 'react';

export interface LogsTabProps {
  children?: ReactNode;
}

export default function LogsTab({ children }: LogsTabProps): JSX.Element {
  if (!children) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">Recent logs</p>
        <p>No recent logs captured for this context.</p>
      </div>
    );
  }
  return <div className="space-y-3" data-testid="context-rail-logs">{children}</div>;
}
