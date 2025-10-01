import { ReactNode } from 'react';

interface LayoutProps {
  layerBrowser: ReactNode;
  controls: ReactNode;
  canvas: ReactNode;
  references: ReactNode;
}

export function Layout({ layerBrowser, controls, canvas, references }: LayoutProps): JSX.Element {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--gap-1)] lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="order-2 flex min-h-0 flex-col gap-[calc(var(--gap-1) * 0.85)] lg:order-1 lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto lg:pr-[calc(var(--gap-0) * 0.75)]">
        <div className="min-h-0">{layerBrowser}</div>
        <div className="min-h-0">{controls}</div>
      </div>
      <div className="order-1 flex min-h-0 flex-col gap-[var(--gap-1)] lg:order-2 lg:min-h-[calc(100vh-128px)]">
        <div className="min-h-0 lg:flex-1">{canvas}</div>
        <div className="min-h-0 lg:flex-none">{references}</div>
      </div>
    </div>
  );
}
