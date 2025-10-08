import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import Onboarding from '../src/routes/Onboarding';
import Story from '../src/routes/Story';
import ShellRoute from '../src/routes/(app)/shell';
import './helpers/appMocks';
import { flushProfileEffects } from './helpers/appMocks';
import { ProfileProvider } from '../src/state/profile';

expect.extend(toHaveNoViolations);

describe('Application accessibility', () => {
  interface A11yCase {
    name: string;
    render: () => ReturnType<typeof render>;
    waitForReady?: () => Promise<void>;
  }

  const cases: A11yCase[] = [
    {
      name: 'workspace shell',
      render: () => {
        vi.useFakeTimers();
        return render(<App />);
      },
      waitForReady: async () => {
        await flushProfileEffects();
        vi.useRealTimers();
        await screen.findByRole('main', { name: /emissions analysis workspace/i });
      }
    },
    {
      name: 'onboarding wizard',
      render: () => {
        vi.useFakeTimers();
        return render(
          <ProfileProvider>
            <Onboarding />
          </ProfileProvider>
        );
      },
      waitForReady: async () => {
        await flushProfileEffects();
        vi.useRealTimers();
        await screen.findByRole('main', { name: /welcome to the analysis console/i });
      }
    },
    {
      name: 'story experience',
      render: () => {
        vi.useFakeTimers();
        return render(
          <ProfileProvider>
            <Story />
          </ProfileProvider>
        );
      },
      waitForReady: async () => {
        await flushProfileEffects();
        vi.useRealTimers();
        await screen.findByRole('main', { name: /guided path/i });
      }
    },
    {
      name: 'workspace shell prototype',
      render: () => render(<ShellRoute />),
      waitForReady: async () => {
        await screen.findByRole('main', { name: /reporting window/i });
      }
    }
  ];

  it.each(cases)('has no detectable axe violations in %s', async ({ render: renderCase, waitForReady }) => {
    const { container } = renderCase();
    await waitForReady?.();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
