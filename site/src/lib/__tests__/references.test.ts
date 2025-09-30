import {
  buildReferenceLookup,
  formatReferenceHint,
  resolveReferenceIndices
} from '../references';

describe('references utilities', () => {
  it('builds lookup and merges hover indices with citation keys', () => {
    const lookup = buildReferenceLookup(['SRC.A', 'SRC.B', 'SRC.C']);
    expect(lookup.get('SRC.C')).toBe(3);

    const indices = resolveReferenceIndices(
      {
        citation_keys: ['SRC.B', 'SRC.A'],
        hover_reference_indices: [5, 2, 2]
      },
      lookup
    );

    expect(indices).toEqual([1, 2, 5]);
    expect(formatReferenceHint(indices)).toBe('[1] [2] [5]');
  });

  it('returns placeholder hint when no indices are available', () => {
    const lookup = buildReferenceLookup(['SRC.A']);
    const indices = resolveReferenceIndices({}, lookup);
    expect(indices).toEqual([]);
    expect(formatReferenceHint(indices)).toBe('[—]');
  });
});
