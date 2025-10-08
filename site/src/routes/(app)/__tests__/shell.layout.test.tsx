import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';

import ShellRoute from '../shell';
import { getACXStoreState, setACXStoreState } from '@/store/useACXStore';

describe('Shell workspace layout', () => {
  beforeEach(() => {
    setACXStoreState({ focusMode: false });
  });

  it('places the brand heading above the navigation rail', () => {
    render(<ShellRoute />);
    const brandHeading = screen.getByRole('heading', { name: /carbon acx/i });
    const navigationRail = screen.getByRole('complementary', { name: /navigation/i });
    expect(brandHeading.compareDocumentPosition(navigationRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('positions the focus toggle above the context header and syncs store state', async () => {
    render(<ShellRoute />);
    const user = userEvent.setup();

    const contextRail = screen.getByRole('complementary', { name: /context/i });
    const focusToggle = within(contextRail).getByRole('button', { name: /focus mode/i });
    const referencesHeading = within(contextRail).getByText(/reference notes/i);

    expect(focusToggle).toHaveAttribute('aria-pressed', 'false');
    expect(getACXStoreState().focusMode).toBe(false);
    expect(focusToggle.compareDocumentPosition(referencesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(focusToggle);

    await waitFor(() => {
      expect(focusToggle).toHaveAttribute('aria-pressed', 'true');
    });
    expect(getACXStoreState().focusMode).toBe(true);
  });
});
