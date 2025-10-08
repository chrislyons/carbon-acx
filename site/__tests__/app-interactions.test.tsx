import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import './helpers/appMocks';
import App from '../src/App';
import { flushProfileEffects } from './helpers/appMocks';

async function renderApp() {
  vi.useFakeTimers();
  const utils = render(<App />);
  await flushProfileEffects();
  vi.useRealTimers();
  await screen.findByRole('main', { name: /emissions analysis workspace/i });
  return utils;
}

describe('App interactions', () => {

  it('supports keyboard skip navigation', async () => {
    await renderApp();

    const user = userEvent.setup();

    await user.tab();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveFocus();

    await user.keyboard('{Enter}');
    const main = screen.getByRole('main', { name: /emissions analysis workspace/i });
    expect(main).toHaveFocus();
  });

  it('toggles focus mode and updates complementary regions', async () => {
    await renderApp();

    const user = userEvent.setup();

    const focusToggle = screen.getByRole('button', { name: /enter focus mode/i });
    const workflowPanel = screen.getByRole('complementary', { name: /workflow controls/i });

    await user.click(focusToggle);
    expect(focusToggle).toHaveAttribute('aria-pressed', 'true');
    expect(workflowPanel).toHaveAttribute('aria-hidden', 'true');

    await user.click(focusToggle);
    expect(focusToggle).toHaveAttribute('aria-pressed', 'false');
    expect(workflowPanel).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('allows toggling additional layers with pressed state feedback', async () => {
    await renderApp();

    const user = userEvent.setup();

    const toggle = (await screen.findByRole('button', {
      name: /add transport services to the active comparison/i,
      hidden: true
    })) as HTMLButtonElement;

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('aria-label', expect.stringMatching(/remove transport services/i));
  });

  it('opens the mobile layer browser drawer', async () => {
    await renderApp();

    const user = userEvent.setup();

    const mobileToggle = (await screen.findByRole('button', {
      name: /browse sectors/i,
      hidden: true
    })) as HTMLButtonElement;
    const controlledId = mobileToggle.getAttribute('aria-controls');
    expect(controlledId).toBeTruthy();
    const container = controlledId ? document.getElementById(controlledId) : null;
    expect(container?.className).toContain('hidden');

    await user.click(mobileToggle);
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
    expect(container?.className).toContain('block');
  });
});
