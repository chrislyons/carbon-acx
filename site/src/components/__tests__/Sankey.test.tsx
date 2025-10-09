import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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
    const { container } = render(
      <Sankey data={sampleData} referenceLookup={referenceLookup} />
    );

    // Section is a landmark with an accessible name and focus target.
    const section = screen.getByRole('region', { name: /emission pathways/i });
    expect(section).toHaveAttribute('tabindex', '-1');

    const svg = screen.getByTestId('sankey-svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('viewBox', '0 0 640 480');

    const gradients = svg.querySelectorAll('linearGradient');
    expect(gradients).toHaveLength(1);

    const path = svg.querySelector('#sankey-link-0');
    expect(path).toHaveAttribute('stroke', 'url(#sankey-gradient-0)');

    const link = container.querySelector('#sankey-link-0 title');
    expect(link?.textContent).toContain('[1]');
  });
});
