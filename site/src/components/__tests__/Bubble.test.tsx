import { render } from '@testing-library/react';

import { Bubble } from '../Bubble';

const referenceLookup = new Map<string, number>([
  ['SRC.A', 1]
]);

const sampleData = [
  {
    activity_id: 'cooling',
    activity_name: 'Cooling',
    category: 'HVAC',
    values: { mean: 2500 },
    citation_keys: ['SRC.A']
  },
  {
    activity_id: 'lighting',
    activity_name: 'Lighting',
    category: 'Facilities',
    values: { mean: 1200 },
    hover_reference_indices: [2]
  }
];

describe('Bubble', () => {
  it('renders bubble chart with pulsing circles', () => {
    const { asFragment, getByTestId } = render(
      <Bubble data={sampleData} referenceLookup={referenceLookup} />
    );

    expect(asFragment()).toMatchSnapshot();
    const bubble = getByTestId('bubble-point-0');
    const title = bubble.querySelector('title');
    expect(title?.textContent).toContain('[1]');
  });
});
