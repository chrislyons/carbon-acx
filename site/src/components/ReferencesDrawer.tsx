import { useEffect, useMemo } from 'react';

import { useProfile } from '../state/profile';

type ReferencesDrawerProps = {
  id?: string;
  open: boolean;
  onToggle: () => void;
};

function normaliseReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry));
}

export function ReferencesDrawer({ id = 'references', open, onToggle }: ReferencesDrawerProps): JSX.Element {
  const { result } = useProfile();

  const references = useMemo(() => normaliseReferences(result?.references), [result]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onToggle]);

  return (
    <aside
      id={id}
      aria-labelledby="references-heading"
      aria-live="polite"
      className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-900/40 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="references-heading" className="text-lg font-semibold text-slate-100">
            References
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Primary sources supporting the figures. Press <kbd className="rounded bg-slate-800 px-1">Esc</kbd> to close.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key.toLowerCase() === 'r') {
              event.preventDefault();
              onToggle();
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div id={`${id}-content`} hidden={!open} className="mt-6 space-y-4 text-sm text-slate-300">
        {references.length === 0 ? (
          <p className="text-sm text-slate-400">No references available for the current selection.</p>
        ) : (
          <ol className="space-y-3" aria-label="Reference list">
            {references.map((reference, index) => (
              <li
                key={reference}
                className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-left shadow-inner shadow-slate-900/30"
              >
                <span className="block text-xs uppercase tracking-[0.3em] text-sky-400">[{index + 1}]</span>
                <p className="mt-1 text-sm text-slate-200">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
