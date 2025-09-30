import { useMemo } from 'react';

interface LayerOption {
  id: string;
  label: string;
  description: string;
}

const OPTIONAL_LAYERS: LayerOption[] = [
  {
    id: 'online',
    label: 'Online services',
    description: 'Include remote work and SaaS activity layers.'
  },
  {
    id: 'industrial_light',
    label: 'Industrial (Light)',
    description: 'Add laboratory, prototyping, and light fabrication workloads.'
  },
  {
    id: 'industrial_heavy',
    label: 'Industrial (Heavy)',
    description: 'Surface high-intensity manufacturing and heavy industry activity.'
  }
];

export interface LayerTogglesProps {
  baseLayer: string;
  availableLayers: readonly string[];
  activeLayers: readonly string[];
  onChange: (layers: string[]) => void;
}

function normaliseLayerList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export function LayerToggles({
  baseLayer,
  availableLayers,
  activeLayers,
  onChange
}: LayerTogglesProps): JSX.Element | null {
  const available = useMemo(() => new Set(normaliseLayerList(availableLayers)), [availableLayers]);
  const activeSet = useMemo(() => new Set(normaliseLayerList(activeLayers)), [activeLayers]);

  if (!baseLayer || !available.has(baseLayer)) {
    return null;
  }

  const options = OPTIONAL_LAYERS.filter((option) => available.has(option.id));
  if (options.length === 0) {
    return null;
  }

  const handleToggle = (layerId: string) => {
    const next = new Set<string>(activeSet);
    if (next.has(layerId)) {
      next.delete(layerId);
    } else {
      next.add(layerId);
    }
    next.add(baseLayer);
    const ordered: string[] = [];
    available.forEach((layer) => {
      if (next.has(layer)) {
        ordered.push(layer);
        next.delete(layer);
      }
    });
    next.forEach((layer) => ordered.push(layer));
    onChange(ordered);
  };

  return (
    <fieldset className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 shadow-inner shadow-slate-900/30">
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
        Optional layers
      </legend>
      <p className="mt-1 text-xs text-slate-400">
        Toggle additional layers to compare with the baseline professional footprint. References update
        automatically.
      </p>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        {options.map((option) => {
          const isActive = activeSet.has(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-1 items-start gap-3 rounded-lg border px-3 py-2 transition ${
                isActive
                  ? 'border-sky-400/60 bg-sky-500/10 text-slate-100'
                  : 'border-slate-800/70 bg-slate-950/40 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggle(option.id)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-400"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-slate-100">{option.label}</span>
                <span className="block text-xs text-slate-400">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
