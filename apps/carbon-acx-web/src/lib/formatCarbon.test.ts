import { describe, it, expect } from 'vitest';
import {
  formatCarbon,
  formatKg,
  formatTonnes,
  formatCarbonShort,
  formatPercent,
  formatIntensity,
  formatAnnualRate,
  formatNumber,
  getDecimalPlaces,
} from './formatCarbon';

describe('formatCarbon', () => {
  describe('auto unit selection', () => {
    it('formats values < 1 kg as grams with 0 decimals', () => {
      expect(formatCarbon(0.234)).toBe('234 g CO₂');
      expect(formatCarbon(0.999)).toBe('999 g CO₂');
      expect(formatCarbon(0.001)).toBe('1 g CO₂');
    });

    it('formats values 1-999 kg as kilograms with 2 decimals', () => {
      expect(formatCarbon(1)).toBe('1 kg CO₂');
      expect(formatCarbon(1.234)).toBe('1.23 kg CO₂');
      expect(formatCarbon(45.678)).toBe('45.68 kg CO₂');
      expect(formatCarbon(999.99)).toBe('999.99 kg CO₂');
    });

    it('formats values ≥ 1000 kg as tonnes with 2 decimals', () => {
      expect(formatCarbon(1000)).toBe('1 tonnes CO₂');
      expect(formatCarbon(1234.56)).toBe('1.23 tonnes CO₂');
      expect(formatCarbon(3744)).toBe('3.74 tonnes CO₂');
      expect(formatCarbon(1000000)).toBe('1,000 tonnes CO₂');
    });
  });

  describe('rounding consistency', () => {
    it('rounds grams to nearest integer', () => {
      expect(formatCarbon(0.2344)).toBe('234 g CO₂');
      expect(formatCarbon(0.2345)).toBe('235 g CO₂'); // Round half up
    });

    it('rounds kilograms to 2 decimal places', () => {
      expect(formatCarbon(45.234)).toBe('45.23 kg CO₂');
      expect(formatCarbon(45.236)).toBe('45.24 kg CO₂'); // Rounds up
      expect(formatCarbon(45.999)).toBe('46 kg CO₂');
    });

    it('rounds tonnes to 2 decimal places', () => {
      expect(formatCarbon(1234.234)).toBe('1.23 tonnes CO₂');
      expect(formatCarbon(1234.567)).toBe('1.23 tonnes CO₂');
      expect(formatCarbon(3744.999)).toBe('3.74 tonnes CO₂');
    });
  });

  describe('options', () => {
    it('supports includeCO2 = false', () => {
      expect(formatCarbon(0.5, { includeCO2: false })).toBe('500 g');
      expect(formatCarbon(45, { includeCO2: false })).toBe('45 kg');
      expect(formatCarbon(1500, { includeCO2: false })).toBe('1.5 tonnes');
    });

    it('supports shortUnits = true', () => {
      expect(formatCarbon(0.5, { shortUnits: true })).toBe('500 g');
      expect(formatCarbon(45, { shortUnits: true })).toBe('45 kg');
      expect(formatCarbon(1500, { shortUnits: true })).toBe('1.5 t');
    });

    it('supports forceUnit', () => {
      expect(formatCarbon(1500, { forceUnit: 'kg' })).toBe('1,500 kg CO₂');
      expect(formatCarbon(0.5, { forceUnit: 'kg' })).toBe('0.5 kg CO₂');
      expect(formatCarbon(1500, { forceUnit: 'g' })).toBe('1,500,000 g CO₂');
    });
  });

  describe('edge cases', () => {
    it('handles zero', () => {
      expect(formatCarbon(0)).toBe('0 kg CO₂');
      expect(formatCarbon(0, { shortUnits: true })).toBe('0 kg');
    });

    it('handles negative values', () => {
      expect(formatCarbon(-45.23)).toBe('−45.23 kg CO₂');
      expect(formatCarbon(-1500)).toBe('−1.5 tonnes CO₂');
    });

    it('handles NaN and Infinity', () => {
      expect(formatCarbon(NaN)).toBe('—');
      expect(formatCarbon(Infinity)).toBe('—');
      expect(formatCarbon(-Infinity)).toBe('—');
    });
  });

  describe('thousands separator', () => {
    it('adds commas for large numbers', () => {
      expect(formatCarbon(1234567)).toBe('1,234.57 tonnes CO₂');
      expect(formatCarbon(1000, { forceUnit: 'kg' })).toBe('1,000 kg CO₂');
    });
  });
});

