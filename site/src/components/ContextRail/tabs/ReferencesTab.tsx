import { useCallback, useId, useMemo, type CSSProperties } from 'react';
import { ChevronDown, Copy } from 'lucide-react';

import { useShellLayout } from '@/hooks/useShellLayout';
import { density } from '@/theme/tokens';

export interface ReferencesTabProps {
  manifestHash?: string | null;
  references: readonly string[];
}

interface OrderedReference {
  value: string;
  index: number;
}

function normaliseReference(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ReferencesTab({ manifestHash = null, references }: ReferencesTabProps): JSX.Element {
  const { rightCollapsed, setRightCollapsed } = useShellLayout();
  const headerId = useId();

  const orderedReferences = useMemo(() => {
    return references
      .map((value, index) => ({ value: normaliseReference(value), index }))
      .filter((entry): entry is OrderedReference & { value: string } => Boolean(entry.value))
      .sort((a, b) => {
        const comparison = a.value.localeCompare(b.value, undefined, {
          sensitivity: 'base',
          numeric: true
        });
        if (comparison !== 0) {
          return comparison;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.value);
  }, [references]);

  const paddingStyle = {
    padding: `${density.padY}px ${density.padX}px`
  } satisfies CSSProperties;

  const headerStyle = {
    padding: `${density.padY}px ${density.padX}px`
  } satisfies CSSProperties;

  const copyJson = useCallback(async () => {
    try {
      const payload = JSON.stringify({ manifestHash, references: orderedReferences }, null, 2);
      await navigator.clipboard?.writeText(payload);
    } catch (error) {
      console.warn('Failed to copy manifest JSON', error);
    }
  }, [manifestHash, orderedReferences]);

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Reference list" data-testid="context-rail-refs">
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/80"
        style={headerStyle}
      >
        <h2 id={headerId} className="text-sm font-medium">
          References
        </h2>
        <div className="flex items-center gap-2">
          <button
            aria-label="Copy manifest JSON"
            title="Copy JSON"
            className="icon-btn"
            type="button"
            onClick={copyJson}
            data-testid="context-rail-copy-json"
          >
            <Copy aria-hidden />
          </button>
          <button
            type="button"
            aria-controls="references-panel"
            aria-expanded={!rightCollapsed}
            onClick={() => setRightCollapsed((value) => !value)}
            className="icon-btn"
            title={rightCollapsed ? 'Show references' : 'Hide references'}
            data-testid="context-rail-toggle"
          >
            <ChevronDown className={!rightCollapsed ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden />
          </button>
        </div>
      </header>
      <section
        id="references-panel"
        hidden={rightCollapsed}
        className="flex-1 overflow-auto"
        style={paddingStyle}
        aria-labelledby={headerId}
        role="region"
      >
        <div className="space-y-4">
          <header className="space-y-2" data-testid="context-rail-manifest">
            <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Active manifest</p>
            {manifestHash ? (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-[11px] font-mono text-muted-foreground">{manifestHash}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground" data-testid="context-rail-manifest-empty">
                Manifest hash unavailable for this context.
              </p>
            )}
          </header>
          <div className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">References</p>
            {orderedReferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No references available.</p>
            ) : (
              <ol className="space-y-2" data-testid="context-rail-reference-list">
                {orderedReferences.map((reference, index) => (
                  <li
                    key={`${index}-${reference}`}
                    className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground"
                  >
                    <span className="mr-2 font-mono text-[11px] text-primary">[{index + 1}]</span>
                    <span className="align-middle text-foreground">{reference}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
