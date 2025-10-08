import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { density, typography } from '@/theme/tokens';

import { StatusChip } from '../StatusChip';
import type { OmniNodeDescriptor } from './types';

interface OmniBrowserRowProps {
  node: OmniNodeDescriptor;
  depth: number;
  offset: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (nodeId: string) => void;
  onToggle: (node: OmniNodeDescriptor) => void;
  onOpen: (node: OmniNodeDescriptor) => void;
}

export function OmniBrowserRow({
  node,
  depth,
  offset,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  onOpen,
}: OmniBrowserRowProps): JSX.Element {
  const counts = node.counts;
  const status = node.state;
  const indentation = density.padX + depth * 12;

  return (
    <li
      data-id={node.id}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={isSelected}
      aria-expanded={node.hasChildren ? isExpanded : undefined}
      className={cn(
        'absolute inset-x-0 flex h-9 items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors',
        isSelected
          ? 'bg-primary/20 text-foreground'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      )}
      style={{ transform: `translateY(${offset}px)`, paddingLeft: `${indentation}px` }}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => {
        if (node.hasChildren) {
          onToggle(node);
        } else {
          onOpen(node);
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {node.hasChildren ? (
          <button
            type="button"
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border/40 bg-background/60 transition-transform',
              isExpanded && 'rotate-90'
            )}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node);
            }}
          >
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        {status ? (
          <StatusChip state={status} />
        ) : (
          <span className="inline-flex h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate" title={node.label}>
          {node.label}
        </span>
      </div>
      {counts ? (
        <div className={cn('flex shrink-0 items-center gap-3 text-xs', typography.numeric)}>
          <span aria-label="ACX count">ACX {counts.acx}</span>
          <span aria-label="OPS count">OPS {counts.ops}</span>
        </div>
      ) : null}
    </li>
  );
}
