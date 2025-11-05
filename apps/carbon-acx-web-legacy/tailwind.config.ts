import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--surface-background)',
        surface: 'var(--surface-default)',
        foreground: 'var(--text-primary)',
        muted: 'var(--surface-muted)',
        border: 'var(--border-default)',
        focus: 'var(--focus-color)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },
        success: 'var(--accent-success)',
        warning: 'var(--accent-warning)',
        danger: 'var(--accent-danger)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
      borderRadius: {
        base: 'var(--radius-base)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        ring: '0 0 0 2px var(--focus-ring)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      transitionDuration: {
        default: 'var(--motion-duration)',
        slow: 'var(--motion-duration-slow)',
        fast: 'var(--motion-duration-fast)',
      },
      transitionTimingFunction: {
        default: 'var(--motion-ease)',
      },
      ringColor: {
        focus: 'var(--focus-color)',
      },
      ringOffsetColor: {
        surface: 'var(--surface-default)',
        focus: 'var(--surface-default)',
      },
      keyframes: {
        collapse: {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        expand: {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
      },
      animation: {
        collapse: 'collapse 200ms ease-out',
        expand: 'expand 200ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
