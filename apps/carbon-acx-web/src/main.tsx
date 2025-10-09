import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const enableNewUi = (import.meta.env.ACX_NEW_UI ?? import.meta.env.VITE_ACX_NEW_UI) === '1';

const loadApp = enableNewUi ? () => import('./NewApp') : () => import('./legacy/LegacyApp');

async function bootstrap() {
  const { default: App } = await loadApp();
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