describe('formatKg', () => {
  it('formats kilograms with 2 decimals', () => {
    expect(formatKg(45.234)).toBe('45.23 kg CO₂');
    expect(formatKg(1234.567)).toBe('1,234.57 kg CO₂');
  });

  it('supports includeCO2 = false', () => {
    expect(formatKg(45.23, false)).toBe('45.23 kg');
  });

  it('handles edge cases', () => {
    expect(formatKg(NaN)).toBe('—');
    expect(formatKg(Infinity)).toBe('—');
  });
});

describe('formatTonnes', () => {
  it('formats tonnes with 2 decimals', () => {
    expect(formatTonnes(1234)).toBe('1.23 tonnes CO₂');
    expect(formatTonnes(3744)).toBe('3.74 tonnes CO₂');
  });

  it('supports includeCO2 = false', () => {
    expect(formatTonnes(1500, false)).toBe('1.5 tonnes');
  });

  it('handles edge cases', () => {
    expect(formatTonnes(NaN)).toBe('—');
  });
});

describe('formatCarbonShort', () => {
  it('formats with short units', () => {
    expect(formatCarbonShort(0.234)).toBe('234 g');
    expect(formatCarbonShort(45.23)).toBe('45.23 kg');
    expect(formatCarbonShort(1500)).toBe('1.5 t');
  });
});

describe('formatPercent', () => {
  it('formats percentages with 1 decimal', () => {
    expect(formatPercent(83.456)).toBe('83.5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0.5)).toBe('0.5%');
  });

  it('handles edge cases', () => {
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPercent(Infinity)).toBe('—');
  });
});

describe('formatIntensity', () => {
  it('formats carbon intensity with 2 decimals', () => {
    expect(formatIntensity(2.456, 'hour')).toBe('2.46 kg CO₂/hour');
    expect(formatIntensity(0.123, 'km')).toBe('0.12 kg CO₂/km');
    expect(formatIntensity(1234.567, 'serving')).toBe('1,234.57 kg CO₂/serving');
  });

  it('handles edge cases', () => {
    expect(formatIntensity(NaN, 'hour')).toBe('—');
  });
});

describe('formatAnnualRate', () => {
  it('formats small values as kg/year', () => {
    expect(formatAnnualRate(45.234)).toBe('45.23 kg/year');
    expect(formatAnnualRate(999.99)).toBe('999.99 kg/year');
  });

  it('formats large values as tonnes/year', () => {
    expect(formatAnnualRate(1234)).toBe('1.23 tonnes/year');
    expect(formatAnnualRate(3744)).toBe('3.74 tonnes/year');
  });

  it('handles edge cases', () => {
    expect(formatAnnualRate(NaN)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('formats with default 2 decimals', () => {
    expect(formatNumber(1234.5678)).toBe('1,234.57');
    expect(formatNumber(0.123)).toBe('0.12');
  });

  it('supports custom decimal places', () => {
    expect(formatNumber(1234.5678, 0)).toBe('1,235');
    expect(formatNumber(1234.5678, 1)).toBe('1,234.6');
    expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
  });

  it('handles edge cases', () => {
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('getDecimalPlaces', () => {
  it('returns correct decimal places for each unit', () => {
    expect(getDecimalPlaces('g')).toBe(0);
    expect(getDecimalPlaces('kg')).toBe(2);
    expect(getDecimalPlaces('t')).toBe(2);
  });
});
