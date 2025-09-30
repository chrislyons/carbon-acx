import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

function normaliseBasePath(value: string | undefined): string {
  if (!value) {
    return '/';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

const publicBasePath = normaliseBasePath(process.env.PUBLIC_BASE_PATH);

export default defineConfig({
  base: publicBasePath,
  define: {
    __PUBLIC_BASE_PATH__: JSON.stringify(publicBasePath)
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true
  }
});
