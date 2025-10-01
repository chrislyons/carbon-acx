import { ReactNode } from 'react';

interface LayoutProps {
  controls: ReactNode;
  canvas: ReactNode;
  references: ReactNode;
}

export function Layout({ controls, canvas, references }: LayoutProps): JSX.Element {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--gap-1)] md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:grid-cols-[minmax(0,0.33fr)_minmax(0,0.67fr)_minmax(240px,0.32fr)]">
      <div className="order-2 min-h-0 md:order-1 md:col-span-1 lg:max-h-[calc(100vh-120px)] lg:overflow-auto lg:pr-[var(--gap-0)]">
        {controls}
      </div>
      <div className="order-1 min-h-0 md:order-2 lg:order-2 lg:min-h-[calc(100vh-120px)] lg:overflow-hidden">
        {canvas}
      </div>
      <div className="order-3 min-h-0 md:order-3 md:col-span-2 lg:col-span-1 lg:order-3">
        {references}
      </div>
    </div>
  );
}
