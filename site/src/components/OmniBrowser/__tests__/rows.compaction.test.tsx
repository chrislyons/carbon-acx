import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OmniBrowser } from '../OmniBrowser';
import type { OmniNavigationState, OmniNodeDescriptor } from '../types';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

expect.extend(toHaveNoViolations);

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 100) }, (_, index) => ({ index, start: index * 36 })),
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
  scopes: ['entities', 'layers', 'activities', 'figures', 'scenarios', 'references'] as const,
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

vi.mock('../useOmniNavigation', () => ({
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
    counts: partial.counts,
    state: partial.state,
  } satisfies OmniNodeDescriptor;
}

function seedCompactTree(): void {
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
      children: ['layer:alpha', 'layer:beta'],
    })
  );
  nodes.set(
    'layer:alpha',
    createNode({
      id: 'layer:alpha',
      parentId: 'omni:group:layers',
      type: 'layer',
      label: 'Alpha sector',
      searchableText: 'alpha sector',
      order: 3,
      counts: { acx: 24, ops: 12 },
      state: 'rendered',
    })
  );
  nodes.set(
    'layer:beta',
    createNode({
      id: 'layer:beta',
      parentId: 'omni:group:layers',
      type: 'layer',
      label: 'Beta sector with a very long label that should truncate gracefully',
      searchableText: 'beta sector long label',
      order: 4,
      counts: { acx: 0, ops: 4 },
      state: 'missing',
    })
  );
  navMock.state = { rootId: 'omni:root', nodes };
}

function seedLargeTree(count: number): void {
  const nodes = new Map<string, OmniNodeDescriptor>();
  const childIds: string[] = [];
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
      children: childIds,
    })
  );
  for (let index = 0; index < count; index += 1) {
    const layerId = `layer:node-${index}`;
    childIds.push(layerId);
    nodes.set(
      layerId,
      createNode({
        id: layerId,
        parentId: 'omni:group:layers',
        type: 'layer',
        label: `Layer ${index + 1}`,
        order: 3 + index,
        counts: { acx: index % 5, ops: index % 3 },
        state: index % 2 === 0 ? 'rendered' : 'missing',
      })
    );
  }
  const groupNode = nodes.get('omni:group:layers');
  if (groupNode) {
    groupNode.children = [...childIds];
    groupNode.hasChildren = childIds.length > 0;
  }
  navMock.state = { rootId: 'omni:root', nodes };
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 1024,
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
  seedCompactTree();
  navMock.ensureChildrenLoaded.mockReset();
  navMock.openNode.mockReset();
  navMock.focusNode.mockReset();
});

describe('OmniBrowser compact rows', () => {
  it('renders single-line rows with status chips and tabular counters', () => {
    render(<OmniBrowser selectedNodeId={null} onSelectionChange={() => {}} />);

    const longLabel = 'Beta sector with a very long label that should truncate gracefully';
    const longLabelNode = screen.getByText(longLabel);
    expect(longLabelNode).toHaveClass('truncate');
    expect(longLabelNode).toHaveAttribute('title', longLabel);

    const longRow = longLabelNode.closest('li');
    expect(longRow).not.toBeNull();
    if (longRow) {
      expect(longRow.classList.contains('h-9')).toBe(true);
      const missingChip = within(longRow).getByRole('img', { name: /missing data/i });
      expect(missingChip).toHaveTextContent('○');
    }

    const alphaRow = screen.getByText('Alpha sector').closest('li');
    expect(alphaRow).not.toBeNull();
    if (alphaRow) {
      expect(alphaRow.classList.contains('h-9')).toBe(true);
      const renderedChip = within(alphaRow).getByRole('img', { name: /rendered/i });
      expect(renderedChip).toHaveTextContent('●');
      const acxSpan = within(alphaRow).getByLabelText(/acx count/i);
      expect(acxSpan).toHaveTextContent('ACX 24');
      const opsSpan = within(alphaRow).getByLabelText(/ops count/i);
      expect(opsSpan).toHaveTextContent('OPS 12');
      const countsContainer = acxSpan.parentElement;
      expect(countsContainer?.className).toContain('tabular-nums');
    }
  });

  it('virtualizes large navigation trees', () => {
    seedLargeTree(5000);
    render(<OmniBrowser selectedNodeId={null} onSelectionChange={() => {}} />);
    const items = screen.getAllByRole('treeitem');
    expect(items.length).toBeLessThan(150);
  });

  it('retains keyboard navigation semantics', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<OmniBrowser selectedNodeId={null} onSelectionChange={onSelectionChange} />);

    const tree = screen.getByRole('tree');
    tree.focus();

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith('omni:root'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith('omni:group:layers'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith('layer:alpha'));

    await user.keyboard('{Enter}');
    await waitFor(() => expect(navMock.openNode).toHaveBeenCalledWith('layer:alpha'));
  });

  it('passes axe accessibility checks', async () => {
    const { container } = render(<OmniBrowser selectedNodeId={null} onSelectionChange={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
