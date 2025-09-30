import { ReactNode, useEffect, useRef, useState } from 'react';

export interface StorySectionProps {
  id: string;
  title: string;
  eyebrow: string;
  statLabel: string;
  statValue: string;
  microCopy: string;
  referenceHint?: string;
  onRequestReferences?: () => void;
  children?: ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StorySection({
  id,
  title,
  eyebrow,
  statLabel,
  statValue,
  microCopy,
  referenceHint,
  onRequestReferences,
  children
}: StorySectionProps): JSX.Element {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || prefersReducedMotion()) {
      setIsActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        });
      },
      {
        threshold: 0.45,
        rootMargin: '0px 0px -20% 0px'
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-8 shadow-xl shadow-slate-950/40 backdrop-blur transition duration-700 ease-out lg:flex-row lg:items-center lg:gap-10 ${
        isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="flex-1 space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-400" aria-live="polite">
          {eyebrow}
        </p>
        <h2 id={`${id}-title`} className="text-2xl font-semibold text-slate-100">
          {title}
        </h2>
        <p className="text-base text-slate-300" aria-live="polite">
          {microCopy}
        </p>
        {children ? <div className="text-sm text-slate-400">{children}</div> : null}
        {onRequestReferences ? (
          <button
            type="button"
            onClick={onRequestReferences}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-slate-400 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
            View sources {referenceHint ? <span className="text-slate-400">{referenceHint}</span> : null}
          </button>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-slate-100 lg:max-w-sm">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{statLabel}</span>
        <span className="text-3xl font-semibold text-slate-50">{statValue}</span>
      </div>
    </section>
  );
}
