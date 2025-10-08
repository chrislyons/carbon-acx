import {
  forwardRef,
  type HTMLAttributes,
  type OlHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  VariableSizeList as VirtualizedList,
  type ListChildComponentProps,
  type VariableSizeList as VariableSizeListComponent
} from 'react-window';

import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export interface ReferencesPanelProps {
  id?: string;
  labelledBy?: string;
  references: string[];
  isLoading?: boolean;
  error?: string | null;
  open?: boolean;
}

const VIRTUALIZATION_THRESHOLD = 30;
const ESTIMATED_CHARACTERS_PER_LINE = 90;
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

const VirtualizedOrderedList = forwardRef<HTMLOListElement, OlHTMLAttributes<HTMLOListElement>>(function VirtualizedOrderedList(
  props,
  ref
) {
  return <ol ref={ref} {...props} aria-label="Reference list" />;
});

const VirtualizedOuterDiv = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function VirtualizedOuterDiv(
  props,
  ref
) {
  const { className, ...rest } = props;
  return <div ref={ref} {...rest} className={cn('pr-4', className)} />;
});

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

export function ReferencesPanel({
  id,
  labelledBy,
  references,
  isLoading = false,
  error = null,
  open = true
}: ReferencesPanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<VariableSizeListComponent | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  const shouldVirtualize = references.length > VIRTUALIZATION_THRESHOLD;

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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading references…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive" role="alert">
        {error}
      </div>
    );
  }

  if (references.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No references available for this figure.
      </div>
    );
  }

  return (
    <ScrollArea id={id} aria-labelledby={labelledBy} ref={containerRef} className="relative h-full">
      {shouldVirtualize ? (
        <VirtualizedList
          height={viewportHeight || averageItemHeight * Math.min(references.length, 8)}
          itemCount={references.length}
          itemSize={getItemSize}
          itemData={{ references }}
          width="100%"
          outerElementType={VirtualizedOuterDiv}
          innerElementType={VirtualizedOrderedList}
          ref={listRef}
          estimatedItemSize={averageItemHeight}
          itemKey={itemKey}
        >
          {ReferenceRow}
        </VirtualizedList>
      ) : (
        <ol className="space-y-3 pr-4" aria-label="Reference list">
          {references.map((reference, index) => (
            <li key={`${index}-${reference}`}>
              <div className="h-full rounded-lg border border-border/70 bg-card/70 pad-compact text-left shadow-inner shadow-black/30">
                <span className="block text-2xs font-semibold uppercase tracking-[0.3em] text-primary">[{index + 1}]</span>
                <p className="mt-1 text-compact text-foreground/90">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ScrollArea>
  );
}
