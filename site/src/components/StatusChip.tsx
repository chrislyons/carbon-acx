export function StatusChip({ state }: { state: 'rendered' | 'missing' }): JSX.Element {
  const icon = state === 'rendered' ? '●' : '○';
  const label = state === 'rendered' ? 'Rendered' : 'Missing data';
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center text-xs leading-none"
      role="img"
      aria-label={label}
      title={label}
    >
      {icon}
    </span>
  );
}
