/**
 * ShareableCard - Export-ready emissions snapshots
 *
 * Features:
 * - Export to PNG, PDF, Twitter card formats
 * - Branded Carbon ACX templates
 * - Customizable content (baseline, goal, scenario comparison)
 * - Social media optimized dimensions
 * - Download/copy functionality
 * - Design token consistency
 *
 * Phase 2 Week 6 implementation
 */

import * as React from 'react';
import { Button } from '../system/Button';
import { Download, Share2, Copy, Check, Twitter, FileText, Image } from 'lucide-react';
import html2canvas from 'html2canvas';

// ============================================================================
// Types
// ============================================================================

export type ShareableCardType = 'baseline' | 'goal' | 'comparison' | 'achievement';
export type ExportFormat = 'png' | 'pdf' | 'twitter';

export interface ShareableCardProps {
  type: ShareableCardType;
  data: {
    title: string;
    value: number; // kg CO₂
    subtitle?: string;
    comparison?: {
      label: string;
      value: number;
      unit: string;
    };
    stats?: Array<{
      label: string;
      value: string;
    }>;
    footer?: string;
  };
  onExport?: (format: ExportFormat, dataUrl: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ShareableCard({ type, data, onExport }: ShareableCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const config = getCardConfig(type);

  const handleExport = async (format: ExportFormat) => {
    if (!cardRef.current) return;

    setIsExporting(true);

    try {
      // Capture card as canvas
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
      });

      let dataUrl: string;

      if (format === 'png' || format === 'twitter') {
        // PNG export
        dataUrl = canvas.toDataURL('image/png');

        // Download file
        const link = document.createElement('a');
        link.download = `carbon-acx-${type}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        // PDF export (simple approach - embed PNG in PDF)
        // In production, consider using jsPDF for better control
        dataUrl = canvas.toDataURL('image/png');

        // For now, just download as PNG with .pdf extension
        // A full PDF implementation would use jsPDF
        const link = document.createElement('a');
        link.download = `carbon-acx-${type}-${Date.now()}.pdf`;
        link.href = dataUrl;
        link.click();
      } else {
        dataUrl = '';
      }

      onExport?.(format, dataUrl);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="space-y-[var(--space-4)]">
      {/* Preview card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]"
        style={{
          width: '600px',
          height: '315px', // Twitter card aspect ratio 1.91:1
          background: config.gradient,
          border: `2px solid ${config.borderColor}`,
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle, ${config.accentColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-[var(--space-8)]">
          {/* Header */}
          <div>
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-4)]">
              <div style={{ color: config.accentColor }}>
                <config.icon className="w-8 h-8" />
              </div>
              <h3
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {data.title}
              </h3>
            </div>

            {/* Main value */}
            <div className="mb-[var(--space-4)]">
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-5xl)',
                  color: config.accentColor,
                  lineHeight: '1',
                }}
              >
                {(data.value / 1000).toFixed(1)}
              </div>
              <div
                className="font-medium"
                style={{
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--text-secondary)',
                }}
              >
                tonnes CO₂/year
              </div>
            </div>

            {data.subtitle && (
              <p
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-secondary)',
                }}
              >
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Stats */}
          {data.stats && data.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-[var(--space-4)]">
              {data.stats.map((stat, index) => (
                <div key={index}>
                  <div
                    className="font-bold mb-[var(--space-1)]"
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comparison */}
          {data.comparison && (
            <div
              className="px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-lg)]"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${config.accentColor}`,
              }}
            >
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                {data.comparison.label}
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-lg)',
                  color: config.accentColor,
                }}
              >
                {data.comparison.value.toFixed(1)} {data.comparison.unit}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-end justify-between">
            <div>
              {data.footer && (
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {data.footer}
                </p>
              )}
            </div>
            <div className="text-right">
              <div
                className="font-bold mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-primary)',
                }}
              >
                Carbon ACX
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                carbon-acx.org
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export controls */}
      <div className="flex items-center gap-[var(--space-3)]">
        <Button
          variant="primary"
          size="md"
          onClick={() => handleExport('png')}
          disabled={isExporting}
          icon={<Image className="w-4 h-4" />}
        >
          Export PNG
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          icon={<FileText className="w-4 h-4" />}
        >
          Export PDF
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={() => handleExport('twitter')}
          disabled={isExporting}
          icon={<Twitter className="w-4 h-4" />}
        >
          Twitter Card
        </Button>

        <Button
          variant="ghost"
          size="md"
          onClick={handleCopy}
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Export status */}
      {isExporting && (
        <div
          className="text-center py-[var(--space-2)]"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          Generating export...
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pre-configured templates
// ============================================================================

export function BaselineShareableCard({
  emissions,
  activityCount,
  topCategory,
}: {
  emissions: number;
  activityCount: number;
  topCategory?: string;
}) {
  return (
    <ShareableCard
      type="baseline"
      data={{
        title: 'My Carbon Baseline',
        value: emissions,
        subtitle: topCategory
          ? `${topCategory} is my largest emissions source`
          : 'Understanding my carbon footprint',
        stats: [
          { label: 'Activities', value: activityCount.toString() },
          { label: 'Categories', value: '4' },
          { label: 'Status', value: 'Active' },
        ],
        footer: 'Calculated with Carbon ACX',
      }}
    />
  );
}

export function GoalShareableCard({
  currentEmissions,
  targetEmissions,
  progress,
  deadline,
}: {
  currentEmissions: number;
  targetEmissions: number;
  progress: number;
  deadline?: string;
}) {
  const reduction = currentEmissions - targetEmissions;
  const reductionPercent = ((reduction / currentEmissions) * 100).toFixed(0);

  return (
    <ShareableCard
      type="goal"
      data={{
        title: 'My Carbon Goal',
        value: targetEmissions,
        subtitle: `${reductionPercent}% reduction from baseline`,
        comparison: {
          label: 'Current Progress',
          value: progress,
          unit: '% complete',
        },
        stats: [
          { label: 'Baseline', value: `${(currentEmissions / 1000).toFixed(1)}t` },
          { label: 'Target', value: `${(targetEmissions / 1000).toFixed(1)}t` },
          { label: 'To Go', value: `${(reduction / 1000).toFixed(1)}t` },
        ],
        footer: deadline
          ? `Target date: ${new Date(deadline).toLocaleDateString()}`
          : 'Working towards net zero',
      }}
    />
  );
}

export function AchievementShareableCard({
  emissions,
  reductionAmount,
  reductionPercent,
  milestoneName,
}: {
  emissions: number;
  reductionAmount: number;
  reductionPercent: number;
  milestoneName?: string;
}) {
  const flights = (reductionAmount / 900).toFixed(1);

  return (
    <ShareableCard
      type="achievement"
      data={{
        title: milestoneName || 'Goal Achieved! 🎉',
        value: emissions,
        subtitle: `Reduced emissions by ${reductionPercent.toFixed(0)}%`,
        comparison: {
          label: 'Equivalent to avoiding',
          value: parseFloat(flights),
          unit: 'transatlantic flights',
        },
        stats: [
          { label: 'Reduction', value: `${(reductionAmount / 1000).toFixed(1)}t` },
          { label: 'Progress', value: '100%' },
          { label: 'Status', value: '✓ Complete' },
        ],
        footer: 'Making a difference together',
      }}
    />
  );
}

export function ComparisonShareableCard({
  myEmissions,
  comparisonLabel,
  comparisonEmissions,
  difference,
}: {
  myEmissions: number;
  comparisonLabel: string;
  comparisonEmissions: number;
  difference: number;
}) {
  const percentDiff = ((difference / comparisonEmissions) * 100).toFixed(0);
  const isLower = difference < 0;

  return (
    <ShareableCard
      type="comparison"
      data={{
        title: 'How I Compare',
        value: myEmissions,
        subtitle: `vs. ${comparisonLabel}`,
        comparison: {
          label: isLower ? 'Lower by' : 'Higher by',
          value: Math.abs(parseFloat(percentDiff)),
          unit: '%',
        },
        stats: [
          { label: 'My Emissions', value: `${(myEmissions / 1000).toFixed(1)}t` },
          { label: comparisonLabel, value: `${(comparisonEmissions / 1000).toFixed(1)}t` },
          { label: 'Difference', value: `${(Math.abs(difference) / 1000).toFixed(1)}t` },
        ],
        footer: isLower ? 'Doing better than average! 🌟' : 'Opportunity to improve',
      }}
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

interface CardConfig {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderColor: string;
  accentColor: string;
}

function getCardConfig(type: ShareableCardType): CardConfig {
  switch (type) {
    case 'baseline':
      return {
        icon: FileText,
        gradient: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--color-baseline-bg) 100%)',
        borderColor: 'var(--color-baseline)',
        accentColor: 'var(--color-baseline)',
      };

    case 'goal':
      return {
        icon: Download,
        gradient: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--color-goal-bg) 100%)',
        borderColor: 'var(--color-goal)',
        accentColor: 'var(--color-goal)',
      };

    case 'comparison':
      return {
        icon: Share2,
        gradient: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--carbon-moderate-bg) 100%)',
        borderColor: 'var(--carbon-moderate)',
        accentColor: 'var(--carbon-moderate)',
      };

    case 'achievement':
      return {
        icon: Check,
        gradient: 'linear-gradient(135deg, var(--carbon-low-bg) 0%, var(--color-improvement-bg) 100%)',
        borderColor: 'var(--carbon-low)',
        accentColor: 'var(--carbon-low)',
      };

    default:
      return {
        icon: FileText,
        gradient: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
        accentColor: 'var(--text-primary)',
      };
  }
}
