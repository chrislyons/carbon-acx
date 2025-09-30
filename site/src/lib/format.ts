export function formatEmission(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} t CO₂e`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(2)} kg CO₂e`;
  }
  if (abs >= 1) {
    return `${value.toFixed(0)} g CO₂e`;
  }
  return `${value.toFixed(2)} g CO₂e`;
}

export function formatKilograms(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)} t`;
  }
  if (Math.abs(value) >= 10) {
    return `${value.toFixed(0)} kg`;
  }
  return `${value.toFixed(1)} kg`;
}
