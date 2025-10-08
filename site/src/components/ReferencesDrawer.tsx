import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { ChevronDown } from 'lucide-react';

import {
  VariableSizeList as VirtualizedList,
  type ListChildComponentProps,
  type VariableSizeList as VariableSizeListComponent
} from 'react-window';

import { cn } from '@/lib/utils';
import { useProfile } from '../state/profile';
import { ScenarioManifest } from './ScenarioManifest';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

type ReferencesDrawerProps = {
  id?: string;
  open: boolean;
  onToggle: () => void;
};

function normaliseReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry));
}

const VIRTUALIZATION_THRESHOLD = 30;
const ESTIMATED_CHARACTERS_PER_LINE = 90;
// Base height covers the card content plus the padding applied by the
// `.pad-compact` utility (`p-4`, i.e. 16px on the top and bottom). This was
// increased during the design-system refresh, so the virtualization constants
// need to reflect the additional padding to avoid clipping rows once the list
// virtualizes.
const ITEM_BASE_HEIGHT = 80;
const ITEM_LINE_HEIGHT = 20;
const ITEM_VERTICAL_PADDING = 12;

function estimateItemHeight(reference: string): number {
  const lines = Math.max(1, Math.ceil(reference.length / ESTIMATED_CHARACTERS_PER_LINE));
  return ITEM_BASE_HEIGHT + ITEM_VERTICAL_PADDING * 2 + (lines - 1) * ITEM_LINE_HEIGHT;
}

type ReferenceItemData = {
  references: string[];
};

const VirtualizedOrderedList = forwardRef<HTMLOListElement, HTMLAttributes<HTMLOListElement>>(
  function VirtualizedOrderedList(props, ref) {
    return <ol ref={ref} {...props} aria-label="Reference list" />;
  }
);

function ReferenceRow({ index, style, data }: ListChildComponentProps<ReferenceItemData>): JSX.Element {
  const reference = data.references[index];
  return (
    <li
      style={{
        ...style,
        left: style.left ?? 0,
        width: style.width ?? '100%',
        paddingTop: ITEM_VERTICAL_PADDING / 2,
        paddingBottom: ITEM_VERTICAL_PADDING / 2
      }}
    >
      <div className="h-full rounded-lg border border-border/70 bg-card/70 pad-compact text-left shadow-inner shadow-black/30">
        <span className="block text-2xs font-semibold uppercase tracking-[0.3em] text-primary">[{index + 1}]</span>
        <p className="mt-1 text-compact text-foreground/90">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
      </div>
    </li>
  );
}

export function ReferencesDrawer({ id = 'references', open, onToggle }: ReferencesDrawerProps): JSX.Element {
  const { activeReferences } = useProfile();

  const references = useMemo(() => normaliseReferences(activeReferences), [activeReferences]);

  const shouldVirtualize = references.length > VIRTUALIZATION_THRESHOLD;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<VariableSizeListComponent | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!shouldVirtualize) {
      setViewportHeight(0);
      return undefined;
    }

    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const updateHeight = () => {
      setViewportHeight(element.clientHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [shouldVirtualize, open]);

  const itemHeights = useMemo(() => references.map(estimateItemHeight), [references]);

  useEffect(() => {
    if (!shouldVirtualize) {
      return;
    }
    listRef.current?.resetAfterIndex(0, true);
  }, [itemHeights, shouldVirtualize]);

  const getItemSize = useCallback((index: number) => itemHeights[index], [itemHeights]);

  const averageItemHeight = useMemo(() => {
    if (itemHeights.length === 0) {
      return ITEM_BASE_HEIGHT + ITEM_VERTICAL_PADDING * 2;
    }
    const total = itemHeights.reduce((sum, size) => sum + size, 0);
    return total / itemHeights.length;
  }, [itemHeights]);

  const itemKey = useCallback(
    (index: number, data: ReferenceItemData) => `${index}-${data.references[index]}`,
    []
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onToggle]);

  return (
    <aside
      id={id}
      aria-labelledby="references-heading"
      aria-live="polite"
      className="acx-card flex h-full flex-col gap-4 bg-card/70 shadow-lg shadow-black/40"
    >
      <div className="flex items-center justify-between gap-3">
        <p id="references-heading" className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          References
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key.toLowerCase() === 'r') {
              event.preventDefault();
              onToggle();
            }
          }}
          className="h-9 w-9 rounded-full border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
        >
          <span className="sr-only">{open ? 'Collapse references' : 'Expand references'}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 transition-transform', open ? 'rotate-180 text-primary' : 'text-muted-foreground')}
          />
        </Button>
      </div>
      <p className="text-compact text-muted-foreground">
        Primary sources supporting the figures. Press <kbd className="rounded bg-muted px-1">Esc</kbd> to close.
      </p>
      <ScenarioManifest />
      <ScrollArea
        id={`${id}-content`}
        hidden={!open}
        viewportRef={containerRef}
        className="flex-1 rounded-xl border border-border/60 bg-background/40"
        viewportClassName="p-4"
      >
        {references.length === 0 ? (
          <p className="text-compact text-muted-foreground">No references available for the current selection.</p>
        ) : shouldVirtualize ? (
          viewportHeight > 0 ? (
            <VirtualizedList
              ref={listRef}
              height={viewportHeight}
              width="100%"
              itemCount={references.length}
              itemData={{ references }}
              itemKey={itemKey}
              itemSize={getItemSize}
              estimatedItemSize={averageItemHeight}
              innerElementType={VirtualizedOrderedList}
            >
              {ReferenceRow}
            </VirtualizedList>
          ) : null
        ) : (
          <ol className="space-y-4" aria-label="Reference list">
            {references.map((reference, index) => (
              <li
                key={reference}
                className="rounded-lg border border-border/70 bg-card/70 pad-compact text-left shadow-inner shadow-black/30"
              >
                <span className="block text-2xs font-semibold uppercase tracking-[0.3em] text-primary">
                  [{index + 1}]
                </span>
                <p className="mt-1 text-compact text-foreground/90">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </aside>
  );
}
