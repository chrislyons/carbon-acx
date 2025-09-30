import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReferencesDrawer } from '../ReferencesDrawer';

vi.mock('../../state/profile', () => ({
  useProfile: () => ({
    result: {
      references: ['[1] First reference.', '[2] Second reference.']
    }
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
