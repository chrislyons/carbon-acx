import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

import { Sankey } from '../Sankey';

const referenceLookup = new Map<string, number>([
  ['SRC.A', 1]
]);

const sampleData = {
  nodes: [
    { id: 'category:cooling', label: 'Cooling', type: 'category' },
    { id: 'activity:chiller', label: 'Chiller', type: 'activity' }
  ],
  links: [
    {
      source: 'category:cooling',
      target: 'activity:chiller',
      category: 'Cooling',
      values: { mean: 1800 },
      citation_keys: ['SRC.A']
    }
  ]
};

describe('Sankey', () => {
  it('renders gradient links with reference hints', () => {
    const { container, getByRole, getByTestId } = render(
      <Sankey data={sampleData} referenceLookup={referenceLookup} />
    );

    // Section is a landmark with an accessible name and focus target.
    const section = getByRole('region', { name: /emission pathways/i });
    expect(section).toHaveAttribute('tabindex', '-1');

    const svg = getByTestId('sankey-svg');
    expect(svg).toMatchSnapshot();
    const link = container.querySelector('#sankey-link-0 title');
    expect(link?.textContent).toContain('[1]');
  });
});
