import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React, { useCallback, useState } from 'react';

import { OmniBrowser } from '../OmniBrowser/OmniBrowser';
import type { OmniNavigationState, OmniNodeDescriptor } from '../OmniBrowser/types';
import CommandPalette from '../CommandPalette';
import { useACXStore } from '@/store/useACXStore';
import { useDeepLink } from '@/hooks/useDeepLink';
import type { StageId } from '../Layout';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 36 })),
    getTotalSize: () => count * 36,
    scrollToIndex: () => {},
  }),
}));

const navMock = {
  state: { rootId: 'omni:root', nodes: new Map<string, OmniNodeDescriptor>() } as OmniNavigationState,
  ensureChildrenLoaded: vi.fn(),
  openNode: vi.fn(),
  focusNode: vi.fn(),
  resolveNode: (id: string) => navMock.state.nodes.get(id),
  scopes: ['entities', 'layers', 'activities', 'figures', 'scenarios', 'references'],
  getScopeForType: (type: OmniNodeDescriptor['type']) => {
    switch (type) {
      case 'layer':
        return 'layers';
      case 'activity':
        return 'activities';
      case 'figure':
        return 'figures';
      case 'scenario':
        return 'scenarios';
      case 'reference':
        return 'references';
      default:
        return 'entities';
    }
  },
  loading: false,
  error: null,
};

vi.mock('../OmniBrowser/useOmniNavigation', () => ({
  useOmniNavigation: () => navMock,
}));

function createNode(partial: Partial<OmniNodeDescriptor>): OmniNodeDescriptor {
  if (!partial.id) {
    throw new Error('Node id required');
  }
  return {
    id: partial.id,
    parentId: partial.parentId ?? null,
    type: partial.type ?? 'group',
    label: partial.label ?? partial.id,
    searchableText: partial.searchableText ?? partial.label?.toLowerCase() ?? partial.id,
    order: partial.order ?? 1,
    hasChildren: partial.hasChildren ?? false,
    isLoaded: partial.isLoaded ?? true,
    children: partial.children ? [...partial.children] : [],
    metadata: partial.metadata,
    description: partial.description,
    refCount: partial.refCount,
  } satisfies OmniNodeDescriptor;
}

function seedNavigationTree(): void {
  const nodes = new Map<string, OmniNodeDescriptor>();
  nodes.set(
    'omni:root',
    createNode({
      id: 'omni:root',
      parentId: null,
      type: 'group',
      label: 'Navigation',
      order: 1,
      hasChildren: true,
      children: ['omni:group:layers'],
    })
  );
  nodes.set(
    'omni:group:layers',
    createNode({
      id: 'omni:group:layers',
      parentId: 'omni:root',
      type: 'group',
      label: 'Layers',
      order: 2,
      hasChildren: true,
      children: ['layer:alpha'],
    })
  );
  nodes.set(
    'layer:alpha',
    createNode({
      id: 'layer:alpha',
      parentId: 'omni:group:layers',
      type: 'layer',
      label: 'Alpha layer',
      searchableText: 'alpha layer',
      order: 3,
      hasChildren: true,
      children: ['activity:alpha.1'],
      refCount: 3,
    })
  );
  nodes.set(
    'activity:alpha.1',
    createNode({
      id: 'activity:alpha.1',
      parentId: 'layer:alpha',
      type: 'activity',
      label: 'Alpha activity',
      searchableText: 'alpha activity',
      order: 4,
      hasChildren: false,
    })
  );
  navMock.state = { rootId: 'omni:root', nodes };
  navMock.openNode.mockClear();
  navMock.ensureChildrenLoaded.mockClear();
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 600,
  });
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
});

beforeEach(() => {
  seedNavigationTree();
});

afterEach(() => {
  useACXStore.getState().reset();
  window.history.replaceState({}, '', '/');
});

describe('OmniBrowser', () => {
  it('supports keyboard navigation and actions', () => {
    const onSelectionChange = vi.fn();
    render(<OmniBrowser selectedNodeId={null} onSelectionChange={onSelectionChange} />);
    const tree = screen.getByRole('tree');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(onSelectionChange).toHaveBeenCalledWith('omni:root');
    onSelectionChange.mockClear();

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(onSelectionChange).toHaveBeenCalledWith('omni:group:layers');
    onSelectionChange.mockClear();

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(onSelectionChange).toHaveBeenCalledWith('layer:alpha');

    fireEvent.keyDown(tree, { key: 'Enter' });
    expect(navMock.openNode).toHaveBeenCalledWith('layer:alpha');

    const search = screen.getByRole('searchbox', { name: /search/i });
    fireEvent.change(search, { target: { value: 'activity' } });
    expect(screen.getByText('Alpha activity')).toBeInTheDocument();
  });
});

describe('CommandPalette', () => {
  it('filters navigation commands and executes actions', () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        focusMode={false}
        onFocusModeChange={() => {}}
        onToggleReferences={() => {}}
        stage="sector"
        onStageChange={() => {}}
        onNavigateToNode={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/type a command/i);
    fireEvent.change(input, { target: { value: 'alpha' } });

    const commandButton = screen.getByRole('button', { name: /alpha layer/i });
    fireEvent.click(commandButton);

    expect(navMock.openNode).toHaveBeenCalledWith('layer:alpha');
  });
});

describe('useDeepLink', () => {
  function createHarness() {
    let stageSetter: ((stage: StageId) => void) | null = null;
    let omniSetter: ((nodes: readonly string[]) => void) | null = null;
    let latestStage: StageId = 'sector';
    let latestSelection: string[] = [];
    function Harness() {
      const [stage, setStage] = useState<StageId>('sector');
      const [selection, setSelection] = useState<string[]>([]);
      latestStage = stage;
      latestSelection = selection;
      stageSetter = setStage;
      const applySelection = useCallback(
        (nodes: readonly string[]) => {
          setSelection(Array.from(nodes));
        },
        [setSelection]
      );
      omniSetter = applySelection;
      useDeepLink({
        stage,
        onStageChange: setStage,
        selectedOmniNodes: selection,
        onOmniSelectionChange: applySelection,
      });
      return null;
    }
    return {
      Harness,
      getStage: () => latestStage,
      getSelection: () => latestSelection,
      setStage: (next: StageId) => stageSetter?.(next),
      setSelection: (nodes: string[]) => omniSetter?.([...nodes]),
    };
  }

  it('synchronises store state with URL parameters', async () => {
    window.history.replaceState({}, '', '/?figure=FIG1&nav=layer:alpha&pane=profile&focus=1');
    const harness = createHarness();
    render(<harness.Harness />);

    await waitFor(() => expect(useACXStore.getState().figureId).toBe('FIG1'));
    expect(useACXStore.getState().focusMode).toBe(true);
    await waitFor(() => expect(harness.getStage()).toBe('profile'));
    await waitFor(() => expect(harness.getSelection()).toContain('layer:alpha'));

    useACXStore.getState().setFigureId('FIG2');
    await waitFor(() => expect(window.location.search).toContain('figure=FIG2'));

    act(() => {
      harness.setStage('activity');
    });
    await waitFor(() => expect(window.location.search).toContain('pane=activity'));

    act(() => {
      harness.setSelection([]);
    });
    await waitFor(() => expect(window.location.search).not.toContain('nav='));
  });
});
