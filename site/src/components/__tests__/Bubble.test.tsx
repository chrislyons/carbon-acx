import '@testing-library/jest-dom';
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
    const { getByRole, getByTestId } = render(
      <Bubble data={sampleData} referenceLookup={referenceLookup} />
    );

    // Section is a landmark with an accessible name and focus target.
    const section = getByRole('region', { name: /bubble/i });
    expect(section).toHaveAttribute('tabindex', '-1');

    const svg = getByTestId('bubble-svg');
    expect(svg).toMatchSnapshot();
    const bubble = getByTestId('bubble-point-0');
    const title = bubble.querySelector('title');
    expect(title?.textContent).toContain('[1]');
  });
});
