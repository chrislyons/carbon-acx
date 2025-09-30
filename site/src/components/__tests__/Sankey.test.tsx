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
    const { asFragment, container } = render(
      <Sankey data={sampleData} referenceLookup={referenceLookup} />
    );

    expect(asFragment()).toMatchSnapshot();
    const link = container.querySelector('#sankey-link-0 title');
    expect(link?.textContent).toContain('[1]');
  });
});
