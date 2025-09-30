export function ProfileControls(): JSX.Element {
  return (
    <section
      aria-labelledby="profile-controls-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40 backdrop-blur"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 id="profile-controls-heading" className="text-lg font-semibold">
            Profile Controls
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Configure the parameters that drive the model outputs. These controls will expand as the
            analysis surface matures.
          </p>
        </div>
      </div>
      <form className="mt-6 space-y-5" aria-describedby="profile-controls-heading">
        <div className="space-y-2">
          <label htmlFor="scenario" className="text-sm font-medium text-slate-200">
            Scenario
          </label>
          <select
            id="scenario"
            name="scenario"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            defaultValue="baseline"
          >
            <option value="baseline">Baseline</option>
            <option value="accelerated">Accelerated</option>
            <option value="stress-test">Stress Test</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="region" className="text-sm font-medium text-slate-200">
            Region
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              North America
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Europe
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Asia-Pacific
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Latin America
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium text-slate-200">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            placeholder="Document assumptions, caveats, or pending data requests."
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Queue computation
          </button>
        </div>
      </form>
    </section>
  );
}
