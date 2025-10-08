import { useEffect, useMemo, useState, useCallback, useId, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { useOmniNavigation } from './OmniBrowser/useOmniNavigation';
import type { OmniNodeDescriptor } from './OmniBrowser/types';
import type { StageId } from './Layout';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusMode: boolean;
  onFocusModeChange: (focusMode: boolean) => void;
  onToggleReferences: () => void;
  stage: StageId;
  onStageChange: (stage: StageId) => void;
  onNavigateToNode?: (nodeId: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group: string;
  action: () => void;
  searchableText: string;
}

function scoreMatch(query: string, text: string): number {
  if (!query) {
    return 0;
  }
  let score = 0;
  let queryIndex = 0;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  for (let i = 0; i < textLower.length; i += 1) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 2;
      queryIndex += 1;
      if (queryIndex === queryLower.length) {
        break;
      }
    } else if (queryLower.includes(textLower[i])) {
      score += 1;
    }
  }
  return queryIndex === queryLower.length ? score : score / 2;
}

function buildCommandFromNode(node: OmniNodeDescriptor, action: () => void): CommandItem {
  return {
    id: node.id,
    label: node.label,
    description: node.description ?? undefined,
    group: 'Navigation',
    action,
    searchableText: node.searchableText,
  } satisfies CommandItem;
}

export default function CommandPalette({
  open,
  onOpenChange,
  focusMode,
  onFocusModeChange,
  onToggleReferences,
  stage,
  onStageChange,
  onNavigateToNode,
}: CommandPaletteProps): JSX.Element | null {
  const { state, openNode } = useOmniNavigation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const labelId = useId();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      } else if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  const navigationCommands = useMemo(() => {
    const commands: CommandItem[] = [];
    state.nodes.forEach((node) => {
      if (node.type === 'group') {
        return;
      }
      const action = () => {
        openNode(node.id);
        onNavigateToNode?.(node.id);
        onOpenChange(false);
      };
      commands.push(buildCommandFromNode(node, action));
    });
    return commands;
  }, [onNavigateToNode, onOpenChange, openNode, state.nodes]);

  const systemCommands = useMemo<CommandItem[]>(() => {
    return [
      {
        id: 'cmd:toggle-focus',
        label: focusMode ? 'Disable focus mode' : 'Enable focus mode',
        group: 'Workspace',
        searchableText: 'focus mode',
        action: () => {
          onFocusModeChange(!focusMode);
          onOpenChange(false);
        },
      },
      {
        id: 'cmd:toggle-references',
        label: 'Toggle references rail',
        group: 'Workspace',
        searchableText: 'references rail toggle',
        action: () => {
          onToggleReferences();
          onOpenChange(false);
        },
      },
      {
        id: 'cmd:stage-sector',
        label: 'Show sector rail',
        group: 'Workspace',
        searchableText: 'sector rail stage left',
        action: () => {
          onStageChange('sector');
          onOpenChange(false);
        },
      },
      {
        id: 'cmd:stage-profile',
        label: 'Show profile controls',
        group: 'Workspace',
        searchableText: 'profile controls stage',
        action: () => {
          onStageChange('profile');
          onOpenChange(false);
        },
      },
      {
        id: 'cmd:stage-activity',
        label: 'Show activity planner',
        group: 'Workspace',
        searchableText: 'activity planner stage',
        action: () => {
          onStageChange('activity');
          onOpenChange(false);
        },
      },
    ];
  }, [focusMode, onFocusModeChange, onOpenChange, onStageChange, onToggleReferences]);

  const commands = useMemo(() => [...systemCommands, ...navigationCommands], [navigationCommands, systemCommands]);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return commands;
    }
    return commands
      .map((command) => ({
        command,
        score: scoreMatch(trimmed, command.searchableText || command.label),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.command);
  }, [commands, query]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length > 0 ? filtered.length - 1 : 0);
    }
  }, [activeIndex, filtered.length]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const command = filtered[activeIndex];
        command?.action();
      }
    },
    [activeIndex, filtered]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6" role="dialog" aria-modal="true" aria-labelledby={labelId}>
      <div className="w-full max-w-xl rounded-xl border border-border/60 bg-background/95 shadow-lg" onKeyDown={handleKeyDown}>
        <header className="border-b border-border/60 px-4 py-3">
          <h2 id={labelId} className="text-sm font-semibold text-foreground">
            Command palette
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Search layers, activities, figures, scenarios, and commands.</p>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            autoFocus
            placeholder="Type a command or search for an entity"
            className="mt-3 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </header>
        <div className="max-h-[340px] overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">No matching commands</p>
          ) : (
            filtered.map((command, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={command.id}
                  type="button"
                  className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm ${
                    isActive ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => command.action()}
                >
                  <span className="font-medium">{command.label}</span>
                  {command.description ? (
                    <span className="text-xs text-muted-foreground">{command.description}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
