import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import './helpers/appMocks';
import { flushProfileEffects } from './helpers/appMocks';

expect.extend(toHaveNoViolations);

describe('App accessibility', () => {
  it('has no detectable axe violations', async () => {
    vi.useFakeTimers();
    const { container } = render(<App />);

    await flushProfileEffects();
    vi.useRealTimers();

    await screen.findByRole('main', { name: /emissions analysis workspace/i });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
