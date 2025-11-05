/**
 * Accessibility Hooks - WCAG 2.1 AA compliance utilities
 *
 * Hooks:
 * - useReducedMotion - Detect prefers-reduced-motion
 * - useFocusTrap - Trap focus within modal/dialog
 * - useKeyboardNav - Keyboard navigation helpers
 * - useAnnounce - Screen reader announcements
 *
 * Phase 3 Week 7 implementation
 */

import * as React from 'react';

// ============================================================================
// useReducedMotion
// ============================================================================

/**
 * Detect if user prefers reduced motion
 *
 * @returns boolean - true if reduced motion is preferred
 *
 * @example
 * const shouldReduceMotion = useReducedMotion();
 * const animationDuration = shouldReduceMotion ? 0 : 600;
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// useFocusTrap
// ============================================================================

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 *
 * @param active - Whether the trap is active
 * @returns ref to attach to container element
 *
 * @example
 * const dialogRef = useFocusTrap(isOpen);
 * return <dialog ref={dialogRef}>...</dialog>;
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean
): React.RefObject<T> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [active]);

  return ref;
}

// ============================================================================
// useKeyboardNav
// ============================================================================

export interface KeyboardNavOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onSpace?: () => void;
}

/**
 * Keyboard navigation helpers
 *
 * @param options - Handlers for different keys
 * @param active - Whether keyboard nav is active
 *
 * @example
 * useKeyboardNav({
 *   onEnter: () => handleSubmit(),
 *   onEscape: () => handleClose(),
 *   onArrowDown: () => selectNext(),
 * }, isOpen);
 */
export function useKeyboardNav(options: KeyboardNavOptions, active: boolean = true) {
  React.useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          options.onEnter?.();
          break;
        case 'Escape':
          options.onEscape?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          options.onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          options.onArrowDown?.();
          break;
        case 'ArrowLeft':
          options.onArrowLeft?.();
          break;
        case 'ArrowRight':
          options.onArrowRight?.();
          break;
        case ' ':
          if (options.onSpace) {
            event.preventDefault();
            options.onSpace();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, active]);
}

// ============================================================================
// useAnnounce
// ============================================================================

/**
 * Announce messages to screen readers using ARIA live regions
 *
 * @returns announce function
 *
 * @example
 * const announce = useAnnounce();
 *
 * function handleSave() {
 *   // Save data...
 *   announce('Profile saved successfully');
 * }
 */
export function useAnnounce(): (message: string, priority?: 'polite' | 'assertive') => void {
  const announcerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = React.useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!announcerRef.current) return;

      // Update priority
      announcerRef.current.setAttribute('aria-live', priority);

      // Clear previous message
      announcerRef.current.textContent = '';

      // Announce new message (timeout ensures screen reader picks it up)
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      }, 100);
    },
    []
  );

  return announce;
}

// ============================================================================
// usePreferredColorScheme
// ============================================================================

export type ColorScheme = 'light' | 'dark' | 'no-preference';

/**
 * Detect user's preferred color scheme
 *
 * @returns 'light' | 'dark' | 'no-preference'
 *
 * @example
 * const colorScheme = usePreferredColorScheme();
 * const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
 */
export function usePreferredColorScheme(): ColorScheme {
  const [scheme, setScheme] = React.useState<ColorScheme>('no-preference');

  React.useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

    const updateScheme = () => {
      if (darkQuery.matches) {
        setScheme('dark');
      } else if (lightQuery.matches) {
        setScheme('light');
      } else {
        setScheme('no-preference');
      }
    };

    updateScheme();

    const handleChange = () => updateScheme();

    // Modern browsers
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener('change', handleChange);
      lightQuery.addEventListener('change', handleChange);
      return () => {
        darkQuery.removeEventListener('change', handleChange);
        lightQuery.removeEventListener('change', handleChange);
      };
    }
    // Legacy browsers
    else {
      darkQuery.addListener(handleChange);
      lightQuery.addListener(handleChange);
      return () => {
        darkQuery.removeListener(handleChange);
        lightQuery.removeListener(handleChange);
      };
    }
  }, []);

  return scheme;
}

// ============================================================================
// useAriaLabel
// ============================================================================

/**
 * Generate accessible aria-label from context
 *
 * @param base - Base label text
 * @param context - Additional context
 * @returns Formatted aria-label
 *
 * @example
 * const ariaLabel = useAriaLabel('Close', { section: 'Dialog' });
 * // Returns: "Close Dialog"
 */
export function useAriaLabel(
  base: string,
  context?: { section?: string; state?: string; index?: number }
): string {
  return React.useMemo(() => {
    let label = base;

    if (context?.section) {
      label += ` ${context.section}`;
    }

    if (context?.state) {
      label += `, ${context.state}`;
    }

    if (context?.index !== undefined) {
      label += ` ${context.index + 1}`;
    }

    return label;
  }, [base, context]);
}

// ============================================================================
// useSkipLink
// ============================================================================

/**
 * Create skip link for keyboard navigation
 *
 * @param targetId - ID of target element to skip to
 * @returns Skip link props
 *
 * @example
 * const skipToMainProps = useSkipLink('main-content');
 * return <a {...skipToMainProps}>Skip to main content</a>;
 */
export function useSkipLink(targetId: string) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    href: `#${targetId}`,
    onClick: handleClick,
    className: 'skip-link',
    'aria-label': `Skip to ${targetId.replace(/-/g, ' ')}`,
  };
}
