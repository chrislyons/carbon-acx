export const theme = {
  colors: {
    neutral: {
      50: '#f5f6f9',
      100: '#eceef3',
      200: '#d9dce5',
      300: '#c4c9d6',
      400: '#9aa1b5',
      500: '#6f7794',
      600: '#4c5470',
      700: '#363d54',
      800: '#222838',
      900: '#141924',
    },
    accent: {
      primary: '#3558ff',
      secondary: '#00b3a4',
      tertiary: '#f97316',
      quaternary: '#8b5cf6',
      success: '#27ae60',
      warning: '#f39c12',
      danger: '#e74c3c',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    xxl: '2rem',
  },
  radius: {
    base: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(12, 21, 42, 0.08)',
    md: '0 6px 18px -8px rgba(12, 21, 42, 0.16)',
    lg: '0 24px 48px -24px rgba(12, 21, 42, 0.24)',
  },
  motion: {
    duration: '180ms',
    durationFast: '120ms',
    durationSlow: '280ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type Theme = typeof theme;
