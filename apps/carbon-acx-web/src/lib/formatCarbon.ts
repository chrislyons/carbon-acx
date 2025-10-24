/**
 * Carbon emissions formatting utilities
 *
 * Provides consistent rounding and formatting for carbon metrics across all weight ranges.
 * Enforces strict decimal place rules for readability and professional presentation.
 */

/**
 * Format carbon emissions with smart unit selection and consistent decimal places
 *
 * Rounding rules (enforced across all displays):
 * - Grams (< 1 kg):        0 decimals  (e.g., "234g")
 * - Kilograms (1-999 kg):  2 decimals  (e.g., "45.23 kg")
 * - Tonnes (≥ 1000 kg):    2 decimals  (e.g., "3.74 tonnes")
 *
 * @param kgCO2 - Emissions in kilograms CO₂
 * @param options - Formatting options
 * @returns Formatted string with appropriate unit
 */
export function formatCarbon(
  kgCO2: number,
  options: {
    /** Include "CO₂" suffix (default: true) */
    includeCO2?: boolean;
    /** Use short units: "t" instead of "tonnes", "kg" instead of "kg CO₂" (default: false) */
    shortUnits?: boolean;
    /** Force a specific unit instead of auto-selecting */
    forceUnit?: 'g' | 'kg' | 't';
  } = {}
): string {
  const { includeCO2 = true, shortUnits = false, forceUnit } = options;

  // Handle edge cases
  if (!isFinite(kgCO2) || isNaN(kgCO2)) {
    return '—';
  }

  if (kgCO2 === 0) {
    return shortUnits ? '0 kg' : '0 kg CO₂';
  }

  const absValue = Math.abs(kgCO2);
  const isNegative = kgCO2 < 0;
  const sign = isNegative ? '−' : ''; // Use proper minus sign (U+2212)

  let value: number;
  let unit: string;

  // Determine unit and format
  if (forceUnit === 'g' || (!forceUnit && absValue < 1)) {
    // Grams: 0 decimals
    value = Math.round(absValue * 1000);
    unit = shortUnits ? 'g' : (includeCO2 ? 'g CO₂' : 'g');
  } else if (forceUnit === 't' || (!forceUnit && absValue >= 1000)) {
    // Tonnes: 2 decimals
    value = parseFloat((absValue / 1000).toFixed(2));
    unit = shortUnits ? 't' : (includeCO2 ? 'tonnes CO₂' : 'tonnes');
  } else {
    // Kilograms (default): 2 decimals
    value = parseFloat(absValue.toFixed(2));
    unit = shortUnits ? 'kg' : (includeCO2 ? 'kg CO₂' : 'kg');
  }

  return `${sign}${value.toLocaleString('en-US')} ${unit}`;
}

/**
 * Format carbon emissions in kilograms with 2 decimal places
 *
 * @param kgCO2 - Emissions in kilograms CO₂
 * @param includeCO2 - Include "CO₂" suffix (default: true)
 * @returns Formatted string (e.g., "1,234.56 kg CO₂")
 */
export function formatKg(kgCO2: number, includeCO2 = true): string {
  if (!isFinite(kgCO2) || isNaN(kgCO2)) return '—';

  const value = parseFloat(kgCO2.toFixed(2));
  const unit = includeCO2 ? 'kg CO₂' : 'kg';

  return `${value.toLocaleString('en-US')} ${unit}`;
}

/**
 * Format carbon emissions in tonnes with 2 decimal places
 *
 * @param kgCO2 - Emissions in kilograms CO₂
 * @param includeCO2 - Include "CO₂" suffix (default: true)
 * @returns Formatted string (e.g., "3.74 tonnes CO₂")
 */
export function formatTonnes(kgCO2: number, includeCO2 = true): string {
  if (!isFinite(kgCO2) || isNaN(kgCO2)) return '—';

  const tonnes = parseFloat((kgCO2 / 1000).toFixed(2));
  const unit = includeCO2 ? 'tonnes CO₂' : 'tonnes';

  return `${tonnes.toLocaleString('en-US')} ${unit}`;
}

/**
 * Format carbon emissions with short units for compact displays
 *
 * @param kgCO2 - Emissions in kilograms CO₂
 * @returns Formatted string with short units (e.g., "3.74t", "45.23kg", "234g")
 */
export function formatCarbonShort(kgCO2: number): string {
  return formatCarbon(kgCO2, { shortUnits: true, includeCO2: false });
}

/**
 * Format percentage with 1 decimal place
 *
 * @param value - Percentage value (e.g., 83.5 for 83.5%)
 * @returns Formatted string (e.g., "83.5%")
 */
export function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '—';

  return `${parseFloat(value.toFixed(1))}%`;
}

/**
 * Format carbon intensity (emissions per unit) with 2 decimal places
 *
 * @param kgCO2PerUnit - Carbon intensity in kg CO₂ per unit
 * @param unit - The functional unit (e.g., "hour", "serving", "km")
 * @returns Formatted string (e.g., "2.45 kg CO₂/hour")
 */
export function formatIntensity(kgCO2PerUnit: number, unit: string): string {
  if (!isFinite(kgCO2PerUnit) || isNaN(kgCO2PerUnit)) return '—';

  const value = parseFloat(kgCO2PerUnit.toFixed(2));

  return `${value.toLocaleString('en-US')} kg CO₂/${unit}`;
}

/**
 * Format annual rate with smart unit selection
 *
 * @param kgCO2PerYear - Annual emissions in kg CO₂/year
 * @returns Formatted string (e.g., "3.74 tonnes/year", "234.56 kg/year")
 */
export function formatAnnualRate(kgCO2PerYear: number): string {
  if (!isFinite(kgCO2PerYear) || isNaN(kgCO2PerYear)) return '—';

  const absValue = Math.abs(kgCO2PerYear);

  if (absValue >= 1000) {
    // Tonnes per year: 2 decimals
    const tonnes = parseFloat((kgCO2PerYear / 1000).toFixed(2));
    return `${tonnes.toLocaleString('en-US')} tonnes/year`;
  } else {
    // Kilograms per year: 2 decimals
    const kg = parseFloat(kgCO2PerYear.toFixed(2));
    return `${kg.toLocaleString('en-US')} kg/year`;
  }
}

/**
 * Format a numeric value with specified decimal places
 *
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals = 2): string {
  if (!isFinite(value) || isNaN(value)) return '—';

  return parseFloat(value.toFixed(decimals)).toLocaleString('en-US');
}

/**
 * Get the appropriate decimal places for a given unit
 *
 * @param unit - Unit of measurement ('g', 'kg', 't')
 * @returns Number of decimal places to use
 */
export function getDecimalPlaces(unit: 'g' | 'kg' | 't'): number {
  switch (unit) {
    case 'g':
      return 0; // Grams: no decimals
    case 'kg':
      return 2; // Kilograms: 2 decimals
    case 't':
      return 2; // Tonnes: 2 decimals
    default:
      return 2;
  }
}
