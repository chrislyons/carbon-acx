import { useMemo } from 'react';

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

  return (
    <section className="space-y-4" aria-label="Reference list">
      <header className="space-y-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Active manifest
        </p>
        {manifestHash ? (
          <div className="rounded-lg border border-border/60 bg-background/60 p-3" data-testid="context-rail-manifest">
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
    </section>
  );
}
