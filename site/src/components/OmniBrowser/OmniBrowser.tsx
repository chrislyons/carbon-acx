import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from 'react';
import { Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { density } from '@/theme/tokens';
import BrandHeader from '../BrandHeader';

import { useOmniNavigation, type OmniScope } from './useOmniNavigation';
import type { OmniNodeDescriptor } from './types';
import { OmniBrowserRow } from './OmniBrowserRow';

interface OmniBrowserProps {
  selectedNodeId: string | null;
  onSelectionChange?: (nodeId: string | null) => void;
}

interface VisibleNode {
  node: OmniNodeDescriptor;
  depth: number;
}

const DEFAULT_EXPANDED = new Set<string>([
  'omni:root',
  'omni:group:layers',
  'omni:group:activities',
  'omni:group:scenarios',
]);

function normaliseSearch(value: string): string {
  return value.trim().toLowerCase();
}

function resolveDepth(nodes: Map<string, OmniNodeDescriptor>, node: OmniNodeDescriptor): number {
  let depth = 0;
  let current: OmniNodeDescriptor | undefined = node;
  while (current?.parentId) {
    const parent = nodes.get(current.parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    current = parent;
  }
  return depth;
}

function filterByScope(
  scope: OmniScope,
  node: OmniNodeDescriptor,
  getScopeForType: (type: OmniNodeDescriptor['type']) => OmniScope,
  rootId: string
): boolean {
  if (node.id === rootId) {
    return true;
  }
  if (scope === 'entities') {
    return true;
  }
  return getScopeForType(node.type) === scope;
}

export function OmniBrowser({ selectedNodeId, onSelectionChange }: OmniBrowserProps): JSX.Element {
  const { state, ensureChildrenLoaded, openNode, focusNode, scopes, getScopeForType } = useOmniNavigation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DEFAULT_EXPANDED));
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<OmniScope>('entities');
  const [activeId, setActiveId] = useState<string | null>(selectedNodeId);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveId(selectedNodeId);
  }, [selectedNodeId]);

  const visibleNodes = useMemo<VisibleNode[]>(() => {
    const nodes = state.nodes;
    const searchTerm = normaliseSearch(search);
    if (!searchTerm) {
      const ordered: VisibleNode[] = [];
      const visit = (id: string, depth: number) => {
        const node = nodes.get(id);
        if (!node) {
          return;
        }
        if (!filterByScope(scope, node, getScopeForType, state.rootId)) {
          return;
        }
        ordered.push({ node, depth });
        if (!node.hasChildren) {
          return;
        }
        if (!expanded.has(id)) {
          return;
        }
        const children = node.children ?? [];
        children.forEach((childId) => visit(childId, depth + 1));
      };
      visit(state.rootId, 0);
      return ordered;
    }
    const matches = Array.from(nodes.values()).filter((node) => {
      if (!filterByScope(scope, node, getScopeForType, state.rootId)) {
        return false;
      }
      return node.searchableText.includes(searchTerm);
    });
    matches.sort((a, b) => a.order - b.order);
    return matches.map((node) => ({ node, depth: resolveDepth(nodes, node) }));
  }, [expanded, getScopeForType, scope, search, state]);

  const activeIndex = useMemo(() => {
    if (!activeId) {
      return -1;
    }
    return visibleNodes.findIndex((entry) => entry.node.id === activeId);
  }, [activeId, visibleNodes]);

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const setSelection = useCallback(
    (nodeId: string | null) => {
      setActiveId(nodeId);
      onSelectionChange?.(nodeId);
    },
    [onSelectionChange]
  );

  const handleToggle = useCallback(
    async (node: OmniNodeDescriptor) => {
      if (!node.hasChildren) {
        return;
      }
      const next = new Set(expanded);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
        await ensureChildrenLoaded(node.id);
      }
      setExpanded(next);
    },
    [ensureChildrenLoaded, expanded]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (visibleNodes.length === 0) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, visibleNodes.length - 1);
        const target = visibleNodes[nextIndex];
        setSelection(target.node.id);
        rowVirtualizer.scrollToIndex(nextIndex);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = activeIndex <= 0 ? 0 : activeIndex - 1;
        const target = visibleNodes[nextIndex];
        setSelection(target.node.id);
        rowVirtualizer.scrollToIndex(nextIndex);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const current = activeIndex >= 0 ? visibleNodes[activeIndex]?.node : null;
        if (current && current.hasChildren && !expanded.has(current.id)) {
          handleToggle(current);
        } else if (current) {
          openNode(current.id);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const current = activeIndex >= 0 ? visibleNodes[activeIndex]?.node : null;
        if (current && current.hasChildren && expanded.has(current.id)) {
          handleToggle(current);
          return;
        }
        if (current?.parentId) {
          setSelection(current.parentId);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const current = activeIndex >= 0 ? visibleNodes[activeIndex]?.node : null;
        if (current) {
          if (event.shiftKey) {
            focusNode(current.id);
          } else {
            openNode(current.id);
          }
        }
      }
    },
    [activeIndex, expanded, focusNode, handleToggle, openNode, rowVirtualizer, setSelection, visibleNodes]
  );

  const headerPaddingStyle = { padding: `${density.padY}px ${density.padX}px` } satisfies CSSProperties;
  const listPaddingStyle = { padding: `${density.padY}px 0` } satisfies CSSProperties;

  return (
    <section className="flex h-full flex-col" aria-label="Omni browser">
      <BrandHeader landmark="heading" level={2} />
      <header className="flex items-center gap-2 border-b border-border/60" style={headerPaddingStyle}>
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search navigation"
            className="flex-1 bg-transparent text-xs outline-none"
            aria-label="Search"
          />
        </div>
        <label className="sr-only" htmlFor="omni-scope">
          Filter scope
        </label>
        <select
          id="omni-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as OmniScope)}
          className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs"
        >
          {scopes.map((entry) => {
            const isActivities = entry === 'activities';
            const label = isActivities ? 'ACX' : entry.charAt(0).toUpperCase() + entry.slice(1);
            return (
              <option
                key={entry}
                value={entry}
                aria-label={isActivities ? 'ACX (activities)' : undefined}
              >
                {label}
              </option>
            );
          })}
        </select>
      </header>
      <div
        ref={containerRef}
        role="tree"
        aria-label="Navigation results"
        tabIndex={0}
        className="relative flex-1 overflow-auto focus:outline-none"
        style={listPaddingStyle}
        onKeyDown={handleKeyDown}
      >
        <ul
          role="presentation"
          className="relative m-0 list-none p-0"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = visibleNodes[virtualRow.index];
            if (!item) {
              return null;
            }
            const { node, depth } = item;
            const isExpanded = expanded.has(node.id);
            const isSelected = node.id === activeId;
            return (
              <OmniBrowserRow
                key={node.id}
                node={node}
                depth={depth}
                offset={virtualRow.start}
                isExpanded={isExpanded}
                isSelected={isSelected}
                onSelect={setSelection}
                onToggle={handleToggle}
                onOpen={(target) => openNode(target.id)}
              />
            );
          })}
        </ul>
      </div>
    </section>
  );
}
