import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ReferencesTab from '@/components/ContextRail/tabs/ReferencesTab';

describe('References tab toggle behaviour', () => {
  const REFERENCES = ['A note about Scope 2', 'Baseline methodology'];

  it('exposes a single references toggle control', () => {
    render(<ReferencesTab manifestHash="hash" references={REFERENCES} />);
    const referenceButtons = screen.getAllByRole('button', { name: /references/i });
    expect(referenceButtons).toHaveLength(1);
  });

  it('toggles the references panel visibility and aria-expanded state', async () => {
    render(<ReferencesTab manifestHash="hash" references={REFERENCES} />);
    const user = userEvent.setup();

    const toggle = screen.getByRole('button', { name: /references/i });
    const panel = screen.getByRole('region', { hidden: true, name: /references/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('hidden');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
  });
});
