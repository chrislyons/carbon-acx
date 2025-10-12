import type { ProfileData } from '../contexts/ProfileContext';

/**
 * Export utilities for carbon profile data
 *
 * Formats:
 * - CSV (spreadsheet-friendly)
 * - JSON (machine-readable)
 * - Plain text summary
 */

// ============================================================================
// CSV Export
// ============================================================================

export function exportProfileToCSV(profile: ProfileData): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `carbon-profile-${timestamp}.csv`;

  // Build CSV content
  const lines: string[] = [];

  // Header
  lines.push('Carbon Footprint Profile Export');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  // Activities
  if (profile.activities.length > 0) {
    lines.push('Activities');
    lines.push('ID,Sector,Name,Category,Quantity,Unit,Carbon Intensity (kg),Annual Emissions (kg),Added Date');

    profile.activities.forEach((activity) => {
      lines.push(
        [
          escapeCSV(activity.id),
          escapeCSV(activity.sectorId),
          escapeCSV(activity.name),
          escapeCSV(activity.category || ''),
          activity.quantity,
          escapeCSV(activity.unit),
          activity.carbonIntensity.toFixed(4),
          activity.annualEmissions.toFixed(2),
          activity.addedAt,
        ].join(',')
      );
    });

    lines.push('');
  }

  // Calculator results
  if (profile.calculatorResults.length > 0) {
    lines.push('Calculator Results');
    lines.push('Category,Label,Annual Emissions (kg),Calculated Date');

    profile.calculatorResults.forEach((result) => {
      lines.push(
        [
          result.category,
          escapeCSV(result.label),
          result.annualEmissions.toFixed(2),
          result.calculatedAt,
        ].join(',')
      );
    });

    lines.push('');
  }

  // Summary
  const totalEmissions = calculateTotal(profile);
  lines.push('Summary');
  lines.push(`Total Annual Emissions (kg),${totalEmissions.toFixed(2)}`);
  lines.push(`Total Annual Emissions (tonnes),${(totalEmissions / 1000).toFixed(3)}`);
  lines.push(`Number of Activities,${profile.activities.length}`);
  lines.push(`Number of Calculator Results,${profile.calculatorResults.length}`);
  lines.push(`Last Updated,${profile.lastUpdated}`);

  // Download
  downloadFile(lines.join('\n'), filename, 'text/csv');
}

// ============================================================================
// JSON Export
// ============================================================================

export function exportProfileToJSON(profile: ProfileData): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `carbon-profile-${timestamp}.json`;

  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    profile: {
      ...profile,
      totalEmissions: calculateTotal(profile),
      totalEmissionsTonnes: calculateTotal(profile) / 1000,
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

// ============================================================================
// Text Summary Export
// ============================================================================

export function exportProfileToText(profile: ProfileData): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `carbon-profile-summary-${timestamp}.txt`;

  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('           CARBON FOOTPRINT PROFILE SUMMARY         ');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Last Updated: ${new Date(profile.lastUpdated).toLocaleString()}`);
  lines.push('');

  // Total emissions
  const totalEmissions = calculateTotal(profile);
  const tonnes = totalEmissions / 1000;
  const globalAverage = 4.5;
  const percentOfAverage = (tonnes / globalAverage) * 100;

  lines.push('───────────────────────────────────────────────────');
  lines.push('ANNUAL CARBON FOOTPRINT');
  lines.push('───────────────────────────────────────────────────');
  lines.push(`Total: ${totalEmissions.toFixed(2)} kg CO₂ (${tonnes.toFixed(2)} tonnes)`);
  lines.push(`Global Average: ${globalAverage} tonnes CO₂`);
  lines.push(
    `Comparison: ${percentOfAverage.toFixed(1)}% of global average ${
      tonnes < globalAverage ? '(Below average ✓)' : '(Above average)'
    }`
  );
  lines.push('');

  // Activities
  if (profile.activities.length > 0) {
    lines.push('───────────────────────────────────────────────────');
    lines.push('TRACKED ACTIVITIES');
    lines.push('───────────────────────────────────────────────────');

    // Group by sector
    const bySector = profile.activities.reduce((acc, activity) => {
      if (!acc[activity.sectorId]) {
        acc[activity.sectorId] = [];
      }
      acc[activity.sectorId].push(activity);
      return acc;
    }, {} as Record<string, typeof profile.activities>);

    Object.entries(bySector).forEach(([sector, activities]) => {
      const sectorTotal = activities.reduce((sum, a) => sum + a.annualEmissions, 0);
      lines.push(`\n[${sector}] - ${sectorTotal.toFixed(2)} kg CO₂/year`);

      activities
        .sort((a, b) => b.annualEmissions - a.annualEmissions)
        .forEach((activity) => {
          const percent = (activity.annualEmissions / totalEmissions) * 100;
          lines.push(
            `  • ${activity.name}: ${activity.annualEmissions.toFixed(2)} kg CO₂ (${percent.toFixed(1)}%)`
          );
          lines.push(`    ${activity.quantity} ${activity.unit}/year`);
        });
    });

    lines.push('');
  }

  // Calculator results
  if (profile.calculatorResults.length > 0) {
    lines.push('───────────────────────────────────────────────────');
    lines.push('CALCULATOR RESULTS');
    lines.push('───────────────────────────────────────────────────');

    profile.calculatorResults
      .sort((a, b) => b.annualEmissions - a.annualEmissions)
      .forEach((result) => {
        const percent = (result.annualEmissions / totalEmissions) * 100;
        lines.push(
          `• ${result.label}: ${result.annualEmissions.toFixed(2)} kg CO₂ (${percent.toFixed(1)}%)`
        );
      });

    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════');
  lines.push(`Generated by Carbon ACX - https://carbon-acx.com`);
  lines.push('═══════════════════════════════════════════════════');

  downloadFile(lines.join('\n'), filename, 'text/plain');
}

// ============================================================================
// Utilities
// ============================================================================

function calculateTotal(profile: ProfileData): number {
  const activityTotal = profile.activities.reduce((sum, a) => sum + a.annualEmissions, 0);
  const calculatorTotal = profile.calculatorResults.reduce((sum, r) => sum + r.annualEmissions, 0);
  return activityTotal + calculatorTotal;
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Export Button Component Utilities
// ============================================================================

export interface ExportOption {
  label: string;
  description: string;
  format: 'csv' | 'json' | 'text';
  icon: string;
  action: (profile: ProfileData) => void;
}

export const exportOptions: ExportOption[] = [
  {
    label: 'CSV (Spreadsheet)',
    description: 'For Excel, Google Sheets, etc.',
    format: 'csv',
    icon: '📊',
    action: exportProfileToCSV,
  },
  {
    label: 'JSON (Data)',
    description: 'For developers and integrations',
    format: 'json',
    icon: '📄',
    action: exportProfileToJSON,
  },
  {
    label: 'Text Summary',
    description: 'Human-readable report',
    format: 'text',
    icon: '📝',
    action: exportProfileToText,
  },
];
