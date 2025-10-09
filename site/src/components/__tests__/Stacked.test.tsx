import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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
    render(
      <Stacked data={sampleData} referenceLookup={referenceLookup} />
    );

    // Section is a landmark with an accessible name and focus target.
    const section = screen.getByRole('region', { name: /annual emissions by category/i });
    expect(section).toHaveAttribute('tabindex', '-1');

    const chart = screen.getByTestId('stacked-svg');
    expect(chart.tagName).toBe('OL');
    const items = screen.getAllByTestId(/stacked-item-/);
    expect(items).toHaveLength(2);

    const firstBar = screen.getByTestId('stacked-bar-0');
    expect(firstBar).toHaveAttribute('title', expect.stringContaining('[1]'));
    expect(firstBar.getAttribute('style')).toMatch(/width:\s*\d+%/);

    const labels = items.map((item) => item.querySelector('span')?.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Cooling', 'Heating']));
  });
});
