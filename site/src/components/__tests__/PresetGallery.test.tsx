import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresetGallery } from '../PresetGallery';
import type { ProfileStatus } from '../../state/profile';

type MutableProfileState = {
  profileId: string;
  setProfileId: (next: string) => void;
} & Record<string, unknown>;

const profileState: MutableProfileState = {
  profileId: 'PRO.TO.24_39.HYBRID.2025',
  controls: {
    commuteDaysPerWeek: 3,
    modeSplit: { car: 60, transit: 30, bike: 10 },
    diet: 'omnivore',
    streamingHoursPerDay: 1.2
  },
  overrides: {},
  status: 'idle' as ProfileStatus,
  result: null,
  error: null,
  refresh: () => {},
  primaryLayer: 'professional',
  availableLayers: ['professional'],
  activeLayers: ['professional'],
  activeReferenceKeys: [],
  activeReferences: [],
  setActiveLayers: () => {},
  setCommuteDays: () => {},
  setModeSplit: () => {},
  setDiet: () => {},
  setStreamingHours: () => {},
  setControlsState: () => {},
  setProfileId: vi.fn()
};

vi.mock('../../state/profile', () => ({
  useProfile: () => profileState
}));

describe('PresetGallery', () => {
  beforeEach(() => {
    profileState.profileId = 'PRO.TO.24_39.HYBRID.2025';
    profileState.setProfileId = vi.fn();
  });

  it('shows the active preset and group description', () => {
    render(<PresetGallery />);

    expect(
      screen.getByRole('button', { name: /professional cohorts/i })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/hybrid cohort anchored in downtown toronto/i)).toBeInTheDocument();
    const activeCard = screen.getByRole('button', { name: /toronto professionals 24–39/i });
    expect(activeCard).toHaveAttribute('aria-pressed', 'true');
    expect(activeCard).toContainElement(screen.getByText('Active'));
  });

  it('applies a preset when a card is clicked', async () => {
    const user = userEvent.setup();
    render(<PresetGallery />);

    await user.click(screen.getByRole('button', { name: /online services/i }));
    const targetCard = await screen.findByRole('button', { name: /quebec consumer bandwidth/i });
    await user.click(targetCard);

    expect(profileState.setProfileId).toHaveBeenCalledWith('ONLINE.QC.CONSUMER.2025');
  });
});
