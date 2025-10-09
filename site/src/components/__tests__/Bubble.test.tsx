import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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
    render(
      <Bubble data={sampleData} referenceLookup={referenceLookup} />
    );

    // Section is a landmark with an accessible name and focus target.
    const section = screen.getByRole('region', { name: /bubble/i });
    expect(section).toHaveAttribute('tabindex', '-1');

    const svg = screen.getByTestId('bubble-svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('viewBox', '0 0 640 480');
    const gradient = svg.querySelector('radialGradient#bubble-fill');
    expect(gradient).not.toBeNull();

    const bubbles = svg.querySelectorAll('[data-testid^="bubble-point-"]');
    expect(bubbles).toHaveLength(2);

    const bubble = screen.getByTestId('bubble-point-0');
    const title = bubble.querySelector('title');
    expect(title?.textContent).toContain('[1]');

    const axisLabels = Array.from(svg.querySelectorAll('text')).map((node) => node.textContent);
    expect(axisLabels).toEqual(expect.arrayContaining(['HVAC', 'Facilities']));
  });
});
