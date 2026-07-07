import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Earth Color Palette
        earth: {
          'deep-ocean': '#0a1628',
          'ocean-mid': '#1e3a5f',
          'atmosphere': '#3b82f6',
          'forest': '#22c55e',
          'ice': '#f0f9ff',
          'sunset': '#f97316',
          'clouds': '#e0f2fe',
        },
        // Semantic mappings
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        display: ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
        sans: ['General Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
