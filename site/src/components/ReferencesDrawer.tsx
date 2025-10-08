import {
  forwardRef,
  type HTMLAttributes,
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

import { useProfile } from '../state/profile';
import { ScenarioManifest } from './ScenarioManifest';

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
const ITEM_BASE_HEIGHT = 64;
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
      <div className="h-full rounded-lg border border-slate-800/70 bg-slate-950/60 pad-compact text-left shadow-inner shadow-slate-900/30">
        <span className="block text-[11px] uppercase tracking-[0.3em] text-sky-400">[{index + 1}]</span>
        <p className="mt-1 text-compact text-slate-200">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
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
      className="acx-card flex h-full flex-col gap-[var(--gap-1)] bg-slate-950/60 shadow-lg shadow-slate-900/40"
    >
      <div className="flex items-center justify-between gap-[var(--gap-0)]">
        <p id="references-heading" className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
          References
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key.toLowerCase() === 'r') {
              event.preventDefault();
              onToggle();
            }
          }}
          className="inline-flex h-9 w-9 min-h-[32px] min-w-[32px] items-center justify-center rounded-full border border-slate-600 text-slate-100 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span className="sr-only">{open ? 'Collapse references' : 'Expand references'}</span>
          <svg
            aria-hidden="true"
            className={`h-3 w-3 transition-transform ${open ? 'rotate-180 text-sky-300' : 'text-slate-400'}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 8.5a1 1 0 0 1-.707-.293l-4-4A1 1 0 0 1 2.707 3.793L6 7.086l3.293-3.293a1 1 0 0 1 1.414 1.414l-4 4A1 1 0 0 1 6 8.5Z" />
          </svg>
        </button>
      </div>
      <p className="text-compact text-slate-400">
        Primary sources supporting the figures. Press <kbd className="rounded bg-slate-800 px-1">Esc</kbd> to close.
      </p>
      <ScenarioManifest />
      <div
        id={`${id}-content`}
        hidden={!open}
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded-xl border border-slate-800/60 bg-slate-950/30 p-[var(--gap-1)] text-compact text-slate-300"
      >
        {references.length === 0 ? (
          <p className="text-compact text-slate-400">No references available for the current selection.</p>
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
          <ol className="space-y-[var(--gap-1)]" aria-label="Reference list">
            {references.map((reference, index) => (
              <li
                key={reference}
                className="rounded-lg border border-slate-800/70 bg-slate-950/60 pad-compact text-left shadow-inner shadow-slate-900/30"
              >
                <span className="block text-[11px] uppercase tracking-[0.3em] text-sky-400">[{index + 1}]</span>
                <p className="mt-1 text-compact text-slate-200">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
