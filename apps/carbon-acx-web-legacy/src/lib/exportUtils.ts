/**
 * Export Utilities
 *
 * Helper functions for exporting data in various formats.
 */

import type { Activity } from '../store/appStore';

/**
 * Converts activities to CSV format and triggers download
 */
export function exportToCSV(activities: Activity[], totalEmissions: number): void {
  try {
    // CSV Header
    const headers = [
      'Activity Name',
      'Category',
      'Quantity',
      'Unit',
      'Carbon Intensity (kg CO₂/unit)',
      'Annual Emissions (kg CO₂)',
      'Added Date',
    ];

    // Convert activities to CSV rows
    const rows = activities.map((activity) => [
      escapeCSVField(activity.name),
      escapeCSVField(activity.category || 'N/A'),
      activity.quantity.toString(),
      escapeCSVField(activity.unit),
      activity.carbonIntensity.toFixed(3),
      activity.annualEmissions.toFixed(2),
      new Date(activity.addedAt).toLocaleDateString(),
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totalEmissions.toFixed(2),
      '',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `carbon-emissions-${timestamp}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw new Error('Failed to export CSV file');
  }
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
function escapeCSVField(value: string | null | undefined): string {
  if (!value) return '';

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Exports canvas element to PNG image
 */
export function exportCanvasToPNG(canvas: HTMLCanvasElement, filename: string = 'visualization.png'): void {
  try {
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `${filename.replace('.png', '')}-${timestamp}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Failed to export canvas to PNG:', error);
    throw new Error('Failed to export visualization as image');
  }
}

/**
 * Legacy export options for ExportButton component (used in legacy DashboardView)
 * This is a stub to maintain compatibility
 */
export const exportOptions: Array<{
  format: string;
  label: string;
  description: string;
  icon: string;
  action: (profile: any, history: any) => void;
}> = [
  {
    format: 'csv',
    label: 'CSV Spreadsheet',
    description: 'Import into Excel or Google Sheets',
    icon: '📊',
    action: (profile) => {
      const activities = profile?.activities || [];
      const totalEmissions = activities.reduce((sum: number, a: Activity) => sum + a.annualEmissions, 0);
      exportToCSV(activities, totalEmissions);
    },
  },
  {
    format: 'json',
    label: 'JSON Data',
    description: 'For developers and data analysis',
    icon: '{ }',
    action: (profile) => {
      const json = JSON.stringify(profile, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `carbon-profile-${timestamp}.json`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
];
