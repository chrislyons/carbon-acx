interface AlertInlineProps {
  tone?: 'info' | 'warning' | 'error' | 'success';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const TONE_STYLES: Record<NonNullable<AlertInlineProps['tone']>, string> = {
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-50',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
};

export function AlertInline({ tone = 'info', message, actionLabel, onAction }: AlertInlineProps): JSX.Element {
  const baseClass =
    'flex min-h-[40px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[13px] shadow-inner shadow-slate-950/40';
  const toneClass = TONE_STYLES[tone] ?? TONE_STYLES.info;
  return (
    <div
      className={`${baseClass} ${toneClass}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="flex-1 text-left font-medium leading-tight">{message}</span>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-8 items-center justify-center rounded-md border border-current px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-inherit transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
