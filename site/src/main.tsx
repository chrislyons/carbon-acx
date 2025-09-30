import React from 'react';
import ReactDOM from 'react-dom/client';

import { installFetchLogger } from './lib/fetchLogger';
import App from './App';
import './index.css';

installFetchLogger();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
