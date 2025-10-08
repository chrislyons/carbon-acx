import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SHELL_LAYOUT_STORAGE_KEY } from '@/theme/tokens';

import VisualizerSurface from '../VisualizerSurface';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

expect.extend(toHaveNoViolations);

function createLongContent(label: string, count: number): JSX.Element {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <p key={`${label}-${index}`} className="py-1 text-sm text-muted-foreground">
          {label} entry {index + 1}
        </p>
      ))}
    </div>
  );
}

const REFERENCES = ['Alpha reference', 'beta source', 'Gamma insight'];

function renderSurface(options: Partial<Parameters<typeof VisualizerSurface>[0]> = {}) {
  const primary = <div data-testid="primary-chart">Primary chart</div>;
  const scenario = options.scenario ?? createLongContent('Scenario', 60);
  const chat = options.chat ?? <div data-testid="chat-panel">Chat content</div>;
  const logs = options.logs ?? createLongContent('Log', 40);
  const compare = options.compare ?? <div data-testid="compare-panel">Compare guidance</div>;

  return render(
    <VisualizerSurface
      primary={primary}
      manifestHash="hash-123"
      references={REFERENCES}
      scenario={scenario}
      chat={chat}
      logs={logs}
      compare={compare}
      dockLoader={options.dockLoader}
    />
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.removeItem(SHELL_LAYOUT_STORAGE_KEY);
});

describe('Context rail interactions', () => {
  it('preserves scroll position when switching tabs', async () => {
    renderSurface();
    const user = userEvent.setup();

    await screen.findByTestId('context-rail-scenario');
    const scrollArea = screen.getByTestId('context-rail-scroll');

    act(() => {
      scrollArea.scrollTop = 180;
      fireEvent.scroll(scrollArea);
    });

    await user.click(screen.getByRole('tab', { name: /Chat/i }));
    await screen.findByTestId('context-rail-chat');

    act(() => {
      scrollArea.scrollTop = 60;
      fireEvent.scroll(scrollArea);
    });

    await user.click(screen.getByRole('tab', { name: /Scenario/i }));
    await screen.findByTestId('context-rail-scenario');

    await waitFor(() => {
      expect(scrollArea.scrollTop).toBeCloseTo(180);
    });
  });

  it('passes axe accessibility checks for the visible layout', async () => {
    const { container } = renderSurface();
    await screen.findByTestId('context-rail-scenario');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Visualizer focus mode', () => {
  it('toggles focus mode and exits via Escape key', async () => {
    renderSurface();
    const user = userEvent.setup();

    await screen.findByTestId('context-rail-tabs');
    const railWrapper = screen.getByTestId('context-rail-container');

    expect(screen.getByTestId('visualizer-surface')).not.toBeNull();

    act(() => {
      window.history.replaceState({}, '', '?view=focus');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(document.querySelector('[data-visualizer-view="focus"]')).not.toBeNull();
    });
    expect(railWrapper).toHaveAttribute('aria-hidden', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(document.querySelector('[data-visualizer-view="focus"]')).toBeNull();
    });
    expect(railWrapper).not.toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Dock persistence', () => {
  it('retains dock orientation and size via shell layout storage', async () => {
    const dockLoader = vi.fn().mockResolvedValue({
      default: vi.fn(() => <div data-testid="lazy-dock">Lazy dock</div>)
    });

    const { unmount } = renderSurface({ dockLoader });
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: /Compare/i }));
    await user.click(await screen.findByTestId('context-rail-dock-toggle'));

    await screen.findByTestId('visualizer-dock');
    expect(dockLoader).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('context-rail-dock-position-bottom'));
    await waitFor(() => {
      expect(screen.getByTestId('visualizer-dock')).toHaveAttribute('data-orientation', 'bottom');
    });

    const slider = screen.getByTestId('context-rail-dock-size') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.45' } });
    expect(slider.value).toBe('0.45');

    await user.click(screen.getByTestId('context-rail-dock-toggle'));
    await waitFor(() => {
      expect(screen.queryByTestId('visualizer-dock')).toBeNull();
    });

    unmount();

    renderSurface({ dockLoader });
    const nextUser = userEvent.setup();

    await nextUser.click(screen.getByRole('tab', { name: /Compare/i }));
    await nextUser.click(await screen.findByTestId('context-rail-dock-toggle'));
    await screen.findByTestId('visualizer-dock');

    expect(screen.getByTestId('visualizer-dock')).toHaveAttribute('data-orientation', 'bottom');
    const restoredSlider = screen.getByTestId('context-rail-dock-size') as HTMLInputElement;
    expect(Number(restoredSlider.value)).toBeCloseTo(0.45, 2);
  });
});
