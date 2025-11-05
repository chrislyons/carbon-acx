import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Default to new interface (set ACX_LEGACY_UI=1 to use legacy)
const useLegacy = (import.meta.env.ACX_LEGACY_UI ?? import.meta.env.VITE_ACX_LEGACY_UI) === '1';

const loadApp = useLegacy ? () => import('./legacy/LegacyApp') : () => import('./NewApp');

async function bootstrap() {
  const { default: App } = await loadApp();
  // TypeScript needs explicit non-null assertion here
  ReactDOM.createRoot(rootElement!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
