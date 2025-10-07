import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatInterface } from '../ChatInterface';
import { useChatStore } from '../../state/chat';

afterEach(() => {
  useChatStore.getState().reset();
});

describe('ChatInterface', () => {
  it('renders transcript history', () => {
    useChatStore.setState({
      history: [
        { id: '1', role: 'user', content: 'Hello', createdAt: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', createdAt: Date.now() },
      ],
    });

    render(<ChatInterface />);

    expect(screen.getAllByTestId(/chat-bubble/)).toHaveLength(2);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('disables send while warmup or busy', async () => {
    useChatStore.setState({
      busy: { warmup: true, resolving: false, computing: false },
      send: vi.fn(),
    });

    render(<ChatInterface warmup suggestions={['Option']} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('shows suggestion chips and allows selection', async () => {
    const user = userEvent.setup();
    const sendMock = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({ send: sendMock });

    render(<ChatInterface suggestions={['Try this']} />);

    const chip = screen.getByTestId('chat-suggestion');
    await user.click(chip);
    const input = screen.getByLabelText(/chat prompt/i);
    expect((input as HTMLInputElement).value).toBe('Try this');

    (input as HTMLInputElement).value = 'Try this';
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(sendMock).toHaveBeenCalledWith('Try this');
  });
});
