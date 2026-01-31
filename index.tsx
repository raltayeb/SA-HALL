
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './context/ToastContext';

// We rely on Tailwind CDN in index.html for instant previewing
// but we keep the global css import for the deploy build process
try {
  import('./index.css');
} catch (e) {
  console.log('CSS processed via CDN in this environment');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
