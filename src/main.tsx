import { Buffer } from 'buffer';
(window as any).Buffer = (window as any).Buffer || Buffer;
(window as any).global = (window as any).global || window;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
