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
    deps: {
      optimizer: {
        web: {
          include: ['jest-axe', '@tanstack/react-virtual']
        }
      }
    }
  }
});
