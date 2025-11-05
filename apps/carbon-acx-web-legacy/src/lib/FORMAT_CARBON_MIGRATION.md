# Carbon Formatting Migration Guide

## Overview

Migrate from inconsistent `.toFixed()` calls to centralized formatting utilities for consistent, professional metric display.

## Formatting Rules

### Decimal Place Standards

| Unit | Decimal Places | Example |
|------|----------------|---------|
| **Grams (g)** | 0 decimals | `234g` |
| **Kilograms (kg)** | 2 decimals | `45.23 kg CO₂` |
| **Tonnes (t)** | 2 decimals | `3.74 tonnes CO₂` |
| **Percentages (%)** | 1 decimal | `83.5%` |
| **Intensity (kg CO₂/unit)** | 2 decimals | `2.45 kg CO₂/hour` |

## Migration Examples

### Before → After

#### 1. **Auto Unit Selection**

```tsx
// ❌ BEFORE - Inconsistent decimals
{(totalEmissions / 1000).toFixed(1)}t
{totalEmissions.toFixed(0)} kg CO₂

// ✅ AFTER - Smart unit selection with consistent decimals
{formatCarbon(totalEmissions)}
// Output: "3.74 tonnes CO₂" or "45.23 kg CO₂"
```

#### 2. **Forced Units**

```tsx
// ❌ BEFORE
{(totalEmissions / 1000).toFixed(2)} tonnes CO₂

// ✅ AFTER
{formatTonnes(totalEmissions)}
// Output: "3.74 tonnes CO₂"
```

#### 3. **Short Units (Compact Displays)**

```tsx
// ❌ BEFORE
{(emissions / 1000).toFixed(1)}t

// ✅ AFTER
{formatCarbonShort(emissions)}
// Output: "3.74t", "45.23kg", or "234g"
```

#### 4. **Percentages**

```tsx
// ❌ BEFORE
{percentage.toFixed(1)}%

// ✅ AFTER
{formatPercent(percentage)}
// Output: "83.5%"
```

#### 5. **Annual Rates**

```tsx
// ❌ BEFORE
{emissions.toFixed(2)} kg CO₂/year

// ✅ AFTER
{formatAnnualRate(emissions)}
// Output: "3.74 tonnes/year" or "45.23 kg/year"
```

#### 6. **Carbon Intensity**

```tsx
// ❌ BEFORE
{carbonIntensity.toFixed(4)} kg CO₂/hour

// ✅ AFTER
{formatIntensity(carbonIntensity, 'hour')}
// Output: "2.45 kg CO₂/hour"
```

## Import Statement

```tsx
import {
  formatCarbon,
  formatKg,
  formatTonnes,
  formatCarbonShort,
  formatPercent,
  formatIntensity,
  formatAnnualRate,
  formatNumber,
} from '../lib/formatCarbon';
```

## Component-by-Component Migration

### Priority 1: Dashboard & Key Metrics

- [x] **DashboardView.tsx** (example implementation below)
- [ ] **HomeView.tsx** - Hero stats
- [ ] **NavSidebar.tsx** - Total emissions badge

### Priority 2: Detail Views

- [ ] **ActivityBadge.tsx** - Emission labels
- [ ] **ActivityBadgeGrid.tsx** - Impact calculations
- [ ] **ActivityMatrix.tsx** - Toast messages
- [ ] **LayerManager.tsx** - Layer totals
- [ ] **LayerToggle.tsx** - Layer summaries
- [ ] **ProfilePicker.tsx** - Profile cards
- [ ] **QuickCalculator.tsx** - Results display

### Priority 3: Charts & Visualizations

- [ ] **TimeSeriesChart.tsx** - Tooltips, stat cards
- [ ] **ComparativeBarChart.tsx** - Tooltips, stat cards
- [ ] **EmissionsHeatmap.tsx** - Cell labels, tooltips

### Priority 4: Utilities

- [ ] **exportUtils.ts** - CSV/text export formatting

## Example: DashboardView.tsx Migration

```tsx
import { formatCarbon, formatTonnes, formatPercent } from '../lib/formatCarbon';

// Before:
<span className="text-4xl font-bold">
  {(totalEmissions / 1000).toFixed(2)}
</span>
<span className="text-lg text-text-muted">tonnes CO₂</span>

// After:
<span className="text-4xl font-bold">
  {formatTonnes(totalEmissions, false).split(' ')[0]}
</span>
<span className="text-lg text-text-muted">tonnes CO₂</span>

// Or even better:
{formatTonnes(totalEmissions)}
```

## Benefits

1. **Consistency** - All metrics follow the same rounding rules
2. **Readability** - No more 8-digit numbers cluttering the UI
3. **Professionalism** - Industry-standard formatting
4. **Maintainability** - Change rules once, apply everywhere
5. **Internationalization-Ready** - Uses `toLocaleString()` for thousands separators
6. **Type Safety** - Handles NaN, Infinity, edge cases gracefully

## Testing

All formatting functions have comprehensive test coverage:

```bash
pnpm test formatCarbon --run
```

Expected output: **31 tests passed**

## References

- **Utility File**: `src/lib/formatCarbon.ts`
- **Tests**: `src/lib/formatCarbon.test.ts`
- **This Guide**: `src/lib/FORMAT_CARBON_MIGRATION.md`
