/**
 * MethodologyModal - 2D text modal explaining carbon calculation methodology
 *
 * Provides transparency about:
 * - How emissions are calculated
 * - Data sources and verification
 * - Emission factor selection criteria
 * - Limitations and assumptions
 *
 * Phase 3: Keep 2D Where Needed
 */

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, BookOpen, Database, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '../system/Button';

// ============================================================================
// Types
// ============================================================================

export interface MethodologyModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal closes */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MethodologyModal({ open, onClose }: MethodologyModalProps) {
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
          className="fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-[var(--radius-xl)] p-[var(--space-6)] shadow-xl overflow-y-auto"
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
                  fontSize: 'var(--font-size-2xl)',
                  color: 'var(--text-primary)',
                }}
              >
                Carbon Calculation Methodology
              </Dialog.Title>
              <Dialog.Description
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                How we calculate and verify carbon emissions data
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

          {/* Content Sections */}
          <div className="space-y-[var(--space-6)]">
            {/* Overview */}
            <Section
              icon={<BookOpen className="w-5 h-5" />}
              title="Activity-Based Calculation Approach"
              iconBg="var(--color-baseline-bg)"
              iconColor="var(--color-baseline)"
            >
              <p className="mb-[var(--space-3)]">
                Carbon ACX uses an <strong>activity-based calculation model</strong> where emissions
                are computed by multiplying activity quantities by verified emission factors:
              </p>
              <div
                className="p-[var(--space-4)] rounded-[var(--radius-lg)] font-mono text-center"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-primary)',
                }}
              >
                Annual Emissions = Quantity × Emission Factor
              </div>
              <p className="mt-[var(--space-3)]">
                For example: <code>50 km/day × 0.18 kg CO₂/km × 365 days = 3,285 kg CO₂/year</code>
              </p>
            </Section>

            {/* Data Sources */}
            <Section
              icon={<Database className="w-5 h-5" />}
              title="Emission Factor Data Sources"
              iconBg="var(--color-insight-bg)"
              iconColor="var(--color-insight)"
            >
              <p className="mb-[var(--space-3)]">
                All emission factors are sourced from peer-reviewed datasets and verified authorities:
              </p>
              <ul className="space-y-[var(--space-2)]">
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--color-baseline)' }}>•</span>
                  <span>
                    <strong>GHG Protocol:</strong> Greenhouse Gas Protocol Corporate Standard (Scope 1, 2, 3)
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--color-baseline)' }}>•</span>
                  <span>
                    <strong>EPA:</strong> U.S. Environmental Protection Agency emission factors
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--color-baseline)' }}>•</span>
                  <span>
                    <strong>IPCC:</strong> Intergovernmental Panel on Climate Change assessment reports
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--color-baseline)' }}>•</span>
                  <span>
                    <strong>DEFRA:</strong> UK Department for Environment, Food & Rural Affairs
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--color-baseline)' }}>•</span>
                  <span>
                    <strong>Research Papers:</strong> Peer-reviewed lifecycle assessment studies
                  </span>
                </li>
              </ul>
            </Section>

            {/* Verification Process */}
            <Section
              icon={<TrendingUp className="w-5 h-5" />}
              title="Quality Assurance & Verification"
              iconBg="var(--color-goal-bg)"
              iconColor="var(--color-goal)"
            >
              <p className="mb-[var(--space-3)]">
                Every emission factor undergoes a rigorous verification process:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-3)]">
                <VerificationStep step="1" title="Source Verification">
                  Cross-reference with multiple authoritative datasets
                </VerificationStep>
                <VerificationStep step="2" title="Peer Review">
                  Independent validation by domain experts
                </VerificationStep>
                <VerificationStep step="3" title="Lifecycle Coverage">
                  Ensure full scope 1, 2, and 3 emissions are captured
                </VerificationStep>
                <VerificationStep step="4" title="Regular Updates">
                  Annual review and updates with latest data
                </VerificationStep>
              </div>
            </Section>

            {/* Limitations */}
            <Section
              icon={<AlertCircle className="w-5 h-5" />}
              title="Limitations & Assumptions"
              iconBg="var(--carbon-moderate-bg)"
              iconColor="var(--carbon-moderate)"
            >
              <p className="mb-[var(--space-3)]">
                Important limitations to understand when interpreting results:
              </p>
              <ul className="space-y-[var(--space-2)]">
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--carbon-moderate)' }}>⚠</span>
                  <span>
                    <strong>Regional Variation:</strong> Emission factors may vary by geography (e.g., grid
                    intensity differs by location)
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--carbon-moderate)' }}>⚠</span>
                  <span>
                    <strong>Temporal Changes:</strong> Technology improvements and energy mix changes affect
                    factors over time
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--carbon-moderate)' }}>⚠</span>
                  <span>
                    <strong>Estimation Uncertainty:</strong> Some activities require assumptions (e.g., average
                    commute patterns)
                  </span>
                </li>
                <li className="flex items-start gap-[var(--space-2)]">
                  <span style={{ color: 'var(--carbon-moderate)' }}>⚠</span>
                  <span>
                    <strong>System Boundaries:</strong> Not all indirect emissions may be captured (e.g.,
                    manufacturing of capital equipment)
                  </span>
                </li>
              </ul>
            </Section>

            {/* Calculator vs Manual */}
            <div
              className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
              style={{
                backgroundColor: 'var(--surface-bg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4
                className="font-semibold mb-[var(--space-3)]"
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-primary)',
                }}
              >
                Quick Calculator vs. Manual Entry
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-4)]">
                <div>
                  <h5
                    className="font-medium mb-[var(--space-2)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Quick Calculator
                  </h5>
                  <ul
                    className="space-y-[var(--space-1)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <li>• Uses average emission factors</li>
                    <li>• Broad category estimates</li>
                    <li>• ~80% accuracy for individuals</li>
                    <li>• Best for initial baseline</li>
                  </ul>
                </div>
                <div>
                  <h5
                    className="font-medium mb-[var(--space-2)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Manual Activity Entry
                  </h5>
                  <ul
                    className="space-y-[var(--space-1)]"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <li>• Specific emission factors per activity</li>
                    <li>• Customizable quantities</li>
                    <li>• Audit-ready documentation</li>
                    <li>• Best for detailed tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-[var(--space-6)] pt-[var(--space-4)] border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <a
              href="/data/emission-factors.csv"
              download
              className="text-[var(--font-size-sm)] underline hover:no-underline"
              style={{ color: 'var(--interactive-primary)' }}
            >
              Download full emission factors dataset (CSV)
            </a>
            <Button variant="primary" size="md" onClick={onClose}>
              Got it
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}

function Section({ icon, title, iconBg, iconColor, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-3)]">
        <div
          className="p-[var(--space-2)] rounded-[var(--radius-md)]"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <h3
          className="font-semibold"
          style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface VerificationStepProps {
  step: string;
  title: string;
  children: React.ReactNode;
}

function VerificationStep({ step, title, children }: VerificationStepProps) {
  return (
    <div
      className="p-[var(--space-3)] rounded-[var(--radius-lg)]"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
          style={{
            backgroundColor: 'var(--color-goal)',
            color: 'white',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          {step}
        </div>
        <h4
          className="font-semibold"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h4>
      </div>
      <p
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
        }}
      >
        {children}
      </p>
    </div>
  );
}
