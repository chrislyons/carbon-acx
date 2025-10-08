import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../../state/profile', async () => {
  const actual = await vi.importActual<typeof import('../../state/profile')>('../../state/profile');
  return {
    ...actual,
    useProfile: vi.fn(),
  };
});

import { ScenarioManifest } from '../ScenarioManifest';
import { hashManifest } from '../../lib/hash';
import { useProfile } from '../../state/profile';

const mockUseProfile = useProfile as unknown as Mock;

describe('ScenarioManifest', () => {
  const manifest = {
    overrides: {
      'ACTIVITY.ONE': 5,
      'ACTIVITY.ZERO': 0,
      'ACTIVITY.TWO': 2.5,
    },
    sources: ['SRC.ONE', 'SRC.TWO', 'SRC.ONE'],
  } as const;

  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      controls: {
        commuteDaysPerWeek: 4,
        modeSplit: { car: 50, transit: 30, bike: 20 },
        diet: 'vegetarian',
        streamingHoursPerDay: 2,
      },
      overrides: manifest.overrides,
      hasLifestyleOverrides: true,
      result: { manifest },
    });
  });

  afterEach(() => {
    mockUseProfile.mockReset();
    if ('clipboard' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).clipboard;
    }
  });

  it('renders scenario payload with selected rows and ordered sources', () => {
    render(<ScenarioManifest />);

    const jsonBlock = screen.getByTestId('scenario-manifest-json');
    const payload = JSON.parse(jsonBlock.textContent ?? '{}');

    expect(payload.selected_rows).toEqual([
      { activity_id: 'ACTIVITY.ONE', quantity: 5 },
      { activity_id: 'ACTIVITY.TWO', quantity: 2.5 },
    ]);
    expect(payload.source_ids).toEqual(['SRC.ONE', 'SRC.TWO']);
    expect(payload.scenario_hash).toBe(hashManifest(manifest));

    const summary = screen.getByTestId('scenario-manifest-summary');
    expect(summary.textContent).toContain('4 commute days/week');
    expect(summary.textContent).toContain('Commute mix Drive 50% / Active 20%');
    expect(summary.textContent).toContain('Vegetarian diet');
    expect(summary.textContent).toContain('2 hr/day streaming');
    expect(summary.textContent).toContain('2 active rows');
    expect(summary.textContent).toContain('2 sources');
  });

  it('copies the manifest json to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ScenarioManifest />);

    const copyButton = screen.getByTestId('scenario-manifest-copy');
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('selected_rows'));
    expect(copyButton).toHaveTextContent(/copied/i);
  });
});
