import { ReactNode } from 'react';

interface LayoutProps {
  controls: ReactNode;
  canvas: ReactNode;
  references: ReactNode;
}

export function Layout({ controls, canvas, references }: LayoutProps): JSX.Element {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:gap-x-5 xl:grid-cols-[360px_minmax(0,1fr)_300px] xl:gap-x-6">
      <div className="order-2 min-h-0 md:col-span-2 md:order-3 lg:order-1 lg:col-span-1 lg:max-h-[calc(100vh-96px)] lg:overflow-auto lg:pr-1">
        {controls}
      </div>
      <div className="order-1 min-h-0 lg:order-2 lg:min-h-[calc(100vh-120px)] lg:overflow-hidden">
        {canvas}
      </div>
      <div className="order-3 min-h-0 md:order-2">
        {references}
      </div>
    </div>
  );
}
