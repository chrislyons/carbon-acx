import { render } from '@testing-library/react';

import { Stacked } from '../Stacked';

const referenceLookup = new Map<string, number>([
  ['SRC.A', 1],
  ['SRC.B', 2]
]);

const sampleData = [
  {
    category: 'Cooling',
    values: { mean: 1200 },
    citation_keys: ['SRC.A']
  },
  {
    category: 'Heating',
    values: { mean: 800 },
    hover_reference_indices: [2]
  }
];

describe('Stacked', () => {
  it('renders stacked bars with reference hints', () => {
    const { asFragment, getByTestId } = render(
      <Stacked data={sampleData} referenceLookup={referenceLookup} />
    );

    expect(asFragment()).toMatchSnapshot();
    expect(getByTestId('stacked-bar-0')).toHaveAttribute('title', expect.stringContaining('[1]'));
  });
});
