import '@testing-library/jest-dom/vitest';

import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeAll(() => {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  if (typeof window.ResizeObserver === 'undefined') {
    // @ts-expect-error jsdom shim
    window.ResizeObserver = ResizeObserverMock;
  }

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });
  }

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => window.setTimeout(() => callback(performance.now()), 0);
  }

  if (typeof window.cancelAnimationFrame !== 'function') {
    window.cancelAnimationFrame = (handle: number): void => window.clearTimeout(handle);
  }

  if (typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = function scrollIntoView(): void {};
  }

  if (typeof navigator !== 'undefined' && !navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });
  }
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
