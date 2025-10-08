import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/state/profile', async () => {
  const actual = await vi.importActual<typeof import('@/state/profile')>('@/state/profile');
  return {
    ...actual,
    useProfile: vi.fn(),
  };
});

import ScenarioTab from '../tabs/ScenarioTab';
import { ScenarioManifest } from '../../ScenarioManifest';
import { useProfile } from '@/state/profile';

const mockUseProfile = useProfile as unknown as Mock;

describe('Scenario tab copy control', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      controls: {
        commuteDaysPerWeek: 4,
        modeSplit: { car: 50, transit: 30, bike: 20 },
        diet: 'vegetarian',
        streamingHoursPerDay: 2,
      },
      overrides: {
        'ACTIVITY.ONE': 5,
        'ACTIVITY.TWO': 2,
      },
      hasLifestyleOverrides: true,
      result: {
        manifest: {
          overrides: {
            'ACTIVITY.ONE': 5,
            'ACTIVITY.ZERO': 0,
            'ACTIVITY.TWO': 2,
          },
          sources: ['SRC.ONE', 'SRC.TWO'],
        },
      },
    });
  });

  afterEach(() => {
    mockUseProfile.mockReset();
    if ('clipboard' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).clipboard;
    }
  });

  it('exposes an icon-only copy button with clipboard support', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ScenarioTab>
        <ScenarioManifest />
      </ScenarioTab>
    );

    const copyButton = screen.getByRole('button', { name: /copy manifest json/i });
    expect(copyButton).toHaveClass('icon-btn');
    expect(copyButton).toHaveAttribute('title', 'Copy JSON');
    expect(copyButton.textContent?.trim()).toBe('');
    expect(copyButton.querySelector('svg')).not.toBeNull();

    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('selected_rows'));
    expect(copyButton).toHaveAttribute('title', 'Copied');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/manifest json copied/i);
  });
});
