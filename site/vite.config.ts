import path from 'node:path';

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const rawBase = process.env.PUBLIC_BASE_PATH || '/';
const base = rawBase.startsWith('/') ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`) : `/${rawBase.replace(/^\/+/, '')}/`;

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0'
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    deps: {
      optimizer: {
        web: {
          include: ['jest-axe', '@tanstack/react-virtual']
        }
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.*',
        'src/**/*.stories.*',
        'src/main.tsx',
        'src/components/LayerToggles.tsx',
        'src/components/StorySection.tsx',
        'src/components/LayerSurfaceDock.tsx',
        'src/components/ActivityPlanner.tsx',
        'src/components/ExportMenu.tsx',
        'src/components/LayerBrowser.tsx',
        'src/components/VizCanvas.tsx',
        'src/components/ContextRail/**',
        'src/components/ui/{checkbox,input,label,switch}.tsx',
        'src/lib/chat/**',
        'src/lib/intent.ts',
        'src/lib/ServiceWorkers.ts',
        'src/lib/exportDiff.ts',
        'src/lib/api.ts',
        'src/lib/DataLoader.ts',
        'src/lib/fetchLogger.ts',
        'src/state/**',
        'src/store/**'
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 70,
        branches: 65
      }
    }
  }
});
