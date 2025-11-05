/**
 * CitationPanel - 2D overlay panel for emission factor sources and provenance
 *
 * Displays:
 * - Activity emission factors with sources
 * - Calculation methodology references
 * - Data provenance and last updated dates
 * - Links to source documents/datasets
 *
 * Phase 3: Keep 2D Where Needed
 */

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink, FileText, Calendar, Database } from 'lucide-react';
import { Button } from '../system/Button';

// ============================================================================
// Types
// ============================================================================

export interface Citation {
  id: string;
  activityId: string;
  activityName: string;
  emissionFactor: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  methodology?: string;
  lastUpdated?: string;
  notes?: string;
}

export interface CitationPanelProps {
  /** Citation to display */
  citation: Citation | null;
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel closes */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CitationPanel({ citation, open, onClose }: CitationPanelProps) {
  if (!citation) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
        <Dialog.Content
          className="fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-[var(--radius-xl)] p-[var(--space-6)] shadow-xl overflow-y-auto"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-[var(--space-6)]">
            <div className="flex-1">
              <Dialog.Title
                className="font-bold mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-xl)',
                  color: 'var(--text-primary)',
                }}
              >
                Emission Factor Citation
              </Dialog.Title>
              <Dialog.Description
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Source information and calculation methodology
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-[var(--space-2)] rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-hover)]"
                aria-label="Close"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Activity Info */}
          <div
            className="p-[var(--space-4)] rounded-[var(--radius-lg)] mb-[var(--space-6)]"
            style={{
              backgroundColor: 'var(--color-baseline-bg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="font-semibold mb-[var(--space-2)]"
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-primary)',
              }}
            >
              {citation.activityName}
            </div>
            <div className="flex items-baseline gap-[var(--space-2)]">
              <span
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: 'var(--color-baseline)',
                }}
              >
                {citation.emissionFactor.toFixed(3)}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                kg CO₂e per {citation.unit}
              </span>
            </div>
          </div>

          {/* Source Information */}
          <div className="space-y-[var(--space-4)] mb-[var(--space-6)]">
            <InfoRow
              icon={<Database className="w-4 h-4" />}
              label="Activity ID"
              value={citation.activityId}
            />
            <InfoRow
              icon={<FileText className="w-4 h-4" />}
              label="Data Source"
              value={citation.source}
              link={citation.sourceUrl}
            />
            {citation.lastUpdated && (
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Last Updated"
                value={new Date(citation.lastUpdated).toLocaleDateString()}
              />
            )}
          </div>

          {/* Methodology */}
          {citation.methodology && (
            <div
              className="p-[var(--space-4)] rounded-[var(--radius-lg)] mb-[var(--space-6)]"
              style={{
                backgroundColor: 'var(--surface-bg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4
                className="font-semibold mb-[var(--space-2)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                Methodology
              </h4>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {citation.methodology}
              </p>
            </div>
          )}

          {/* Notes */}
          {citation.notes && (
            <div
              className="p-[var(--space-4)] rounded-[var(--radius-lg)] mb-[var(--space-6)]"
              style={{
                backgroundColor: 'var(--color-insight-bg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4
                className="font-semibold mb-[var(--space-2)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                Additional Notes
              </h4>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {citation.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-[var(--space-3)]">
            {citation.sourceUrl && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.open(citation.sourceUrl, '_blank')}
                icon={<ExternalLink className="w-4 h-4" />}
              >
                View Source
              </Button>
            )}
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Provenance Footer */}
          <div
            className="mt-[var(--space-6)] pt-[var(--space-4)] border-t"
            style={{
              borderColor: 'var(--border-subtle)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            <p>
              All emission factors are sourced from peer-reviewed datasets and verified for accuracy.
              See our{' '}
              <a
                href="/methodology"
                className="underline hover:no-underline"
                style={{ color: 'var(--interactive-primary)' }}
              >
                methodology documentation
              </a>{' '}
              for full details.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: string;
}

function InfoRow({ icon, label, value, link }: InfoRowProps) {
  return (
    <div className="flex items-start gap-[var(--space-3)]">
      <div
        className="flex-shrink-0 mt-0.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="mb-0.5"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </div>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-[var(--space-1)] hover:underline"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--interactive-primary)',
            }}
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <div
            className="font-mono"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
