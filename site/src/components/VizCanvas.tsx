export function VizCanvas(): JSX.Element {
  return (
    <section
      aria-labelledby="viz-canvas-heading"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-6 shadow-lg shadow-slate-900/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 id="viz-canvas-heading" className="text-lg font-semibold">
            Visualization Canvas
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            A responsive surface to host charts, timelines, and other analytical storytelling assets.
          </p>
        </div>
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:text-xs sm:text-slate-500">
          <span>Status</span>
          <span className="font-semibold text-sky-300">Idle</span>
        </div>
      </div>
      <div className="mt-6 grid min-h-[320px] place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center text-sm text-slate-500">
        <div className="space-y-3">
          <p className="text-base font-medium text-slate-300">Ready for renderings</p>
          <p className="max-w-sm text-sm text-slate-400">
            Drop in future visual components or connect the compute API to stream results into this
            canvas.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-700" aria-hidden="true" />
            <span>Awaiting data</span>
            <span className="h-2 w-2 rounded-full bg-slate-700" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
