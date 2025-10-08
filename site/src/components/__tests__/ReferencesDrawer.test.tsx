import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReferencesDrawer } from '../ReferencesDrawer';

vi.mock('../../state/profile', () => ({
  useProfile: () => ({
    activeReferences: ['First reference.', 'Second reference.'],
    controls: {
      commuteDaysPerWeek: 3,
      modeSplit: { car: 60, transit: 30, bike: 10 },
      diet: 'omnivore',
      streamingHoursPerDay: 1.5,
    },
    overrides: {},
    hasLifestyleOverrides: false,
    result: { manifest: { sources: [] } },
  })
}));

describe('ReferencesDrawer', () => {
  it('renders references and closes on escape', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { asFragment } = render(<ReferencesDrawer open onToggle={onToggle} />);

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText('First reference.')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onToggle).toHaveBeenCalled();

    const button = screen.getByRole('button', { name: /collapse/i });
    expect(button.className).toContain('focus-visible');
  });
});
