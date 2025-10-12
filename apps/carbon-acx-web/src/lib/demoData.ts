/**
 * Demo data for instant visualization
 * Provides realistic carbon footprint data for immediate display
 */

import type { SelectedActivity, CalculatorResult } from '../contexts/ProfileContext';

export function getDemoActivities(): SelectedActivity[] {
  return [
    {
      id: 'demo-commute-car',
      sectorId: 'professional-services',
      name: 'Commute (car)',
      category: 'Transport',
      quantity: 8000,
      unit: 'km',
      carbonIntensity: 0.21, // kg CO₂ per km
      annualEmissions: 1680,
      addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-office-electricity',
      sectorId: 'professional-services',
      name: 'Office electricity',
      category: 'Energy',
      quantity: 2400,
      unit: 'kWh',
      carbonIntensity: 0.4, // kg CO₂ per kWh
      annualEmissions: 960,
      addedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-flights',
      sectorId: 'professional-services',
      name: 'Business flights (domestic)',
      category: 'Transport',
      quantity: 12000,
      unit: 'km',
      carbonIntensity: 0.15,
      annualEmissions: 1800,
      addedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-heating',
      sectorId: 'professional-services',
      name: 'Home heating (gas)',
      category: 'Energy',
      quantity: 1200,
      unit: 'm³',
      carbonIntensity: 2.0,
      annualEmissions: 2400,
      addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-purchases',
      sectorId: 'private-sector',
      name: 'Consumer goods',
      category: 'Shopping',
      quantity: 5000,
      unit: 'USD',
      carbonIntensity: 0.3,
      annualEmissions: 1500,
      addedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-food',
      sectorId: 'industrial-land-use',
      name: 'Food (mixed diet)',
      category: 'Diet',
      quantity: 365,
      unit: 'days',
      carbonIntensity: 6.0,
      annualEmissions: 2190,
      addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function getDemoCalculatorResults(): CalculatorResult[] {
  return [
    {
      category: 'commute',
      label: 'Daily commute (40km)',
      annualEmissions: 1680,
      calculatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      category: 'diet',
      label: 'Mixed diet',
      annualEmissions: 2190,
      calculatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function loadDemoProfile() {
  const demoProfile = {
    version: 1,
    data: {
      activities: getDemoActivities(),
      calculatorResults: getDemoCalculatorResults(),
      lastUpdated: new Date().toISOString(),
    },
  };

  localStorage.setItem('carbon-acx-profile', JSON.stringify(demoProfile));

  // Reload to apply demo data
  window.location.reload();
}

// Get demo time series data (6 months of emissions tracking)
export function getDemoTimeSeries() {
  const months = [
    { date: '6 months ago', value: 7200 },
    { date: '5 months ago', value: 8100 },
    { date: '4 months ago', value: 8900 },
    { date: '3 months ago', value: 9500 },
    { date: '2 months ago', value: 10200 },
    { date: 'Last month', value: 10530 },
  ];

  return months;
}

// Global comparison data
export function getGlobalComparisonData() {
  return [
    { category: 'You (demo)', value: 10530, color: '#059669', baseline: 4500 },
    { category: 'US Average', value: 16000, color: '#dc2626', baseline: 4500 },
    { category: 'EU Average', value: 7000, color: '#f59e0b', baseline: 4500 },
    { category: 'Global Average', value: 4500, color: '#6b7280', baseline: 4500 },
    { category: 'Paris Target', value: 2000, color: '#3b82f6', baseline: 4500 },
  ];
}
