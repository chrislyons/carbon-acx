import { useEffect, useMemo } from 'react';

import { useProfile, type ReferenceEntry } from '../state/profile';

type ReferencesDrawerProps = {
  id?: string;
  open: boolean;
  onToggle: () => void;
};

function formatReferences(entries: ReferenceEntry[]): Array<{ key: string; text: string; n: number }> {
  const formatted: Array<{ key: string; text: string; n: number }> = [];
  entries.forEach((entry, index) => {
    const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
    if (!text) {
      return;
    }
    const nValue = typeof entry?.n === 'number' && Number.isFinite(entry.n) ? Math.max(1, Math.trunc(entry.n)) : index + 1;
    const key = (typeof entry?.key === 'string' && entry.key.trim()) || `${nValue}-${text}`;
    formatted.push({ key, text, n: nValue });
  });
  return formatted;
}

export function ReferencesDrawer({ id = 'references', open, onToggle }: ReferencesDrawerProps): JSX.Element {
  const { activeReferences } = useProfile();

  const references = useMemo(() => formatReferences(activeReferences), [activeReferences]);

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
      className="flex h-full flex-col rounded-2xl border border-slate-800/70 bg-slate-900/60 p-2.5 shadow-lg shadow-slate-900/40 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <p id="references-heading" className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
          References
        </p>
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
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-600 text-slate-100 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span className="sr-only">{open ? 'Collapse references' : 'Expand references'}</span>
          <svg
            aria-hidden="true"
            className={`h-3 w-3 transition-transform ${open ? 'rotate-180 text-sky-300' : 'text-slate-400'}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 8.5a1 1 0 0 1-.707-.293l-4-4A1 1 0 0 1 2.707 3.793L6 7.086l3.293-3.293a1 1 0 0 1 1.414 1.414l-4 4A1 1 0 0 1 6 8.5Z" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 text-compact text-slate-400">
        Primary sources supporting the figures. Press <kbd className="rounded bg-slate-800 px-1">Esc</kbd> to close.
      </p>
      <div
        id={`${id}-content`}
        hidden={!open}
        className="mt-2.5 flex-1 overflow-y-auto rounded-xl border border-slate-800/60 bg-slate-950/30 p-2.5 text-compact text-slate-300"
      >
        {references.length === 0 ? (
          <p className="text-compact text-slate-400">No references available for the current selection.</p>
        ) : (
            <ol className="space-y-2.5" aria-label="Reference list">
            {references.map((reference) => (
              <li
                key={reference.key}
                className="rounded-lg border border-slate-800/70 bg-slate-950/60 pad-compact text-left shadow-inner shadow-slate-900/30"
                data-testid="reference-item"
              >
                <span className="block text-[11px] uppercase tracking-[0.3em] text-sky-400">[{reference.n}]</span>
                <p className="mt-1 text-compact text-slate-200">{reference.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
