import type { ReactNode } from 'react';

export interface ScenarioTabProps {
  children?: ReactNode;
}

export default function ScenarioTab({ children }: ScenarioTabProps): JSX.Element {
  if (!children) {
    return (
      <div className="grid min-h-[160px] place-content-center text-sm text-muted-foreground">
        Scenario overview unavailable.
      </div>
    );
  }
  return <div className="space-y-4" data-testid="context-rail-scenario">{children}</div>;
}
