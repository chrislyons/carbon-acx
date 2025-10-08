import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ContextView = 'refs' | 'scenario' | 'compare' | 'chat' | 'logs';
export type VisualizerView = ContextView | 'focus';

interface UseViewParamOptions {
  defaultTab?: ContextView;
}

function parseViewFromSearch(search: string, fallback: ContextView): VisualizerView {
  const input = typeof search === 'string' ? search : '';
  const params = new URLSearchParams(input.startsWith('?') ? input.slice(1) : input);
  const raw = params.get('view');
  if (!raw) {
    return fallback;
  }
  const normalised = raw.trim().toLowerCase();
  if (normalised === 'focus') {
    return 'focus';
  }
  if (['refs', 'scenario', 'compare', 'chat', 'logs'].includes(normalised)) {
    return normalised as ContextView;
  }
  return fallback;
}

function writeViewToUrl(view: VisualizerView, fallback: ContextView): void {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set('view', view);
  if (view === fallback) {
    // Preserve explicit scenario deep-links but avoid redundant state when returning to default.
    const previous = params.get('view');
    if (previous === fallback) {
      params.delete('view');
    }
  }
  const search = params.toString();
  const nextSearch = search.length > 0 ? `?${search}` : '';
  if (nextSearch === window.location.search) {
    return;
  }
  const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState({}, '', url);
}

export interface ViewStateController {
  view: VisualizerView;
  activeTab: ContextView;
  setView: (view: VisualizerView) => void;
  setActiveTab: (view: ContextView) => void;
  exitFocus: () => void;
}

export function useViewParam(options: UseViewParamOptions = {}): ViewStateController {
  const defaultTab = options.defaultTab ?? 'scenario';
  const appliedSearchRef = useRef<string | null>(null);
  const [view, setViewState] = useState<VisualizerView>(() => {
    if (typeof window === 'undefined') {
      return defaultTab;
    }
    const parsed = parseViewFromSearch(window.location.search, defaultTab);
    return parsed;
  });
  const lastTabRef = useRef<ContextView>(view === 'focus' ? defaultTab : (view as ContextView));

  const applyViewFromSearch = useCallback(
    (search: string) => {
      const parsed = parseViewFromSearch(search, defaultTab);
      setViewState((previous) => {
        if (previous === parsed) {
          return previous;
        }
        return parsed;
      });
      appliedSearchRef.current = search;
    },
    [defaultTab]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    applyViewFromSearch(window.location.search);
    const handlePopState = () => {
      applyViewFromSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyViewFromSearch]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const currentSearch = window.location.search;
    if (appliedSearchRef.current !== currentSearch) {
      applyViewFromSearch(currentSearch);
    }
  });

  useEffect(() => {
    if (view !== 'focus') {
      lastTabRef.current = view;
    }
  }, [view]);

  const updateView = useCallback(
    (next: VisualizerView) => {
      setViewState((previous) => {
        if (previous === next) {
          return previous;
        }
        return next;
      });
      writeViewToUrl(next, defaultTab);
      if (typeof window !== 'undefined') {
        appliedSearchRef.current = window.location.search;
      }
    },
    [defaultTab]
  );

  const setActiveTab = useCallback(
    (next: ContextView) => {
      lastTabRef.current = next;
      updateView(next);
    },
    [updateView]
  );

  const exitFocus = useCallback(() => {
    const target = lastTabRef.current ?? defaultTab;
    updateView(target);
  }, [defaultTab, updateView]);

  const activeTab = useMemo<ContextView>(() => {
    return view === 'focus' ? lastTabRef.current ?? defaultTab : (view as ContextView);
  }, [defaultTab, view]);

  return {
    view,
    activeTab,
    setView: updateView,
    setActiveTab,
    exitFocus
  };
}

