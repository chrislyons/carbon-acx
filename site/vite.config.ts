import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

// Use env override; fall back to '/carbon-acx/' only when deploying under subpath
const base = process.env.BUILD_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0'
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true
  }
});
