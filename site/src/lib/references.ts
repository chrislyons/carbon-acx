export type CitationKey = string;

export interface ReferenceCarrier {
  citation_keys?: CitationKey[] | null;
  hover_reference_indices?: number[] | null;
}

export type ReferenceLookup = ReadonlyMap<CitationKey, number>;

export function buildReferenceLookup(
  sources: readonly CitationKey[] | null | undefined
): Map<CitationKey, number> {
  const lookup = new Map<CitationKey, number>();
  if (!Array.isArray(sources)) {
    return lookup;
  }
  sources.forEach((key, index) => {
    if (typeof key === 'string' && key.trim()) {
      lookup.set(key, index + 1);
    }
  });
  return lookup;
}

export function resolveReferenceIndices(
  carrier: ReferenceCarrier | null | undefined,
  lookup: ReferenceLookup
): number[] {
  const indices = new Set<number>();
  if (!carrier) {
    return [];
  }
  const hover = carrier.hover_reference_indices;
  if (Array.isArray(hover)) {
    hover.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        indices.add(Math.trunc(value));
      }
    });
  }
  const keys = carrier.citation_keys;
  if (Array.isArray(keys) && keys.length > 0) {
    keys.forEach((key) => {
      const index = lookup.get(key);
      if (typeof index === 'number') {
        indices.add(index);
      }
    });
  }
  return Array.from(indices).filter((value) => value > 0).sort((a, b) => a - b);
}

export function formatReferenceHint(indices: readonly number[]): string {
  if (!indices || indices.length === 0) {
    return '[—]';
  }
  return indices.map((value) => `[${value}]`).join(' ');
}
