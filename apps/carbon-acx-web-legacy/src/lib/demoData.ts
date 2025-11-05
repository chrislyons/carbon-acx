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
      name: 'Car Commute',
      category: 'Transport',
      quantity: 8000,
      unit: 'km',
      carbonIntensity: 0.21, // kg CO₂ per km
      annualEmissions: 1680,
      addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'car-gasoline',
    },
    {
      id: 'demo-office-electricity',
      sectorId: 'professional-services',
      name: 'Office Electricity',
      category: 'Energy',
      quantity: 2400,
      unit: 'kWh',
      carbonIntensity: 0.4, // kg CO₂ per kWh
      annualEmissions: 960,
      addedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'electricity-grid',
    },
    {
      id: 'demo-flights',
      sectorId: 'professional-services',
      name: 'Business Flights',
      category: 'Transport',
      quantity: 12000,
      unit: 'km',
      carbonIntensity: 0.15,
      annualEmissions: 1800,
      addedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'plane-domestic',
    },
    {
      id: 'demo-heating',
      sectorId: 'professional-services',
      name: 'Natural Gas Heating',
      category: 'Energy',
      quantity: 1200,
      unit: 'm³',
      carbonIntensity: 2.0,
      annualEmissions: 2400,
      addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'natural-gas',
    },
    {
      id: 'demo-purchases',
      sectorId: 'private-sector',
      name: 'Amazon Shopping',
      category: 'Shopping',
      quantity: 5000,
      unit: 'USD',
      carbonIntensity: 0.3,
      annualEmissions: 1500,
      addedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'amazon',
    },
    {
      id: 'demo-food',
      sectorId: 'industrial-land-use',
      name: 'Beef Consumption',
      category: 'Diet',
      quantity: 365,
      unit: 'days',
      carbonIntensity: 6.0,
      annualEmissions: 2190,
      addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      iconType: 'beef',
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

// Sector-specific visualization data
export function getSectorActivityBreakdown(sectorId: string) {
  // Generate realistic activity comparisons for this sector
  const activityData: Record<string, any[]> = {
    'professional-services': [
      { category: 'Office Electricity', value: 960, color: '#f59e0b', baseline: 800 },
      { category: 'Business Travel (Air)', value: 1800, color: '#dc2626', baseline: 800 },
      { category: 'Car Commute', value: 1680, color: '#f97316', baseline: 800 },
      { category: 'Public Transit', value: 240, color: '#10b981', baseline: 800 },
      { category: 'Office Heating', value: 720, color: '#f59e0b', baseline: 800 },
    ],
    'industrial-energy': [
      { category: 'Process Heat', value: 4500, color: '#dc2626', baseline: 2000 },
      { category: 'Machinery', value: 3200, color: '#f59e0b', baseline: 2000 },
      { category: 'Lighting', value: 800, color: '#10b981', baseline: 2000 },
      { category: 'HVAC', value: 1400, color: '#f59e0b', baseline: 2000 },
      { category: 'Refrigeration', value: 2100, color: '#f97316', baseline: 2000 },
    ],
    'industrial-land-use': [
      { category: 'Livestock (Beef)', value: 2700, color: '#dc2626', baseline: 1500 },
      { category: 'Livestock (Dairy)', value: 1200, color: '#f59e0b', baseline: 1500 },
      { category: 'Rice Cultivation', value: 1800, color: '#f97316', baseline: 1500 },
      { category: 'Vegetable Farming', value: 400, color: '#10b981', baseline: 1500 },
      { category: 'Fruit Farming', value: 600, color: '#22c55e', baseline: 1500 },
    ],
  };

  return activityData[sectorId] || [
    { category: 'Activity A', value: 1200, color: '#059669', baseline: 1000 },
    { category: 'Activity B', value: 800, color: '#f59e0b', baseline: 1000 },
    { category: 'Activity C', value: 1500, color: '#dc2626', baseline: 1000 },
    { category: 'Activity D', value: 600, color: '#10b981', baseline: 1000 },
  ];
}

// Sector emissions trend (simulated 12-month data)
export function getSectorEmissionsTrend(sectorId: string) {
  const months = [
    '12 mo ago', '11 mo ago', '10 mo ago', '9 mo ago',
    '8 mo ago', '7 mo ago', '6 mo ago', '5 mo ago',
    '4 mo ago', '3 mo ago', '2 mo ago', 'Last month'
  ];

  // Different growth patterns for different sectors
  const baseValues: Record<string, number> = {
    'professional-services': 4000,
    'industrial-energy': 8000,
    'industrial-land-use': 5000,
    'default': 3000,
  };

  const growthRate: Record<string, number> = {
    'professional-services': 1.02, // 2% monthly growth
    'industrial-energy': 0.98, // 2% monthly decline (efficiency improvements)
    'industrial-land-use': 1.01, // 1% monthly growth
    'default': 1.015,
  };

  const base = baseValues[sectorId] || baseValues.default;
  const rate = growthRate[sectorId] || growthRate.default;

  return months.map((month, index) => ({
    date: month,
    value: Math.round(base * Math.pow(rate, index)),
  }));
}
