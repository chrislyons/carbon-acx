type ReferencesDrawerProps = {
  id?: string;
  open: boolean;
  onToggle: () => void;
};

export function ReferencesDrawer({ id = 'references', open, onToggle }: ReferencesDrawerProps): JSX.Element {
  return (
    <aside
      id={id}
      aria-labelledby="references-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="references-heading" className="text-lg font-semibold">
            References
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Quick access to supporting documents, checklists, and research trails.
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
      <div
        id={`${id}-content`}
        hidden={!open}
        className="mt-6 space-y-6 text-sm text-slate-300"
      >
        <nav aria-label="Reference links" className="space-y-2">
          <a
            href="#"
            className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <span className="font-medium text-slate-200">Methodology (coming soon)</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-300">PDF</span>
          </a>
          <a
            href="#"
            className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <span className="font-medium text-slate-200">Data dictionary</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-300">Sheet</span>
          </a>
          <a
            href="#"
            className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <span className="font-medium text-slate-200">QA checklist</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-300">Doc</span>
          </a>
        </nav>
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-4 text-xs text-slate-400">
          Keyboard tip: use the <kbd className="rounded bg-slate-800 px-1">R</kbd> key while the drawer button
          is focused to toggle visibility.
        </div>
      </div>
    </aside>
  );
}
