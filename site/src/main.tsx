import React from 'react';
import ReactDOM from 'react-dom/client';

import { installFetchLogger } from './lib/fetchLogger';
import { purgeStaleServiceWorkersOnce } from './lib/purgeServiceWorkers';
import App from './App';
import './styles/density.css';
import './theme/global.css';
import './index.css';

installFetchLogger();
purgeStaleServiceWorkersOnce();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
