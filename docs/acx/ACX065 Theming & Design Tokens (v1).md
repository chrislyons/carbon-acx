# Carbon ACX theming guidelines

The new workspace is powered by CSS custom properties defined in `apps/carbon-acx-web/src/styles/tokens.css`. The tokens provide
a consistent palette across light/dark themes and map directly to Tailwind aliases for rapid prototyping.

## Core tokens

| Category | Token | Notes |
| --- | --- | --- |
| Typography | `--font-sans`, `--font-mono` | Applied to Tailwind `fontFamily.sans` and `fontFamily.mono`. |
| Surfaces | `--surface-*` | Background layers for shell, cards, and overlays. |
| Borders | `--border-default`, `--border-strong` | Used by structural dividers and focus rings. |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` | Aligns text colors with semantic emphasis. |
| Accent | `--accent-50` – `--accent-900` | Gradient for primary brand tone and interactive states. |
| Neutral | `--neutral-50` – `--neutral-900` | Supporting grayscale for outlines and backgrounds. |
| Feedback | `--accent-success`, `--accent-warning`, `--accent-danger` | Reinforces system feedback. |
| Motion | `--motion-duration-*`, `--motion-ease` | Shared timing for animations and transitions. |
| Radius & spacing | `--radius-*`, `--space-*` | Standardises card shapes and layout rhythm. |

Dark mode overrides live under `[data-theme='dark']`, mirroring the token structure for near drop-in parity.

## Using tokens in components

1. Prefer Tailwind classes (e.g. `text-foreground`, `bg-surface`) whenever possible—the config in
   `apps/carbon-acx-web/tailwind.config.ts` aliases Tailwind utilities back to the design tokens.
2. When Tailwind cannot express a value, reference the token directly (e.g. `style={{ color: 'var(--text-muted)' }}`).
3. Respect `prefers-reduced-motion`; token overrides in `tokens.css` collapse animation durations when users request it.

## Legacy iframe shell

The legacy bridge (`LegacyApp`) reuses the same global CSS import so typography and surface colours remain on-brand even while the
iframe loads the older bundle. If the legacy app needs bespoke overrides, append them in `src/legacy` with tokens instead of raw
hex values to avoid divergence.
